// buddy.js
const canvas = document.getElementById('bc')
const ctx    = canvas.getContext('2d')

const SIZES = { small: { w:40, h:66 }, medium: { w:60, h:100 }, large: { w:90, h:150 } }
let currentSize = 'medium'

function applySize(size) {
  if (!SIZES[size]) return
  currentSize = size
  canvas.width  = SIZES[size].w
  canvas.height = SIZES[size].h
}

function S(v) {
  const sz = SIZES[currentSize] || SIZES.medium
  return v * sz.h / 100
}

function roundRect(x, y, w, h, r) {
  r = Math.min(Math.abs(r || 0), Math.abs(w) / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x,     y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x,     y,     x + r, y,         r)
  ctx.closePath()
}

const C = {
  suitMain:     '#E2E2E2', suitLight:    '#F4F4F4', suitShadow:   '#C0C0C0', suitJoint:    '#AFAFAF',
  helmet:       '#EBEBEB', visor:        '#0d1b3e', visorRim:     '#8899bb', visorGlow:    'rgba(80,150,255,0.35)',
  glove:        '#777777', boot:         '#505050', antenna:      '#bbbbbb', antennaLight: '#FF8C00',
  backpack:     '#888888', panelBg:      '#C8C8C8', dot0:         '#ff3c3c', dot1:         '#3ddd3d',
  dot2:         '#3388ff', shadow:       'rgba(0,0,0,0.13)', zColor:       'rgba(110,160,255,0.8)', sweat:        '#5bb8ff'
}

let tick = 0, frameCount = 0
let px = 80, dir = 1
let mood = 'neutral'
let isSitting = false, boredTick = 0
let currentAnim = null, animTick = 0
let nextAnimIn = rndInterval(30000, 60000)

let screenW = window.screen.availWidth || window.screen.width || 1920

let dragging = false, dragMoved = false
let dragStartClient = { x:0, y:0 }
let dragOffsetScreen = { x:0, y:0 }

let userLocale = 'en-US'
try {
  userLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US'
  window.api.send('locale-detected', userLocale)
} catch(e) {}

function rndInterval(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

function drawFace(cx, cy, m) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, S(10.5), 0.2, Math.PI - 0.2)
  ctx.clip()
  const ey = cy - S(1)
  if (m === 'happy') {
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = S(1.4); ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx-S(4.5),ey); ctx.quadraticCurveTo(cx-S(2.5),ey-S(2.5),cx-S(0.5),ey); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx+S(0.5),ey); ctx.quadraticCurveTo(cx+S(2.5),ey-S(2.5),cx+S(4.5),ey); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy+S(2.5), S(2.8), 0.15, Math.PI-0.15); ctx.stroke()
  } else if (m === 'surprise') {
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = S(1.3)
    ctx.beginPath(); ctx.arc(cx-S(3), ey, S(2.2), 0, Math.PI*2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx+S(3), ey, S(2.2), 0, Math.PI*2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy+S(3), S(1.8), 0, Math.PI*2)
    ctx.fillStyle = '#6a1a10'; ctx.fill()
  } else if (m === 'bored') {
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillRect(cx-S(5), ey-S(0.6), S(3.5), S(1.2))
    ctx.fillRect(cx+S(1.5), ey-S(0.6), S(3.5), S(1.2))
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = S(1); ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx-S(2.5), cy+S(3)); ctx.lineTo(cx+S(2.5), cy+S(3)); ctx.stroke()
  } else if (m === 'tired') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = S(1.3); ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx-S(4.5),ey); ctx.quadraticCurveTo(cx-S(3),ey-S(1.5),cx-S(1.5),ey); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx+S(1.5),ey); ctx.quadraticCurveTo(cx+S(3),ey-S(1.5),cx+S(4.5),ey); ctx.stroke()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.beginPath(); ctx.arc(cx-S(3), ey, S(1.6), 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx+S(3), ey, S(1.6), 0, Math.PI*2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = S(1); ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(cx, cy+S(2.5), S(2), 0.3, Math.PI-0.3); ctx.stroke()
  }
  ctx.restore()
}

