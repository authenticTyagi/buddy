const { EventEmitter } = require('events')
const { execSync }     = require('child_process')

class WindowPlugin extends EventEmitter {
  constructor(config) {
    super()
    this.config  = config
    this.lastApp = null
  }

  getActiveWindow() {
    try {
      const ps = `
        Add-Type @"
        using System; using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h,out int p);
        }
"@
        $h=$([Win32]::GetForegroundWindow()); $p=0
        [Win32]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null
        $proc=Get-Process -Id $p -EA SilentlyContinue
        if($proc){Write-Output($proc.Name+'|'+$proc.MainWindowTitle)}
      `
      // The issue was compressing the here-string into a single line.
      // Here-strings in PowerShell must maintain their multi-line format with literal newlines.
      // We convert it to a base64 encoded command to avoid syntax/escaping issues entirely.
      const encodedCommand = Buffer.from(ps, 'utf16le').toString('base64');

      const r = execSync(
        `powershell -NoProfile -NonInteractive -EncodedCommand ${encodedCommand}`,
        { timeout: 4000, encoding: 'utf8' }
      ).trim()
      
      if (!r) return null
      const [name, title] = r.split('|')
      return { name: name.toLowerCase(), title: title||'' }
    } catch(e) { return null }
  }

  getLabel(name) {
    const map = {
      'code':'VS Code','devenv':'Visual Studio','cursor':'Cursor',
      'chrome':'Chrome','msedge':'Edge','firefox':'Firefox',
      'teams':'Microsoft Teams','slack':'Slack','zoom':'Zoom',
      'outlook':'Outlook','winword':'Word','excel':'Excel',
      'powerpnt':'PowerPoint','onenote':'OneNote',
      'powershell':'PowerShell','windowsterminal':'Terminal','cmd':'Command Prompt',
      'notepad':'Notepad','mstsc':'Remote Desktop',
      'postman':'Postman','dbeaver':'DBeaver','azuredatastudio':'Azure Data Studio',
      'rider':'Rider','idea':'IntelliJ','pycharm':'PyCharm','webstorm':'WebStorm'
    }
    for (const k of Object.keys(map)) if (name.includes(k)) return map[k]
    return null
  }

  getContextPrompt(label, title) {
    const tips = {
      'VS Code':        `${title ? `Working on "${title}". ` : ''}Sharp VS Code tip. Max 12 words.`,
      'Visual Studio':  `Visual Studio is open. Useful tip or shortcut. Max 12 words.`,
      'Cursor':         `Cursor AI editor open. Witty tip. Max 12 words.`,
      'Chrome':         `Too many tabs probably. Witty focus nudge. Max 12 words.`,
      'Edge':           `Edge open. Productivity tip. Max 12 words.`,
      'Microsoft Teams':`Teams open. Witty Teams tip or meeting remark. Max 12 words.`,
      'Slack':          `Slack open. Witty messaging or focus tip. Max 12 words.`,
      'Outlook':        `Outlook open. Witty email tip. Max 12 words.`,
      'Excel':          `Excel open${title ? ` — ${title}` : ''}. Clever shortcut or formula tip. Max 12 words.`,
      'Word':           `Word open. Witty writing or formatting tip. Max 12 words.`,
      'PowerPoint':     `PowerPoint open. Witty presentation tip. Max 12 words.`,
      'PowerShell':     `PowerShell open. Witty dev tip or encouragement. Max 12 words.`,
      'Terminal':       `Terminal open. Witty command-line tip. Max 12 words.`,
      'Notepad':        `Notepad instead of a proper editor. Gentle roast. Max 12 words.`,
      'Remote Desktop': `Remote Desktop open. Witty remark — hope it cooperates. Max 12 words.`,
      'Zoom':           `Zoom open. Witty meeting tip — mute check perhaps. Max 12 words.`,
      'Postman':        `Postman open. Witty API testing tip. Max 12 words.`
    }
    return tips[label] || `Switched to ${label}. Witty contextual tip. Max 12 words.`
  }

  start() {
    const ms = (this.config.plugins?.window?.pollIntervalSecs || 15) * 1000
    setInterval(() => {
      const win = this.getActiveWindow()
      if (!win) return
      const label = this.getLabel(win.name)
      if (!label || win.name === this.lastApp) return
      this.lastApp = win.name
      this.emit('event', {
        type:'APP_CONTEXT', app:label, title:win.title,
        contextPrompt: this.getContextPrompt(label, win.title),
        message:`Switched to ${label}.`
      })
    }, ms)
    console.log('[WindowPlugin] started')
  }
}

module.exports = WindowPlugin