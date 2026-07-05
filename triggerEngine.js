const { EventEmitter }          = require('events')
const { generateMessage, setLocale } = require('./aiEngine')

const PRIORITY = {
  STARTUP:            0,
  CPU_SPIKE:          1,
  RAM_SPIKE:          1,
  MEETING_SOON:       1,
  NEW_TEAMS_MESSAGE:  2,
  NEW_EMAIL:          2,
  SHIFT_WARNING:      2,
  HEALTH_NUDGE:       3,
  CUSTOM_MESSAGE:     3,
  APP_CONTEXT:        3,
  CLICK_INTERACTION:  3,
  DRAG_INTERACTION:   3,
  IDLE:               4,
  JOKE:               4,
  SYSTEM_STATS:       4
}

const COOLDOWNS = {
  STARTUP:            0,
  CPU_SPIKE:          2   * 60000,
  RAM_SPIKE:          2   * 60000,
  MEETING_SOON:       1   * 60000,
  NEW_TEAMS_MESSAGE:  30  * 1000,
  NEW_EMAIL:          60  * 1000,
  SHIFT_WARNING:      10  * 60000,
  HEALTH_NUDGE:       10  * 60000,
  CUSTOM_MESSAGE:     60  * 1000,
  APP_CONTEXT:        30  * 1000,
  CLICK_INTERACTION:  8   * 1000,
  DRAG_INTERACTION:   5   * 1000,
  IDLE:               2   * 60000,
  JOKE:               60  * 60000,
  SYSTEM_STATS:       5   * 60000
}

class TriggerEngine extends EventEmitter {
  constructor(config = {}) {
    super()
    this.config       = config
    this.queue        = []
    this.isPlaying    = false
    this.isGenerating = false
    this.lastFired    = {}
    this.statsCounter = 0
  }

  attach(pm) {
    if (pm && typeof pm.on === 'function') {
      pm.on('event', e => this.handle(e))
    }
  }

  canFire(type) {
    if (type === 'STARTUP') return true
    const cd = COOLDOWNS[type] ?? 60000
    return (Date.now() - (this.lastFired[type] || 0)) >= cd
  }

  getPriority(type) { return PRIORITY[type] ?? 3 }

  getDuration(type) {
    const n = this.config?.notifications || {}
    const map = {
      MEETING_SOON:       (n.meetingDurationSecs || 10) * 1000,
      SHIFT_WARNING:      (n.shiftDurationSecs   ||  8) * 1000,
      HEALTH_NUDGE:       (n.healthDurationSecs  ||  8) * 1000,
      IDLE:               (n.idleDurationSecs    ||  6) * 1000,
      JOKE:               (n.jokeDurationSecs    ||  7) * 1000,
      STARTUP:            5000,
      CPU_SPIKE:          7000,
      RAM_SPIKE:          7000,
      CLICK_INTERACTION:  4000,
      DRAG_INTERACTION:   3500
    }
    return map[type] || (n.defaultDurationSecs || 6) * 1000
  }

  getMood(type) {
    if (['CPU_SPIKE','RAM_SPIKE'].includes(type)) return 'surprise'
    if (['IDLE','JOKE','CLICK_INTERACTION','DRAG_INTERACTION'].includes(type)) return 'neutral'
    return 'happy'
  }

  async handle(event) {
    if (!event || !event.type) return
    const { type } = event

    // locale from renderer
    if (type === '__locale__') { setLocale(event.locale); return }

    // plugin guards — never fire disabled plugin events
    const p = this.config?.plugins || {}
    if (type === 'NEW_EMAIL'          && !p.outlook?.enabled) return
    if (type === 'NEW_TEAMS_MESSAGE'  && !p.teams?.enabled)   return
    if (type === 'MEETING_SOON'       && !p.outlook?.enabled && !p.teams?.enabled) return

    // SYSTEM_STATS throttle
    if (type === 'SYSTEM_STATS') {
      this.statsCounter++
      if (this.statsCounter % 5 !== 0) return
    }

    if (!this.canFire(type)) return
    const prio = this.getPriority(type)

    // low-priority events dropped if queue has anything waiting
    if (prio >= 4 && this.queue.filter(i => !i.pending).length > 0) return

    if (this.isGenerating) {
      if (prio <= 2 && this.queue.length < 6) {
        this.queue.push({ event, type, pending: true, priority: prio })
      }
      return
    }

    this.lastFired[type] = Date.now()
    await this.generate(type, event)
  }

  async generate(type, event) {
    this.isGenerating = true
    try {
      const message  = await generateMessage(type, event)
      const duration = this.getDuration(type)
      const mood     = this.getMood(type)
      const priority = this.getPriority(type)
      const item     = { message, mood, duration, priority }

      if (priority <= 1) this.queue.unshift(item)
      else               this.queue.push(item)

      this.queue.sort((a,b) => (a.priority ?? 3) - (b.priority ?? 3))
      if (!this.isPlaying) this.playNext()
    } catch(e) {
      console.error('[TriggerEngine]', e.message)
    } finally {
      this.isGenerating = false
      const pending = this.queue.find(i => i.pending)
      if (pending) {
        this.queue.splice(this.queue.indexOf(pending), 1)
        this.lastFired[pending.type] = Date.now()
        await this.generate(pending.type, pending.event)
      }
    }
  }

  playNext() {
    const next = this.queue.find(i => !i.pending)
    if (!next) { this.isPlaying = false; return }
    this.queue.splice(this.queue.indexOf(next), 1)
    this.isPlaying = true
    this.emit('show', { message: next.message, mood: next.mood, duration: next.duration })
    setTimeout(() => this.playNext(), next.duration + 500)
  }
}

module.exports = TriggerEngine