function drawHelmet(cx, cy, m) {
  ctx.fillStyle = C.helmet
  ctx.beginPath(); ctx.arc(cx, cy, S(14), 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath(); ctx.ellipse(cx-S(5), cy-S(5), S(4.5), S(2.8), -0.5, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = C.visor
  ctx.beginPath(); ctx.arc(cx, cy, S(11), 0.25, Math.PI-0.25); ctx.fill()
  ctx.strokeStyle = C.visorRim; ctx.lineWidth = S(1)
  ctx.beginPath(); ctx.arc(cx, cy, S(11.5), 0.2, Math.PI-0.2); ctx.stroke()
  ctx.strokeStyle = C.visorGlow; ctx.lineWidth = S(2)
  ctx.beginPath(); ctx.arc(cx, cy, S(10), 0.5, Math.PI*0.7); ctx.stroke()
  drawFace(cx, cy, m)
  ctx.strokeStyle = C.antenna; ctx.lineWidth = S(1.2); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx+S(8), cy-S(10)); ctx.lineTo(cx+S(11), cy-S(14)); ctx.stroke()
  ctx.fillStyle = C.antennaLight
  ctx.beginPath(); ctx.arc(cx+S(11), cy-S(14), S(2.2), 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = 'rgba(255,140,0,0.3)'
  ctx.beginPath(); ctx.arc(cx+S(11), cy-S(14), S(3.5), 0, Math.PI*2); ctx.fill()
}

function drawBody(cx, bodyY) {
  ctx.fillStyle = C.backpack
  roundRect(cx+S(9), bodyY, S(8), S(18), S(2)); ctx.fill()
  ctx.fillStyle = '#9a9a9a'
  roundRect(cx+S(10), bodyY+S(2), S(6), S(14), S(1)); ctx.fill()
  ctx.fillStyle = C.suitMain
  roundRect(cx-S(11), bodyY, S(22), S(24), S(4)); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  roundRect(cx-S(9), bodyY+S(2), S(9), S(8), S(2)); ctx.fill()
  ctx.fillStyle = C.panelBg
  roundRect(cx-S(5), bodyY+S(8), S(10), S(8), S(2)); ctx.fill(); 
  [[C.dot0,0],[C.dot1,1],[C.dot2,2]].forEach(([col,i]) => {
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(cx-S(3)+i*S(3), bodyY+S(12), S(1.4), 0, Math.PI*2); ctx.fill()
  })
  ctx.fillStyle = C.suitJoint
  roundRect(cx-S(11), bodyY+S(19), S(22), S(5), S(2)); ctx.fill()
  ctx.fillStyle = '#c8c8c8'
  roundRect(cx-S(10), bodyY+S(20), S(20), S(2), S(1)); ctx.fill()
}

function drawNeck(cx, y) {
  ctx.fillStyle = '#c0c0c0'
  roundRect(cx-S(5), y, S(10), S(5), S(2)); ctx.fill()
}

function drawArms(cx, armY, armSwing) {
  ctx.strokeStyle = C.suitLight; ctx.lineWidth = S(5.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(10),armY); ctx.quadraticCurveTo(cx-S(16),armY+S(9)+armSwing*0.3,cx-S(15),armY+S(17)+armSwing*0.4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(10),armY); ctx.quadraticCurveTo(cx+S(16),armY+S(9)-armSwing*0.3,cx+S(15),armY+S(17)-armSwing*0.4); ctx.stroke()
  ctx.fillStyle = C.glove
  ctx.beginPath(); ctx.arc(cx-S(15), armY+S(18)+armSwing*0.4, S(3.8), 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx+S(15), armY+S(18)-armSwing*0.4, S(3.8), 0, Math.PI*2); ctx.fill()
}

function drawLegs(cx, legY, legSwing) {
  ctx.strokeStyle = C.suitShadow; ctx.lineWidth = S(6.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(5),legY); ctx.quadraticCurveTo(cx-S(7)-legSwing*0.25,legY+S(12),cx-S(6)-legSwing*0.4,legY+S(22)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(5),legY); ctx.quadraticCurveTo(cx+S(7)+legSwing*0.25,legY+S(12),cx+S(6)+legSwing*0.4,legY+S(22)); ctx.stroke()
  ctx.fillStyle = C.boot
  roundRect(cx-S(12)-legSwing*0.4, legY+S(21), S(12), S(7), S(2.5)); ctx.fill()
  roundRect(cx+S(1)+legSwing*0.4,  legY+S(21), S(12), S(7), S(2.5)); ctx.fill()
}

function drawShadow(cx, h) {
  ctx.fillStyle = C.shadow
  ctx.beginPath(); ctx.ellipse(cx, h-S(2), S(10), S(2.5), 0, 0, Math.PI*2); ctx.fill()
}

function drawWalk(t, d, m) {
  const sz = SIZES[currentSize] || SIZES.medium
  ctx.clearRect(0, 0, sz.w, sz.h)
  const flip = d < 0
  if (flip) { ctx.save(); ctx.translate(sz.w,0); ctx.scale(-1,1) }
  const cx    = sz.w / 2
  const phase = t * 0.15
  const ls    = Math.sin(phase) * S(8)
  const as    = -Math.sin(phase) * S(7)
  const bob   = Math.abs(Math.sin(phase)) * S(1.5)
  drawShadow(cx, sz.h)
  drawLegs(cx, S(59)+bob, ls)
  drawBody(cx, S(35)+bob)
  drawArms(cx, S(41)+bob, as)
  drawNeck(cx, S(30)+bob)
  drawHelmet(cx, S(18)+bob, m)
  if (flip) ctx.restore()
}

function drawSit(t, m) {
  const sz = SIZES[currentSize] || SIZES.medium
  ctx.clearRect(0, 0, sz.w, sz.h)
  const cx  = sz.w / 2
  const bob = Math.sin(t * 0.025) * S(1.2)
  ctx.fillStyle = C.shadow
  ctx.beginPath(); ctx.ellipse(cx, sz.h-S(3), S(14), S(3), 0, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = C.suitShadow; ctx.lineWidth = S(6.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(4),S(62)+bob); ctx.lineTo(cx-S(20),S(75)+bob); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(4),S(62)+bob); ctx.lineTo(cx+S(20),S(75)+bob); ctx.stroke()
  ctx.fillStyle = C.boot
  roundRect(cx-S(26), S(74)+bob, S(12), S(7), S(2.5)); ctx.fill()
  roundRect(cx+S(14), S(74)+bob, S(12), S(7), S(2.5)); ctx.fill()
  drawBody(cx, S(35)+bob)
  ctx.strokeStyle = C.suitLight; ctx.lineWidth = S(5.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(10),S(44)+bob); ctx.quadraticCurveTo(cx-S(18),S(56)+bob,cx-S(18),S(68)+bob); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(10),S(44)+bob); ctx.quadraticCurveTo(cx+S(18),S(56)+bob,cx+S(18),S(68)+bob); ctx.stroke()
  ctx.fillStyle = C.glove
  ctx.beginPath(); ctx.arc(cx-S(18),S(69)+bob,S(3.8),0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx+S(18),S(69)+bob,S(3.8),0,Math.PI*2); ctx.fill()
  drawNeck(cx, S(30)+bob)
  drawHelmet(cx, S(18)+bob, m)
  if (m === 'bored' && Math.floor(boredTick/60) % 2 === 0) {
    ctx.fillStyle = C.zColor
    ctx.font = `bold ${S(8)}px sans-serif`;  ctx.fillText('z', cx+S(14), S(15)+bob)
    ctx.font = `bold ${S(10)}px sans-serif`; ctx.fillText('z', cx+S(18), S(10)+bob)
    ctx.font = `bold ${S(12)}px sans-serif`; ctx.fillText('Z', cx+S(22), S(5)+bob)
  }
}

function drawStumble(t, d, sTick, phase) {
  const sz = SIZES[currentSize] || SIZES.medium
  ctx.clearRect(0, 0, sz.w, sz.h)
  const flip = d < 0
  if (flip) { ctx.save(); ctx.translate(sz.w,0); ctx.scale(-1,1) }
  const cx   = sz.w / 2
  const tilt = phase === 'trip'
    ? Math.min(sTick*0.045, 0.55)
    : Math.sin(sTick*0.28)*(0.4*(1-sTick/30))
  ctx.save()
  ctx.translate(cx,S(82)); ctx.rotate(tilt); ctx.translate(-cx,-S(82))
  ctx.fillStyle = C.shadow
  ctx.beginPath(); ctx.ellipse(cx,sz.h-S(2),S(12),S(3),0,0,Math.PI*2); ctx.fill()
  const splay = phase === 'trip' ? sTick*0.9 : Math.sin(sTick*0.4)*5
  ctx.strokeStyle = C.suitShadow; ctx.lineWidth = S(6.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx+S(2),S(59)); ctx.lineTo(cx+S(9)+splay,S(81)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx-S(2),S(59)); ctx.lineTo(cx-S(13)-splay,S(81)); ctx.stroke()
  ctx.fillStyle = C.boot
  roundRect(cx+S(3)+splay, S(80), S(12), S(7), S(2.5)); ctx.fill()
  roundRect(cx-S(21)-splay,S(80), S(12), S(7), S(2.5)); ctx.fill()
  const flail = Math.sin(sTick*0.5)*S(14)
  ctx.strokeStyle = C.suitLight; ctx.lineWidth = S(5.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx+S(10),S(42)); ctx.lineTo(cx+S(19),S(30)-flail); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx-S(10),S(42)); ctx.lineTo(cx-S(19),S(28)+flail); ctx.stroke()
  ctx.fillStyle = C.glove
  ctx.beginPath(); ctx.arc(cx+S(19),S(29)-flail,S(3.8),0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx-S(19),S(27)+flail,S(3.8),0,Math.PI*2); ctx.fill()
  drawBody(cx, S(35))
  drawNeck(cx, S(30))
  drawHelmet(cx, S(18), phase==='trip'?'surprise':'happy')
  ctx.restore()
  if (flip) ctx.restore()
}

