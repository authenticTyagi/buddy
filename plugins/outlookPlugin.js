const { EventEmitter } = require('events')

class OutlookPlugin extends EventEmitter {
  constructor(config) {
    super()
    this.config       = config
    this.accessToken  = null
    this.tokenExpiry  = null
    this.seenItems    = new Set()
    this.lastEmailId  = null
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
      console.error('[OutlookPlugin] token error:', e.message)
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

  async checkMeetings() {
    const now  = new Date()
    const soon = new Date(now.getTime() + this.config.meetingAlertMins * 60000)
    const data = await this.graphGet(
      `/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${soon.toISOString()}&$select=id,subject,start,organizer&$orderby=start/dateTime`
    )
    if (!data?.value) return
    data.value.forEach(ev => {
      if (this.seenItems.has('mtg_'+ev.id)) return
      this.seenItems.add('mtg_'+ev.id)
      const mins = Math.round((new Date(ev.start.dateTime+'Z') - now) / 60000)
      this.emit('event', { type:'MEETING_SOON', subject:ev.subject||'Meeting',
        minutesAway:mins, organizer:ev.organizer?.emailAddress?.name||'',
        message:`${ev.subject} in ${mins} mins` })
    })
  }

  async checkEmails() {
    if (!this.config.showNewEmails) return
    const data = await this.graphGet(
      `/me/mailFolders/inbox/messages?$filter=isRead eq false&$select=id,subject,from,receivedDateTime&$top=5&$orderby=receivedDateTime desc`
    )
    if (!data?.value?.length) return
    const latest = data.value[0]
    if (latest.id === this.lastEmailId) return
    this.lastEmailId = latest.id
    this.emit('event', { type:'NEW_EMAIL',
      subject: latest.subject || '(no subject)',
      from:    latest.from?.emailAddress?.name || 'Someone',
      count:   data.value.length,
      message: `Email from ${latest.from?.emailAddress?.name}` })
  }

  async checkTodaysCalendar() {
    const now = new Date()
    const s   = new Date(now); s.setHours(0,0,0,0)
    const e   = new Date(now); e.setHours(23,59,59,999)
    const data = await this.graphGet(
      `/me/calendarView?startDateTime=${s.toISOString()}&endDateTime=${e.toISOString()}&$select=subject,start&$orderby=start/dateTime`
    )
    if (!data?.value?.length) return
    const count    = data.value.length
    const subjects = data.value.slice(0,3).map(ev=>ev.subject).join(', ')
    this.emit('event', { type:'IDLE',
      message:`You have ${count} meeting${count>1?'s':''} today: ${subjects}.` })
  }

  async poll() {
    await Promise.all([ this.checkMeetings(), this.checkEmails() ])
  }

  async start() {
    if (!process.env.AZURE_CLIENT_ID) {
      console.log('[OutlookPlugin] skipped — AZURE_CLIENT_ID not set')
      return
    }
    await this.checkTodaysCalendar()
    await this.poll()
    setInterval(() => this.poll(), this.config.pollIntervalSecs * 1000)
    console.log('[OutlookPlugin] started')
  }
}

module.exports = OutlookPlugin