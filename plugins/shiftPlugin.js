const { EventEmitter } = require('events')

class ShiftPlugin extends EventEmitter {
  constructor(config) {
    super()
    this.shift     = config.shift
    this.firedToday = new Set()
  }

  toMins(t) { const [h,m]=t.split(':').map(Number); return h*60+m }
  nowMins()  { const n=new Date(); return n.getHours()*60+n.getMinutes() }
  minsLeft() { return this.toMins(this.shift.end)   - this.nowMins() }
  minsIn()   { return this.nowMins() - this.toMins(this.shift.start) }
  isWorkDay(){ return this.shift.workDays.includes(new Date().getDay()) }

  fire(key, payload) {
    const dk = key+'_'+new Date().toDateString()
    if (this.firedToday.has(dk)) return
    this.firedToday.add(dk)
    this.emit('event', { type:'SHIFT_WARNING', ...payload })
  }

  start() {
    setInterval(() => {
      if (!this.isWorkDay()) return
      const left = this.minsLeft()
      const into = this.minsIn()
      if (into >= 0 && into <= 2)
        this.fire('start',  { subtype:'SHIFT_START',  minsLeft:left, message:`Shift started. Finish line: ${this.shift.end}.` })
      if (left <= 60 && left > 58)
        this.fire('60min',  { subtype:'HOUR_LEFT',    minsLeft:left, message:'One hour left. Wrap up anything critical.' })
      if (left <= 30 && left > 28)
        this.fire('30min',  { subtype:'THIRTY_LEFT',  minsLeft:left, message:'30 minutes left.' })
      if (left <= 0  && left > -2)
        this.fire('end',    { subtype:'SHIFT_END',    minsLeft:0,    message:'Shift over. Log off.' })
    }, 60000)
    console.log('[ShiftPlugin] started')
  }
}

module.exports = ShiftPlugin