function drawSlide(t, d) {
  const sz = SIZES[currentSize] || SIZES.medium
  ctx.clearRect(0, 0, sz.w, sz.h)
  const flip = d < 0
  if (flip) { ctx.save(); ctx.translate(sz.w,0); ctx.scale(-1,1) }
  const cx = sz.w / 2
  ctx.save()
  ctx.translate(cx,S(85)); ctx.rotate(0.28); ctx.translate(-cx,-S(85))
  ctx.strokeStyle = 'rgba(180,180,180,0.25)'; ctx.lineWidth = S(1)
  for (let i=0;i<5;i++) {
    ctx.beginPath(); ctx.moveTo(cx-S(14),S(40+i*8)); ctx.lineTo(cx-S(14)-S(10+i*4),S(40+i*8)); ctx.stroke()
  }
  ctx.fillStyle = C.shadow
  ctx.beginPath(); ctx.ellipse(cx,sz.h-S(2),S(13),S(3),0,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle = C.suitShadow; ctx.lineWidth = S(6.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(3),S(59)); ctx.lineTo(cx-S(3),S(82)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(3),S(59)); ctx.lineTo(cx+S(5),S(82)); ctx.stroke()
  ctx.fillStyle = C.boot
  roundRect(cx-S(9),S(81),S(14),S(7),S(2.5)); ctx.fill()
  ctx.strokeStyle = C.suitLight; ctx.lineWidth = S(5.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx+S(10),S(42)); ctx.lineTo(cx-S(3),S(57)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx-S(10),S(42)); ctx.lineTo(cx-S(18),S(54)); ctx.stroke()
  ctx.fillStyle = C.glove
  ctx.beginPath(); ctx.arc(cx-S(4),S(58),S(3.8),0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx-S(18),S(55),S(3.8),0,Math.PI*2); ctx.fill()
  drawBody(cx, S(35))
  drawNeck(cx, S(30))
  drawHelmet(cx, S(18), 'happy')
  ctx.restore()
  if (flip) ctx.restore()
}

function drawFall(sTick, phase) {
  const sz = SIZES[currentSize] || SIZES.medium
  ctx.clearRect(0, 0, sz.w, sz.h)
  const cx    = sz.w / 2
  const angle = phase === 'falling'
    ? Math.min(sTick*0.075, Math.PI/2)
    : Math.max(Math.PI/2 - sTick*0.058, 0)
  ctx.save()
  ctx.translate(cx,S(68)); ctx.rotate(dir>0?angle:-angle); ctx.translate(-cx,-S(68))
  ctx.fillStyle = C.shadow
  ctx.beginPath(); ctx.ellipse(cx,sz.h-S(3),S(8+sTick*0.6),S(3),0,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle = C.suitShadow; ctx.lineWidth = S(6.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(5),S(59)); ctx.lineTo(cx-S(6),S(81)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(5),S(59)); ctx.lineTo(cx+S(6),S(81)); ctx.stroke()
  ctx.fillStyle = C.boot
  roundRect(cx-S(12),S(80),S(12),S(7),S(2.5)); ctx.fill()
  roundRect(cx+S(1), S(80),S(12),S(7),S(2.5)); ctx.fill()
  drawBody(cx, S(35))
  drawArms(cx, S(41), 0)
  drawNeck(cx, S(30))
  drawHelmet(cx, S(18), phase==='falling'?'surprise':sTick>20?'happy':'surprise')
  ctx.restore()
}

function drawTired(t) {
  const sz = SIZES[currentSize] || SIZES.medium
  ctx.clearRect(0, 0, sz.w, sz.h)
  const flip = dir < 0
  if (flip) { ctx.save(); ctx.translate(sz.w,0); ctx.scale(-1,1) }
  const cx    = sz.w / 2
  const phase = t * 0.055
  const ls    = Math.sin(phase) * S(4)
  const as    = -Math.sin(phase) * S(3)
  const bob   = Math.abs(Math.sin(phase)) * S(0.8)
  const droop = S(6)
  ctx.fillStyle = C.shadow
  ctx.beginPath(); ctx.ellipse(cx,sz.h-S(2),S(10),S(2.5),0,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle = C.suitShadow; ctx.lineWidth = S(6.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(5),S(59)+bob+droop); ctx.quadraticCurveTo(cx-S(7)-ls*0.25,S(71)+bob+droop,cx-S(6)-ls*0.4,S(81)+bob+droop); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(5),S(59)+bob+droop); ctx.quadraticCurveTo(cx+S(7)+ls*0.25,S(71)+bob+droop,cx+S(6)+ls*0.4, S(81)+bob+droop); ctx.stroke()
  ctx.fillStyle = C.boot
  roundRect(cx-S(12)-ls*0.4, S(80)+bob+droop, S(12), S(7), S(2.5)); ctx.fill()
  roundRect(cx+S(1)+ls*0.4,  S(80)+bob+droop, S(12), S(7), S(2.5)); ctx.fill()
  drawBody(cx, S(35)+bob+droop)
  ctx.strokeStyle = C.suitLight; ctx.lineWidth = S(5.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx-S(10),S(42)+bob+droop); ctx.quadraticCurveTo(cx-S(15),S(54)+as*0.3+droop,cx-S(13),S(64)+as*0.3+droop); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+S(10),S(42)+bob+droop); ctx.quadraticCurveTo(cx+S(15),S(54)-as*0.3+droop,cx+S(13),S(64)-as*0.3+droop); ctx.stroke()
  ctx.fillStyle = C.glove
  ctx.beginPath(); ctx.arc(cx-S(13),S(65)+as*0.3+droop,S(3.8),0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx+S(13),S(65)-as*0.3+droop,S(3.8),0,Math.PI*2); ctx.fill()
  drawNeck(cx, S(30)+bob+droop)
  drawHelmet(cx, S(18)+bob+droop, 'tired')
  ctx.fillStyle = C.sweat
  ctx.beginPath(); ctx.arc(cx+S(14),S(14)+bob+droop,S(2.2),0,Math.PI*2); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx+S(14),S(10)+bob+droop)
  ctx.quadraticCurveTo(cx+S(11),S(12)+bob+droop,cx+S(14),S(14)+bob+droop)
  ctx.quadraticCurveTo(cx+S(17),S(12)+bob+droop,cx+S(14),S(10)+bob+droop)
  ctx.fill()
  if (Math.floor(t/40)%2===0) {
    ctx.fillStyle = C.zColor
    ctx.font=`bold ${S(7)}px sans-serif`;  ctx.fillText('z',cx+S(16),S(13)+bob+droop)
    ctx.font=`bold ${S(9)}px sans-serif`;  ctx.fillText('z',cx+S(20),S(8)+bob+droop)
    ctx.font=`bold ${S(11)}px sans-serif`; ctx.fillText('Z',cx+S(24),S(3)+bob+droop)
  }
  if (flip) ctx.restore()
}

