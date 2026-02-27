// app/not-found.tsx

import Link from "next/link"

export default function NotFound() {
  return (
    <div className="section-lg">
      <div className="container stack" style={{ alignItems: "center", textAlign: "center" }}>
        <h1>Page Not Found</h1>
        <p className="text-fluid-lg text-pp-slate-500" style={{ maxWidth: "var(--measure)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Head back home or
          use the navigation above.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
