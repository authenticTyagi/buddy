# 🔌 Buddy Plugin System

Buddy uses an event-driven plugin architecture. Each plugin is an independent Node.js class that emits events onto the shared event bus.

---

## How Plugins Work

```
Plugin → emits event → PluginManager → TriggerEngine → Claude AI → Buddy bubble
```

Every plugin:
1. Extends `EventEmitter`
2. Has a `start()` method
3. Emits `event` objects with a `type` field

---

## Writing Your Own Plugin

Create `plugins/myPlugin.js`:

```javascript
const { EventEmitter } = require('events')

class MyPlugin extends EventEmitter {
  constructor(config) {
    super()
    this.config = config
  }

  start() {
    // fire every 5 minutes
    setInterval(() => {
      this.emit('event', {
        type: 'CUSTOM_MESSAGE',
        message: 'Your custom message here'
      })
    }, 5 * 60 * 1000)

    console.log('[MyPlugin] started')
  }
}

module.exports = MyPlugin
```

Register it in `pluginManager.js`:

```javascript
const MyPlugin = require('./myPlugin')
// inside load():
this.register(new MyPlugin(this.config), 'MyPlugin')
```

---

## Event Types

| Type | Tier | Description |
|---|---|---|
| `STARTUP` | 0 | Once on launch |
| `MEETING_SOON` | 1 | Meeting starting soon |
| `CPU_SPIKE` | 1 | CPU over threshold |
| `RAM_SPIKE` | 1 | RAM over threshold |
| `NEW_TEAMS_MESSAGE` | 2 | Unread Teams message |
| `NEW_EMAIL` | 2 | New email in inbox |
| `SHIFT_WARNING` | 2 | Shift start/end/warning |
| `APP_CONTEXT` | 3 | Active app changed |
| `HEALTH_NUDGE` | 3 | Health reminder |
| `CUSTOM_MESSAGE` | 3 | Scheduled custom message |
| `IDLE` | 4 | Nothing happening |
| `JOKE` | 4 | Random joke |
| `SYSTEM_STATS` | 4 | Periodic system status |

Lower tier number = higher priority.

---

## Azure Setup (Outlook + Teams)

1. Go to https://portal.azure.com → App registrations → New registration
2. Name: `Buddy Desktop`
3. Add permissions: `Calendars.Read`, `Mail.Read`, `User.Read`, `Chat.Read`
4. Create client secret
5. Add to `.env`:
```
AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
AZURE_CLIENT_SECRET=...
```
6. Set `plugins.outlook.enabled: true` and/or `plugins.teams.enabled: true` in `config.json`