function drawDance(t) {
  const sz     = SIZES[currentSize] || SIZES.medium
  ctx.clearRect(0, 0, sz.w, sz.h)
  const cx     = sz.w / 2
  const bounce = Math.abs(Math.sin(t*0.18)) * S(5)
  const sway   = Math.sin(t*0.18) * S(3)
  const ls     = Math.sin(t*0.18) * S(6)
  ctx.fillStyle = C.shadow
  ctx.beginPath(); ctx.ellipse(cx,sz.h-S(2),S(10+bounce*0.3),S(2.5),0,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle = C.suitShadow; ctx.lineWidth = S(6.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx+sway-S(5),S(59)-bounce*0.3); ctx.lineTo(cx+sway-S(5)-ls*0.4,S(81)-bounce*0.3); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+sway+S(5),S(59)-bounce*0.3); ctx.lineTo(cx+sway+S(5)+ls*0.4,S(81)-bounce*0.3); ctx.stroke()
  ctx.fillStyle = C.boot
  roundRect(cx+sway-S(12)-ls*0.4, S(80)-bounce*0.3, S(12), S(7), S(2.5)); ctx.fill()
  roundRect(cx+sway+S(1)+ls*0.4,  S(80)-bounce*0.3, S(12), S(7), S(2.5)); ctx.fill()
  drawBody(cx+sway, S(35)-bounce)
  const ar = -S(8) - bounce*0.5
  ctx.strokeStyle = C.suitLight; ctx.lineWidth = S(5.5); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx+sway-S(10),S(42)-bounce); ctx.quadraticCurveTo(cx+sway-S(18),S(36)+ar,cx+sway-S(16),S(28)+ar); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+sway+S(10),S(42)-bounce); ctx.quadraticCurveTo(cx+sway+S(18),S(36)+ar,cx+sway+S(16),S(28)+ar); ctx.stroke()
  ctx.fillStyle = C.glove
  ctx.beginPath(); ctx.arc(cx+sway-S(16),S(27)+ar,S(3.8),0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx+sway+S(16),S(27)+ar,S(3.8),0,Math.PI*2); ctx.fill()
  drawNeck(cx+sway, S(30)-bounce)
  drawHelmet(cx+sway, S(18)-bounce, 'happy')
}

