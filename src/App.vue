<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { createGame } from './game/engine.js'

const canvas = ref(null)
const phase = ref('menu') // menu | playing | paused | over
const hud = reactive({ lives: 3, score: 0, coins: 0, best: 0, dashCd: 0, shootCd: 0 })
const result = reactive({ score: 0, best: 0 })
const deadSrc = ref('/heads/dead.png')
let game

const start = () => { phase.value = 'playing'; game.start() }
const togglePause = () => {
  if (phase.value === 'playing') { phase.value = 'paused'; game.pause() }
  else if (phase.value === 'paused') { phase.value = 'playing'; game.resume() }
}
const press = (a) => game?.act(a, true)
const release = (a) => game?.act(a, false)

// dead.png -> normal.png -> disembunyikan kalau dua-duanya tidak ada
const onHeadError = () => {
  deadSrc.value = deadSrc.value.endsWith('dead.png') ? '/heads/normal.png' : ''
}

const onKey = (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause()
  else if (e.code === 'Enter' && (phase.value === 'menu' || phase.value === 'over')) start()
}

// HP di posisi portrait: game dijeda otomatis, layar meminta HP diputar
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)')
const onOrient = () => { if (portrait.matches && phase.value === 'playing') togglePause() }

onMounted(() => {
  game = createGame(canvas.value, {
    onState: (s) => Object.assign(hud, s),
    onOver: (r) => { Object.assign(result, r); phase.value = 'over' },
  })
  hud.best = game.best()
  window.addEventListener('keydown', onKey)
  portrait.addEventListener('change', onOrient)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  portrait.removeEventListener('change', onOrient)
  game?.destroy()
})
</script>

<template>
  <main class="page">
    <div class="stage">
      <canvas ref="canvas" width="900" height="400"></canvas>

      <div v-if="phase === 'playing' || phase === 'paused'" class="hud">
        <span class="hearts">{{ '♥'.repeat(hud.lives) }}</span>
        <span>{{ hud.score }} poin</span>
        <span>{{ hud.coins }} koin</span>
        <span>Rekor {{ Math.max(hud.best, hud.score) }}</span>
        <span>Dash {{ hud.dashCd > 0 ? hud.dashCd.toFixed(1) + ' dtk' : 'siap' }}</span>
      </div>

      <template v-if="phase === 'playing'">
        <button class="pause" aria-label="Jeda" @pointerdown.prevent="togglePause">II</button>
        <div class="pad">
          <div class="grp">
            <button class="tb" @pointerdown.prevent="press('slide')" @pointerup="release('slide')"
              @pointercancel="release('slide')" @pointerleave="release('slide')">Slide</button>
            <button class="tb" @pointerdown.prevent="press('jump')">Lompat</button>
          </div>
          <div class="grp">
            <button class="tb" :class="{ cd: hud.dashCd > 0 }" @pointerdown.prevent="press('dash')">Dash</button>
            <button class="tb" @pointerdown.prevent="press('shoot')">Tembak</button>
          </div>
        </div>
      </template>

      <div v-if="phase !== 'playing'" class="overlay">
        <template v-if="phase === 'menu'">
          <h1>Doodle Stickman</h1>
          <p>Lari terus, hindari rintangan, kumpulkan koin.</p>
          <p v-if="hud.best">Rekor kamu {{ hud.best }}</p>
          <button @click="start">Mulai main (Enter)</button>
        </template>
        <template v-else-if="phase === 'paused'">
          <h1>Dijeda</h1>
          <button @click="togglePause">Lanjut (Esc)</button>
        </template>
        <template v-else>
          <img v-if="deadSrc" class="dead" :src="deadSrc" alt="" @error="onHeadError" />
          <h1>Game over</h1>
          <p>Skor {{ result.score }}</p>
          <p>Rekor {{ result.best }}</p>
          <button @click="start">Main lagi (Enter)</button>
        </template>
      </div>
    </div>

    <ul class="keys">
      <li><b>Spasi / ↑</b> lompat</li>
      <li><b>↓</b> slide</li>
      <li><b>Shift</b> dash</li>
      <li><b>X</b> tembak</li>
      <li><b>Esc</b> jeda</li>
    </ul>

    <div class="rotate">
      <p>Putar HP ke posisi landscape untuk bermain.</p>
    </div>
  </main>
</template>

<style>
:root { font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive; color: #2a2f36; }
body { margin: 0; background: #dfe6e2; touch-action: manipulation; }
.page { min-height: 100dvh; display: grid; place-content: center; gap: 16px; padding: 16px; box-sizing: border-box; }
.stage { position: relative; width: min(900px, 100%, calc((100dvh - 90px) * 2.25)); margin: 0 auto; border: 3px solid #2a2f36; border-radius: 6px; overflow: hidden; background: #f1f5f2; }
canvas { display: block; width: 100%; height: auto; }
.hud { position: absolute; top: 10px; left: 14px; right: 60px; display: flex; gap: 18px; flex-wrap: wrap; font-size: 18px; pointer-events: none; }
.hearts { color: #d8453b; letter-spacing: 2px; }
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(241, 245, 242, 0.88); text-align: center; }
.overlay h1 { margin: 0; font-size: 44px; }
.overlay p { margin: 0; font-size: 20px; }
.dead { width: 96px; height: 96px; object-fit: contain; }
button { margin-top: 12px; font: inherit; font-size: 20px; padding: 8px 22px; color: #2a2f36; background: #ffd84d; border: 3px solid #2a2f36; border-radius: 6px; cursor: pointer; }
button:hover { background: #ffe37d; }
button:focus-visible { outline: 3px solid #2a2f36; outline-offset: 3px; }

.pad { position: absolute; left: 10px; right: 10px; bottom: 8px; display: flex; justify-content: space-between; pointer-events: none; }
.grp { display: flex; gap: 12px; }
.tb, .pause { margin: 0; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; background: rgba(255, 216, 77, 0.82); }
.tb { width: 76px; height: 60px; padding: 0; font-size: 16px; }
.tb:active, .pause:active { background: #ffb800; }
.tb.cd { background: rgba(205, 213, 209, 0.85); }
.pause { position: absolute; top: 8px; right: 10px; width: 40px; height: 36px; padding: 0; font-size: 16px; }

.keys { display: flex; flex-wrap: wrap; gap: 8px 22px; justify-content: center; list-style: none; margin: 0; padding: 0; font-size: 16px; }
.rotate { display: none; }

@media (pointer: coarse) {
  .page { padding: 8px; gap: 0; }
  .stage { width: min(100%, calc((100dvh - 16px) * 2.25)); }
  .keys { display: none; }
}
@media (orientation: portrait) and (pointer: coarse) {
  .stage, .keys { display: none; }
  .rotate { display: grid; place-items: center; min-height: 80dvh; text-align: center; font-size: 22px; padding: 0 24px; }
}
</style>
