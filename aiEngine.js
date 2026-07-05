require('dotenv').config()
const Anthropic = require('@anthropic-ai/sdk')
const fs   = require('fs')
const path = require('path')
const os   = require('os')

// ── config ─────────────────────────────────────────────────────────────────
function loadConfig() {
  const p1 = path.join(process.env.APPDATA || os.homedir(), 'Buddy', 'config.json')
  const p2 = path.join(__dirname, 'config.json')
  return JSON.parse(fs.readFileSync(fs.existsSync(p1) ? p1 : p2, 'utf8'))
}

const config       = loadConfig()
const DISPLAY_NAME = config.buddy.userName || os.userInfo().username
const USER_ROLE    = config.buddy.userRole || 'Professional'

// ── locale → language ──────────────────────────────────────────────────────
let detectedLocale = 'en-US'
const LOCALE_LANG  = {
  hi:'Hindi', ja:'Japanese', ko:'Korean', 'zh-CN':'Chinese (Simplified)',
  'zh-TW':'Chinese (Traditional)', fr:'French', de:'German', es:'Spanish',
  pt:'Portuguese', ar:'Arabic', ru:'Russian', it:'Italian', nl:'Dutch',
  tr:'Turkish', pl:'Polish', sv:'Swedish', da:'Danish', fi:'Finnish',
  nb:'Norwegian', th:'Thai', vi:'Vietnamese', id:'Indonesian', ms:'Malay',
  uk:'Ukrainian', he:'Hebrew', cs:'Czech', sk:'Slovak', ro:'Romanian',
  hu:'Hungarian'
}

function setLocale(locale) { detectedLocale = locale }

function getLanguage() {
  const override = config.buddy.language
  if (override && override !== 'auto') return override
  const full = LOCALE_LANG[detectedLocale]
  if (full) return full
  const lang = detectedLocale.split('-')[0]
  return LOCALE_LANG[lang] || 'English'
}

// ── personality by time ────────────────────────────────────────────────────
function getPersonality() {
  const h = new Date().getHours()
  if (h >= 6  && h < 9)  return 'warm and energising — start of day vibes'
  if (h >= 9  && h < 12) return 'sharp and focused — peak productivity mode'
  if (h >= 12 && h < 14) return 'relaxed and slightly humorous — post-lunch ease'
  if (h >= 14 && h < 17) return 'deadpan and dry — afternoon grind'
  if (h >= 17 && h < 20) return 'friendly and winding down — end of day'
  return 'casual and off-duty — after hours'
}

// ── client ─────────────────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── logging ────────────────────────────────────────────────────────────────
function getLogPath() {
  return config._logPath || path.join(process.env.APPDATA || os.homedir(), 'Buddy', 'buddy.log')
}

function log(entry) {
  const line = `[${new Date().toISOString()}] ${entry}\n`
  try { fs.appendFileSync(getLogPath(), line, { encoding: 'utf8' }) } catch(e) {}
  process.stdout.write(line)
}

// ── system prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt() {
  const lang        = getLanguage()
  const personality = getPersonality()
  const langNote    = lang === 'English' ? '' : `\n- LANGUAGE: Respond in ${lang}. Keep numbers and technical terms in their original form.`
  return `
You are Buddy — a tiny astronaut living on ${DISPLAY_NAME}'s taskbar.
${DISPLAY_NAME} is a ${USER_ROLE}.

PERSONALITY: ${personality}

STRICT RULES — zero exceptions:
- ONE sentence only. Maximum 12 words. Complete the thought. Never truncate.
- No emojis. No "I am an AI." No robotic self-reference.
- For system stats: always include the exact real numbers provided.
- Be accurate. Never invent data. Only state facts you were given.
- Rotate tone: deadpan / cheeky / warm / encouraging based on personality.
- Micro-actionable nudges where relevant.${langNote}
`
}

// ── main generate ──────────────────────────────────────────────────────────
async function generateMessage(eventType, context) {
  const prompt = buildPrompt(eventType, context)
  const t0     = Date.now()

  log('----------------------------------------')
  log(`EVENT   : ${eventType}`)
  log(`CONTEXT : ${JSON.stringify(context)}`)
  log(`LANG    : ${getLanguage()}`)
  log(`PERSONA : ${getPersonality()}`)
  log(`PROMPT  : ${prompt}`)

  try {
    const res = await client.messages.create({
      model:    'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system:   buildSystemPrompt(),
      messages: [{ role: 'user', content: prompt }]
    })
    const latency = Date.now() - t0
    const msg     = res.content[0].text.trim()
    const { input_tokens: it, output_tokens: ot } = res.usage
    log(`SOURCE  : CLAUDE API`)
    log(`REPLY   : ${msg}`)
    log(`TOKENS  : in=${it} out=${ot} total=${it+ot}`)
    log(`LATENCY : ${latency}ms`)
    return msg
  } catch(err) {
    log(`SOURCE  : FALLBACK (${err.message})`)
    const msg = fallback(eventType, context)
    log(`REPLY   : ${msg}`)
    return msg
  }
}

