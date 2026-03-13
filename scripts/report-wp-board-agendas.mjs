import { fetchWpBoardAgendas, summarizeWpBoardAgendas } from "./lib/wp-board-agendas.mjs"

function printTable(rows) {
  const tableRows = rows.map((row) => ({
    id: row.id,
    meetingDate: row.meetingDateIso || "unknown",
    modified: row.modified,
    title: row.title,
    html: row.hasHtmlContent ? `yes (${row.htmlChars})` : "no",
    file: row.fileUrl ? "yes" : "no",
    taxonomy: row.taxonomy,
  }))

  console.table(tableRows)
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const asJson = args.has("--json")

  const agendas = await fetchWpBoardAgendas()
  const summary = summarizeWpBoardAgendas(agendas)

  if (asJson) {
    console.log(JSON.stringify({ summary, agendas }, null, 2))
    return
  }

  console.log("WordPress Board agenda report")
  console.log(summary)
  printTable(agendas)

  if (agendas.length > 0) {
    console.log("\nSample rows:")
    for (const row of agendas.slice(0, 10)) {
      console.log(`- ${row.meetingDateIso || row.modified} | ${row.id} | ${row.title}`)
      console.log(`  normalized: ${row.normalizedTitle}`)
      console.log(`  html: ${row.hasHtmlContent ? `yes (${row.htmlChars} chars)` : "no"} | file: ${row.fileUrl || "none"}`)
      console.log(`  taxonomy: ${row.taxonomy || "none"} | legacy: ${row.legacyPath || "none"}`)
      console.log(`  link: ${row.link}`)
    }
  }
}

main().catch((error) => {
  console.error("WordPress agenda report failed:", error)
  process.exit(1)
})
