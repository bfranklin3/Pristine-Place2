import { auth, currentUser } from "@clerk/nextjs/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { PortalRegistrationForm } from "@/components/auth/portal-registration-form"

export const metadata = {
  title: "Resident Portal Registration",
  description: "Submit your resident information for HOA approval before accessing the portal.",
}

interface PortalRegistrationData {
  homeAddress?: string
  username?: string | null
  emailAddress?: string
}

export default async function PortalRegistrationPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/portal-registration")}`)
  }

  const user = await currentUser()
  const isApproved = user?.publicMetadata?.portalApproved === true
  const isSubmitted = user?.publicMetadata?.portalRegistrationSubmitted === true
  const registrationData = (user?.unsafeMetadata?.portalRegistration || {}) as PortalRegistrationData
  const primaryEmail = user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress || ""

  if (isApproved) {
    redirect("/resident-portal")
  }

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">Resident Portal Registration</h1>
          <p className="hero-subtitle" style={{ maxWidth: "62ch" }}>
            Sign-up is open to everyone, but Resident Portal access is granted only after HOA approval.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="card stack" style={{ gap: "var(--space-m)", padding: "var(--space-l)" }}>
            {isSubmitted ? (
              <>
                <h2 style={{ color: "var(--pp-navy-dark)" }}>Registration Submitted</h2>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)" }}>
                  Your registration form is on file and pending HOA review. You will receive access once approved.
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                  If you need an update, contact the board at{" "}
                  <a href="mailto:bod@pristineplace.us" className="text-pp-navy hover:underline">
                    bod@pristineplace.us
                  </a>.
                </p>
                <div>
                  <Link href="/" className="btn btn-outline">Return to Public Website</Link>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ color: "var(--pp-navy-dark)" }}>Approval Form</h2>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)" }}>
                  Complete this form so the HOA can verify residency and approve portal access.
                </p>
                <PortalRegistrationForm
                  initialFirstName={user?.firstName || ""}
                  initialLastName={user?.lastName || ""}
                  initialAddress={registrationData.homeAddress || ""}
                  initialEmailAddress={registrationData.emailAddress || primaryEmail}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
