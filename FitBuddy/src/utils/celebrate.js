// Confetti + a short victory fanfare for when every habit is done for the day.
// Third-party library: canvas-confetti (https://github.com/catdad/canvas-confetti) — draws the confetti
import confetti from 'canvas-confetti'

// Browsers only allow sound after the user interacts with the page, so the
// AudioContext is created ("unlocked") during the click that logs progress,
// and the fanfare is played a moment later once the server has replied.
let audio = null

export function unlockSound() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') audio.resume()
  } catch {
    audio = null // no Web Audio support: celebrate silently
  }
}

// C – E – G – high C, like a little "ta-da!". Generated with the Web Audio API,
// so there is no audio file to download or license.
function playFanfare() {
  if (!audio) return
  const notes = [523.25, 659.25, 783.99, 1046.5] // frequencies in Hz
  const start = audio.currentTime + 0.05
  notes.forEach((frequency, i) => {
    const isLast = i === notes.length - 1
    const at = start + i * 0.13
    const length = isLast ? 0.7 : 0.16

    const oscillator = audio.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency

    // Fade each note in and out quickly so it doesn't click.
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(0.25, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, at + length)

    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(at)
    oscillator.stop(at + length + 0.05)
  })
}

// Two bursts from the bottom corners, then a little rain for ~1.5 seconds.
function fireConfetti() {
  const shared = { disableForReducedMotion: true, zIndex: 2000 }
  confetti({ ...shared, particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.8 } })
  confetti({ ...shared, particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.8 } })

  const end = Date.now() + 1500
  ;(function frame() {
    confetti({ ...shared, particleCount: 3, spread: 120, startVelocity: 25, origin: { x: Math.random(), y: -0.1 } })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

export function celebrate() {
  fireConfetti()
  playFanfare()
}
