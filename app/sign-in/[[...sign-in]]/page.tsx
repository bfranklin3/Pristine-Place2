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
      <div style={{ display: "grid", gap: "0.8rem", width: "100%", maxWidth: "420px" }}>
        <div
          style={{
            textAlign: "center",
            border: "1px solid var(--pp-slate-300)",
            borderRadius: "10px",
            padding: "0.65rem 0.85rem",
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--pp-slate-700)" }}>
            Forgot your password?
          </p>
          <Link
            href="/forgot-password"
            style={{
              display: "inline-block",
              marginTop: "0.3rem",
              color: "var(--pp-navy-dark)",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            Reset it here
          </Link>
        </div>
        <SignIn />
        <div style={{ textAlign: "center" }}>
          <Link
            href="/forgot-password"
            style={{ color: "var(--pp-navy-dark)", fontWeight: 700, textDecoration: "underline" }}
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  )
}
