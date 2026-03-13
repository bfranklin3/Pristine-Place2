"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, FileText, Info, Upload, Users } from "lucide-react"
import {
  CLUBHOUSE_RENTAL_EVENT_TYPE_OPTIONS,
  CLUBHOUSE_RENTAL_TIME_OPTIONS,
  EMPTY_CLUBHOUSE_RENTAL_FORM_DATA,
  type ClubhouseRentalFormData,
  type ClubhouseRentalRequestedSpace,
  type ClubhouseRentalVendorOption,
  validateClubhouseRentalFormData,
} from "@/lib/clubhouse-rental/form"

type FormErrors = Partial<Record<keyof ClubhouseRentalFormData | "insuranceCertificate", string>>
type AttachmentSummary = {
  id: string
  originalFilename: string
  url: string
  mimeType: string
  fileSizeBytes: number
  scope: string
  note: string | null
  createdAt: string
}

type AvailabilityConflict = {
  id: string
  source: "rental" | "hoa_event"
  title: string
  subtitle: string
  statusLabel: string
  isBlocking: boolean
  scope: "clubhouse" | "ballroom"
  date: string
  startLabel: string
  endLabel: string
  locationLabel: string
  href: string | null
}

const rentalAgreementBullets = [
  "Your reservation is not confirmed until the completed agreement, payment, and insurance materials are received.",
  "The reservation applies to the main clubhouse room and does not include the pool, tennis court, or exercise room.",
  "The Elgin gate and clubhouse entrance are opened before the event and closed shortly after the scheduled end time.",
  "The security deposit is refundable only after inspection confirms the agreement terms and checklist were satisfied.",
]

const insuranceBullets = [
  "The resident must provide homeowner insurance information and supporting proof of coverage.",
  "Vendor or entertainment providers must supply their own liability coverage when applicable.",
  "The renter accepts responsibility for liabilities arising from the event and their invited guests.",
]

