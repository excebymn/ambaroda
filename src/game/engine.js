import { sfx } from './audio.js'

const W = 900, H = 400, G = 320, PX = 120
const KEY = 'doodle-stickman-best'
const INK = '#2a2f36', RED = '#d8453b', GOLD = '#e6a800'

const SIZE = { box: [34, 34], spike: [36, 20], big: [40, 76], bird: [40, 20], walker: [28, 50], pit: [110, 0] }

// Pola rintangan per tingkat kesulitan: [jenis, jarak x dari awal pola]
const PATTERNS = [
  [[['box']], [['spike']], [['big']]],
  [[['pit']], [['bird']], [['walker']]],
  [[['spike'], ['bird', 260]], [['big'], ['box', 280]], [['walker'], ['spike', 260]]],
  [[['pit'], ['bird', 320]], [['walker'], ['spike', 240], ['bird', 480]], [['big'], ['pit', 300]]],
]

const hitBox = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const readBest = () => { try { return +localStorage.getItem(KEY) || 0 } catch { return 0 } }
const saveBest = (v) => { try { localStorage.setItem(KEY, v) } catch {} }

export function createGame(canvas, cb) {
  const ctx = canvas.getContext('2d')
  const heads = {}
  for (const k of ['normal', 'hit', 'dead']) {
    const img = new Image()
    img.src = `/heads/${k}.png`
    heads[k] = img
  }
  const loaded = (img) => img.complete && img.naturalWidth > 0

  let s, raf, last = performance.now(), running = false, bestScore = readBest()
  const keys = { down: false }

  const calc = () => Math.floor(s.dist) + s.coins * 10

  function reset() {
    s = { t: 0, dist: 0, coins: 0, lives: 3, y: G, vy: 0, slide: false, dash: 0, dashCd: 0,
      shootCd: 0, inv: 0, run: 0, ents: [], bullets: [], gap: 300, dead: false }
  }

  function spawn() {
    const tier = Math.min(3, Math.floor(s.dist / 300))
    const ti = Math.random() < 0.5 ? tier : Math.floor(Math.random() * (tier + 1))
    const pool = PATTERNS[ti]
    const pat = pool[Math.floor(Math.random() * pool.length)]
    let end = 0
    for (const [t, dx = 0] of pat) {
      const [w, h] = SIZE[t]
      s.ents.push({ t, x: W + 40 + dx, y: t === 'bird' ? G - 62 : G - h, w, h })
      end = Math.max(end, dx + w)
    }
    const cx = W + 40 + end + 130
    for (let i = 0; i < 3; i++) s.ents.push({ t: 'coin', x: cx + i * 34, y: G - 45, w: 18, h: 18 })
    if (s.lives < 3 && Math.random() < 0.15) s.ents.push({ t: 'heart', x: cx + 40, y: G - 150, w: 22, h: 22 })
    s.gap = end + 320 + Math.random() * 220
  }

  function hit() {
    if (s.inv > 0 || s.dead) return
    s.lives--
    s.inv = 1.5
    sfx('hit')
    if (s.lives <= 0) end()
  }

  function end() {
    s.dead = true
    running = false
    sfx('over')
    const score = calc()
    bestScore = Math.max(bestScore, score)
    saveBest(bestScore)
    cb.onOver({ score, best: bestScore })
  }

  function update(dt) {
    const v = s.dash > 0 ? 640 : 340
    s.t += dt
    s.dist += (v * dt) / 50
    s.run += (v * dt) / 34
    s.dash = Math.max(0, s.dash - dt)
    s.dashCd = Math.max(0, s.dashCd - dt)
    s.shootCd = Math.max(0, s.shootCd - dt)
    s.inv = Math.max(0, s.inv - dt)

    const pit = s.ents.find((e) => e.t === 'pit' && e.x < PX - 8 && e.x + e.w > PX + 8)
    s.vy += 2200 * dt
    s.y += s.vy * dt
    if (s.y >= G && s.y < G + 30 && !pit) { s.y = G; s.vy = 0 }
    if (s.y > H + 60) {
      s.ents = s.ents.filter((e) => !(e.t === 'pit' && e.x < PX + 60 && e.x + e.w > PX - 60))
      s.y = G - 200
      s.vy = 0
      hit()
    }
    s.slide = keys.down && s.y === G

    for (const e of s.ents) e.x -= (v + (e.t === 'walker' ? 90 : 0)) * dt
    for (const b of s.bullets) b.x += 700 * dt
    s.gap -= v * dt
    if (s.gap <= 0) spawn()

    const ph = s.slide ? 30 : 60
    const p = { x: PX - 11, y: s.y - ph, w: 22, h: ph }
    for (const e of s.ents) {
      if (e.dead || e.t === 'pit' || !hitBox(p, e)) continue
      if (e.t === 'coin') { e.dead = true; s.coins++; sfx('coin') }
      else if (e.t === 'heart') { e.dead = true; s.lives = Math.min(3, s.lives + 1); sfx('heart') }
      else if (s.dash > 0 && e.t !== 'big') { e.dead = true; sfx('smash') }
      else hit()
    }
    for (const b of s.bullets) {
      for (const e of s.ents) {
        if (!e.dead && (e.t === 'bird' || e.t === 'walker') && hitBox({ x: b.x - 5, y: b.y - 5, w: 10, h: 10 }, e)) {
          e.dead = b.dead = true
          sfx('smash')
        }
      }
    }
    s.ents = s.ents.filter((e) => !e.dead && e.x + e.w > -40)
    s.bullets = s.bullets.filter((b) => !b.dead && b.x < W + 20)
    emit()
  }

  function emit() {
    cb.onState({ lives: s.lives, score: calc(), coins: s.coins, best: bestScore, dashCd: s.dashCd, shootCd: s.shootCd })
  }

  function draw() {
    let seed = 1 + Math.floor(s.t * 8) * 7919
    const r = () => (((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5) * 3

    ctx.fillStyle = '#f1f5f2'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#cddde6'
    ctx.lineWidth = 1
    for (let y = 40; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const L = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a + r(), b + r()); ctx.lineTo(c + r(), d + r()); ctx.stroke() }
    const R = (x, y, w, h) => { L(x, y, x + w, y); L(x + w, y, x + w, y + h); L(x + w, y + h, x, y + h); L(x, y + h, x, y) }
    const C = (x, y, rad) => { ctx.beginPath(); ctx.arc(x + r(), y + r(), rad, 0, 7); ctx.stroke() }

    const pits = s.ents.filter((e) => e.t === 'pit')
    for (let x = 0; x < W; x += 30) {
      if (!pits.some((p) => x + 15 > p.x && x + 15 < p.x + p.w)) L(x, G, x + 30, G)
    }
    for (const p of pits) { L(p.x, G, p.x, H); L(p.x + p.w, G, p.x + p.w, H) }

    for (const e of s.ents) {
      const { x, y, w, h } = e
      if (e.t === 'box') { R(x, y, w, h); L(x, y, x + w, y + h) }
      else if (e.t === 'big') { R(x, y, w, h); L(x, y, x + w, y + h); L(x + w, y, x, y + h) }
      else if (e.t === 'spike') {
        ctx.strokeStyle = RED
        L(x, y + h, x + 9, y); L(x + 9, y, x + 18, y + h); L(x + 18, y + h, x + 27, y); L(x + 27, y, x + w, y + h)
      } else if (e.t === 'bird') {
        ctx.strokeStyle = RED
        const f = Math.sin(s.t * 18) * 8
        C(x + 20, y + 12, 8); L(x + 20, y + 8, x + 6, y + f); L(x + 20, y + 8, x + 34, y + f); L(x + 28, y + 12, x + 40, y + 14)
      } else if (e.t === 'walker') {
        ctx.strokeStyle = RED
        const q = Math.sin(s.t * 12) * 6
        C(x + 14, y + 8, 8); L(x + 14, y + 16, x + 14, y + 34)
        L(x + 14, y + 34, x + 4 + q, y + h); L(x + 14, y + 34, x + 24 - q, y + h)
        L(x + 14, y + 22, x + 2, y + 30); L(x + 14, y + 22, x + 26, y + 30)
      } else if (e.t === 'coin') { ctx.strokeStyle = GOLD; C(x + 9, y + 9, 8) }
      else if (e.t === 'heart') { ctx.fillStyle = RED; ctx.font = '26px sans-serif'; ctx.fillText('♥', x - 2, y + 20) }
      ctx.strokeStyle = INK
    }

    ctx.fillStyle = INK
    for (const b of s.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill() }

    if (!(s.inv > 0 && Math.floor(s.t * 20) % 2)) drawPlayer(L, C)
  }

  function drawPlayer(L, C) {
    const sl = s.slide, air = s.y < G
    const lean = sl ? 16 : s.dash > 0 ? 10 : 0
    const nx = PX + lean, ny = s.y - (sl ? 22 : 44)
    const hy = s.y - (sl ? 12 : 26), len = s.y - hy
    L(nx, ny, PX, hy)
    for (const d of [1, -1]) {
      const a = air ? d * 0.7 : Math.sin(s.run) * d * 0.9
      L(PX, hy, PX + Math.sin(a) * len, hy + Math.cos(a) * len)
      const b = air ? -d * 1.1 : Math.sin(s.run) * -d * 0.9
      L(nx, ny + 8, nx + Math.sin(b) * 16 + 4, ny + 8 + Math.cos(b) * 14)
    }
    if (s.dash > 0) for (let i = 0; i < 3; i++) L(PX - 50 - i * 25, s.y - 15 - i * 14, PX - 20 - i * 25, s.y - 15 - i * 14)

    const key = s.dead ? 'dead' : s.inv > 1.1 ? 'hit' : 'normal'
    const img = loaded(heads[key]) ? heads[key] : heads.normal
    const bob = !air && !sl ? Math.sin(s.t * 14) * 2 : 0
    let tilt = air ? -0.25 : s.dash > 0 ? 0.3 : 0
    if (s.inv > 1.1) tilt = Math.sin(s.t * 60) * 0.15
    ctx.save()
    ctx.translate(nx, ny - 14 + bob)
    ctx.rotate(tilt)
    if (loaded(img)) ctx.drawImage(img, -20, -20, 40, 40)
    else {
      C(0, 0, 14)
      ctx.fillStyle = INK
      ctx.fillRect(-6, -4, 3, 3); ctx.fillRect(4, -4, 3, 3)
      L(-5, 6, 5, 6)
    }
    ctx.restore()
  }

  function frame(now) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.033, (now - last) / 1000)
    last = now
    if (running) update(dt)
    draw()
  }

  // Satu pintu untuk keyboard dan tombol layar: act('jump' | 'slide' | 'dash' | 'shoot', tekan?)
  function act(name, on) {
    if (name === 'slide') { keys.down = on; return }
    if (!running || !on) return
    if (name === 'jump' && s.y === G) { s.vy = -820; s.y -= 1; sfx('jump') }
    else if (name === 'dash' && s.dashCd <= 0) { s.dash = 0.25; s.dashCd = 3; sfx('dash') }
    else if (name === 'shoot' && s.shootCd <= 0) {
      s.bullets.push({ x: PX + 16, y: s.y - (s.slide ? 15 : 40) })
      s.shootCd = 0.4
      sfx('shoot')
    }
  }
  const MAP = { Space: 'jump', ArrowUp: 'jump', ArrowDown: 'slide', ShiftLeft: 'dash', ShiftRight: 'dash', KeyX: 'shoot' }
  const down = (e) => {
    const a = MAP[e.code]
    if (!a) return
    if (running && ['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault()
    act(a, true)
  }
  const up = (e) => { if (MAP[e.code] === 'slide') act('slide', false) }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)

  reset()
  raf = requestAnimationFrame(frame)

  return {
    best: () => bestScore,
    act,
    start() { reset(); keys.down = false; running = true; last = performance.now(); emit() },
    pause() { running = false },
    resume() { running = true; last = performance.now() },
    destroy() {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    },
  }
}
