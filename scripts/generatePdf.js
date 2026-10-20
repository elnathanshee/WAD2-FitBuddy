import path from 'node:path'
import fs from 'node:fs'
import { marked } from 'marked'
import { chromium } from 'playwright-core'

const MD_PATH = 'C:/Users/User/.gemini/antigravity/brain/e39303b1-e01c-4b42-9051-e33396e91ffb/fitbuddy_project_documentation.md'
const ARTIFACT_PDF_PATH = 'C:/Users/User/.gemini/antigravity/brain/e39303b1-e01c-4b42-9051-e33396e91ffb/FitBuddy_Project_Documentation.pdf'
const PROJECT_PDF_PATH = path.resolve('FitBuddy_Project_Documentation.pdf')
const SCREENSHOTS_DIR = 'C:/Users/User/.gemini/antigravity/brain/e39303b1-e01c-4b42-9051-e33396e91ffb/screenshots'

async function generatePdf() {
  console.log('1. Reading markdown document...')
  let md = fs.readFileSync(MD_PATH, 'utf-8')

  console.log('2. Inlining screenshots as base64 images...')
  const imageFiles = fs.readdirSync(SCREENSHOTS_DIR)
  for (const img of imageFiles) {
    if (img.endsWith('.png')) {
      const fullPath = path.join(SCREENSHOTS_DIR, img).replace(/\\/g, '/')
      const b64 = fs.readFileSync(fullPath).toString('base64')
      const dataUri = `data:image/png;base64,${b64}`
      md = md.replaceAll(fullPath, dataUri)
    }
  }

  console.log('3. Compiling markdown to HTML via marked in Node.js...')
  const htmlBody = marked.parse(md)

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>FitBuddy — Comprehensive Project Documentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1f2937;
      background: #ffffff;
      font-size: 13.5px;
      line-height: 1.65;
    }

    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #111827;
      border-bottom: 2.5px solid #4f46e5;
      padding-bottom: 10px;
      margin-top: 0;
      margin-bottom: 18px;
    }

    h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1e1b4b;
      border-bottom: 1.5px solid #e5e7eb;
      padding-bottom: 8px;
      margin-top: 32px;
      margin-bottom: 14px;
    }

    h3 {
      font-size: 15px;
      font-weight: 600;
      color: #3730a3;
      margin-top: 22px;
      margin-bottom: 10px;
    }

    h4 {
      font-size: 13.5px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    p {
      margin-top: 0;
      margin-bottom: 12px;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 14px;
      padding-left: 24px;
    }

    li {
      margin-bottom: 4px;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 10px;
      border: 1px solid #d1d5db;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      margin: 18px 0;
      display: block;
      page-break-inside: avoid;
    }

    pre {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      padding: 14px 18px;
      overflow-x: auto;
      font-size: 11px;
      line-height: 1.5;
      margin: 16px 0;
      page-break-inside: avoid;
    }

    code {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 11.5px;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border-radius: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #e5e7eb;
      padding: 9px 12px;
      text-align: left;
    }

    th {
      background: #f8fafc;
      font-weight: 600;
      color: #374151;
    }

    tr:nth-child(even) td {
      background: #fafafa;
    }

    blockquote {
      border-left: 4px solid #6366f1;
      margin: 16px 0;
      padding: 10px 16px;
      background: #eef2ff;
      color: #3730a3;
      border-radius: 0 6px 6px 0;
    }

    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 28px 0;
    }

    @media print {
      body {
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      h1, h2, h3 {
        page-break-after: avoid;
      }

      img, table, pre, blockquote {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`

  const previewPath = path.resolve('FitBuddy_Document_Preview.html')
  fs.writeFileSync(previewPath, fullHtml, 'utf-8')
  console.log('4. HTML written to:', previewPath)

  console.log('5. Launching browser to print PDF...')
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage()

  await page.setContent(fullHtml, { waitUntil: 'load' })
  await page.waitForTimeout(1000)

  console.log('6. Generating PDF with A4 margins and page numbering...')
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '16mm',
      right: '16mm',
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-family: \'Segoe UI\', Arial, sans-serif; font-size: 8px; width: 100%; text-align: center; color: #9ca3af; padding-bottom: 8px;">FitBuddy (SMU IS216 WAD2) — Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  })

  fs.writeFileSync(ARTIFACT_PDF_PATH, pdfBuffer)
  fs.writeFileSync(PROJECT_PDF_PATH, pdfBuffer)
  await browser.close()

  console.log('✅ PDF generated successfully!')
  console.log('Artifact PDF:', ARTIFACT_PDF_PATH, `(${pdfBuffer.length} bytes)`)
  console.log('Project Root PDF:', PROJECT_PDF_PATH)
}

generatePdf().catch((err) => {
  console.error('Error generating PDF:', err)
  process.exit(1)
})
