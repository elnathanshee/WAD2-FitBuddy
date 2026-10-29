import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

console.log('Build script running from:', process.cwd())

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.env') continue
    if (entry.isSymbolicLink && entry.isSymbolicLink()) continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

if (fs.existsSync('FitBuddy/package.json')) {
  console.log('Building from repo root...')
  // 1. Keep FitBuddy/server synchronized with server
  if (fs.existsSync('server')) {
    copyDirSync('server', 'FitBuddy/server')
  }

  // 2. Install FitBuddy frontend dependencies so Vite and Vue are guaranteed present
  console.log('Installing FitBuddy frontend dependencies...')
  execSync('npm install --prefix FitBuddy --include=dev', { stdio: 'inherit' })

  // 3. Compile frontend with Vite
  console.log('Building FitBuddy frontend with Vite...')
  execSync('npm --prefix FitBuddy run build', { stdio: 'inherit' })

  // 4. Duplicate output to root dist
  if (fs.existsSync('FitBuddy/dist')) {
    copyDirSync('FitBuddy/dist', 'dist')
  }
} else {
  console.log('Building from FitBuddy subfolder...')
  execSync('npx vite build', { stdio: 'inherit' })
  if (fs.existsSync('dist')) {
    copyDirSync('dist', 'FitBuddy/dist')
  }
}

console.log('✅ Build output ready in both dist and FitBuddy/dist.')
