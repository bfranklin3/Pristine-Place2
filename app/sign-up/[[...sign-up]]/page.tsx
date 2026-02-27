import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "var(--pp-slate-50)",
      }}
    >
      <SignUp
        forceRedirectUrl="/portal-registration"
        fallbackRedirectUrl="/portal-registration"
      />
    </div>
  )
}
