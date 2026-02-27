"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

interface PortalRegistrationFormProps {
  initialFirstName: string
  initialLastName: string
  initialAddress: string
  initialEmailAddress: string
}

export function PortalRegistrationForm({
  initialFirstName,
  initialLastName,
  initialAddress,
  initialEmailAddress,
}: PortalRegistrationFormProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [homeAddress, setHomeAddress] = useState(initialAddress)
  const [emailAddress, setEmailAddress] = useState(initialEmailAddress)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const isFormValid = useMemo(() => {
    const hasRequired = firstName.trim() && lastName.trim() && homeAddress.trim() && emailAddress.trim()
    if (!hasRequired) return false
    return true
  }, [emailAddress, firstName, homeAddress, lastName])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResult(null)

    if (!isFormValid) {
      setResult({
        type: "error",
        message: "Please complete all required fields before submitting.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/portal-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          homeAddress,
          emailAddress,
        }),
      })

      const data = (await response.json()) as { success: boolean; error?: string }

      if (!response.ok || !data.success) {
        setResult({
          type: "error",
          message: data.error || "Registration submission failed. Please try again.",
        })
        return
      }

      router.push("/portal-registration/submitted")
    } catch {
      setResult({
        type: "error",
        message: "Registration submission failed. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="stack" style={{ gap: "var(--space-m)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-m)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label htmlFor="firstName" className="text-fluid-sm font-semibold" style={{ display: "block" }}>First Name *</label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-300)" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label htmlFor="lastName" className="text-fluid-sm font-semibold" style={{ display: "block" }}>Last Name *</label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-300)" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", gridColumn: "span 2" }}>
            <label htmlFor="homeAddress" className="text-fluid-sm font-semibold" style={{ display: "block" }}>Home Address in Pristine Place *</label>
            <input
              id="homeAddress"
              type="text"
              required
              value={homeAddress}
              onChange={(event) => setHomeAddress(event.target.value)}
              style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-300)" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label htmlFor="emailAddress" className="text-fluid-sm font-semibold" style={{ display: "block" }}>Email Address *</label>
            <input
              id="emailAddress"
              type="email"
              required
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-300)" }}
            />
          </div>
        </div>

        <div
          className="text-fluid-sm"
          style={{
            background: "var(--pp-slate-100)",
            border: "1px solid var(--pp-slate-200)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-s)",
          }}
        >
          Password is handled securely in Clerk during sign-up and is never sent through this HOA approval form.
        </div>

        <button type="submit" className="btn btn-primary" disabled={!isFormValid || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit for Approval"}
        </button>

        {result && (
          <p
            className="text-fluid-sm"
            style={{ color: result.type === "success" ? "var(--pp-navy-dark)" : "#b91c1c", fontWeight: 600 }}
          >
            {result.message}
          </p>
        )}
      </div>
    </form>
  )
}
