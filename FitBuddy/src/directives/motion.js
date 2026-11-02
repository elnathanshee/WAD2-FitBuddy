// Beyond WAD2 syllabus: custom directives.
//
// A custom directive is your own "v-something" attribute (like the built-in v-if
// or v-show). Vue calls its `mounted` function when the element is added to the
// page and its `unmounted` function when it is removed, and gives us the real
// DOM element, so we can add event listeners to it. We use them because the
// course has no taught way to (1) fade an element in when it scrolls into view
// or (2) tilt a card towards the mouse, and writing the same code in every
// component would be repetitive. The directives are registered globally in
// main.js, so any component can use them with v-reveal / v-tilt.
//
// v-reveal  Fades + lifts an element in the first time it scrolls into view,
//           so content never just "pops" in. Plays once; respects reduced motion.
// v-tilt    Tilts a card a few degrees towards a fine pointer (mouse/trackpad)
//           with a soft light sheen, for a sense of depth. Pure transform, so
//           it never moves the layout. Off on touch screens and reduced motion.

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// One IntersectionObserver (a browser tool that reports when an element enters the
// screen) is shared by all v-reveal elements. It is created the first time it is needed.
let revealObserver = null
function getRevealObserver() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          revealObserver.unobserve(entry.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
  }
  return revealObserver
}

// Usage: <div v-reveal> or <div v-reveal="120"> (the number is a delay in ms).
// The CSS for the fade is the .reveal / .is-visible classes in assets/main.css.
export const vReveal = {
  mounted(el, binding) {
    if (!('IntersectionObserver' in window)) return
    el.classList.add('reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    getRevealObserver().observe(el)
  },
  unmounted(el) {
    revealObserver?.unobserve(el)
  },
}

const MAX_TILT = 6 // degrees

// Usage: <div v-tilt>. The tilt angles are written into CSS variables
// (--tilt-rx / --tilt-ry); the .tilt class in assets/main.css turns them into a rotation.
export const vTilt = {
  mounted(el) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    el.classList.add('tilt')
    let frame = 0
    let target = { x: 0, y: 0 }
    let current = { x: 0, y: 0 }

    // Ease the current angle towards the target each frame (a light spring),
    // so the card follows the pointer smoothly instead of snapping.
    // requestAnimationFrame runs this before every screen refresh.
    const step = () => {
      current.x += (target.x - current.x) * 0.18
      current.y += (target.y - current.y) * 0.18
      el.style.setProperty('--tilt-rx', `${current.x.toFixed(2)}deg`)
      el.style.setProperty('--tilt-ry', `${current.y.toFixed(2)}deg`)
      if (Math.abs(target.x - current.x) > 0.01 || Math.abs(target.y - current.y) > 0.01) {
        frame = requestAnimationFrame(step)
      } else {
        frame = 0
      }
    }
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(step)
    }

    el._tiltMove = (event) => {
      if (reduceMotion()) return
      const rect = el.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width
      const py = (event.clientY - rect.top) / rect.height
      target = { x: (0.5 - py) * MAX_TILT * 2, y: (px - 0.5) * MAX_TILT * 2 }
      el.style.setProperty('--tilt-glare-x', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--tilt-glare-y', `${(py * 100).toFixed(1)}%`)
      el.classList.add('is-tilting')
      kick()
    }
    el._tiltLeave = () => {
      target = { x: 0, y: 0 }
      el.classList.remove('is-tilting')
      kick()
    }
    // Listeners are stored on the element (el._tiltMove) so `unmounted` can remove them
    el.addEventListener('pointermove', el._tiltMove)
    el.addEventListener('pointerleave', el._tiltLeave)
  },
  unmounted(el) {
    el.removeEventListener('pointermove', el._tiltMove)
    el.removeEventListener('pointerleave', el._tiltLeave)
  },
}