// ── prompts ────────────────────────────────────────────────────────────────
function buildPrompt(type, ctx) {
  const h  = new Date().getHours()
  const td = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'

  switch(type) {
    case 'STARTUP':
      return `Greet ${DISPLAY_NAME} to start their ${td}. Warm, witty. Under 12 words.`
    case 'CPU_SPIKE':
      return `CPU just hit ${ctx.cpu}%. ${td}. Witty warning with the exact number.`
    case 'RAM_SPIKE':
      return `RAM at ${ctx.ram}% (${ctx.ramGB}/${ctx.totalGB} GB used). ${td}. Witty accurate warning.`
    case 'SYSTEM_STATS':
      return `CPU ${ctx.cpu}%, RAM ${ctx.ramGB}/${ctx.totalGB} GB. ${td}. Casual status — include real numbers.`
    case 'MEETING_SOON':
      return `"${ctx.subject}" starts in ${ctx.minutesAway} mins. ${td}. Witty heads-up.`
    case 'NEW_EMAIL':
      return `Email from ${ctx.from}: "${ctx.subject}". ${td}. Witty nudge to check it.`
    case 'NEW_TEAMS_MESSAGE':
      return `Teams message from ${ctx.from}: "${ctx.preview}". ${td}. Witty nudge.`
    case 'SHIFT_WARNING':
      return `${ctx.subtype}: ${ctx.minsLeft} mins left in shift. ${td}. Witty and accurate.`
    case 'HEALTH_NUDGE':
      return `${ctx.subtype} reminder. ${td}. Witty genuinely useful health nudge.`
    case 'APP_CONTEXT':
      return ctx.contextPrompt || `Switched to ${ctx.app}. ${td}. Witty useful tip. Max 12 words.`
    case 'CUSTOM_MESSAGE':
      return `Rewrite in Buddy's voice (max 12 words): "${ctx.message}"`
    case 'IDLE':
      return `${DISPLAY_NAME} hasn't been notified a while. ${td}. Random witty useful remark.`
    case 'JOKE':
      return `One clever original office-safe joke for ${DISPLAY_NAME}. One sentence. Not a dad joke.`
    case 'CLICK_INTERACTION':
      return `${DISPLAY_NAME} just clicked on you (the astronaut). ${td}. Witty surprised/annoyed reaction. Max 12 words.`
    case 'DRAG_INTERACTION':
      return `${DISPLAY_NAME} just dragged you to a new spot. ${td}. Witty reaction to being moved. Max 12 words.`
    default:
      return `Witty helpful remark for ${DISPLAY_NAME}. ${td}.`
  }
}

// ── fallback pools ─────────────────────────────────────────────────────────
const POOLS = {
  CLICK_INTERACTION: [
    'Hey! Personal space, please.',
    'Ouch. Rude.',
    'You rang?',
    'I was mid-patrol.',
    'Yes, I am real. Stop testing.',
    'Click noted. Underwhelmed.',
    'That tickled. Weirdly.',
    'Do you need something?'
  ],
  DRAG_INTERACTION: [
    'I have legs, you know.',
    'Put me down.',
    'Not a widget!',
    'This is undignified.',
    'Fine. New spot. Happy?',
    'I go where I please.',
    'Respect the astronaut.',
    'At least warn me next time.'
  ],
  IDLE: [
    'Still here. Staring into the void with you.',
    'Did you drink water today?',
    'Five-minute break. Seriously.',
    'Inbox is suspiciously quiet.',
    'Alt+Tab is a lifestyle.',
    'I have counted all the pixels. Twice.',
    'Save your work. Just saying.',
    'Is this what retirement feels like?'
  ],
  JOKE: [
    'Why do developers prefer dark mode? Light attracts bugs.',
    'I told my laptop to stop. It kept running.',
    'Git blame: a love language.',
    'Meetings: where good ideas go to die slowly.',
    '404: motivation not found — restarting.'
  ]
}

function fallback(type, ctx) {
  if (POOLS[type]) {
    return POOLS[type][Math.floor(Math.random() * POOLS[type].length)]
  }
  const f = {
    STARTUP:          `Hello, ${DISPLAY_NAME}. Ready when you are.`,
    CPU_SPIKE:        `CPU at ${ctx.cpu || '?'}% — something is eating your machine.`,
    RAM_SPIKE:        `RAM at ${ctx.ram || '?'}% (${ctx.ramGB || '?'} GB) — close some tabs.`,
    SYSTEM_STATS:     `CPU ${ctx.cpu || '?'}%  |  RAM ${ctx.ramGB || '?'}/${ctx.totalGB || '?'} GB`,
    MEETING_SOON:     `${ctx.subject || 'Meeting'} in ${ctx.minutesAway || '?'} mins. Wrap up.`,
    NEW_EMAIL:        `Email from ${ctx.from || 'someone'} waiting.`,
    NEW_TEAMS_MESSAGE:`Teams message from ${ctx.from || 'someone'} — unread.`,
    SHIFT_WARNING:    `${ctx.minsLeft || 0} minutes left in shift.`,
    HEALTH_NUDGE:     `Time for a ${(ctx.subtype || 'health').toLowerCase()} break.`,
    APP_CONTEXT:      `Switched to ${ctx.app || 'new app'}. Stay focused.`,
    CUSTOM_MESSAGE:   ctx.message || 'Scheduled reminder.'
  }
  return f[type] || 'Something happened. Check the logs.'
}

module.exports = { generateMessage, setLocale }