<!--
  A 3D trophy for the leaderboard that turns slowly on its own. Modelled in code with
  Three.js: a lathe-turned cup, handles, stem and a two-tier base.
  Shows a placeholder while Three.js loads, and an icon if WebGL is unavailable.
-->
<template>
  <div class="trophy3d" :class="{ ready: state === 'ready' }" :data-state="state" data-testid="trophy-3d" role="img" aria-label="Trophy">
    <div ref="stageEl" class="stage" aria-hidden="true"></div>
    <div v-if="state === 'loading'" class="placeholder skeleton" aria-hidden="true"></div>
    <div v-else-if="state === 'fallback'" class="flat" aria-hidden="true"><i class="bi bi-trophy-fill"></i></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { createSpinnableStage } from '../../utils/three/spinnable'

const stageEl = ref(null)
const state = ref('loading')
let stage = null
let disposed = false

function build(THREE) {
  const group = new THREE.Group()
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0a83a, metalness: 1, roughness: 0.26, side: THREE.DoubleSide })
  const plinth = new THREE.MeshStandardMaterial({ color: 0x1b6343, metalness: 0.1, roughness: 0.55 })

  // Cup: an outline turned around the vertical axis (outer wall, lip, inner wall)
  const profile = [
    [0.0, 0.0], [0.22, 0.02], [0.46, 0.12], [0.62, 0.34], [0.71, 0.62], [0.75, 0.9], [0.78, 1.08],
    [0.72, 1.1], [0.68, 0.92], [0.64, 0.64], [0.55, 0.38], [0.38, 0.2], [0.0, 0.14],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), gold)
  cup.position.y = 0.05
  group.add(cup)

  // Handles: half-hidden rings on each side of the cup
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 16, 48), gold)
    handle.position.set(side * 0.74, 0.72, 0)
    group.add(handle)
  }

  // Stem with a knot
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.42, 32), gold)
  stem.position.y = -0.16
  group.add(stem)
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16), gold)
  knot.position.y = -0.02
  group.add(knot)
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.1, 64), gold)
  foot.position.y = -0.42
  group.add(foot)

  // Two-tier base in the brand green, with a gold plaque
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.8), plinth)
  base.position.y = -0.68
  group.add(base)
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.02), gold)
  plaque.position.set(0, -0.68, 0.41)
  group.add(plaque)

  group.position.y = 0.05
  return { object: group, floorY: -0.9 }
}

onMounted(async () => {
  try {
    stage = await createSpinnableStage(stageEl.value, build, { cameraZ: 5.4 })
    if (disposed) {
      stage.dispose()
      return
    }
    state.value = 'ready'
  } catch (err) {
    console.warn('3D trophy unavailable, showing an icon instead:', err)
    state.value = 'fallback'
  }
})

onUnmounted(() => {
  disposed = true
  stage?.dispose()
})
</script>

<style scoped>
.trophy3d {
  position: relative;
  width: 168px;
  height: 168px;
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
  border-radius: var(--r-lg);
}
.flat {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-4xl);
  color: var(--fb-amber);
}
@media (max-width: 575.98px) {
  .trophy3d {
    width: 120px;
    height: 120px;
  }
}
</style>
