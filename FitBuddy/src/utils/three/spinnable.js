// =============================================================================
// Shared Three.js stage for the small interactive 3D models (streak medal,
// trophy). Three.js (MIT licence, threejs.org) is loaded lazily with import(),
// so pages without a model never download it.
//
// What the stage does:
// - renders a model built by `build(THREE)` with studio-style reflections
//   (RoomEnvironment) and a soft contact shadow so it sits on the page
// - turns slowly on its own (display only: it doesn't respond to the pointer)
// - pauses rendering when off-screen or the tab is hidden (saves battery)
// - respects prefers-reduced-motion (stays still, shown at a 3/4 angle)
// - cleans up every GPU resource on dispose()
// =============================================================================

const SPIN_SPEED = 0.6 // radians per second

export async function createSpinnableStage(container, build, { cameraZ = 5 } = {}) {
  const THREE = await import('three')
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Throws if WebGL is unavailable; callers show a 2D fallback instead
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.style.pointerEvents = 'none' // decorative: clicks and scrolls pass through
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  camera.position.set(0, 0.25, cameraZ)
  camera.lookAt(0, 0, 0)

  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(2, 3, 4)
  scene.add(key)

  // The model spins inside `pivot`; `model` is whatever build() returns
  const pivot = new THREE.Group()
  scene.add(pivot)
  const built = await build(THREE)
  pivot.add(built.object)

  // Soft round shadow under the model (a blurred radial gradient on a plane)
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 128
  const g = shadowCanvas.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(28,27,24,0.35)')
  grad.addColorStop(1, 'rgba(28,27,24,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = built.floorY ?? -1.2
  scene.add(shadow)

  // Reduced motion: no spinning, just a still three-quarter view
  if (reduceMotion) pivot.rotation.y = -0.5

  // ---- Sizing -----------------------------------------------------------
  const resize = () => {
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderOnce()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  // ---- Render loop (only while visible) -----------------------------------
  let frame = 0
  let last = 0
  let onScreen = true
  const extraUpdates = new Set()

  function renderOnce() {
    renderer.render(scene, camera)
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000)
    last = now
    if (!reduceMotion) pivot.rotation.y += SPIN_SPEED * dt
    for (const fn of extraUpdates) fn(dt, now)
    renderOnce()
    const keepGoing = !reduceMotion || extraUpdates.size > 0
    frame = onScreen && !document.hidden && keepGoing ? requestAnimationFrame(loop) : 0
  }

  function start() {
    if (!frame && onScreen && !document.hidden) {
      last = 0
      frame = requestAnimationFrame(loop)
    }
  }

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting
    if (onScreen) start()
  })
  io.observe(container)
  const onVisibility = () => !document.hidden && start()
  document.addEventListener('visibilitychange', onVisibility)

  resize()
  start()

  return {
    THREE,
    pivot,
    object: built.object,
    renderOnce,
    start,
    // Run `fn(dt)` every frame until it returns true (used for one-off spins)
    animate(fn) {
      const wrapped = (dt, now) => {
        if (fn(dt, now)) extraUpdates.delete(wrapped)
      }
      extraUpdates.add(wrapped)
      start()
    },
    dispose() {
      cancelAnimationFrame(frame)
      io.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      scene.traverse((obj) => {
        obj.geometry?.dispose()
        const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
        for (const m of materials) {
          m.map?.dispose()
          m.dispose()
        }
      })
      shadowTexture.dispose()
      envTexture.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
