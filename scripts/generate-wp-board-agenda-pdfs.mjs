import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"
import { fetchWpBoardAgendas, summarizeWpBoardAgendas } from "./lib/wp-board-agendas.mjs"
import { renderBoardAgendaPdfHtml } from "./templates/board-agenda-pdf-template.mjs"

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "tmp", "wp-board-agenda-pdfs")

function getArgValue(flag) {
  const exact = process.argv.find((arg) => arg.startsWith(`${flag}=`))
  if (exact) return exact.slice(flag.length + 1)
  const index = process.argv.indexOf(flag)
  if (index >= 0) return process.argv[index + 1]
  return null
}

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function main() {
  const outputDir = getArgValue("--output") || DEFAULT_OUTPUT_DIR
  const limitRaw = getArgValue("--limit")
  const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 0) : null
  const saveHtml = process.argv.includes("--save-html")

  const agendas = await fetchWpBoardAgendas()
  const selected = limit ? agendas.slice(0, limit) : agendas
  const summary = summarizeWpBoardAgendas(selected)

  if (selected.length === 0) {
    console.log("No WordPress board agendas found.")
    return
  }

  await ensureDir(outputDir)

  const browser = await chromium.launch({ headless: true })

  try {
    const generated = []

    for (const agenda of selected) {
      const page = await browser.newPage()
      const html = renderBoardAgendaPdfHtml(agenda)
      const baseName = sanitizeFileName(agenda.outputBasename || `board-meeting-agenda-${agenda.id}`)
      const pdfPath = path.join(outputDir, `${baseName}.pdf`)
      const htmlPath = path.join(outputDir, `${baseName}.html`)

      await page.setContent(html, { waitUntil: "load" })
      await page.pdf({
        path: pdfPath,
        format: "Letter",
        printBackground: true,
        preferCSSPageSize: true,
      })

      if (saveHtml) {
        await fs.writeFile(htmlPath, html, "utf8")
      }

      await page.close()

      generated.push({
        id: agenda.id,
        title: agenda.title,
        normalizedTitle: agenda.normalizedTitle,
        meetingDateIso: agenda.meetingDateIso,
        meetingTimeLabel: agenda.meetingTimeLabel,
        outputBasename: baseName,
        pdfPath,
        htmlPath: saveHtml ? htmlPath : null,
        sourceLink: agenda.link,
        hadExistingFile: Boolean(agenda.fileUrl),
      })

      console.log(`Generated ${baseName}.pdf`)
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      outputDir,
      summary,
      generated,
    }

    const manifestPath = path.join(outputDir, "manifest.json")
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

    console.log(`\nGenerated ${generated.length} agenda PDF(s) in ${outputDir}`)
    console.log(`Manifest written to ${manifestPath}`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error("WordPress board agenda PDF generation failed:", error)
  process.exit(1)
})
