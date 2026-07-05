const { EventEmitter } = require('events')

class HealthPlugin extends EventEmitter {
  constructor(config) {
    super()
    this.health = config.health
    this.shift  = config.shift
  }

  toMins(t) { const [h,m]=t.split(':').map(Number); return h*60+m }
  isWorkDay() { return this.shift.workDays.includes(new Date().getDay()) }
  isWithinShift() {
    const n = new Date(); const nm = n.getHours()*60+n.getMinutes()
    return nm >= this.toMins(this.shift.start) && nm <= this.toMins(this.shift.end)
  }

  schedule(subtype, mins, message) {
    setInterval(() => {
      if (!this.isWorkDay() || !this.isWithinShift()) return
      this.emit('event', { type:'HEALTH_NUDGE', subtype, message })
    }, mins * 60000)
  }

  start() {
    if (!this.health.enabled) return
    this.schedule('POSTURE',   this.health.postureReminderMins, 'Sit straight, shoulders back, screen at eye level.')
    this.schedule('EYE_BREAK', this.health.eyeBreakMins,        '20-20-20: look 20 ft away for 20 seconds.')
    this.schedule('WATER',     this.health.waterReminderMins,   'Drink a glass of water right now.')
    this.schedule('STRETCH',   this.health.stretchReminderMins, 'Stand up and stretch.')
    console.log('[HealthPlugin] started')
  }
}

module.exports = HealthPlugin