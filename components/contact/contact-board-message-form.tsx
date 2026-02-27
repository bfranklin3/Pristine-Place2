"use client"

import { useState } from "react"
import { Send, CheckCircle2, AlertCircle } from "lucide-react"
import { submitContactBoard, type ContactBoardFormData } from "@/app/actions/contact-board"

export function ContactBoardMessageForm() {
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
          "Thank you for reaching out. Your message has been sent to the Board of Directors. You can expect a response within the timeline you selected.",
      })
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
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setSubmitStatus({
        type: "error",
        message: result.error || "Failed to send your message. Please try again.",
      })
    }

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="stack" style={{ gap: "var(--space-l)" }}>
        <div>
          <h2 style={{ color: "var(--pp-navy-dark)" }}>Send a Message</h2>
          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
            All fields marked with an asterisk (*) are required
          </p>
        </div>

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

        <div className="card" style={{ padding: "var(--space-l)", background: "var(--pp-white)" }}>
          <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-m)" }}>
            Your Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-m)" }}>
            <div className="stack-xs md:col-span-2">
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

            <div className="stack-xs md:col-span-2">
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

            <div className="stack-xs md:col-span-2">
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
                    onChange={() => setFormData({ ...formData, preferredContact: "email" })}
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
                    onChange={() => setFormData({ ...formData, preferredContact: "phone" })}
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
              <span>Sending...</span>
            ) : (
              <>
                <Send style={{ width: "1.125rem", height: "1.125rem" }} />
                <span>Send Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
