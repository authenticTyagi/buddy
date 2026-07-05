const { EventEmitter } = require('events')
const { execSync }     = require('child_process')

class TeamsKeepAlivePlugin extends EventEmitter {
  constructor(config) {
    super()
    this.intervalMins = config.plugins?.teamsKeepAlive?.intervalMins || 4
  }

  isTeamsRunning() {
    try {
      const n = execSync(
        'powershell -NoProfile -NonInteractive -Command "Get-Process -Name Teams -EA SilentlyContinue | Measure-Object | Select -ExpandProperty Count"',
        { timeout:3000, encoding:'utf8' }
      ).trim()
      return parseInt(n) > 0
    } catch(e) { return false }
  }

  nudge() {
    try {
      execSync(`powershell -NoProfile -NonInteractive -Command "
        Add-Type -AssemblyName System.Windows.Forms
        $p=[System.Windows.Forms.Cursor]::Position
        [System.Windows.Forms.Cursor]::Position=New-Object System.Drawing.Point(($p.X+1),$p.Y)
        Start-Sleep -Milliseconds 80
        [System.Windows.Forms.Cursor]::Position=$p
      "`, { timeout:3000 })
    } catch(e) {}
  }

  start() {
    setInterval(() => {
      if (this.isTeamsRunning()) this.nudge()
    }, this.intervalMins * 60000)
    console.log(`[TeamsKeepAlive] started — nudging every ${this.intervalMins} mins`)
  }
}

module.exports = TeamsKeepAlivePlugin