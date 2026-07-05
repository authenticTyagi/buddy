const { EventEmitter } = require('events')

class TeamsPlugin extends EventEmitter {
  constructor(config) {
    super()
    this.config      = config
    this.accessToken = null
    this.tokenExpiry = null
    this.seenMsgs    = new Set()
  }

  async getToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken
    if (!process.env.AZURE_CLIENT_ID) return null
    try {
      const msal   = require('@azure/msal-node')
      const client = new msal.ConfidentialClientApplication({
        auth: {
          clientId:     process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          authority:    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
        }
      })
      const r = await client.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default']
      })
      this.accessToken = r.accessToken
      this.tokenExpiry = Date.now() + r.expiresIn * 1000 - 60000
      return this.accessToken
    } catch(e) {
      console.error('[TeamsPlugin] token error:', e.message)
      return null
    }
  }

  async graphGet(ep) {
    const token = await this.getToken()
    if (!token) return null
    const fetch = require('node-fetch')
    try {
      const r = await fetch(`https://graph.microsoft.com/v1.0${ep}`, {
        headers: { Authorization:`Bearer ${token}` }
      })
      return r.ok ? r.json() : null
    } catch(e) { return null }
  }

  async checkMessages() {
    if (!this.config.showUnreadMessages) return
    const data = await this.graphGet(
      '/me/chats?$expand=messages($top=3)&$filter=unreadMessageCount gt 0'
    )
    if (!data?.value) return
    for (const chat of data.value) {
      if (!chat.messages) continue
      for (const msg of chat.messages) {
        if (this.seenMsgs.has(msg.id)) continue
        if (msg.messageType !== 'message') continue
        this.seenMsgs.add(msg.id)
        const from    = msg.from?.user?.displayName || 'Someone'
        const preview = (msg.body?.content||'').replace(/<[^>]*>/g,'').slice(0,55)
        this.emit('event', { type:'NEW_TEAMS_MESSAGE', from, preview,
          chatId:msg.chatId, message:`Teams: ${from} — "${preview}"` })
      }
    }
  }

  async start() {
    if (!process.env.AZURE_CLIENT_ID) {
      console.log('[TeamsPlugin] skipped — AZURE_CLIENT_ID not set')
      return
    }
    await this.checkMessages()
    setInterval(() => this.checkMessages(), this.config.pollIntervalSecs * 1000)
    console.log('[TeamsPlugin] started')
  }
}

module.exports = TeamsPlugin