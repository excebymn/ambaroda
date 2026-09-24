let ac

const SOUNDS = {
  jump: [440, 0.12, 'square'],
  shoot: [880, 0.06, 'square'],
  dash: [220, 0.2, 'sawtooth'],
  coin: [1320, 0.1, 'triangle'],
  heart: [990, 0.25, 'triangle'],
  hit: [110, 0.3, 'sawtooth'],
  smash: [300, 0.12, 'square'],
  over: [80, 0.6, 'sawtooth'],
}

export function sfx(name) {
  try {
    ac ??= new AudioContext()
    const [f, d, type] = SOUNDS[name]
    const o = ac.createOscillator()
    const g = ac.createGain()
    const t = ac.currentTime
    o.type = type
    o.frequency.setValueAtTime(f, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.5), t + d)
    g.gain.setValueAtTime(0.08, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + d)
    o.connect(g).connect(ac.destination)
    o.start(t)
    o.stop(t + d)
  } catch {}
}
