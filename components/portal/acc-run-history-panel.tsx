"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"

type RunFilter = "all" | "rerun" | "import"

interface RunHistoryItem {
  id: string
  runType: "rerun" | "import"
  sourceFormId: string
  mode: string
  startedAt: string
  finishedAt: string | null
  triggeredBy: string | null
  rowsRead: number
  rowsUpserted: number
  rowsUnchanged: number
  attachmentsUpserted: number
  errorsJson: unknown
}

interface RunHistoryResponse {
  items: RunHistoryItem[]
  counts: {
    total: number
    rerun: number
    import: number
  }
  filter: RunFilter
  limit: number
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

function elapsed(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "Running"
  const s = new Date(startedAt).getTime()
  const f = new Date(finishedAt).getTime()
  if (Number.isNaN(s) || Number.isNaN(f) || f < s) return "—"
  const secs = Math.round((f - s) / 1000)
  if (secs < 60) return `${secs}s`
  const min = Math.floor(secs / 60)
  const rem = secs % 60
  return `${min}m ${rem}s`
}

export function AccRunHistoryPanel() {
  const [items, setItems] = useState<RunHistoryItem[]>([])
  const [counts, setCounts] = useState({ total: 0, rerun: 0, import: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<RunFilter>("all")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("filter", filter)
      params.set("limit", "10")
      const res = await fetch(`/api/acc/runs?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to load run history")
      }
      const json = (await res.json()) as RunHistoryResponse
      setItems(json.items || [])
      setCounts(json.counts || { total: 0, rerun: 0, import: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run history")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const summary = useMemo(
    () => [
      { label: "Total", value: counts.total },
      { label: "Reruns", value: counts.rerun },
      { label: "Imports", value: counts.import },
    ],
    [counts],
  )

  return (
    <div className="stack" style={{ gap: "0.8rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        {summary.map((item) => (
          <span
            key={item.label}
            style={{
              padding: "0.3rem 0.6rem",
              borderRadius: 999,
              border: "1px solid var(--pp-slate-300)",
              background: "var(--pp-slate-50)",
              color: "var(--pp-slate-700)",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            {item.label}: {item.value}
          </span>
        ))}
        <div style={{ display: "flex", gap: "0.4rem", marginLeft: "0.4rem", flexWrap: "wrap" }}>
          {[
            { value: "all" as const, label: "All" },
            { value: "rerun" as const, label: "Reruns" },
            { value: "import" as const, label: "Imports" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={filter === opt.value ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setFilter(opt.value)}
              style={{ padding: "0.35rem 0.65rem" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchRuns}
          style={{ minWidth: "2.3rem", paddingInline: "0.6rem", marginLeft: "auto" }}
          aria-label="Refresh run history"
        >
          <RefreshCw style={{ width: "0.85rem", height: "0.85rem" }} />
        </button>
      </div>

      {error ? (
        <div
          style={{
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: "var(--radius-md)",
            padding: "0.7rem 0.85rem",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <AlertCircle style={{ width: "0.95rem", height: "0.95rem" }} />
          <span>{error}</span>
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid var(--pp-slate-200)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "var(--pp-white)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "90px 140px 130px 1fr 110px 100px",
            gap: "0.6rem",
            padding: "0.7rem 0.8rem",
            background: "var(--pp-navy-dark)",
            color: "var(--pp-white)",
            fontSize: "0.76rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span>Type</span>
          <span>Started</span>
          <span>Duration</span>
          <span>Triggered By</span>
          <span>Rows</span>
          <span>Updated</span>
        </div>
        {loading ? (
          <p style={{ margin: 0, padding: "0.8rem", color: "var(--pp-slate-600)" }}>Loading run history...</p>
        ) : null}
        {!loading && items.length === 0 ? (
          <p style={{ margin: 0, padding: "0.8rem", color: "var(--pp-slate-600)" }}>No runs found.</p>
        ) : null}
        {!loading &&
          items.map((row, idx) => {
            const isExpanded = !!expanded[row.id]
            const isRerun = row.runType === "rerun"
            return (
              <div key={row.id} style={{ borderTop: idx === 0 ? "none" : "1px solid var(--pp-slate-100)" }}>
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 140px 130px 1fr 110px 100px",
                    gap: "0.6rem",
                    padding: "0.7rem 0.8rem",
                    width: "100%",
                    border: 0,
                    background: idx % 2 === 0 ? "var(--pp-white)" : "var(--pp-slate-50)",
                    textAlign: "left",
                    cursor: "pointer",
                    alignItems: "center",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    {isExpanded ? <ChevronDown style={{ width: "0.82rem", height: "0.82rem" }} /> : <ChevronRight style={{ width: "0.82rem", height: "0.82rem" }} />}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.2rem 0.45rem",
                        borderRadius: 999,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: isRerun ? "#dbeafe" : "#ecfdf5",
                        color: isRerun ? "#1d4ed8" : "#065f46",
                      }}
                    >
                      {isRerun ? "Rerun" : "Import"}
                    </span>
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>{formatDate(row.startedAt)}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>{elapsed(row.startedAt, row.finishedAt)}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>{row.triggeredBy || "—"}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>{row.rowsRead}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>{row.rowsUpserted}</span>
                </button>
                {isExpanded ? (
                  <div style={{ padding: "0.75rem 0.85rem", background: "#fbfcfd", borderTop: "1px solid var(--pp-slate-100)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.5rem", marginBottom: "0.65rem" }}>
                      <div><strong style={{ fontSize: "0.78rem" }}>Run ID:</strong> <span style={{ fontSize: "0.78rem" }}>{row.id}</span></div>
                      <div><strong style={{ fontSize: "0.78rem" }}>Mode:</strong> <span style={{ fontSize: "0.78rem" }}>{row.mode}</span></div>
                      <div><strong style={{ fontSize: "0.78rem" }}>Source:</strong> <span style={{ fontSize: "0.78rem" }}>{row.sourceFormId}</span></div>
                      <div><strong style={{ fontSize: "0.78rem" }}>Finished:</strong> <span style={{ fontSize: "0.78rem" }}>{formatDate(row.finishedAt)}</span></div>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        maxHeight: "220px",
                        overflow: "auto",
                        background: "var(--pp-slate-900)",
                        color: "#e5e7eb",
                        borderRadius: "6px",
                        padding: "0.6rem",
                        fontSize: "0.75rem",
                        lineHeight: 1.35,
                      }}
                    >
{JSON.stringify(row.errorsJson, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            )
          })}
      </div>
    </div>
  )
}

