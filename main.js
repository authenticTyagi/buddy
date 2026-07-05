// main.js
require('dotenv').config()
const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, shell } = require('electron')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

app.disableHardwareAcceleration() 

let buddyWin, bubbleWin, tray, setupWin
let currentSize = 'medium'

const SIZES = {
  small:  { w: 40,  h: 66  },
  medium: { w: 60,  h: 100 },
  large:  { w: 90,  h: 150 }
}

function getBuddyDir() {
  const base = process.env.APPDATA || os.homedir()
  return path.join(base, 'Buddy')
}
function getEnvPath()    { return path.join(getBuddyDir(), '.env') }
function getConfigPath() { return path.join(getBuddyDir(), 'config.json') }
function getLogPath()    { return path.join(getBuddyDir(), 'buddy.log') }

function ensureUserDirs() {
  const dir = getBuddyDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  
  const userCfg = getConfigPath()
  if (!fs.existsSync(userCfg)) {
    const src = path.join(__dirname, 'config.json')
    if (fs.existsSync(src)) fs.copyFileSync(src, userCfg)
  }
}

function loadUserEnv() {
  const p = getEnvPath()
  if (fs.existsSync(p)) require('dotenv').config({ path: p, override: true })
}

function isFirstRun() {
  const p = getEnvPath()
  if (!fs.existsSync(p)) return true
  try {
    const c = fs.readFileSync(p, 'utf8')
    return !c.includes('ANTHROPIC_API_KEY=sk-ant-') && !c.includes('GEMINI_API_KEY=')
  } catch (e) {
    return true
  }
}

function ensureIcon() {
  const iconDir = path.join(__dirname, 'assets')
  const iconPath = path.join(iconDir, 'icon.png')
  
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true })
  }
  
  if (!fs.existsSync(iconPath)) {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAi0lEQVQ4y2NgGAWDB/wnwP+nBJihgBEoZoSHAUaqGBgYGBgpYcDAwED///9nIEQzKSmJgYGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgWEQAADgIgFiAi8XiAAAAABJRU5ErkJggg==',
      'base64'
    )
    fs.writeFileSync(iconPath, png)
  }
  return iconPath
}

