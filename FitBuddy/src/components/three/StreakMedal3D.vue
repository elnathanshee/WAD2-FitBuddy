<!--
  A 3D medal that shows a streak number. It turns slowly on its own and flips
  when the number changes (display only, not interactive). Built entirely in
  code with Three.js (no model files).
  Shows a placeholder while Three.js loads, and a flat medal if WebGL is
  unavailable.
-->
<template>
  <div
    class="medal3d"
    :class="{ ready: state === 'ready' }"
    :data-state="state"
    data-testid="streak-medal"
    role="img"
    :aria-label="`${value} ${label}`"
  >
    <div ref="stageEl" class="stage" aria-hidden="true"></div>
    <div v-if="state === 'loading'" class="placeholder skeleton" aria-hidden="true"></div>
    <div v-else-if="state === 'fallback'" class="flat-medal" aria-hidden="true">
      <span class="display-num">{{ value }}</span>
      <small>{{ label }}</small>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { createSpinnableStage } from '../../utils/three/spinnable'

const props = defineProps({
  value: { type: Number, default: 0 },
  label: { type: String, default: 'streak' },
})

const stageEl = ref(null)
const state = ref('loading') // loading | ready | fallback
let stage = null
let faceTexture = null
let backTexture = null
let faceCanvas = null
let disposed = false
// Quarter-turn applied to the back texture so the number reads correctly on that side
const BACK_ROTATION = Math.PI / 2

// Draws the medal face (gold disc, number, label) onto a canvas texture
function drawFace() {
  const c = faceCanvas
  const ctx = c.getContext('2d')
  const s = c.width
  ctx.clearRect(0, 0, s, s)
  const bg = ctx.createRadialGradient(s * 0.42, s * 0.38, s * 0.05, s / 2, s / 2, s / 2)
  bg.addColorStop(0, '#f6cf6e')
  bg.addColorStop(1, '#c98a1c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, s, s)
  // Inner ring
  ctx.strokeStyle = 'rgba(107, 63, 5, 0.45)'
  ctx.lineWidth = s * 0.016
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2)
  ctx.stroke()
  // Number, with a light offset copy for an embossed look
  const text = String(props.value)
  const size = text.length > 2 ? s * 0.3 : s * 0.38
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${size}px Fredoka, Nunito, sans-serif`
  ctx.fillStyle = 'rgba(255, 240, 200, 0.7)'
  ctx.fillText(text, s / 2 - 3, s * 0.45 - 3)
  ctx.fillStyle = '#6b3f05'
  ctx.fillText(text, s / 2, s * 0.45)
  ctx.font = `800 ${s * 0.065}px Nunito, sans-serif`
  ctx.fillStyle = '#6b3f05'
  ctx.fillText(props.label.toUpperCase().split('').join(String.fromCharCode(8202)), s / 2, s * 0.7)
  if (faceTexture) faceTexture.needsUpdate = true
  // Redraw both faces so the front and back show the new streak
  if (backTexture) backTexture.needsUpdate = true
}

// One full extra turn with ease-out, e.g. when the streak changes
function flourish() {
  if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const total = Math.PI * 2
  const duration = 1.1
  let elapsed = 0
  let done = 0
  stage.animate((dt) => {
    elapsed = Math.min(duration, elapsed + dt)
    const p = 1 - Math.pow(1 - elapsed / duration, 3)
    const target = total * p
    stage.pivot.rotation.y += target - done
    done = target
    return elapsed >= duration
  })
}

async function build(THREE) {
  faceCanvas = document.createElement('canvas')
  faceCanvas.width = faceCanvas.height = 512
  // Wait for the web fonts so the number isn't drawn in a fallback face
  try {
    await Promise.race([document.fonts.load('600 160px Fredoka'), new Promise((r) => setTimeout(r, 1500))])
  } catch {
    // draw with whatever font is available
  }
  drawFace()
  faceTexture = new THREE.CanvasTexture(faceCanvas)
  faceTexture.colorSpace = THREE.SRGBColorSpace
  faceTexture.anisotropy = 4
  // The cap's UVs come out a quarter-turn off once the coin faces the camera
  faceTexture.center.set(0.5, 0.5)
  faceTexture.rotation = Math.PI / 2

  // The back cap's UVs run the other way round, so it gets its own copy of the
  // canvas with the opposite quarter-turn (checked frame by frame while spinning)
  backTexture = new THREE.CanvasTexture(faceCanvas)
  backTexture.colorSpace = THREE.SRGBColorSpace
  backTexture.anisotropy = 4
  backTexture.center.set(0.5, 0.5)
  backTexture.rotation = BACK_ROTATION

  const group = new THREE.Group()
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a23a, metalness: 0.9, roughness: 0.28 })
  const face = new THREE.MeshStandardMaterial({ map: faceTexture, metalness: 0.55, roughness: 0.35 })
  const backFace = new THREE.MeshStandardMaterial({ map: backTexture, metalness: 0.55, roughness: 0.35 })

  // Coin: cylinder turned to face the camera. Groups: 0 side, 1 front cap (the face), 2 back cap (the same face, so the number reads correctly when the coin turns around)
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 96), [gold, face, backFace])
  coin.rotation.x = Math.PI / 2
  group.add(coin)

  // Raised rim gives the edge some thickness and catches the light
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 24, 120), gold)
  group.add(rim)

  // Ribbon tails in the brand green, attached at the top edge of the rim in the
  // coin's mid-plane (never over the face), so front and back look alike
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x1b6343, roughness: 0.75, metalness: 0 })
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.04), ribbonMat)
    tail.position.set(side * 0.28, 1.5, 0)
    tail.rotation.z = side * -0.32
    group.add(tail)
  }

  // Lowered so the raised ribbon fits in view; the shadow floor follows
  group.position.y = -0.42
  return { object: group, floorY: -1.6 }
}

onMounted(async () => {
  try {
    stage = await createSpinnableStage(stageEl.value, build, { cameraZ: 6.2 })
    if (disposed) {
      stage.dispose()
      return
    }
    state.value = 'ready'
    flourish()
  } catch (err) {
    console.warn('3D medal unavailable, showing a flat version:', err)
    state.value = 'fallback'
  }
})

watch(
  () => [props.value, props.label],
  () => {
    if (!faceCanvas) return
    drawFace()
    stage?.renderOnce()
    flourish()
  },
)

onUnmounted(() => {
  disposed = true
  stage?.dispose()
})
</script>

<style scoped>
.medal3d {
  position: relative;
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}
.stage {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 400ms var(--ease-out);
}
.ready .stage {
  opacity: 1;
}
.placeholder {
  position: absolute;
  inset: var(--s-6);
  border-radius: 50%;
}
.flat-medal {
  position: absolute;
  inset: var(--s-6);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b3f05;
  background: radial-gradient(circle at 40% 35%, #f6cf6e, #c98a1c);
  box-shadow: inset 0 0 0 6px #d9a23a;
}
.flat-medal span {
  font-size: var(--fs-3xl);
}
.flat-medal small {
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 575.98px) {
  .medal3d {
    width: 136px;
    height: 136px;
  }
  .placeholder,
  .flat-medal {
    inset: var(--s-4);
  }
}
</style>
