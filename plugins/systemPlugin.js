const os = require('os')
const { EventEmitter } = require('events')

class SystemPlugin extends EventEmitter {
  constructor(config) {
    super()
    this.config      = config
    this.lastCpuInfo = null
  }

  getCpuPercent() {
    const cpus = os.cpus()
    if (!this.lastCpuInfo) { this.lastCpuInfo = cpus; return 0 }
    let idle = 0, total = 0
    cpus.forEach((cpu, i) => {
      const prev = this.lastCpuInfo[i]
      for (const t in cpu.times) total += cpu.times[t] - (prev.times[t] || 0)
      idle += cpu.times.idle - (prev.times.idle || 0)
    })
    this.lastCpuInfo = cpus
    return Math.round(100 - (100 * idle / total))
  }

  getRamPercent() {
    const t = os.totalmem(), f = os.freemem()
    return Math.round(((t-f)/t)*100)
  }

  getRamGB()   { return ((os.totalmem()-os.freemem())/1073741824).toFixed(1) }
  getTotalGB() { return (os.totalmem()/1073741824).toFixed(0) }

  start() {
    const poll = () => {
      const cpu = this.getCpuPercent()
      const ram = this.getRamPercent()
      const ramGB   = this.getRamGB()
      const totalGB = this.getTotalGB()

      this.emit('event', { type:'SYSTEM_STATS', cpu, ram, ramGB, totalGB,
        message:`CPU ${cpu}%  |  RAM ${ramGB}/${totalGB} GB` })

      if (cpu >= this.config.cpuWarnPercent)
        this.emit('event', { type:'CPU_SPIKE', cpu, message:`CPU at ${cpu}%.` })

      if (ram >= this.config.ramWarnPercent)
        this.emit('event', { type:'RAM_SPIKE', ram, ramGB, totalGB,
          message:`RAM at ${ram}% (${ramGB}/${totalGB} GB).` })
    }

    setTimeout(() => {
      poll()
      setInterval(poll, this.config.pollIntervalSecs * 1000)
    }, 2000)

    setInterval(() => this.emit('event', { type:'IDLE' }),
      (this.config.idleIntervalSecs || 120) * 1000)

    setInterval(() => this.emit('event', { type:'JOKE' }),
      (this.config.jokeIntervalHours || 1) * 3600000)

    console.log('[SystemPlugin] started')
  }
}

module.exports = SystemPlugin