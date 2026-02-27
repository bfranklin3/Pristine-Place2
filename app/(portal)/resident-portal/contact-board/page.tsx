// app/(portal)/resident-portal/contact-board/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, Send, CheckCircle2, AlertCircle, Users, MessageSquare, Phone } from "lucide-react"
import { submitContactBoard, type ContactBoardFormData } from "@/app/actions/contact-board"

const BOARD_MEMBERS = [
  { name: "David Abbott", position: "President" },
  { name: "Rich Ruland", position: "Vice President" },
  { name: "Deborah Hresko", position: "Treasurer" },
  { name: "Pierre Richard", position: "Secretary" },
  { name: "Joshua Rodriguez", position: "Director at Large" },
]

export default function ContactBoardPage() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    preferredContact: "email" as "email" | "phone",
    subject: "",
    message: "",
    responseTimeline: "within-week" as "no-rush" | "within-week" | "asap",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setSubmitStatus(null)

    const data: ContactBoardFormData = formData

    const result = await submitContactBoard(data)

    if (result.success) {
      setSubmitStatus({
        type: "success",
        message:
          "Thank you for reaching out! Your message has been sent to the Board of Directors. You can expect a response within the timeline you selected.",
      })
      // Reset form
      setFormData({
        name: "",
        address: "",
        email: "",
        phone: "",
        preferredContact: "email",
        subject: "",
        message: "",
        responseTimeline: "within-week",
      })
      // Scroll to top to see success message
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setSubmitStatus({
        type: "error",
        message: result.error || "Failed to send your message. Please try again or email bod@pristineplace.us directly.",
      })
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
            <Mail style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Contact the Board</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Have a question, concern, or suggestion? Reach out directly to your elected Board of Directors. We're here to
            listen and serve our community.
          </p>
        </div>
      </section>

      {/* ── Introduction & Context ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            {/* What This Form Is For */}
            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <h2 style={{ color: "var(--pp-navy-dark)" }}>What This Form Is For</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Use this form to share general questions, concerns, feedback, or suggestions with the Board of Directors.
                Whether you have a question about HOA policies, want to provide input on a community matter, or simply want
                to be heard—this is the right place.
              </p>
              <div
                className="card"
                style={{
                  padding: "var(--space-m)",
                  background: "var(--pp-slate-50)",
                  borderLeft: "3px solid var(--pp-gold)",
                }}
              >
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", lineHeight: 1.6 }}>
                  <strong>Note:</strong> For urgent safety issues, facilities problems, or covenant violations, please use
                  the{" "}
                  <Link
                    href="/resident-portal/report-issue"
                    style={{ color: "var(--pp-navy-dark)", fontWeight: 600, textDecoration: "underline" }}
                  >
                    Report an Issue
                  </Link>{" "}
                  form instead, which routes your concern to the appropriate committee for faster action.
                </p>
              </div>
            </div>

            {/* Who Receives Your Message */}
            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                <Users style={{ width: "1.5rem", height: "1.5rem", color: "var(--pp-navy-dark)" }} />
                <h2 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>Who Receives Your Message</h2>
              </div>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Your message is sent directly to <strong>all five elected Board members</strong>. You're not just reaching
                one person—you're reaching the entire Board of Directors who govern our community.
              </p>

              {/* Board Member Roster */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
                  gap: "var(--space-s)",
                }}
              >
                {BOARD_MEMBERS.map((member) => (
                  <div
                    key={member.name}
                    className="card"
                    style={{
                      padding: "var(--space-m)",
                      textAlign: "center",
                      background: "var(--pp-slate-50)",
                    }}
                  >
                    <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "0.25rem" }}>
                      {member.name}
                    </h3>
                    <span className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                      {member.position}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Timeline */}
            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                <MessageSquare style={{ width: "1.5rem", height: "1.5rem", color: "var(--pp-navy-dark)" }} />
                <h2 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>What to Expect</h2>
              </div>
              <div className="stack" style={{ gap: "var(--space-s)" }}>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                  The Board aims to respond to resident messages <strong>within 7 business days</strong>. For time-sensitive
                  matters, you can indicate your preferred response timeline in the form below.
                </p>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                  Keep in mind that board members are volunteer neighbors with jobs and families. While they work hard to
                  stay responsive, complex questions may require consulting with property management, legal counsel, or other
                  committee members before a complete answer can be provided.
                </p>
              </div>
            </div>

            {/* Board Meeting Attendance */}
            <div
              className="card"
              style={{
                padding: "var(--space-l)",
                background: "var(--pp-navy-dark)",
                color: "var(--pp-white)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-m)" }}>
                <Phone style={{ width: "2rem", height: "2rem", color: "var(--pp-gold-light)", flexShrink: 0 }} />
                <div className="stack-xs">
                  <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-white)" }}>
                    Prefer to Speak in Person?
                  </h3>
                  <p className="text-fluid-base" style={{ color: "var(--pp-slate-200)", lineHeight: 1.7 }}>
                    All residents are welcome to attend monthly Board meetings and speak during the open forum portion of the
                    agenda. Some concerns are best addressed face-to-face, and the Board values hearing directly from
                    residents.
                  </p>
                  <p className="text-fluid-base" style={{ color: "var(--pp-slate-200)", marginTop: "var(--space-xs)" }}>
                    Call:{" "}
                    <a
                      href="tel:+13525159420"
                      style={{ color: "var(--pp-white)", fontWeight: 700, textDecoration: "underline" }}
                    >
                      (352) 515-9420
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <form onSubmit={handleSubmit}>
            <div className="stack" style={{ gap: "var(--space-l)" }}>
              <div>
                <h2 style={{ color: "var(--pp-navy-dark)" }}>Send Your Message</h2>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  All fields marked with an asterisk (*) are required
                </p>
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

              {/* Your Information */}
              <div className="card" style={{ padding: "var(--space-l)", background: "var(--pp-white)" }}>
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-m)" }}>
                  Your Information
                </h3>

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

                  <div className="stack-xs" style={{ gridColumn: "span 2" }}>
                    <label className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                      Preferred Contact Method <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div style={{ display: "flex", gap: "var(--space-m)", marginTop: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="preferredContact"
                          value="email"
                          checked={formData.preferredContact === "email"}
                          onChange={(e) => setFormData({ ...formData, preferredContact: "email" })}
                          style={{ width: "1.125rem", height: "1.125rem", cursor: "pointer" }}
                        />
                        <span className="text-fluid-base" style={{ color: "var(--pp-slate-700)" }}>
                          Email
                        </span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="preferredContact"
                          value="phone"
                          checked={formData.preferredContact === "phone"}
                          onChange={(e) => setFormData({ ...formData, preferredContact: "phone" })}
                          style={{ width: "1.125rem", height: "1.125rem", cursor: "pointer" }}
                        />
                        <span className="text-fluid-base" style={{ color: "var(--pp-slate-700)" }}>
                          Phone
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Message */}
              <div className="card" style={{ padding: "var(--space-l)", background: "var(--pp-white)" }}>
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-m)" }}>
                  Your Message
                </h3>

                <div className="stack" style={{ gap: "var(--space-m)" }}>
                  <div className="stack-xs">
                    <label htmlFor="subject" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                      Subject / Topic <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <select
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      style={{
                        padding: "0.65rem 0.9rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--pp-slate-300)",
                        fontSize: "1rem",
                        background: "var(--pp-white)",
                        width: "100%",
                      }}
                    >
                      <option value="">Select a topic...</option>
                      <option value="General Question">General Question</option>
                      <option value="Feedback or Suggestion">Feedback or Suggestion</option>
                      <option value="Rule or Policy Question">Rule or Policy Question</option>
                      <option value="Financial Question">Financial Question</option>
                      <option value="Meeting Request">Meeting Request</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="stack-xs">
                    <label htmlFor="message" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                      Message <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={10}
                      placeholder="Please share your question or concern in as much detail as you'd like..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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

                  <div className="stack-xs">
                    <label htmlFor="responseTimeline" className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)" }}>
                      Preferred Response Timeline
                    </label>
                    <select
                      id="responseTimeline"
                      value={formData.responseTimeline}
                      onChange={(e) =>
                        setFormData({ ...formData, responseTimeline: e.target.value as "no-rush" | "within-week" | "asap" })
                      }
                      style={{
                        padding: "0.65rem 0.9rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--pp-slate-300)",
                        fontSize: "1rem",
                        background: "var(--pp-white)",
                        width: "100%",
                      }}
                    >
                      <option value="no-rush">No rush — whenever you have time</option>
                      <option value="within-week">Within a week would be great</option>
                      <option value="asap">As soon as possible, please</option>
                    </select>
                  </div>
                </div>
              </div>

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
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send style={{ width: "1.125rem", height: "1.125rem" }} />
                      <span>Send Message to Board</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ── Alternative Contact ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div
            className="card"
            style={{
              padding: "var(--space-l)",
              background: "var(--pp-slate-50)",
              borderLeft: "4px solid var(--pp-navy-dark)",
            }}
          >
            <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-s)" }}>
              Prefer Email?
            </h3>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7, marginBottom: "var(--space-s)" }}>
              You can also reach the Board directly via email at:{" "}
              <a
                href="mailto:bod@pristineplace.us"
                style={{ color: "var(--pp-navy-dark)", fontWeight: 600, textDecoration: "underline" }}
              >
                bod@pristineplace.us
              </a>
            </p>
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", lineHeight: 1.6 }}>
              This form simply makes it easier to provide all the relevant information in one place, but either method reaches
              the same people.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