const decorationBullets = [
  "No ceiling decorations, confetti, glitter, sparkles, or similar materials may be used.",
  "No thumb tacks, nails, tape, or adhesives may be used on the walls.",
  "No food or drink may be consumed or served in the lobby.",
  "The renter must complete the post-rental checklist and restore the clubhouse to its original condition.",
]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p style={{ margin: "0.35rem 0 0 0", color: "#991b1b", fontSize: "0.83rem", fontWeight: 600 }}>
      {message}
    </p>
  )
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: typeof Info
  children: ReactNode
}) {
  return (
    <section
      className="card"
      style={{
        padding: "var(--space-l)",
        background: "#fffef9",
        border: "1px solid #e5efe8",
        display: "grid",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <div
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "var(--radius-md)",
            background: "var(--pp-navy-dark)",
            color: "var(--pp-gold-light)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: "1.1rem", height: "1.1rem" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>{title}</h2>
          <p style={{ margin: "0.3rem 0 0 0", color: "var(--pp-slate-600)", maxWidth: "64ch" }}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function ClubhouseRentalOnlineForm({
  mode = "create",
  requestId = null,
  initialFormData = EMPTY_CLUBHOUSE_RENTAL_FORM_DATA,
  residentActionNote = null,
  existingAttachments = [],
}: {
  mode?: "create" | "edit"
  requestId?: string | null
  initialFormData?: ClubhouseRentalFormData
  residentActionNote?: string | null
  existingAttachments?: AttachmentSummary[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<ClubhouseRentalFormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [insuranceCertificateFile, setInsuranceCertificateFile] = useState<File | null>(null)
  const [additionalAttachmentFiles, setAdditionalAttachmentFiles] = useState<File[]>([])
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflicts, setConflicts] = useState<{ blockingConflicts: AvailabilityConflict[]; tentativeConflicts: AvailabilityConflict[] }>({
    blockingConflicts: [],
    tentativeConflicts: [],
  })
  const [conflictsLoading, setConflictsLoading] = useState(false)
  const hasAvailabilityInputs = Boolean(form.reservationDate && form.startTime && form.endTime)

  function updateField<K extends keyof ClubhouseRentalFormData>(key: K, value: ClubhouseRentalFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    if (key === "vendorsInvolved" && value === "no") {
      setForm((current) => ({ ...current, vendorDetails: "" }))
    }
  }

  function validate() {
    const nextErrors: FormErrors = {}

    for (const message of validateClubhouseRentalFormData(form)) {
      if (message === "Resident name is required.") nextErrors.residentName = message
      if (message === "Best contact phone is required.") nextErrors.bestContactPhone = message
      if (message === "Best email address is required.") nextErrors.bestEmailAddress = message
      if (message === "Property address is required.") nextErrors.propertyAddress = message
      if (message === "Event type is required.") nextErrors.eventType = message
      if (message === "Reservation date is required.") nextErrors.reservationDate = message
      if (message === "Start time is required.") nextErrors.startTime = message
      if (message === "End time is required.") nextErrors.endTime = message
      if (message.startsWith("Estimated guest count")) nextErrors.guestCount = message
      if (message === "Event description is required.") nextErrors.eventDescription = message
      if (message === "Please indicate whether vendors are involved.") nextErrors.vendorsInvolved = message
      if (message === "Please describe the vendors or entertainment involved.") nextErrors.vendorDetails = message
      if (message === "Insurance company is required.") nextErrors.insuranceCompany = message
      if (message === "Policy number is required.") nextErrors.policyNumber = message
      if (message === "Initials are required for the clubhouse rental terms.") {
        nextErrors.clubhouseAgreementInitials = message
      }
      if (message === "Initials are required for the insurance section.") nextErrors.insuranceInitials = message
      if (message === "Initials are required for the decoration rules section.") {
        nextErrors.decorationInitials = message
      }
      if (message === "Please acknowledge the rental rules.") nextErrors.acknowledgeRentalRules = message
      if (message === "Please acknowledge the deposit and damage responsibility.") {
        nextErrors.acknowledgeDepositResponsibility = message
      }
      if (message === "Please acknowledge attendance responsibility.") {
        nextErrors.acknowledgeAttendanceResponsibility = message
      }
      if (message === "Please acknowledge capacity and safety requirements.") {
        nextErrors.acknowledgeCapacitySafety = message
      }
      if (message === "Typed confirmation name is required.") nextErrors.typedConfirmationName = message
    }

    if (!insuranceCertificateFile && existingAttachments.length === 0) {
      nextErrors.insuranceCertificate = "Insurance certificate upload is required."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  useEffect(() => {
    if (!hasAvailabilityInputs) {
      setConflicts({ blockingConflicts: [], tentativeConflicts: [] })
      setConflictsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        setConflictsLoading(true)
        const res = await fetch("/api/clubhouse-rental/availability/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData: {
              reservationDate: form.reservationDate,
              startTime: form.startTime,
              endTime: form.endTime,
              requestedSpace: form.requestedSpace,
            },
            excludeRequestId: mode === "edit" ? requestId : null,
          }),
          signal: controller.signal,
        })
        const body = (await res.json().catch(() => ({}))) as {
          blockingConflicts?: AvailabilityConflict[]
          tentativeConflicts?: AvailabilityConflict[]
        }
        if (!res.ok) return
        setConflicts({
          blockingConflicts: body.blockingConflicts || [],
          tentativeConflicts: body.tentativeConflicts || [],
        })
      } catch {
        if (!controller.signal.aborted) {
          setConflicts({ blockingConflicts: [], tentativeConflicts: [] })
        }
      } finally {
        if (!controller.signal.aborted) {
          setConflictsLoading(false)
        }
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [form.reservationDate, form.startTime, form.endTime, form.requestedSpace, hasAvailabilityInputs, mode, requestId])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)

    if (!validate()) {
      setStatus({ type: "error", message: "Please correct the required fields before continuing." })
      return
    }

    setIsSubmitting(true)

    try {
      const createUrl = mode === "edit" && requestId
        ? `/api/clubhouse-rental/requests/${requestId}`
        : "/api/clubhouse-rental/requests"
      const createRes = await fetch(createUrl, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: form }),
      })
      const createBody = (await createRes.json().catch(() => ({}))) as {
        error?: string
        detail?: string
        validationErrors?: string[]
        request?: { id: string; requestNumber: string }
      }

      if (!createRes.ok || !createBody.request) {
        throw new Error(
          createBody.validationErrors?.[0] ||
            createBody.error ||
            createBody.detail ||
            (mode === "edit"
              ? "Failed to update clubhouse rental request."
              : "Failed to create clubhouse rental request."),
        )
      }

      const filesToUpload = [insuranceCertificateFile, ...additionalAttachmentFiles].filter(
        (file): file is File => file instanceof File,
      )

      if (filesToUpload.length > 0) {
        const uploadForm = new FormData()
        for (const file of filesToUpload) {
          uploadForm.append("files", file, file.name)
        }

        const uploadRes = await fetch(`/api/clubhouse-rental/requests/${createBody.request.id}/attachments`, {
          method: "POST",
          body: uploadForm,
        })
        const uploadBody = (await uploadRes.json().catch(() => ({}))) as {
          error?: string
          detail?: string
          validationErrors?: string[]
        }

        if (!uploadRes.ok) {
          throw new Error(
            uploadBody.validationErrors?.[0] ||
              uploadBody.error ||
              uploadBody.detail ||
              "Failed to upload clubhouse rental attachments.",
          )
        }
      }

      if (mode === "edit" && requestId) {
        const resubmitRes = await fetch(`/api/clubhouse-rental/requests/${requestId}/resubmit`, {
          method: "POST",
        })
        const resubmitBody = (await resubmitRes.json().catch(() => ({}))) as {
          error?: string
          detail?: string
          validationErrors?: string[]
          request?: { id: string }
        }

        if (!resubmitRes.ok || !resubmitBody.request) {
          throw new Error(
            resubmitBody.validationErrors?.[0] ||
              resubmitBody.error ||
              resubmitBody.detail ||
              "Failed to resubmit clubhouse rental request.",
          )
        }

        setStatus({
          type: "success",
          message: `Clubhouse rental request ${createBody.request.requestNumber} was updated and resubmitted successfully.`,
        })
        router.push(`/resident-portal/clubhouse/rental/requests/${requestId}`)
        router.refresh()
        return
      }

      setStatus({
        type: "success",
        message: `Clubhouse rental request ${createBody.request.requestNumber} was created successfully. Availability checks and reviewer loopback are still planned next steps.`,
      })
      setForm(EMPTY_CLUBHOUSE_RENTAL_FORM_DATA)
      setErrors({})
      setInsuranceCertificateFile(null)
      setAdditionalAttachmentFiles([])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit clubhouse rental request."
      setStatus({ type: "error", message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="section" style={{ background: "var(--pp-white)" }}>
      <div className="container" style={{ maxWidth: "78rem" }}>
        <div className="stack" style={{ gap: "var(--space-l)" }}>
          <div
            className="card"
            style={{
              padding: "var(--space-l)",
              background: mode === "edit" ? "#f8fafc" : "#f3f8f3",
              border: mode === "edit" ? "1px solid var(--pp-slate-200)" : "1px solid #dbe8df",
              display: "grid",
              gap: "0.9rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <AlertCircle
                style={{
                  width: "1.1rem",
                  height: "1.1rem",
                  color: mode === "edit" ? "#9a3412" : "var(--pp-navy-dark)",
                }}
              />
              <h2 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                {mode === "edit" ? "Resident Update" : "Experimental Online Form"}
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--pp-slate-700)", maxWidth: "68ch" }}>
              {mode === "edit"
                ? "Use this page to update the same clubhouse rental request after more information has been requested."
                : "This is an early online version of the clubhouse rental request. Use it to test the future digital workflow while review steps, notifications, and resident-facing improvements continue to evolve."}
            </p>
            {residentActionNote ? (
              <div style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "#fff7ed", color: "#9a3412" }}>
                <strong>Additional information requested:</strong> {residentActionNote}
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem" }}>
            <SectionCard
              title="Resident Information"
              description="These fields should eventually prefill from the resident's portal profile and property record."
              icon={Users}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "1rem" }}>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Resident Name</span>
                  <input className="form-input" value={form.residentName} onChange={(e) => updateField("residentName", e.target.value)} />
                  <FieldError message={errors.residentName} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Best Contact Phone</span>
                  <input className="form-input" value={form.bestContactPhone} onChange={(e) => updateField("bestContactPhone", e.target.value)} />
                  <FieldError message={errors.bestContactPhone} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Best Email Address</span>
                  <input className="form-input" type="email" value={form.bestEmailAddress} onChange={(e) => updateField("bestEmailAddress", e.target.value)} />
                  <FieldError message={errors.bestEmailAddress} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Property Address</span>
                  <input className="form-input" value={form.propertyAddress} onChange={(e) => updateField("propertyAddress", e.target.value)} />
                  <FieldError message={errors.propertyAddress} />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Event Details"
              description="This step captures the rental slot and basic event information. Availability checks will be added later."
              icon={CalendarDays}
            >
              <div
                aria-live="polite"
                style={{
                  minHeight: hasAvailabilityInputs ? "4rem" : 0,
                  display: "grid",
                  alignContent: "start",
                }}
              >
                {conflicts.blockingConflicts.length > 0 || conflicts.tentativeConflicts.length > 0 ? (
                  <div
                    style={{
                      padding: "0.9rem 1rem",
                      borderRadius: "var(--radius-md)",
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                      color: "#9a3412",
                      display: "grid",
                      gap: "0.6rem",
                    }}
                  >
                    <strong>Availability warning</strong>
                    {conflicts.blockingConflicts.length > 0 ? (
                      <div className="stack-xs">
                        <span>Booked conflicts:</span>
                        {conflicts.blockingConflicts.map((conflict) => (
                          <span key={conflict.id}>
                            {conflict.startLabel} - {conflict.endLabel} · {conflict.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {conflicts.tentativeConflicts.length > 0 ? (
                      <div className="stack-xs">
                        <span>Tentative overlaps:</span>
                        {conflicts.tentativeConflicts.map((conflict) => (
                          <span key={conflict.id}>
                            {conflict.startLabel} - {conflict.endLabel} · {conflict.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <span style={{ fontSize: "0.9rem" }}>
                      You can still submit this request, but the overlap should be reviewed before approval.
                    </span>
                  </div>
                ) : conflictsLoading ? (
                  <div style={{ color: "var(--pp-slate-500)", fontSize: "0.9rem", padding: "0.35rem 0" }}>
                    Checking availability...
                  </div>
                ) : hasAvailabilityInputs ? (
                  <div style={{ color: "var(--pp-slate-500)", fontSize: "0.9rem", padding: "0.35rem 0" }}>
                    No current conflicts found for this time slot.
                  </div>
                ) : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))", gap: "1rem" }}>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Event Type</span>
                  <select className="form-input" value={form.eventType} onChange={(e) => updateField("eventType", e.target.value)}>
                    <option value="">Select event type</option>
                    {CLUBHOUSE_RENTAL_EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.eventType} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Reservation Date</span>
                  <input className="form-input" type="date" value={form.reservationDate} onChange={(e) => updateField("reservationDate", e.target.value)} />
                  <FieldError message={errors.reservationDate} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Start Time</span>
                  <select className="form-input" value={form.startTime} onChange={(e) => updateField("startTime", e.target.value)}>
                    <option value="">Select start time</option>
                    {CLUBHOUSE_RENTAL_TIME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.startTime} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>End Time</span>
                  <select className="form-input" value={form.endTime} onChange={(e) => updateField("endTime", e.target.value)}>
                    <option value="">Select end time</option>
                    {CLUBHOUSE_RENTAL_TIME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.endTime} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Estimated Guest Count</span>
                  <input className="form-input" type="number" min="1" max="104" value={form.guestCount} onChange={(e) => updateField("guestCount", e.target.value)} />
                  <FieldError message={errors.guestCount} />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Rental Details"
              description="This section replaces the old one-line event form with a more reviewable event summary."
              icon={Clock3}
            >
              <div style={{ display: "grid", gap: "1rem" }}>
                <label style={{ display: "grid", gap: "0.35rem", maxWidth: "20rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Requested Space</span>
                  <select
                    className="form-input"
                    value={form.requestedSpace}
                    onChange={(e) => updateField("requestedSpace", e.target.value as ClubhouseRentalRequestedSpace)}
                  >
                    <option value="grand_ballroom">Grand Ballroom</option>
                  </select>
                </label>

                <div
                  style={{
                    padding: "0.9rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--pp-slate-50)",
                    borderLeft: "4px solid var(--pp-navy-dark)",
                    color: "var(--pp-slate-700)",
                  }}
                >
                  Included areas currently shown with this rental: Grand Ballroom, Full Kitchen, and Library / Meeting Room.
                </div>

                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Event Description</span>
                  <textarea className="form-input" rows={5} value={form.eventDescription} onChange={(e) => updateField("eventDescription", e.target.value)} />
                  <FieldError message={errors.eventDescription} />
                </label>

                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Setup / Special Requests</span>
                  <textarea className="form-input" rows={4} value={form.specialRequests} onChange={(e) => updateField("specialRequests", e.target.value)} />
                </label>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Will outside vendors or entertainment be involved?</span>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {[
                      { value: "no", label: "No outside vendors" },
                      { value: "yes", label: "Yes, vendors or entertainment are involved" },
                    ].map((option) => (
                      <label key={option.value} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", color: "var(--pp-slate-700)" }}>
                        <input
                          type="radio"
                          name="vendorsInvolved"
                          checked={form.vendorsInvolved === option.value}
                          onChange={() => updateField("vendorsInvolved", option.value as ClubhouseRentalVendorOption)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <FieldError message={errors.vendorsInvolved} />
                </div>

                {form.vendorsInvolved === "yes" ? (
                  <label style={{ display: "grid", gap: "0.35rem" }}>
                    <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Vendor / Entertainment Details</span>
                    <textarea className="form-input" rows={4} value={form.vendorDetails} onChange={(e) => updateField("vendorDetails", e.target.value)} />
                    <FieldError message={errors.vendorDetails} />
                  </label>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Insurance & Attachments"
              description="The old form only described these requirements in text. This draft makes the insurance material explicit."
              icon={Upload}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "1rem" }}>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Homeowner Insurance Company</span>
                  <input className="form-input" value={form.insuranceCompany} onChange={(e) => updateField("insuranceCompany", e.target.value)} />
                  <FieldError message={errors.insuranceCompany} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Homeowner Insurance Policy Number</span>
                  <input className="form-input" value={form.policyNumber} onChange={(e) => updateField("policyNumber", e.target.value)} />
                  <FieldError message={errors.policyNumber} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Insurance Certificate Upload</span>
                  <input
                    className="form-input"
                    type="file"
                    onChange={(e) => {
                      setInsuranceCertificateFile(e.target.files?.[0] || null)
                      setErrors((current) => {
                        if (!current.insuranceCertificate) return current
                        const next = { ...current }
                        delete next.insuranceCertificate
                        return next
                      })
                    }}
                  />
                  {insuranceCertificateFile ? (
                    <p style={{ margin: 0, color: "var(--pp-slate-600)", fontSize: "0.9rem" }}>Selected: {insuranceCertificateFile.name}</p>
                  ) : existingAttachments.length > 0 ? (
                    <p style={{ margin: 0, color: "var(--pp-slate-600)", fontSize: "0.9rem" }}>
                      Existing attachment(s) on file. Upload a new insurance file only if you need to add or replace documentation.
                    </p>
                  ) : null}
                  <FieldError message={errors.insuranceCertificate} />
                </label>
                <label style={{ display: "grid", gap: "0.35rem", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Additional Attachments</span>
                  <input
                    className="form-input"
                    type="file"
                    multiple
                    onChange={(e) => setAdditionalAttachmentFiles(Array.from(e.target.files || []))}
                  />
                  {additionalAttachmentFiles.length > 0 ? (
                    <p style={{ margin: 0, color: "var(--pp-slate-600)", fontSize: "0.9rem" }}>
                      Selected: {additionalAttachmentFiles.map((file) => file.name).join(", ")}
                    </p>
                  ) : null}
                </label>
              </div>
              {existingAttachments.length > 0 ? (
                <div style={{ display: "grid", gap: "0.45rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Existing Attachments</span>
                  <div className="stack-xs">
                    {existingAttachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--pp-navy-dark)", fontWeight: 600, textDecoration: "none" }}
                      >
                        {attachment.originalFilename}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Agreement & Submission"
              description="The old paper form required the renter to initial multiple rule sections. This draft keeps that intent, but in a clearer online format."
              icon={FileText}
            >
              <div style={{ display: "grid", gap: "1rem" }}>
                {[
                  {
                    key: "clubhouseAgreementInitials" as const,
                    title: "Clubhouse Rental Agreement",
                    bullets: rentalAgreementBullets,
                  },
                  {
                    key: "insuranceInitials" as const,
                    title: "Insurance",
                    bullets: insuranceBullets,
                  },
                  {
                    key: "decorationInitials" as const,
                    title: "Decoration Limitations / Rules",
                    bullets: decorationBullets,
                  },
                ].map((section) => (
                  <div
                    key={section.key}
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--pp-slate-50)",
                      border: "1px solid var(--pp-slate-200)",
                      display: "grid",
                      gap: "0.8rem",
                    }}
                  >
                    <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>{section.title}</h3>
                    <ul style={{ margin: 0, paddingLeft: "1.15rem", color: "var(--pp-slate-700)", display: "grid", gap: "0.35rem" }}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                    <label style={{ display: "grid", gap: "0.35rem", maxWidth: "12rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Initials</span>
                      <input className="form-input" value={form[section.key]} onChange={(e) => updateField(section.key, e.target.value)} maxLength={8} />
                      <FieldError message={errors[section.key]} />
                    </label>
                  </div>
                ))}

                <div style={{ display: "grid", gap: "0.6rem" }}>
                  {[
                    {
                      key: "acknowledgeRentalRules" as const,
                      label: "I acknowledge that I have reviewed the clubhouse rental rules and event-use limitations.",
                    },
                    {
                      key: "acknowledgeDepositResponsibility" as const,
                      label: "I acknowledge responsibility for the deposit, cleanup obligations, and damage-related charges.",
                    },
                    {
                      key: "acknowledgeAttendanceResponsibility" as const,
                      label: "I acknowledge that the resident renter must be present for the duration of the event.",
                    },
                    {
                      key: "acknowledgeCapacitySafety" as const,
                      label: "I acknowledge the clubhouse capacity, safety, and occupancy requirements.",
                    },
                  ].map((item) => (
                    <label key={item.key} style={{ display: "grid", gap: "0.25rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "flex-start", gap: "0.55rem", color: "var(--pp-slate-700)" }}>
                        <input
                          type="checkbox"
                          checked={form[item.key]}
                          onChange={(e) => updateField(item.key, e.target.checked)}
                          style={{ marginTop: "0.2rem" }}
                        />
                        {item.label}
                      </span>
                      <FieldError message={errors[item.key]} />
                    </label>
                  ))}
                </div>

                <label style={{ display: "grid", gap: "0.35rem", maxWidth: "24rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>Typed Confirmation Name</span>
                  <input className="form-input" value={form.typedConfirmationName} onChange={(e) => updateField("typedConfirmationName", e.target.value)} />
                  <FieldError message={errors.typedConfirmationName} />
                </label>
              </div>
            </SectionCard>

            {status ? (
              <div
                className="card"
                style={{
                  padding: "1rem 1.1rem",
                  border: status.type === "success" ? "1px solid #86efac" : "1px solid #fca5a5",
                  background: status.type === "success" ? "#ecfdf3" : "#fef2f2",
                  color: status.type === "success" ? "#166534" : "#991b1b",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                }}
              >
                {status.type === "success" ? (
                  <CheckCircle2 style={{ width: "1rem", height: "1rem", marginTop: "0.15rem", flexShrink: 0 }} />
                ) : (
                  <AlertCircle style={{ width: "1rem", height: "1rem", marginTop: "0.15rem", flexShrink: 0 }} />
                )}
                <p style={{ margin: 0 }}>{status.message}</p>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (mode === "edit" ? "Saving..." : "Submitting...") : mode === "edit" ? "Update and Resubmit" : "Submit Rental Request"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setForm(initialFormData)
                  setErrors({})
                  setInsuranceCertificateFile(null)
                  setAdditionalAttachmentFiles([])
                  setStatus(null)
                }}
              >
                {mode === "edit" ? "Reset Changes" : "Reset Draft"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
