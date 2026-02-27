// app/(portal)/resident-portal/newsletters/page.tsx

"use client"

import { useState } from "react"
import { Newspaper, Download, ChevronDown, Archive } from "lucide-react"

/* ── Newsletter Data ──────────────────────────────────────── */

const CURRENT_ISSUE = {
  month: "March",
  year: "2026",
  description: "Community updates, upcoming events, and important announcements for residents.",
  url: "https://drive.google.com/file/d/1rWRsZgEmwLrkjFEhX0Jmr74GMb3ZBQds/view?usp=sharing",
}

const newsletters2026 = [
  { month: "March", url: "https://drive.google.com/file/d/1rWRsZgEmwLrkjFEhX0Jmr74GMb3ZBQds/view?usp=sharing" },
  { month: "February", url: "https://drive.google.com/file/d/1jQFBYUGweAfa2-HmX9SHXUiKKiU0Gi8v/view?usp=sharing" },
  { month: "January", url: "https://drive.google.com/file/d/1XZp77uuREs1r_9SS8HBEso2umF735AZ8/view?usp=sharing" },
]

const newsletters2025 = [
  { month: "December", url: "https://drive.google.com/file/d/1m-LwLjMK9LWPo0bVRUf9qQIqSb5Eb7C3/view?usp=sharing" },
  { month: "November", url: "https://drive.google.com/file/d/1-ENS8T72bh5OeP-4GBe6J3_eSm76e6gs/view?usp=sharing" },
  { month: "October", url: "https://drive.google.com/file/d/1E4iVI_nCLGRA8cfwxUOjKN7dGUblsYmx/view?usp=sharing" },
  { month: "September", url: "https://drive.google.com/file/d/1nwzxJyX7P0M09_mS_Tyg1troJFMn88Pa/view?usp=share_link" },
  { month: "August", url: "https://drive.google.com/file/d/1LfGkxkHy4cKU4zRQCcxq7PW8fAAcKC_m/view?usp=sharing" },
  { month: "July", url: "https://drive.google.com/file/d/1VXjcAEZR9LLkRu0Zxo56toy3qhzYIUv6/view?usp=sharing" },
  { month: "June", url: "https://drive.google.com/file/d/1MsYP1NTEW1dintBF1_t1XukJQDiW5svp/view?usp=sharing" },
  { month: "May", url: "https://drive.google.com/file/d/1jYGIsy4cERLDk_plzUh7QDEQOdUCp2Fs/view?usp=sharing" },
  { month: "April", url: "https://drive.google.com/file/d/14Ida58nSDpK-Q0iPQ0_ZQLC89VndxOlQ/view?usp=sharing" },
  { month: "March", url: "https://drive.google.com/file/d/1KjFd0dDCPMVhVSFAa3p-wNN9SGyge_kZ/view?usp=sharing" },
  { month: "February", url: "https://drive.google.com/file/d/1bL2vxeZWcdji_wGEvG4_J6-5GRzmk-jy/view?usp=sharing", note: "Cover displays 'January' — this is the February issue" },
  { month: "January", url: "https://drive.google.com/file/d/1LLTFTcz00dDWSzVtEfj8NclV-qA0oLw-/view?usp=sharing" },
]

const newsletters2024 = [
  { month: "December", url: "https://drive.google.com/file/d/1v6n93jOtNdXjNL0KstdI7JiuYYOSpe6t/view?usp=sharing" },
  { month: "November", url: "https://drive.google.com/file/d/1L8F3_hYRIevH2lEFT1K3WIYHQVc24M7Z/view?usp=sharing" },
  { month: "October", url: "https://drive.google.com/file/d/11yyrbkiVihQVB8Kqto5AEP54L3ypZ_mm/view?usp=sharing" },
  { month: "September", url: "https://drive.google.com/file/d/1TWKjOLaQhVTEWLFl3kiqpdzB7unczy2j/view?usp=sharing" },
  { month: "August", url: "https://drive.google.com/file/d/125Pjjz4qb8Pb5NSPelAnAOcF4JuERTvq/view?usp=sharing" },
  { month: "July", url: "https://drive.google.com/file/d/1iIkZIHSvkFOrUcHgEsl2daxOS2BNi11k/view?usp=sharing" },
  { month: "June", url: "https://drive.google.com/file/d/14kbDWIHPe2tbUmaYPDU0xkDMvq-cKejP/view?usp=sharing" },
  { month: "May", url: "https://drive.google.com/file/d/1Ie8m9WPyD_yRhud191VLzykSBU9OaKMD/view?usp=sharing" },
  { month: "April", url: "https://drive.google.com/file/d/14dZHmIVCWpxCK4es1v_m9HGqKrxGFV0o/view?usp=sharing" },
  { month: "March", url: "https://drive.google.com/file/d/11_aEjUaB15gsQOUBy0UxfTZh7DYe7wo8/view?usp=sharing" },
  { month: "February", url: "https://drive.google.com/file/d/1F5Mxf8hN8rlTSgQyWxrIKHAomqp0QAVQ/view?usp=sharing" },
  { month: "January", url: "https://drive.google.com/file/d/1PHAgF-3nww6bmpllGkpdmBKqhCy9Ub80/view?usp=sharing" },
]

