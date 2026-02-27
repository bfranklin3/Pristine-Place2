"use client"

import { useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { CheckCircle2, ClipboardCheck, FileText, Info, Shield, Upload, Wrench } from "lucide-react"

type WorkType = "paint" | "roof" | "fence" | "landscaping" | "other" | ""
type RoleType = "owner" | "authorized_rep" | ""

type FormState = {
  ownerName: string
  streetAddress: string
  ownerPhone: string
  ownerEmail: string
  ownerEmailConfirm: string
  phase: string
  lot: string
  role: RoleType
  authorizedRepName: string
  workType: WorkType
  projectDescription: string
  startDate: string
  completionDate: string
  hasSupportingDocs: "no" | "yes" | ""
}

const initialForm: FormState = {
  ownerName: "",
  streetAddress: "",
  ownerPhone: "",
  ownerEmail: "",
  ownerEmailConfirm: "",
  phase: "",
  lot: "",
  role: "",
  authorizedRepName: "",
  workType: "",
  projectDescription: "",
  startDate: "",
  completionDate: "",
  hasSupportingDocs: "",
}

const fullTerms = [
  "Any exterior or grounds modification requires ACC application and approval before work begins.",
  "Applications are free, but work started without approval may result in a $1,000 fine.",
  "Submit complete plans/specs and visual references (photos/material samples) with your request.",
  "ACC decisions are communicated by phone or email to the homeowner.",
  "No construction, improvement, or alteration may begin without written or emailed ACC approval.",
  "ACC may inspect work during construction to verify conformance with the approved request.",
  "If project scope changes before completion, submit a new change request for review.",
  "If you are not the legal owner, owner consent and written authorization are required.",
  "Maintain site cleanliness and restore impacted common areas within 14 days of completion.",
  "On completion, return the permit to the ACC mailbox and provide completion date for final inspection.",
]

export function AccSubmitPageClient() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showFullTerms, setShowFullTerms] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const workTypeCards = [
    { value: "paint" as WorkType, icon: "🎨", label: "Paint" },
    { value: "roof" as WorkType, icon: "🏗️", label: "Roof" },
    { value: "fence" as WorkType, icon: "🧱", label: "Fence" },
    { value: "landscaping" as WorkType, icon: "🌿", label: "Landscaping" },
    { value: "other" as WorkType, icon: "✏️", label: "Other" },
  ]

  const sidebarChecklist = useMemo(
    () => [
      "Project details (scope, dimensions, materials)",
      "Photos of the work area",
      "Material specs / brochures",
      "Site plan with marked location",
      "Contractor details (if applicable)",
      "Expected start and completion dates",
    ],
    [],
  )

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)

    if (!agreedToTerms) {
      setStatus({ type: "error", message: "Please acknowledge the Terms & Conditions before submitting." })
      return
    }

    const requiredMissing = [
      !form.ownerName.trim(),
      !form.streetAddress.trim(),
      !form.ownerPhone.trim(),
      !form.ownerEmail.trim(),
      !form.ownerEmailConfirm.trim(),
      !form.phase.trim(),
      !form.lot.trim(),
      !form.role,
      !form.workType,
      !form.projectDescription.trim(),
      !form.startDate,
      !form.completionDate,
      !form.hasSupportingDocs,
    ].some(Boolean)

    if (requiredMissing) {
      setStatus({ type: "error", message: "Please complete all required fields before submitting." })
      return
    }

    if (form.ownerEmail.trim().toLowerCase() !== form.ownerEmailConfirm.trim().toLowerCase()) {
      setStatus({ type: "error", message: "Owner email and confirm email do not match." })
      return
    }

    if (form.role === "authorized_rep" && !form.authorizedRepName.trim()) {
      setStatus({ type: "error", message: "Please enter the authorized representative name." })
      return
    }

    setStatus({
      type: "success",
      message:
        "Request captured. Final submit integration is the next step; for immediate processing please continue using the current ACC WordPress workflow.",
    })
  }

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div className="hero-overlay" style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }} />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Shield style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Submit ACC Request</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Planning an exterior modification? Submit your request here for ACC review.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)", paddingTop: "2rem" }}>
        <div className="container" style={{ maxWidth: "74rem", display: "grid", gap: "var(--space-l)" }}>
          <div
            className="card"
            style={{
              border: "1.5px solid #b7e4c7",
              padding: "var(--space-l)",
              background: "#f8fff9",
            }}
          >
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.7, marginBottom: "0.9rem" }}>
              Before you begin, review the requirements for your project type below. Submitting this form confirms your agreement to the community Terms &amp; Conditions.
            </p>

            <button
              type="button"
              onClick={() => setShowFullTerms((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.7rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "2px solid #2fa968",
                background: "var(--pp-white)",
                color: "#13361d",
                fontWeight: 800,
                fontSize: "1.1rem",
                cursor: "pointer",
              }}
            >
              <FileText style={{ width: "1.15rem", height: "1.15rem" }} />
              <span>Review the Pristine Place Terms and Conditions</span>
              <span style={{ marginLeft: "0.35rem", fontSize: "1.1rem" }}>{showFullTerms ? "▴" : "▾"}</span>
            </button>

            <div
              style={{
                marginTop: showFullTerms ? "1rem" : "0",
                maxHeight: showFullTerms ? "90rem" : "0",
                overflow: "hidden",
                opacity: showFullTerms ? 1 : 0,
                transition: "all 0.25s ease",
              }}
            >
              <h2 style={{ color: "var(--pp-navy-dark)", marginBottom: "0.8rem" }}>Architectural Control Committee (ACC) Guidelines</h2>
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", marginBottom: "0.5rem" }}>
                Please read this summary before submitting your request.
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.7, color: "var(--pp-slate-700)" }}>
                <li><strong>Get Approval First:</strong> No construction may begin until ACC approval is issued in writing or by email.</li>
                <li><strong>Submit Details:</strong> Include plans, photos, and material specs with your request.</li>
                <li><strong>The Fine:</strong> Work started without approval may result in an automatic <strong>$1,000 fine</strong>.</li>
                <li><strong>Cleanliness & Restoration:</strong> Keep the site clean and restore affected common areas within 14 days of completion.</li>
                <li><strong>Completion Report:</strong> Return the permit and mark the completion date when work is finished.</li>
              </ul>

              <details style={{ marginTop: "0.9rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--pp-navy-dark)" }}>Full Terms &amp; Conditions</summary>
                <ul style={{ marginTop: "0.65rem", paddingLeft: "1.1rem", lineHeight: 1.7, color: "var(--pp-slate-700)" }}>
                  {fullTerms.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "var(--space-l)",
            }}
            className="acc-submit-grid"
          >
            <div className="card" style={{ padding: "var(--space-l)", background: "#fffef9" }}>
              <h2 style={{ color: "var(--pp-navy-dark)", marginBottom: "0.35rem" }}>ACC Change Request Form</h2>
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                Please acknowledge the Terms and Conditions checkbox below, then complete your project request.
              </p>

              <form onSubmit={onSubmit} style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
                <div
                  style={{
                    border: "1px solid #d4e8da",
                    borderRadius: "var(--radius-md)",
                    background: "#f8fffb",
                    padding: "0.8rem 0.9rem",
                  }}
                >
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-slate-700)", marginBottom: "0.45rem" }}>
                    Terms & Conditions
                  </p>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} style={{ marginTop: "0.2rem" }} />
                    <span style={{ color: "var(--pp-slate-700)", fontWeight: 600, lineHeight: 1.5 }}>
                      I hereby acknowledge that I have read and consent to the Pristine Place Terms & Conditions.
                    </span>
                  </label>
                </div>

                <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "0.9rem" }}>
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", marginBottom: "0.55rem" }}>
                    Your Information
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.8rem" }}>
                    <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                      <label style={{ display: "grid", gap: "0.3rem" }}>
                        <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Owner&apos;s Name <span style={{ color: "#b91c1c" }}>*</span></span>
                        <input value={form.ownerName} onChange={(e) => updateField("ownerName", e.target.value)} required style={inputStyle} />
                      </label>
                      <label style={{ display: "grid", gap: "0.3rem" }}>
                        <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Street Address <span style={{ color: "#b91c1c" }}>*</span></span>
                        <input value={form.streetAddress} onChange={(e) => updateField("streetAddress", e.target.value)} required style={inputStyle} />
                        <small style={helperStyle}>Street address only — no need to include city or state.</small>
                      </label>
                    </div>

                    <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                      <label style={{ display: "grid", gap: "0.3rem" }}>
                        <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Owner&apos;s Phone Number <span style={{ color: "#b91c1c" }}>*</span></span>
                        <input value={form.ownerPhone} onChange={(e) => updateField("ownerPhone", e.target.value)} required style={inputStyle} />
                        <small style={helperStyle}>Best phone number for contact.</small>
                      </label>
                      <label style={{ display: "grid", gap: "0.3rem" }}>
                        <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Owner&apos;s Email Address <span style={{ color: "#b91c1c" }}>*</span></span>
                        <input type="email" value={form.ownerEmail} onChange={(e) => updateField("ownerEmail", e.target.value)} required style={inputStyle} />
                      </label>
                    </div>

                    <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                      <label style={{ display: "grid", gap: "0.3rem" }}>
                        <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Confirm Email <span style={{ color: "#b91c1c" }}>*</span></span>
                        <input type="email" value={form.ownerEmailConfirm} onChange={(e) => updateField("ownerEmailConfirm", e.target.value)} required style={inputStyle} />
                      </label>
                      <div />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "0.9rem" }}>
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", marginBottom: "0.55rem" }}>
                    Property Details
                  </p>
                  <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Phase <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input value={form.phase} onChange={(e) => updateField("phase", e.target.value)} required style={inputStyle} />
                      <small style={helperStyle}>The section or phase of Pristine Place where your home is located.</small>
                    </label>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Lot# <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input value={form.lot} onChange={(e) => updateField("lot", e.target.value)} required style={inputStyle} />
                    </label>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "0.9rem" }}>
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", marginBottom: "0.55rem" }}>
                    About Your Project
                  </p>

                  <label style={{ display: "grid", gap: "0.3rem", marginBottom: "0.8rem" }}>
                    <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Your role <span style={{ color: "#b91c1c" }}>*</span></span>
                    <div style={{ display: "grid", gap: "0.45rem" }}>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="role" value="owner" checked={form.role === "owner"} onChange={() => updateField("role", "owner")} />
                        <span>I am the owner</span>
                      </label>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="role" value="authorized_rep" checked={form.role === "authorized_rep"} onChange={() => updateField("role", "authorized_rep")} />
                        <span>I am an authorized representative acting on the owner&apos;s behalf</span>
                      </label>
                    </div>
                  </label>

                  {form.role === "authorized_rep" ? (
                    <label style={{ display: "grid", gap: "0.3rem", marginBottom: "0.8rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Authorized Representative Name <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input value={form.authorizedRepName} onChange={(e) => updateField("authorizedRepName", e.target.value)} style={inputStyle} required />
                    </label>
                  ) : null}

                  <label style={{ display: "grid", gap: "0.45rem", marginBottom: "0.8rem" }}>
                    <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Type of work requested <span style={{ color: "#b91c1c" }}>*</span></span>
                    <div className="acc-work-grid" style={{ display: "grid", gap: "0.5rem" }}>
                      {workTypeCards.map((item) => {
                        const active = form.workType === item.value
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => updateField("workType", item.value)}
                            style={{
                              borderRadius: "var(--radius-md)",
                              border: active ? "2px solid var(--pp-navy-dark)" : "1.5px solid var(--pp-slate-200)",
                              background: active ? "#f0fbf5" : "var(--pp-white)",
                              color: "var(--pp-slate-700)",
                              fontWeight: 700,
                              padding: "0.55rem 0.6rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <span aria-hidden>{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </label>

                  <label style={{ display: "grid", gap: "0.3rem", marginBottom: "0.8rem" }}>
                    <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Project Description <span style={{ color: "#b91c1c" }}>*</span></span>
                    <textarea
                      value={form.projectDescription}
                      onChange={(e) => updateField("projectDescription", e.target.value)}
                      required
                      rows={7}
                      placeholder="Describe your scope of work, materials, dimensions, location on property, and finish details."
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                    />
                  </label>

                  <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Estimated Start Date <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input type="date" value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} required style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Estimated Completion Date <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input type="date" value={form.completionDate} onChange={(e) => updateField("completionDate", e.target.value)} required style={inputStyle} />
                    </label>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "0.9rem" }}>
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", marginBottom: "0.55rem" }}>
                    Supporting Documents
                  </p>
                  <label style={{ display: "grid", gap: "0.35rem" }}>
                    <span className="text-fluid-sm" style={{ fontWeight: 600 }}>
                      Do you have supporting documents to attach? (photos, site plans, material specs) <span style={{ color: "#b91c1c" }}>*</span>
                    </span>
                    <div style={{ display: "grid", gap: "0.45rem" }}>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="docs" value="no" checked={form.hasSupportingDocs === "no"} onChange={() => updateField("hasSupportingDocs", "no")} />
                        <span>Not at this time</span>
                      </label>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="docs" value="yes" checked={form.hasSupportingDocs === "yes"} onChange={() => updateField("hasSupportingDocs", "yes")} />
                        <span>Yes, I am prepared to submit my documents now.</span>
                      </label>
                    </div>
                  </label>

                  {form.hasSupportingDocs === "yes" ? (
                    <label style={{ display: "grid", gap: "0.3rem", marginTop: "0.8rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>
                        Upload supporting files
                      </span>
                      <input type="file" multiple style={inputStyle} />
                      <small style={helperStyle}>Accepted formats: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX</small>
                    </label>
                  ) : null}
                </div>

                {status ? (
                  <div
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: status.type === "success" ? "1px solid #86efac" : "1px solid #fca5a5",
                      background: status.type === "success" ? "#f0fdf4" : "#fef2f2",
                      color: status.type === "success" ? "#166534" : "#991b1b",
                      padding: "0.7rem 0.8rem",
                    }}
                  >
                    {status.message}
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--pp-slate-200)", paddingTop: "1rem" }}>
                  <button
                    type="submit"
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: "var(--pp-navy-dark)",
                      color: "var(--pp-white)",
                      padding: "0.72rem 1.2rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    <ClipboardCheck style={{ width: "1rem", height: "1rem" }} />
                    Submit My Request
                  </button>
                  <button
                    type="button"
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--pp-slate-300)",
                      background: "var(--pp-white)",
                      color: "var(--pp-slate-700)",
                      padding: "0.68rem 1.1rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Save & Continue Later
                  </button>
                </div>
                <small style={{ ...helperStyle, marginTop: "-0.3rem" }}>
                  Not ready? Save your progress and return later.
                </small>
              </form>
            </div>

            <aside className="card" style={{ padding: "var(--space-l)", background: "#fcfff9" }}>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <Info style={{ width: "1.1rem", height: "1.1rem", color: "var(--pp-navy-dark)" }} />
                  <h3 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>ACC Information</h3>
                </div>

                <div style={sideCardStyle}>
                  <p style={sideTitleStyle}>Review Timeline</p>
                  <ul style={sideListStyle}>
                    <li>Online submissions are usually reviewed within one week.</li>
                    <li>Decisions are communicated by email/phone.</li>
                    <li>Paper submissions are reviewed at monthly ACC meetings.</li>
                  </ul>
                </div>

                <div style={sideCardStyle}>
                  <p style={sideTitleStyle}>Before You Submit</p>
                  <ul style={sideListStyle}>
                    {sidebarChecklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div style={sideCardStyle}>
                  <p style={sideTitleStyle}>Need Help?</p>
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", margin: 0 }}>
                    Questions about your application or the ACC process?
                  </p>
                  <p style={{ margin: "0.4rem 0 0 0", fontWeight: 700, color: "#0f8c42" }}>Email: acc@pristineplace.us</p>
                </div>

                <Link
                  href="/resident-portal/acc#architectural-guidelines"
                  style={{
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid #b7d8be",
                    background: "var(--pp-white)",
                    color: "var(--pp-slate-700)",
                    padding: "0.68rem 0.9rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    textAlign: "center",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Wrench style={{ width: "0.95rem", height: "0.95rem" }} />
                  View Architectural Guidelines
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <style jsx>{`
        .acc-submit-grid {
          grid-template-columns: minmax(0, 1fr) 18rem;
          align-items: start;
        }
        .acc-two-col {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
        .acc-work-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        @media (max-width: 1100px) {
          .acc-submit-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 760px) {
          .acc-two-col {
            grid-template-columns: minmax(0, 1fr);
          }
          .acc-work-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </>
  )
}

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: "var(--radius-sm)",
  border: "1.5px solid var(--pp-slate-200)",
  background: "var(--pp-white)",
  padding: "0.58rem 0.62rem",
  fontSize: "0.92rem",
  color: "var(--pp-slate-700)",
}

const helperStyle: CSSProperties = {
  color: "var(--pp-slate-500)",
  fontSize: "0.78rem",
}

const radioLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.45rem",
  color: "var(--pp-slate-700)",
}

const sideCardStyle: CSSProperties = {
  borderRadius: "var(--radius-md)",
  border: "1px solid #cfe7d5",
  background: "#f7fff8",
  padding: "0.75rem 0.8rem",
  display: "grid",
  gap: "0.5rem",
}

const sideTitleStyle: CSSProperties = {
  margin: 0,
  fontWeight: 800,
  color: "var(--pp-navy-dark)",
}

const sideListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "1.1rem",
  color: "var(--pp-slate-700)",
  lineHeight: 1.6,
  fontSize: "0.9rem",
}
