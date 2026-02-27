// app/(portal)/resident-portal/report-issue/page.tsx
"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, KeyRound, Trees, Building2, ShieldAlert, Users, Shield, HelpCircle, Send } from "lucide-react"
import { ISSUE_CATEGORIES, type IssueCategory } from "@/lib/email/routing-config"
import { submitIssueReport, type ReportIssueFormData } from "@/app/actions/report-issue"

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  KeyRound,
  Trees,
  Building2,
  ShieldAlert,
  Users,
  Shield,
  HelpCircle,
}

export default function ReportIssuePage() {
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    location: "",
    description: "",
    dateNoticed: new Date().toISOString().split("T")[0],
    urgency: "normal" as "normal" | "urgent",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const selectedCategoryConfig = ISSUE_CATEGORIES.find((cat) => cat.id === selectedCategory)
  const showLocationField = selectedCategoryConfig?.needsLocation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCategory) {
      setSubmitStatus({ type: "error", message: "Please select an issue category" })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    const data: ReportIssueFormData = {
      category: selectedCategory,
      ...formData,
    }

    const result = await submitIssueReport(data)

    if (result.success) {
      setSubmitStatus({ type: "success", message: "Your issue report has been submitted successfully. The appropriate team will review it and respond as needed." })
      // Reset form
      setSelectedCategory(null)
      setFormData({
        name: "",
        address: "",
        email: "",
        phone: "",
        location: "",
        description: "",
        dateNoticed: new Date().toISOString().split("T")[0],
        urgency: "normal",
      })
    } else {
      setSubmitStatus({ type: "error", message: result.error || "Failed to submit issue report. Please try again." })
    }

    setIsSubmitting(false)
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <AlertCircle style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Report an Issue</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Help us maintain our community by reporting concerns, issues, or violations. Your feedback ensures Pristine
            Place remains a great place to live.
          </p>
        </div>
      </section>

      {/* ── Introduction ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-m)" }}>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
              This form allows residents to report maintenance concerns, facility issues, covenant violations, or other
              matters requiring attention from the HOA Board or committees. Your report will be routed to the appropriate
              team based on the category you select.
            </p>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
              <strong>For emergencies,</strong> please contact local authorities (911) or the Hernando County Sheriff's
              Office at (352) 754-6830. This form is not monitored 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* ── Form ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <form onSubmit={handleSubmit}>
            <div className="stack" style={{ gap: "var(--space-l)" }}>

              {/* Category Selection */}
              <div className="stack" style={{ gap: "var(--space-m)" }}>
                <div>
                  <h2 style={{ color: "var(--pp-navy-dark)" }}>1. Select Issue Category</h2>
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                    Choose the category that best describes your issue
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 13rem), 1fr))",
                    gap: "var(--space-s)",
                  }}
                >
                  {ISSUE_CATEGORIES.map((category) => {
                    const Icon = ICON_MAP[category.icon]
                    const isSelected = selectedCategory === category.id

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategory(category.id)}
                        className="card"
                        style={{
                          padding: "var(--space-s)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--space-xs)",
                          textAlign: "left",
                          border: isSelected ? "2px solid var(--pp-navy-dark)" : "2px solid transparent",
                          background: isSelected ? "var(--pp-white)" : "var(--pp-white)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "var(--radius-md)",
                            background: isSelected ? "var(--pp-navy-dark)" : "var(--pp-slate-100)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon
                            style={{
                              width: "1.125rem",
                              height: "1.125rem",
                              color: isSelected ? "var(--pp-white)" : "var(--pp-navy)",
                            }}
                          />
                        </div>
                        <div>
                          <h3
                            className="text-step-0 font-semibold"
                            style={{ color: "var(--pp-navy-dark)", marginBottom: "0.25rem" }}
                          >
                            {category.label}
                          </h3>
                          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.5 }}>
                            {category.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Show form fields only after category is selected */}
              {selectedCategory && (
                <>
                  {/* Contact Information */}
                  <div className="stack" style={{ gap: "var(--space-m)" }}>
                    <h2 style={{ color: "var(--pp-navy-dark)" }}>2. Your Information</h2>

                    <div className="card" style={{ padding: "var(--space-l)", background: "var(--pp-white)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-m)" }}>
                        <div className="stack-xs" style={{ gridColumn: "span 2" }}>
                          <label htmlFor="name" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                            Full Name <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{
                              padding: "0.65rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--pp-slate-300)",
                              fontSize: "1rem",
                              background: "var(--pp-white)",
                              width: "100%",
                            }}
                          />
                        </div>

                        <div className="stack-xs" style={{ gridColumn: "span 2" }}>
                          <label htmlFor="address" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                            Street Address / Lot Number <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            id="address"
                            required
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            style={{
                              padding: "0.65rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--pp-slate-300)",
                              fontSize: "1rem",
                              background: "var(--pp-white)",
                              width: "100%",
                            }}
                          />
                        </div>

                        <div className="stack-xs">
                          <label htmlFor="email" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                            Email Address <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            style={{
                              padding: "0.65rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--pp-slate-300)",
                              fontSize: "1rem",
                              background: "var(--pp-white)",
                              width: "100%",
                            }}
                          />
                        </div>

                        <div className="stack-xs">
                          <label htmlFor="phone" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                            Phone Number (optional)
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            style={{
                              padding: "0.65rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--pp-slate-300)",
                              fontSize: "1rem",
                              background: "var(--pp-white)",
                              width: "100%",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Issue Details */}
                  <div className="stack" style={{ gap: "var(--space-m)" }}>
                    <h2 style={{ color: "var(--pp-navy-dark)" }}>3. Issue Details</h2>

                    <div className="card" style={{ padding: "var(--space-l)", background: "var(--pp-white)" }}>
                      <div className="stack" style={{ gap: "var(--space-m)" }}>
                        {showLocationField && (
                          <div className="stack-xs">
                            <label htmlFor="location" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                              Location of Issue
                            </label>
                            <input
                              type="text"
                              id="location"
                              placeholder="e.g., Near east entrance, Pool area, Lot 42, etc."
                              value={formData.location}
                              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                              style={{
                                padding: "0.65rem 0.9rem",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--pp-slate-300)",
                                fontSize: "1rem",
                                background: "var(--pp-white)",
                                width: "100%",
                              }}
                            />
                          </div>
                        )}

                        <div className="stack-xs">
                          <label htmlFor="description" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                            Issue Description <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <textarea
                            id="description"
                            required
                            rows={6}
                            placeholder="Please describe the issue in as much detail as possible..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            style={{
                              padding: "0.65rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--pp-slate-300)",
                              fontSize: "1rem",
                              fontFamily: "inherit",
                              resize: "vertical",
                              background: "var(--pp-white)",
                              width: "100%",
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-m)" }}>
                          <div className="stack-xs">
                            <label htmlFor="dateNoticed" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                              Date First Noticed
                            </label>
                            <input
                              type="date"
                              id="dateNoticed"
                              value={formData.dateNoticed}
                              onChange={(e) => setFormData({ ...formData, dateNoticed: e.target.value })}
                              max={new Date().toISOString().split("T")[0]}
                              style={{
                                padding: "0.65rem 0.9rem",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--pp-slate-300)",
                                fontSize: "1rem",
                                background: "var(--pp-white)",
                                width: "100%",
                              }}
                            />
                          </div>

                          <div className="stack-xs">
                            <label htmlFor="urgency" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                              Priority Level
                            </label>
                            <select
                              id="urgency"
                              value={formData.urgency}
                              onChange={(e) => setFormData({ ...formData, urgency: e.target.value as "normal" | "urgent" })}
                              style={{
                                padding: "0.65rem 0.9rem",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--pp-slate-300)",
                                fontSize: "1rem",
                                background: "var(--pp-white)",
                                width: "100%",
                              }}
                            >
                              <option value="normal">Normal - Can wait for regular review</option>
                              <option value="urgent">Urgent - Needs immediate attention</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Status Messages */}
                  {submitStatus && (
                    <div
                      className="card"
                      style={{
                        padding: "var(--space-m)",
                        background: submitStatus.type === "success" ? "#ecfdf5" : "#fef2f2",
                        borderLeft: `4px solid ${submitStatus.type === "success" ? "#10b981" : "#dc2626"}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-s)" }}>
                        {submitStatus.type === "success" ? (
                          <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem", color: "#10b981", flexShrink: 0 }} />
                        ) : (
                          <AlertCircle style={{ width: "1.25rem", height: "1.25rem", color: "#dc2626", flexShrink: 0 }} />
                        )}
                        <p
                          className="text-fluid-sm"
                          style={{ color: submitStatus.type === "success" ? "#065f46" : "#991b1b", lineHeight: 1.6 }}
                        >
                          {submitStatus.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div style={{ paddingTop: "var(--space-m)" }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.9rem 2rem",
                        borderRadius: "var(--radius-md)",
                        background: isSubmitting ? "var(--pp-slate-400)" : "var(--pp-navy-dark)",
                        color: "var(--pp-white)",
                        fontWeight: 700,
                        fontSize: "1rem",
                        border: "none",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send style={{ width: "1.125rem", height: "1.125rem" }} />
                          <span>Submit Issue Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

            </div>
          </form>
        </div>
      </section>

      {/* ── What Happens Next ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <h2 style={{ color: "var(--pp-navy-dark)" }}>What Happens Next?</h2>

            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-navy-dark)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "0.5rem" }}>
                  1. Your Report is Routed
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Based on the category you selected, your report will be sent to the appropriate committee or team responsible
                  for handling that type of issue.
                </p>
              </div>

              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-slate-400)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "0.5rem" }}>
                  2. Review & Assessment
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  The responsible team will review your report and assess the situation. For urgent matters, action will be taken
                  as quickly as possible.
                </p>
              </div>

              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-slate-400)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "0.5rem" }}>
                  3. Action & Follow-Up
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Depending on the nature of the issue, you may be contacted for additional information. Some issues may be
                  resolved immediately, while others may require Board approval or vendor scheduling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  )
}
