let ctx: AudioContext | null = null

export function playNotify() {
  try {
    if (!ctx) ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.setValueAtTime(1200, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08)
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    o.start(ctx.currentTime)
    o.stop(ctx.currentTime + 0.12)
  } catch {}
}