const ANIMS = ['stumble','slide','fall','tired','dance']

function loop() {
  frameCount++; tick++

  if (isSitting) {
    boredTick++
    try {
      const m = mood === 'happy' ? 'happy' : boredTick > 300 ? 'bored' : 'neutral'
      drawSit(boredTick, m)
    } catch(e) {}
    requestAnimationFrame(loop)
    return
  }

  nextAnimIn -= 16
  if (nextAnimIn <= 0 && !currentAnim) {
    currentAnim = ANIMS[Math.floor(Math.random() * ANIMS.length)]
    animTick    = 0
    nextAnimIn  = rndInterval(25000, 55000)
  }

  const speeds = { stumble: null, slide: 3.2, fall: 0, tired: 0.4, dance: 0 }
  let speed = 1.5
  if (currentAnim === 'stumble') speed = animTick <= 18 ? 4 : 0.5
  else if (currentAnim in speeds && speeds[currentAnim] !== null) speed = speeds[currentAnim]

  px += dir * speed

  try {
    if (currentAnim === 'stumble') {
      animTick++
      drawStumble(tick, dir, Math.min(animTick, animTick <= 18 ? animTick : animTick - 18), animTick <= 18 ? 'trip' : 'recover')
      if (animTick > 46) { currentAnim = null; quip('Totally meant to do that.') }
    } else if (currentAnim === 'slide') {
      animTick++
      drawSlide(tick, dir)
      if (animTick > 50) { currentAnim = null; quip('Wheeeee.') }
    } else if (currentAnim === 'fall') {
      animTick++
      drawFall(animTick <= 22 ? animTick : animTick - 22, animTick <= 22 ? 'falling' : 'getup')
      if (animTick > 52) { currentAnim = null; quip('The floor is fine actually.') }
    } else if (currentAnim === 'tired') {
      animTick++
      drawTired(animTick)
      if (animTick > 130) { currentAnim = null; quip('Coffee. Now.') }
    } else if (currentAnim === 'dance') {
      animTick++
      drawDance(animTick)
      if (animTick > 100) { currentAnim = null; quip('Still got it.') }
    } else {
      drawWalk(tick, dir, mood)
    }
  } catch(e) {
    try { ctx.clearRect(0, 0, canvas.width, canvas.height) } catch(e2) {}
  }

  const sz = SIZES[currentSize] || SIZES.medium
  if (px > screenW - sz.w - 5) { dir = -1; px = screenW - sz.w - 5 }
  if (px < 5)                  { dir =  1; px = 5 }

  try { window.api.send('move-window', { x: Math.round(px) }) } catch(e) {}

  requestAnimationFrame(loop)
}

