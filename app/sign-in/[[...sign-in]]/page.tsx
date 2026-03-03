import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

export default function SignInPage() {
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
      <div style={{ display: "grid", gap: "0.8rem" }}>
        <SignIn />
        <div style={{ textAlign: "center" }}>
          <Link href="/forgot-password" style={{ color: "var(--pp-navy-dark)", fontWeight: 600, textDecoration: "underline" }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  )
}