const newsletters2023 = [
  { month: "December", url: "https://drive.google.com/file/d/1gsN_VU471GDt4CouKCYWD9_qZvEdH1xZ/view?usp=sharing" },
  { month: "November", url: "https://drive.google.com/file/d/1_PzRL7vQ14FBJeBvg--_zgPDlCvIyEVp/view?usp=sharing" },
  { month: "October", url: "https://drive.google.com/file/d/1Utx4qvoofW3ueTJLYC7XDpW-GmsKdV4c/view?usp=sharing" },
  { month: "September", url: "https://drive.google.com/file/d/12GwVlw7j344wLaj_dUg6O_zpmlKTeyA5/view?usp=sharing" },
  { month: "August", url: "https://drive.google.com/file/d/1MaLeW7Gw_0wzYHeej3CeTfE3C_O6_Mwd/view?usp=sharing" },
  { month: "July", url: "https://drive.google.com/file/d/13cyQlCWps91Df1LDU6YRC8VcV9SDm9iR/view?usp=sharing" },
  { month: "June", url: "https://drive.google.com/file/d/1_0pA7F1SJDYqikZULfbWjzCtgOJAo4_G/view?usp=sharing" },
  { month: "May", url: "https://drive.google.com/file/d/1iJZDxnJongw7-T3drRUvNo4sOFc9ECWX/view?usp=sharing" },
  { month: "April", url: "https://drive.google.com/file/d/1fCt-4oB2khV_ldjxf5hu1k72VQdMQBME/view?usp=sharing" },
  { month: "March", url: "https://drive.google.com/file/d/19y5ij3FrBkyLQlazsbVNo5KLRVp7zBJk/view?usp=sharing" },
  { month: "February", url: "https://drive.google.com/file/d/1ZB3ZKOKhGoOU9MJy0y3teXsNjfKjGczE/view?usp=share_link" },
  { month: "January", url: "https://drive.google.com/file/d/1pWfWdm2mprFDJjE5EekF0NLhjXLcw5dW/view?usp=sharing" },
]

const newsletters2022 = [
  { month: "December", url: "https://drive.google.com/file/d/1ppIUV15spzcaHV2GVXMENjwxYoGX297a/view?usp=sharing" },
  { month: "November", url: "https://drive.google.com/file/d/1aB9A_CSL7nz1YYYq8lcXrzVjHYNvW1ZC/view?usp=sharing" },
  { month: "October", url: "https://drive.google.com/file/d/1i_z2VAvcmfZ7vz_snk5u6OaCoI038jfX/view?usp=sharing" },
  { month: "September", url: "https://drive.google.com/file/d/1w9d3xiYM-2FFYZq5VMXzbHyLHwWwgyqd/view?usp=sharing" },
  { month: "August", url: "https://drive.google.com/file/d/12rMlgK5ODC4AjGSiEUU10McbG7FwiISk/view?usp=sharing" },
  { month: "July", url: "https://drive.google.com/file/d/1gFnXf-M6QVUR9I9XyKlJlR-bYhKirt9v/view?usp=sharing" },
  { month: "June", url: "https://drive.google.com/file/d/1nsa59Kr5zFnYSyzJvrqohbqNl30Y2GoL/view?usp=sharing" },
  { month: "May", url: "https://drive.google.com/file/d/1BXguRTZDiKIM5WSBAKeVtCFzCgBtBV3I/view?usp=sharing" },
  { month: "April", url: "https://drive.google.com/file/d/1UTC4nd53XgXbtkXafXVmWmbf5TPbnFNC/view?usp=sharing" },
  { month: "March", url: "https://drive.google.com/file/d/1XEI6vnqxYVw5_E3RvL_hKlLV2aWLHSsO/view?usp=sharing" },
  { month: "February", url: "https://drive.google.com/file/d/1aCquZ2nIXJhslwImM32jVPIaXR6lRpHI/view?usp=sharing" },
  { month: "January", url: "https://drive.google.com/file/d/1uVQ_oY5ebzTfswiQp0jeieEVjJm5x7cZ/view?usp=sharing" },
]