function quip(text) {
  try {
    window.api.send('show-bubble', { x: Math.round(px), text })
    setTimeout(() => window.api.send('hide-bubble'), 2800)
  } catch(e) {}
}

canvas.addEventListener('mousedown', (e) => {
  dragging = true; dragMoved = false
  dragStartClient  = { x: e.clientX, y: e.clientY }
  dragOffsetScreen = { x: e.screenX - window.screenX, y: e.screenY - window.screenY }
  e.preventDefault()
})

window.addEventListener('mousemove', (e) => {
  if (!dragging) return
  const dx = Math.abs(e.clientX - dragStartClient.x)
  const dy = Math.abs(e.clientY - dragStartClient.y)
  if (dx > 4 || dy > 4) {
    dragMoved = true
    try {
      window.api.send('drag-window', {
        x: Math.round(e.screenX - dragOffsetScreen.x),
        y: Math.round(e.screenY - dragOffsetScreen.y)
      })
    } catch(e2) {}
  }
})

window.addEventListener('mouseup', (e) => {
  if (!dragging) return
  dragging = false
  if (!dragMoved) {
    if (isSitting) {
      isSitting = false; boredTick = 0; mood = 'happy'
      quip('Back on patrol.')
      setTimeout(() => { mood = 'neutral' }, 2500)
    } else {
      try { window.api.send('buddy-clicked', { x: Math.round(px), locale: userLocale }) } catch(e2) {}
    }
  } else {
    const finalX = Math.round(e.screenX - dragOffsetScreen.x)
    px = Math.max(5, Math.min(finalX, screenW - (SIZES[currentSize]||SIZES.medium).w - 5))
    try { window.api.send('buddy-dragged', { x: px, locale: userLocale }) } catch(e2) {}
  }
})

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (isSitting) {
    isSitting = false; boredTick = 0; mood = 'happy'
    quip('Back on patrol.')
    setTimeout(() => { mood = 'neutral' }, 2500)
  } else {
    isSitting = true; mood = 'neutral'
    quip('Taking five. Right-click again to walk.')
  }
})

window.api.on('set-mood', (e, m) => {
  mood = m
  if ((m === 'happy' || m === 'surprise') && isSitting) boredTick = 0
})

window.api.on('force-bubble', (e, { text, duration }) => {
  try {
    window.api.send('show-bubble', { x: Math.round(px), text })
    setTimeout(() => window.api.send('hide-bubble'), duration || 6000)
  } catch(e2) {}
})

window.api.on('set-size', (e, size) => { applySize(size) })

window.api.on('drag-position-update', (e, { x }) => {
  px = Math.max(5, Math.min(x, screenW - (SIZES[currentSize]||SIZES.medium).w - 5))
})

window.api.on('screen-info', (e, { width }) => {
  screenW = width
})

applySize('medium')
loop()