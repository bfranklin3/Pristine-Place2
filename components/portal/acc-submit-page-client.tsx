"use client"

import { useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { ClipboardCheck, FileText, Info, Save, Shield, Wrench } from "lucide-react"

type WorkType = "paint" | "roof" | "fence" | "landscaping" | "other" | ""
type RoleType = "owner" | "authorized_rep" | ""

type FormState = {
  ownerName: string
  streetAddress: string
  ownerPhone: string
  ownerEmail: string
  phase: string
  lot: string
  role: RoleType
  authorizedRepName: string
  workType: WorkType
  projectDescription: string
  startDate: string
  completionDate: string
  hasSupportingDocs: "no" | "yes" | ""
  paintBodyColor: string
  paintTrimColor: string
  paintDoorColor: string
  roofColor: string
  roofType: string
  fenceStyle: string
  landscapingDetails: string
  otherWorkDetails: string
}

type FormErrors = Partial<Record<keyof FormState | "agreedToTerms", string>>
type UploadStatus = { type: "info" | "error" | "success"; message: string } | null

const MAX_UPLOAD_FILES = 20
const MAX_FILE_BYTES = 256 * 1024 * 1024
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "bmp", "pdf", "doc", "docx", "xls", "xlsx", "xlsm", "txt"]

const initialForm: FormState = {
  ownerName: "",
  streetAddress: "",
  ownerPhone: "",
  ownerEmail: "",
  phase: "",
  lot: "",
  role: "",
  authorizedRepName: "",
  workType: "",
  projectDescription: "",
  startDate: "",
  completionDate: "",
  hasSupportingDocs: "",
  paintBodyColor: "",
  paintTrimColor: "",
  paintDoorColor: "",
  roofColor: "",
  roofType: "",
  fenceStyle: "",
  landscapingDetails: "",
  otherWorkDetails: "",
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
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null)

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

  const fenceStyleOptions = useMemo(
    () => [
      "4' High Black Chain Link",
      "4' High Green Chain Link",
      "4' High Black Metal Panel - Puppy",
      "4' High Black Metal Panel - Sierra",
      "4' High Black Metal Panel - Outback",
      "4' High Black Metal Panel - Carolina",
    ],
    [],
  )

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function validateSelectedFiles(files: File[]) {
    const validationErrors: string[] = []

    if (files.length > MAX_UPLOAD_FILES) {
      validationErrors.push(`You can upload up to ${MAX_UPLOAD_FILES} files.`)
    }

    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() || ""
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        validationErrors.push(`Unsupported file type: ${file.name}`)
      }
      if (file.size > MAX_FILE_BYTES) {
        validationErrors.push(`${file.name} exceeds 256 MB.`)
      }
    }

    return validationErrors
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) {
      setSelectedFiles([])
      setUploadStatus(null)
      return
    }

    const files = Array.from(fileList)
    const validationErrors = validateSelectedFiles(files)
    setSelectedFiles(files)

    if (validationErrors.length > 0) {
      setUploadStatus({ type: "error", message: validationErrors[0] })
      return
    }

    setUploadStatus({
      type: "success",
      message: `${files.length} file${files.length === 1 ? "" : "s"} selected. Files will be submitted with your request.`,
    })
    setErrors((prev) => {
      if (!prev.hasSupportingDocs) return prev
      const next = { ...prev }
      delete next.hasSupportingDocs
      return next
    })
  }

  function setTerms(value: boolean) {
    setAgreedToTerms(value)
    if (value) {
      setErrors((prev) => {
        if (!prev.agreedToTerms) return prev
        const next = { ...prev }
        delete next.agreedToTerms
        return next
      })
    }
  }

  function describedBy(...ids: Array<string | false | null | undefined>) {
    const value = ids.filter(Boolean).join(" ")
    return value || undefined
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)

    const nextErrors: FormErrors = {}

    if (!agreedToTerms) nextErrors.agreedToTerms = "Please acknowledge the Terms & Conditions."
    if (!form.ownerName.trim()) nextErrors.ownerName = "Owner name is required."
    if (!form.streetAddress.trim()) nextErrors.streetAddress = "Street address is required."
    if (!form.ownerPhone.trim()) nextErrors.ownerPhone = "Owner phone number is required."
    if (!form.ownerEmail.trim()) nextErrors.ownerEmail = "Owner email address is required."
    if (!form.role) nextErrors.role = "Please select your role."
    if (!form.workType) nextErrors.workType = "Please choose a work type."
    if (!form.projectDescription.trim()) nextErrors.projectDescription = "Project description is required."
    if (!form.startDate) nextErrors.startDate = "Estimated start date is required."
    if (!form.completionDate) nextErrors.completionDate = "Estimated completion date is required."
    if (!form.hasSupportingDocs) nextErrors.hasSupportingDocs = "Please indicate whether you have supporting documents."
    if (form.startDate && form.completionDate) {
      const start = new Date(form.startDate)
      const completion = new Date(form.completionDate)
      if (completion < start) {
        nextErrors.completionDate = "Estimated completion date cannot be earlier than the start date."
      }
    }

    if (form.role === "authorized_rep" && !form.authorizedRepName.trim()) {
      nextErrors.authorizedRepName = "Authorized representative name is required."
    }

    if (form.workType === "paint") {
      if (!form.paintBodyColor.trim()) nextErrors.paintBodyColor = "Body color is required."
      if (!form.paintTrimColor.trim()) nextErrors.paintTrimColor = "Trim color is required."
      if (!form.paintDoorColor.trim()) nextErrors.paintDoorColor = "Door color is required."
    }
    if (form.workType === "roof") {
      if (!form.roofColor.trim()) nextErrors.roofColor = "Roof color is required."
      if (!form.roofType.trim()) nextErrors.roofType = "Roof type is required."
    }
    if (form.workType === "fence" && !form.fenceStyle.trim()) nextErrors.fenceStyle = "Fence style is required."
    if (form.workType === "landscaping" && !form.landscapingDetails.trim()) nextErrors.landscapingDetails = "Landscaping details are required."
    if (form.workType === "other" && !form.otherWorkDetails.trim()) nextErrors.otherWorkDetails = "Other work details are required."
    if (form.hasSupportingDocs === "yes") {
      if (selectedFiles.length === 0) nextErrors.hasSupportingDocs = "Please select at least one file to upload."
      if (validateSelectedFiles(selectedFiles).length > 0) nextErrors.hasSupportingDocs = "Please resolve file upload issues before submitting."
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.completionDate === "Estimated completion date cannot be earlier than the start date.") {
        setStatus({ type: "error", message: "Completion date must be the same day as or after the start date." })
      } else {
        setStatus({ type: "error", message: "Please fix the highlighted fields and try again." })
      }
      return
    }

    setStatus({
      type: "success",
      message:
        `Request captured${form.hasSupportingDocs === "yes" ? ` with ${selectedFiles.length} attachment${selectedFiles.length === 1 ? "" : "s"}` : ""}. Final submit integration is the next step; for immediate processing please continue using the current ACC WordPress workflow.`,
    })
    if (form.hasSupportingDocs === "yes" && selectedFiles.length > 0) {
      setUploadStatus({ type: "info", message: "Attachments are queued with this submission request." })
    }
  }

  function onSaveDraft() {
    setStatus({
      type: "success",
      message: "Draft save clicked. Full save-and-resume backend wiring is the next step in this plan.",
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
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setTerms(e.target.checked)}
                      style={{ marginTop: "0.2rem" }}
                      aria-invalid={!!errors.agreedToTerms}
                      aria-describedby={errors.agreedToTerms ? "agreedToTerms-error" : undefined}
                    />
                    <span style={{ color: "var(--pp-slate-700)", fontWeight: 600, lineHeight: 1.5 }}>
                      I hereby acknowledge that I have read and consent to the Pristine Place Terms & Conditions.
                    </span>
                  </label>
                  {errors.agreedToTerms ? <small id="agreedToTerms-error" style={errorStyle}>{errors.agreedToTerms}</small> : null}
                </div>

                <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "0.9rem" }}>
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", marginBottom: "0.55rem" }}>
                    Your Information
                  </p>
                  <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem", alignItems: "start" }}>
                    <label style={{ display: "grid", gap: "0.3rem", alignContent: "start" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Owner&apos;s Name <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input
                        value={form.ownerName}
                        onChange={(e) => updateField("ownerName", e.target.value)}
                        required
                        style={inputStyle}
                        aria-invalid={!!errors.ownerName}
                        aria-describedby={errors.ownerName ? "ownerName-error" : undefined}
                      />
                      {errors.ownerName ? <small id="ownerName-error" style={errorStyle}>{errors.ownerName}</small> : null}
                    </label>
                    <label style={{ display: "grid", gap: "0.3rem", alignContent: "start" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Street Address <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input
                        value={form.streetAddress}
                        onChange={(e) => updateField("streetAddress", e.target.value)}
                        required
                        style={inputStyle}
                        aria-invalid={!!errors.streetAddress}
                        aria-describedby={describedBy("streetAddress-help", errors.streetAddress && "streetAddress-error")}
                      />
                      <small id="streetAddress-help" style={helperStyle}>Street address only — no need to include city or state.</small>
                      {errors.streetAddress ? <small id="streetAddress-error" style={errorStyle}>{errors.streetAddress}</small> : null}
                    </label>
                    <label style={{ display: "grid", gap: "0.3rem", alignContent: "start" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Owner&apos;s Phone Number <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input
                        value={form.ownerPhone}
                        onChange={(e) => updateField("ownerPhone", e.target.value)}
                        required
                        style={inputStyle}
                        aria-invalid={!!errors.ownerPhone}
                        aria-describedby={describedBy("ownerPhone-help", errors.ownerPhone && "ownerPhone-error")}
                      />
                      <small id="ownerPhone-help" style={helperStyle}>Best phone number for contact.</small>
                      {errors.ownerPhone ? <small id="ownerPhone-error" style={errorStyle}>{errors.ownerPhone}</small> : null}
                    </label>
                    <label style={{ display: "grid", gap: "0.3rem", alignContent: "start" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Owner&apos;s Email Address <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input
                        type="email"
                        value={form.ownerEmail}
                        onChange={(e) => updateField("ownerEmail", e.target.value)}
                        required
                        style={inputStyle}
                        aria-invalid={!!errors.ownerEmail}
                        aria-describedby={errors.ownerEmail ? "ownerEmail-error" : undefined}
                      />
                      {errors.ownerEmail ? <small id="ownerEmail-error" style={errorStyle}>{errors.ownerEmail}</small> : null}
                    </label>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "0.9rem" }}>
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", marginBottom: "0.55rem" }}>
                    Property Details
                  </p>
                  <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Phase</span>
                      <select value={form.phase} onChange={(e) => updateField("phase", e.target.value)} style={inputStyle}>
                        <option value="">Select phase (optional)…</option>
                        <option value="Phase 1">Phase 1</option>
                        <option value="Phase 2">Phase 2</option>
                        <option value="Phase 3">Phase 3</option>
                        <option value="Phase 4">Phase 4</option>
                        <option value="Phase 5">Phase 5</option>
                        <option value="Phase 6">Phase 6</option>
                      </select>
                      <small style={helperStyle}>The section or phase of Pristine Place where your home is located.</small>
                    </label>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Lot#</span>
                      <input value={form.lot} onChange={(e) => updateField("lot", e.target.value)} style={inputStyle} />
                      <small style={helperStyle}>Optional. Enter if known.</small>
                    </label>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "0.9rem" }}>
                  <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", marginBottom: "0.55rem" }}>
                    About Your Project
                  </p>

                  <label style={{ display: "grid", gap: "0.3rem", marginBottom: "0.8rem" }}>
                    <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Your role <span style={{ color: "#b91c1c" }}>*</span></span>
                    <div style={{ display: "grid", gap: "0.45rem" }} aria-invalid={!!errors.role} aria-describedby={errors.role ? "role-error" : undefined}>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="role" value="owner" checked={form.role === "owner"} onChange={() => updateField("role", "owner")} />
                        <span>I am the owner</span>
                      </label>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="role" value="authorized_rep" checked={form.role === "authorized_rep"} onChange={() => updateField("role", "authorized_rep")} />
                        <span>I am an authorized representative acting on the owner&apos;s behalf</span>
                      </label>
                    </div>
                    {errors.role ? <small id="role-error" style={errorStyle}>{errors.role}</small> : null}
                  </label>

                  {form.role === "authorized_rep" ? (
                    <label style={{ display: "grid", gap: "0.3rem", marginBottom: "0.8rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Authorized Representative Name <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input
                        value={form.authorizedRepName}
                        onChange={(e) => updateField("authorizedRepName", e.target.value)}
                        style={inputStyle}
                        required
                        aria-invalid={!!errors.authorizedRepName}
                        aria-describedby={errors.authorizedRepName ? "authorizedRepName-error" : undefined}
                      />
                      {errors.authorizedRepName ? <small id="authorizedRepName-error" style={errorStyle}>{errors.authorizedRepName}</small> : null}
                    </label>
                  ) : null}

                  <label style={{ display: "grid", gap: "0.45rem", marginBottom: "0.8rem" }}>
                    <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Type of work requested <span style={{ color: "#b91c1c" }}>*</span></span>
                    <div className="acc-work-grid" style={{ display: "grid", gap: "0.5rem" }} role="radiogroup" aria-invalid={!!errors.workType} aria-describedby={errors.workType ? "workType-error" : undefined}>
                      {workTypeCards.map((item) => {
                        const active = form.workType === item.value
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => updateField("workType", item.value)}
                            role="radio"
                            aria-checked={active}
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
                    {errors.workType ? <small id="workType-error" style={errorStyle}>{errors.workType}</small> : null}
                  </label>

                  {form.workType ? (
                    <div
                      style={{
                        border: "1px solid #d4e8da",
                        borderRadius: "var(--radius-md)",
                        background: "#f8fffb",
                        padding: "0.8rem 0.9rem",
                        marginBottom: "0.8rem",
                        display: "grid",
                        gap: "0.75rem",
                      }}
                    >
                      <p className="text-fluid-sm" style={{ fontWeight: 700, color: "var(--pp-navy-dark)", margin: 0 }}>
                        Project-specific details
                      </p>

                      {form.workType === "paint" ? (
                        <>
                          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", margin: 0 }}>
                            For paint requests, provide the requested color selections.
                          </p>
                          <div className="acc-three-col" style={{ display: "grid", gap: "0.8rem" }}>
                            <label style={{ display: "grid", gap: "0.3rem" }}>
                              <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Body Color</span>
                              <input value={form.paintBodyColor} onChange={(e) => updateField("paintBodyColor", e.target.value)} required style={inputStyle} aria-invalid={!!errors.paintBodyColor} aria-describedby={errors.paintBodyColor ? "paintBodyColor-error" : undefined} />
                              {errors.paintBodyColor ? <small id="paintBodyColor-error" style={errorStyle}>{errors.paintBodyColor}</small> : null}
                            </label>
                            <label style={{ display: "grid", gap: "0.3rem" }}>
                              <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Trim Color</span>
                              <input value={form.paintTrimColor} onChange={(e) => updateField("paintTrimColor", e.target.value)} required style={inputStyle} aria-invalid={!!errors.paintTrimColor} aria-describedby={errors.paintTrimColor ? "paintTrimColor-error" : undefined} />
                              {errors.paintTrimColor ? <small id="paintTrimColor-error" style={errorStyle}>{errors.paintTrimColor}</small> : null}
                            </label>
                            <label style={{ display: "grid", gap: "0.3rem" }}>
                              <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Door Color</span>
                              <input value={form.paintDoorColor} onChange={(e) => updateField("paintDoorColor", e.target.value)} required style={inputStyle} aria-invalid={!!errors.paintDoorColor} aria-describedby={errors.paintDoorColor ? "paintDoorColor-error" : undefined} />
                              {errors.paintDoorColor ? <small id="paintDoorColor-error" style={errorStyle}>{errors.paintDoorColor}</small> : null}
                            </label>
                          </div>
                        </>
                      ) : null}

                      {form.workType === "roof" ? (
                        <>
                          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", margin: 0 }}>
                            For roof requests, provide roof color and material type.
                          </p>
                          <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                            <label style={{ display: "grid", gap: "0.3rem" }}>
                              <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Roof Color</span>
                              <input value={form.roofColor} onChange={(e) => updateField("roofColor", e.target.value)} required style={inputStyle} aria-invalid={!!errors.roofColor} aria-describedby={errors.roofColor ? "roofColor-error" : undefined} />
                              {errors.roofColor ? <small id="roofColor-error" style={errorStyle}>{errors.roofColor}</small> : null}
                            </label>
                            <label style={{ display: "grid", gap: "0.3rem" }}>
                              <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Roof Type</span>
                              <select value={form.roofType} onChange={(e) => updateField("roofType", e.target.value)} required style={inputStyle} aria-invalid={!!errors.roofType} aria-describedby={errors.roofType ? "roofType-error" : undefined}>
                                <option value="">Select roof type…</option>
                                <option value="Dimensional Shingle">Dimensional Shingle</option>
                                <option value="Tile Roof">Tile Roof</option>
                              </select>
                              {errors.roofType ? <small id="roofType-error" style={errorStyle}>{errors.roofType}</small> : null}
                            </label>
                          </div>
                        </>
                      ) : null}

                      {form.workType === "fence" ? (
                        <>
                          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", margin: 0 }}>
                            For fence requests, choose the proposed fence style.
                          </p>
                          <label style={{ display: "grid", gap: "0.3rem" }}>
                            <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Fence Style</span>
                            <select value={form.fenceStyle} onChange={(e) => updateField("fenceStyle", e.target.value)} required style={inputStyle} aria-invalid={!!errors.fenceStyle} aria-describedby={errors.fenceStyle ? "fenceStyle-error" : undefined}>
                              <option value="">Select fence style…</option>
                              {fenceStyleOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {errors.fenceStyle ? <small id="fenceStyle-error" style={errorStyle}>{errors.fenceStyle}</small> : null}
                          </label>
                        </>
                      ) : null}

                      {form.workType === "landscaping" ? (
                        <>
                          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", margin: 0 }}>
                            For landscaping requests, include key materials, plantings, and any hardscape details.
                          </p>
                          <label style={{ display: "grid", gap: "0.3rem" }}>
                            <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Landscaping Details</span>
                            <textarea
                              value={form.landscapingDetails}
                              onChange={(e) => updateField("landscapingDetails", e.target.value)}
                              rows={4}
                              placeholder="Describe plants, edging, stone, lighting, irrigation, and placement."
                              required
                              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                              aria-invalid={!!errors.landscapingDetails}
                              aria-describedby={errors.landscapingDetails ? "landscapingDetails-error" : undefined}
                            />
                            {errors.landscapingDetails ? <small id="landscapingDetails-error" style={errorStyle}>{errors.landscapingDetails}</small> : null}
                          </label>
                        </>
                      ) : null}

                      {form.workType === "other" ? (
                        <>
                          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", margin: 0 }}>
                            For other requests, provide a brief category and enough detail for ACC review.
                          </p>
                          <label style={{ display: "grid", gap: "0.3rem" }}>
                            <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Other Work Details</span>
                            <textarea
                              value={form.otherWorkDetails}
                              onChange={(e) => updateField("otherWorkDetails", e.target.value)}
                              rows={4}
                              placeholder="Describe the work category, materials, and installation location."
                              required
                              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                              aria-invalid={!!errors.otherWorkDetails}
                              aria-describedby={errors.otherWorkDetails ? "otherWorkDetails-error" : undefined}
                            />
                            {errors.otherWorkDetails ? <small id="otherWorkDetails-error" style={errorStyle}>{errors.otherWorkDetails}</small> : null}
                          </label>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  <label style={{ display: "grid", gap: "0.3rem", marginBottom: "0.8rem" }}>
                    <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Project Description <span style={{ color: "#b91c1c" }}>*</span></span>
                    <textarea
                      value={form.projectDescription}
                      onChange={(e) => updateField("projectDescription", e.target.value)}
                      required
                      rows={7}
                      placeholder="Describe your scope of work, materials, dimensions, location on property, and finish details."
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                      aria-invalid={!!errors.projectDescription}
                      aria-describedby={errors.projectDescription ? "projectDescription-error" : undefined}
                    />
                    {errors.projectDescription ? <small id="projectDescription-error" style={errorStyle}>{errors.projectDescription}</small> : null}
                  </label>

                  <div className="acc-two-col" style={{ display: "grid", gap: "0.8rem" }}>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Estimated Start Date <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input type="date" value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} required style={inputStyle} aria-invalid={!!errors.startDate} aria-describedby={errors.startDate ? "startDate-error" : undefined} />
                      {errors.startDate ? <small id="startDate-error" style={errorStyle}>{errors.startDate}</small> : null}
                    </label>
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>Estimated Completion Date <span style={{ color: "#b91c1c" }}>*</span></span>
                      <input type="date" value={form.completionDate} onChange={(e) => updateField("completionDate", e.target.value)} required style={inputStyle} aria-invalid={!!errors.completionDate} aria-describedby={errors.completionDate ? "completionDate-error" : undefined} />
                      {errors.completionDate ? <small id="completionDate-error" style={errorStyle}>{errors.completionDate}</small> : null}
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
                    <div style={{ display: "grid", gap: "0.45rem" }} aria-invalid={!!errors.hasSupportingDocs} aria-describedby={errors.hasSupportingDocs ? "hasSupportingDocs-error" : undefined}>
                      <label style={radioLabelStyle}>
                        <input
                          type="radio"
                          name="docs"
                          value="no"
                          checked={form.hasSupportingDocs === "no"}
                          onChange={() => {
                            updateField("hasSupportingDocs", "no")
                            setSelectedFiles([])
                            setUploadStatus(null)
                          }}
                        />
                        <span>Not at this time</span>
                      </label>
                      <label style={radioLabelStyle}>
                        <input
                          type="radio"
                          name="docs"
                          value="yes"
                          checked={form.hasSupportingDocs === "yes"}
                          onChange={() => updateField("hasSupportingDocs", "yes")}
                        />
                        <span>Yes, I am prepared to submit my documents now.</span>
                      </label>
                    </div>
                    {errors.hasSupportingDocs ? <small id="hasSupportingDocs-error" style={errorStyle}>{errors.hasSupportingDocs}</small> : null}
                  </label>

                  {form.hasSupportingDocs === "yes" ? (
                    <label style={{ display: "grid", gap: "0.3rem", marginTop: "0.8rem" }}>
                      <span className="text-fluid-sm" style={{ fontWeight: 600 }}>
                        Upload supporting files
                      </span>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFilesSelected(e.target.files)}
                        style={inputStyle}
                        aria-describedby="upload-help"
                      />
                      <small id="upload-help" style={helperStyle}>
                        Accepted formats: JPG, JPEG, PNG, BMP, PDF, DOC, DOCX, XLS, XLSX, XLSM, TXT. Max 256 MB per file, max 20 files.
                      </small>
                      {uploadStatus ? (
                        <small
                          role="status"
                          aria-live="polite"
                          style={uploadStatus.type === "error" ? errorStyle : helperStyle}
                        >
                          {uploadStatus.message}
                        </small>
                      ) : null}
                      {selectedFiles.length > 0 ? (
                        <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.25rem" }}>
                          <small style={{ ...helperStyle, fontWeight: 700 }}>Selected files ({selectedFiles.length})</small>
                          <ul style={{ margin: 0, paddingLeft: "1rem", color: "var(--pp-slate-700)", fontSize: "0.86rem", lineHeight: 1.5 }}>
                            {selectedFiles.map((file) => (
                              <li key={`${file.name}-${file.size}`}>
                                {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFiles([])
                              setUploadStatus({ type: "info", message: "Selection cleared." })
                            }}
                            style={{
                              width: "fit-content",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--pp-slate-300)",
                              background: "var(--pp-white)",
                              color: "var(--pp-slate-700)",
                              padding: "0.35rem 0.55rem",
                              fontSize: "0.82rem",
                              cursor: "pointer",
                            }}
                          >
                            Clear selected files
                          </button>
                        </div>
                      ) : null}
                    </label>
                  ) : null}
                </div>

                {status ? (
                  <div
                    role={status.type === "error" ? "alert" : "status"}
                    aria-live="polite"
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

                <div className="acc-actions" style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "stretch", borderTop: "1px solid var(--pp-slate-200)", paddingTop: "1rem" }}>
                  <button
                    type="submit"
                    className="acc-primary-action"
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
                      justifyContent: "center",
                    }}
                  >
                    <ClipboardCheck style={{ width: "1rem", height: "1rem" }} />
                    Submit My Request
                  </button>
                  <button
                    type="button"
                    onClick={onSaveDraft}
                    className="acc-secondary-action"
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--pp-slate-300)",
                      background: "var(--pp-white)",
                      color: "var(--pp-slate-700)",
                      padding: "0.68rem 1.1rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Save style={{ width: "0.95rem", height: "0.95rem" }} />
                    Save & Continue Later
                  </button>
                </div>
                <div className="acc-actions-help" style={{ display: "grid", gap: "0.35rem", marginTop: "-0.3rem" }}>
                  <small style={helperStyle}>
                    <strong>Submit My Request:</strong> sends your application to ACC for review.
                  </small>
                  <small style={helperStyle}>
                    <strong>Save & Continue Later:</strong> stores progress so you can finish later.
                  </small>
                </div>
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
        .acc-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, auto));
        }
        .acc-primary-action,
        .acc-secondary-action {
          min-height: 2.75rem;
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
          .acc-three-col {
            grid-template-columns: minmax(0, 1fr);
          }
          .acc-work-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .acc-actions {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (min-width: 761px) {
          .acc-three-col {
            grid-template-columns: repeat(3, minmax(0, 1fr));
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

const errorStyle: CSSProperties = {
  color: "#b91c1c",
  fontSize: "0.82rem",
  fontWeight: 600,
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