function createBuddyWindow() {
  const { height } = screen.getPrimaryDisplay().workAreaSize
  const sz = SIZES[currentSize] || SIZES['medium']

  buddyWin = new BrowserWindow({
    width: sz.w, height: sz.h,
    x: 100, y: height - sz.h,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    resizable: false, hasShadow: false,
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  buddyWin.loadFile('buddy.html')
  buddyWin.setAlwaysOnTop(true, 'screen-saver')
  buddyWin.setIgnoreMouseEvents(false)
}

function createBubbleWindow() {
  bubbleWin = new BrowserWindow({
    width: 280, height: 90,
    x: 100, y: 100,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    resizable: false, hasShadow: false,
    show: false,
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  bubbleWin.loadFile('bubble.html')
  bubbleWin.setAlwaysOnTop(true, 'screen-saver')
  bubbleWin.setIgnoreMouseEvents(true)
}

function createSetupWindow() {
  setupWin = new BrowserWindow({
    width: 560, height: 700,
    center: true, resizable: false,
    frame: true, title: 'Buddy — Setup',
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  setupWin.loadFile('setup.html')
  setupWin.setMenuBarVisibility(false)
}

function createTray() {
  const iconPath = ensureIcon()
  const img = nativeImage.createFromPath(iconPath)
  tray = new Tray(img)
  rebuildTrayMenu()
  tray.setToolTip('Buddy')
}

function rebuildTrayMenu() {
  const menu = Menu.buildFromTemplate([
    { label: 'Buddy', enabled: false },
    { type: 'separator' },
    { label: 'Show',  click: () => buddyWin && buddyWin.show() },
    { label: 'Hide',  click: () => buddyWin && buddyWin.hide() },
    { type: 'separator' },
    {
      label: 'Size', submenu: [
        { label: 'Small',  type: 'radio', checked: currentSize === 'small',  click: () => resizeBuddy('small')  },
        { label: 'Medium', type: 'radio', checked: currentSize === 'medium', click: () => resizeBuddy('medium') },
        { label: 'Large',  type: 'radio', checked: currentSize === 'large',  click: () => resizeBuddy('large')  }
      ]
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setContextMenu(menu)
}

function resizeBuddy(size) {
  if (!SIZES[size]) return
  currentSize = size
  if (!buddyWin) return
  
  const { height } = screen.getPrimaryDisplay().workAreaSize
  const sz = SIZES[size]
  const bounds = buddyWin.getBounds()
  
  buddyWin.setBounds({ x: bounds.x, y: height - sz.h, width: sz.w, height: sz.h })
  buddyWin.webContents.send('set-size', size)
  rebuildTrayMenu()
  
  try {
    const cfgPath = getConfigPath()
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      cfg.buddy = cfg.buddy || {}
      cfg.buddy.size = size
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
    }
  } catch(e) {}
}

let bubbleVisible = false

ipcMain.on('move-window', (e, { x }) => {
  if (!buddyWin) return
  const { height } = screen.getPrimaryDisplay().workAreaSize
  const sz = SIZES[currentSize] || SIZES['medium']
  
  buddyWin.setBounds({ x, y: height - sz.h, width: sz.w, height: sz.h })
  
  if (bubbleVisible && bubbleWin) {
    const totalW = screen.getPrimaryDisplay().bounds.width
    const bw = 280
    const bx = Math.min(Math.max(x - 110, 0), totalW - bw)
    bubbleWin.setBounds({ x: bx, y: height - sz.h - 90, width: bw, height: 90 })
  }
})

ipcMain.on('request-display-bounds', (event) => {
  if (buddyWin) {
    buddyWin.webContents.send('update-display-bounds', screen.getPrimaryDisplay().bounds);
  }
});

ipcMain.on('drag-window', (e, { x, y }) => {
  if (!buddyWin) return
  const { width: sw, height: sh } = screen.getPrimaryDisplay().bounds
  const sz = SIZES[currentSize] || SIZES['medium']
  
  const clampedX = Math.min(Math.max(x, 0), sw - sz.w)
  const clampedY = Math.min(Math.max(y, 0), sh - sz.h)
  buddyWin.setPosition(clampedX, clampedY)
  
  if (buddyWin) buddyWin.webContents.send('drag-position-update', { x: clampedX })
})

ipcMain.on('show-bubble', (e, { x, text }) => {
  if (!bubbleWin) return
  const { height } = screen.getPrimaryDisplay().workAreaSize
  const sz = SIZES[currentSize] || SIZES['medium']
  const totalW = screen.getPrimaryDisplay().bounds.width
  const bw = 280
  const bx = Math.min(Math.max(x - 110, 0), totalW - bw)
  const by = height - sz.h - 90
  
  bubbleWin.setBounds({ x: bx, y: by, width: bw, height: 90 })
  bubbleWin.webContents.send('set-text', text)
  bubbleWin.show()
  bubbleVisible = true
})

ipcMain.on('hide-bubble', () => {
  if (!bubbleWin) return
  bubbleWin.hide()
  bubbleVisible = false
})

ipcMain.on('locale-detected', (e, locale) => {
  try {
    const { setLocale } = require('./aiEngine')
    setLocale(locale)
  } catch(ex) {}
})

ipcMain.on('buddy-clicked', (e, { x, locale }) => {
  if (!buddyWin || !bubbleWin) return
  const { generateMessage, setLocale } = require('./aiEngine')
  setLocale(locale)
  generateMessage('CLICK_INTERACTION', { locale }).then(msg => {
    showBubbleFromMain(msg, 'neutral', 4000)
  }).catch(err => {})
})

ipcMain.on('buddy-dragged', (e, { x, locale }) => {
  if (!buddyWin || !bubbleWin) return
  const { generateMessage, setLocale } = require('./aiEngine')
  setLocale(locale)
  generateMessage('DRAG_INTERACTION', { locale }).then(msg => {
    showBubbleFromMain(msg, 'neutral', 3500)
  }).catch(err => {})
})

ipcMain.on('open-link', (e, url) => shell.openExternal(url))

ipcMain.on('setup-complete', (e, data) => {
  const envPath = getEnvPath()
  let env = `GEMINI_API_KEY=${data.apiKey}\n`
  if (data.clientId)     env += `AZURE_CLIENT_ID=${data.clientId}\n`
  if (data.tenantId)     env += `AZURE_TENANT_ID=${data.tenantId}\n`
  if (data.clientSecret) env += `AZURE_CLIENT_SECRET=${data.clientSecret}\n`
  fs.writeFileSync(envPath, env, 'utf8')

  try {
    const cfgPath = getConfigPath()
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      cfg.buddy = cfg.buddy || {}
      cfg.buddy.userName = data.userName || 'Friend'
      cfg.buddy.userRole = data.userRole || 'Professional'
      
      if (data.clientId) {
        cfg.plugins = cfg.plugins || {}
        cfg.plugins.outlook = cfg.plugins.outlook || {}
        cfg.plugins.teams = cfg.plugins.teams || {}
        cfg.plugins.outlook.enabled = true
        cfg.plugins.teams.enabled   = true
      }
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
    }
  } catch(e) {}

  if (setupWin) { setupWin.close(); setupWin = null }
  loadUserEnv()
  launchBuddy()
})

function showBubbleFromMain(message, mood, duration) {
  if (!buddyWin || !bubbleWin) return
  buddyWin.webContents.send('set-mood', mood)
  buddyWin.webContents.send('force-bubble', { text: message, duration })
  setTimeout(() => {
    if (buddyWin) buddyWin.webContents.send('set-mood', 'neutral')
  }, duration)
}

function startPlugins() {
  try {
    const PluginManager = require('./plugins/pluginManager')
    const TriggerEngine = require('./triggerEngine')

    const cfgPath = fs.existsSync(getConfigPath()) ? getConfigPath() : path.join(__dirname, 'config.json')
    const config  = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    config._logPath = getLogPath()

    currentSize = config?.buddy?.size || 'medium'

    const pm = new PluginManager(config)
    const te = new TriggerEngine(config)

    pm.load()
    te.attach(pm)

    te.on('show', ({ message, mood, duration }) => {
      showBubbleFromMain(message, mood || 'neutral', duration || 6000)
    })

    pm.startAll()
  } catch (err) {}
}

function launchBuddy() {
  createBuddyWindow()
  createBubbleWindow()
  createTray()
  
  buddyWin.webContents.on('did-finish-load', () => {
    const { width } = screen.getPrimaryDisplay().workAreaSize
    buddyWin.webContents.send('screen-info', { width })
  
    setTimeout(() => {
      try {
        const cfgPath = fs.existsSync(getConfigPath()) ? getConfigPath() : path.join(__dirname, 'config.json')
        const cfg  = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
        const name = cfg?.buddy?.userName || 'there'
        const h    = new Date().getHours()
        const g    = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
        
        showBubbleFromMain(`${g}, ${name}! I am on duty. Let us make today count.`, 'happy', 5000)
      } catch (e) {
        showBubbleFromMain(`Hello! I am on duty. Let us make today count.`, 'happy', 5000)
      }
    }, 1500)
    
    startPlugins()
  })
}

app.whenReady().then(() => {
  ensureUserDirs()
  loadUserEnv()
  if (isFirstRun()) {
    createSetupWindow()
  } else {
    launchBuddy()
  }
})

app.on('window-all-closed', (e) => e.preventDefault())