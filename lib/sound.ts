type AudioCtor = typeof AudioContext

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor: AudioCtor | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
  if (!Ctor) return null
  const ctx = new Ctor()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function playTick(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = 1000
  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.06)
}

export function playWin(ctx: AudioContext) {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = ctx.currentTime + i * 0.1
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.3)
  })
}

export function playAgain(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3)
  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.3)
}
