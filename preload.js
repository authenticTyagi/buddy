// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    const validChannels = [
      'locale-detected', 'move-window', 'drag-window', 'show-bubble', 
      'hide-bubble', 'buddy-clicked', 'buddy-dragged', 'setup-complete', 
      'open-link', 'request-display-bounds'
    ]
    if (validChannels.includes(channel)) ipcRenderer.send(channel, data)
  },
  on: (channel, func) => {
    const validChannels = [
      'set-mood', 'force-bubble', 'set-size', 'drag-position-update', 
      'screen-info', 'update-display-bounds'
    ]
    if (validChannels.includes(channel)) ipcRenderer.on(channel, (event, ...args) => func(event, ...args))
  }
})