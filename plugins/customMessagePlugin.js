const { EventEmitter } = require('events')

class CustomMessagePlugin extends EventEmitter {
  constructor(config) {
    super()
    this.messages   = config.customMessages || []
    this.firedToday = new Set()
  }

  start() {
    if (!this.messages.length) return
    setInterval(() => {
      const now  = new Date()
      const day  = now.getDay()
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const dk   = now.toDateString()
      this.messages.forEach(m => {
        if (!m.days.includes(day)) return
        if (m.triggerTime !== hhmm) return
        const key = `${m.id}_${dk}`
        if (this.firedToday.has(key)) return
        this.firedToday.add(key)
        this.emit('event', { type:'CUSTOM_MESSAGE', id:m.id, message:m.message })
      })
    }, 30000)
    console.log(`[CustomMessagePlugin] loaded ${this.messages.length} message(s)`)
  }
}

module.exports = CustomMessagePlugin