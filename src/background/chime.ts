/** Three soft rising notes, generated so no audio file ships with the extension. */
export function playChime(): void {
    const ctx = new AudioContext()
    const notes = [660, 880, 1320]
    notes.forEach((frequency, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const t = ctx.currentTime + i * 0.18
        osc.type = 'sine'
        osc.frequency.value = frequency
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.65)
    })
    setTimeout(() => void ctx.close(), 1500)
}
