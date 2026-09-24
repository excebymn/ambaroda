<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { createGame } from './game/engine.js'

const canvas = ref(null)
const phase = ref('menu') // menu | playing | paused | over
const hud = reactive({ lives: 3, score: 0, coins: 0, best: 0, dashCd: 0, shootCd: 0 })
const result = reactive({ score: 0, best: 0 })
let game

const start = () => { phase.value = 'playing'; game.start() }
const togglePause = () => {
  if (phase.value === 'playing') { phase.value = 'paused'; game.pause() }
  else if (phase.value === 'paused') { phase.value = 'playing'; game.resume() }
}
const onKey = (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause()
  else if (e.code === 'Enter' && (phase.value === 'menu' || phase.value === 'over')) start()
}

onMounted(() => {
  game = createGame(canvas.value, {
    onState: (s) => Object.assign(hud, s),
    onOver: (r) => { Object.assign(result, r); phase.value = 'over' },
  })
  hud.best = game.best()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
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
  </main>
</template>

<style>
:root { font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive; color: #2a2f36; }
body { margin: 0; background: #dfe6e2; }
.page { min-height: 100vh; display: grid; place-content: center; gap: 16px; padding: 16px; }
.stage { position: relative; width: min(900px, 100%); border: 3px solid #2a2f36; border-radius: 6px; overflow: hidden; background: #f1f5f2; }
canvas { display: block; width: 100%; height: auto; }
.hud { position: absolute; top: 10px; left: 14px; right: 14px; display: flex; gap: 18px; flex-wrap: wrap; font-size: 18px; pointer-events: none; }
.hearts { color: #d8453b; letter-spacing: 2px; }
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(241, 245, 242, 0.88); text-align: center; }
.overlay h1 { margin: 0; font-size: 44px; }
.overlay p { margin: 0; font-size: 20px; }
button { margin-top: 12px; font: inherit; font-size: 20px; padding: 8px 22px; color: #2a2f36; background: #ffd84d; border: 3px solid #2a2f36; border-radius: 6px; cursor: pointer; }
button:hover { background: #ffe37d; }
button:focus-visible { outline: 3px solid #2a2f36; outline-offset: 3px; }
.keys { display: flex; flex-wrap: wrap; gap: 8px 22px; justify-content: center; list-style: none; margin: 0; padding: 0; font-size: 16px; }
</style>
