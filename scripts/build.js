import fs from 'node:fs'
import { execSync } from 'node:child_process'

console.log('Build script running from:', process.cwd())

if (fs.existsSync('FitBuddy/package.json')) {
  console.log('Building FitBuddy from root directory...')
  execSync('npm --prefix FitBuddy run build', { stdio: 'inherit' })
} else if (fs.existsSync('package.json')) {
  console.log('Building FitBuddy from subfolder...')
  execSync('npm run build', { stdio: 'inherit' })
} else {
  console.error('Error: Could not locate package.json')
  process.exit(1)
}