const newsletters2021 = [
  { month: "December", url: "https://drive.google.com/file/d/1IXOoTn5av4Pv7eUl-fWvtFJgKyOLBZww/view?usp=sharing" },
  { month: "November", url: "https://drive.google.com/file/d/1wr6hi7gUQRdh54jgIucOKe_m1XE6jWAO/view?usp=sharing" },
  { month: "October", url: "https://drive.google.com/file/d/16Y1wlhT6XY6Nt9b5XEafTV8h_vEEFHkU/view?usp=sharing" },
  { month: "September", url: "https://drive.google.com/file/d/19saclzddwpDZSh_KIxrxw46pP0sPoUVU/view?usp=sharing" },
  { month: "August", url: "https://drive.google.com/file/d/1rLRLAK43jebBlBqQy6Z6IqPqFSp-dkr1/view?usp=sharing" },
  { month: "July", url: "https://drive.google.com/file/d/1jclZR4Y35icupef53jjW6cwQlR8HpKFh/view?usp=sharing" },
  { month: "June", url: "https://drive.google.com/file/d/1wq5X3SLYTtFmbRe2Od6nwjlBsqisyIuF/view?usp=sharing" },
  { month: "May", url: "https://drive.google.com/file/d/1HZSHLDUDC8P32dicN4TwKCbwhYBqHckR/view?usp=sharing" },
  { month: "April", url: "https://drive.google.com/file/d/1AYs8VtSDXC5gikbDtGYzZK_ZL-D0d3RM/view?usp=sharing" },
  { month: "March", url: "https://drive.google.com/file/d/1MRK5HmNX4lIb58Jrj46dS98--tB6oNPb/view?usp=sharing" },
  { month: "February", url: "https://drive.google.com/file/d/1ctLcYcwmAvPcmLcRvy-jWaR5J6V-Be3X/view?usp=sharing" },
  { month: "January", url: "https://drive.google.com/file/d/1uQP1QKm_rmKOTCCMtPzUlsYCT8aIYfPp/view?usp=sharing" },
]

/* ── Page ─────────────────────────────────────────────────── */

