const { EventEmitter }        = require('events')
const SystemPlugin            = require('./systemPlugin')
const OutlookPlugin           = require('./outlookPlugin')
const TeamsPlugin             = require('./teamsPlugin')
const ShiftPlugin             = require('./shiftPlugin')
const HealthPlugin            = require('./healthPlugin')
const CustomMessagePlugin     = require('./customMessagePlugin')
const WindowPlugin            = require('./windowPlugin')
const TeamsKeepAlivePlugin    = require('./teamsKeepAlivePlugin')

class PluginManager extends EventEmitter {
  constructor(config) {
    super()
    this.config  = config
    this.plugins = []
  }

  register(plugin, label) {
    plugin.on('event', e => this.emit('event', e))
    this.plugins.push(plugin)
    console.log(`[PluginManager] loaded ${label}`)
  }

  load() {
    const c = this.config
    const p = c.plugins || {}

    if (p.system?.enabled)
      this.register(new SystemPlugin(p.system), 'SystemPlugin')

    if (p.outlook?.enabled)
      this.register(new OutlookPlugin(p.outlook), 'OutlookPlugin')

    if (p.teams?.enabled)
      this.register(new TeamsPlugin(p.teams), 'TeamsPlugin')

    if (c.shift)
      this.register(new ShiftPlugin(c), 'ShiftPlugin')

    if (c.health?.enabled)
      this.register(new HealthPlugin(c), 'HealthPlugin')

    if (c.customMessages?.length)
      this.register(new CustomMessagePlugin(c), 'CustomMessagePlugin')

    this.register(new WindowPlugin(c), 'WindowPlugin')

    if (p.teamsKeepAlive?.enabled)
      this.register(new TeamsKeepAlivePlugin(c), 'TeamsKeepAlivePlugin')
  }

  startAll() { this.plugins.forEach(p => p.start()) }
}

module.exports = PluginManager