export default function NewslettersPage() {
  const [year2026Open, setYear2026Open] = useState(true)
  const [year2025Open, setYear2025Open] = useState(false)
  const [year2024Open, setYear2024Open] = useState(false)
  const [year2023Open, setYear2023Open] = useState(false)
  const [year2022Open, setYear2022Open] = useState(false)
  const [year2021Open, setYear2021Open] = useState(false)

  return (
    <>

      {/* ── Hero ── */}
      <section
        className="hero-section"
        style={{ background: "var(--pp-navy-dark)" }}
      >
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Newspaper style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Community Newsletters</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Stay informed with monthly updates covering community news, upcoming events, committee reports,
            and important announcements.
          </p>
        </div>
      </section>

      {/* ── Introduction ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
            Pristine Place publishes a monthly newsletter delivered to the door of all residents. Digital copies
            are available below for easy access, printing, or sharing.
          </p>
        </div>
      </section>

      {/* ── Current Issue ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <h2 style={{ color: "var(--pp-navy-dark)" }}>Current Issue</h2>

            <div
              className="card"
              style={{
                padding: "var(--space-l)",
                borderLeft: "4px solid var(--pp-gold)",
                background: "linear-gradient(135deg, var(--pp-white) 0%, #fffbeb 100%)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", marginBottom: "var(--space-2xs)" }}>
                    <Newspaper style={{ width: "1.5rem", height: "1.5rem", color: "var(--pp-navy-dark)" }} />
                    <h3 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                      {CURRENT_ISSUE.month} {CURRENT_ISSUE.year}
                    </h3>
                  </div>
                  <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                    {CURRENT_ISSUE.description}
                  </p>
                </div>

                <a
                  href={CURRENT_ISSUE.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--pp-navy-dark)",
                    color: "var(--pp-white)",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    textDecoration: "none",
                    alignSelf: "flex-start",
                  }}
                >
                  <Download style={{ width: "1rem", height: "1rem" }} />
                  Read Now (PDF)
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Previous Issues ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <h2 style={{ color: "var(--pp-navy-dark)" }}>Previous Issues</h2>

            {/* 2026 */}
            <YearAccordion
              year="2026"
              newsletters={newsletters2026}
              isOpen={year2026Open}
              onToggle={() => setYear2026Open(!year2026Open)}
            />

            {/* 2025 */}
            <YearAccordion
              year="2025"
              newsletters={newsletters2025}
              isOpen={year2025Open}
              onToggle={() => setYear2025Open(!year2025Open)}
            />

            {/* 2024 */}
            <YearAccordion
              year="2024"
              newsletters={newsletters2024}
              isOpen={year2024Open}
              onToggle={() => setYear2024Open(!year2024Open)}
            />

            {/* 2023 */}
            <YearAccordion
              year="2023"
              newsletters={newsletters2023}
              isOpen={year2023Open}
              onToggle={() => setYear2023Open(!year2023Open)}
            />

            {/* 2022 */}
            <YearAccordion
              year="2022"
              newsletters={newsletters2022}
              isOpen={year2022Open}
              onToggle={() => setYear2022Open(!year2022Open)}
            />

            {/* 2021 */}
            <YearAccordion
              year="2021"
              newsletters={newsletters2021}
              isOpen={year2021Open}
              onToggle={() => setYear2021Open(!year2021Open)}
            />

          </div>
        </div>
      </section>

      {/* ── Historical Archive ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div
            className="card"
            style={{
              padding: "var(--space-l)",
              borderLeft: "4px solid var(--pp-slate-300)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-m)" }}>
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "50%",
                  background: "var(--pp-slate-600)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Archive style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-white)" }} />
              </div>
              <div className="stack-xs">
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Historical Archive (2008–2020)
                </h3>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                  Looking for an older issue? Browse the full archive of newsletters from 2008 through 2020,
                  organized by year.
                </p>
                <a
                  href="https://drive.google.com/drive/folders/1YhkXBMrivSDoKGki2i8G3yoU-LpwcT2U"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fluid-base font-semibold"
                  style={{
                    color: "var(--pp-navy-dark)",
                    textDecoration: "underline",
                    marginTop: "var(--space-xs)",
                  }}
                >
                  View Historical Archive →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  )
}

/* ── Year Accordion Component ───────────────────────────── */

function YearAccordion({
  year,
  newsletters,
  isOpen,
  onToggle,
}: {
  year: string
  newsletters: Array<{ month: string; url: string; note?: string }>
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        border: "1px solid var(--pp-slate-200)",
      }}
    >
      {/* Accordion Header */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-m) var(--space-l)",
          background: isOpen ? "var(--pp-navy-dark)" : "var(--pp-white)",
          color: isOpen ? "var(--pp-white)" : "var(--pp-navy-dark)",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <h3 className="text-step-1 font-bold">{year}</h3>
        <ChevronDown
          style={{
            width: "1.25rem",
            height: "1.25rem",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div
          style={{
            padding: "var(--space-m) var(--space-l)",
            background: "var(--pp-white)",
            borderTop: "1px solid var(--pp-slate-200)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 12rem), 1fr))",
              gap: "var(--space-s)",
            }}
          >
            {newsletters.map((newsletter) => (
              <div key={newsletter.month} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <a
                  href={newsletter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fluid-sm font-semibold"
                  style={{
                    color: "var(--pp-navy-dark)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.5rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--pp-slate-200)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--pp-slate-50)"
                    e.currentTarget.style.borderColor = "var(--pp-navy-dark)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.borderColor = "var(--pp-slate-200)"
                  }}
                >
                  <Download style={{ width: "0.875rem", height: "0.875rem", flexShrink: 0 }} />
                  {newsletter.month}
                </a>
                {newsletter.note && (
                  <p
                    className="text-fluid-xs"
                    style={{ color: "var(--pp-slate-500)", fontStyle: "italic", paddingLeft: "0.5rem" }}
                  >
                    {newsletter.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
