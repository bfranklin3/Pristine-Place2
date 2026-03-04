import PasswordResetFlow from "@/components/auth/password-reset-flow"

type ForgotPasswordPageProps = {
  searchParams?: {
    email?: string
  }
}

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const initialEmail = typeof searchParams?.email === "string" ? searchParams.email : ""
  return (
    <PasswordResetFlow
      title="Reset Password"
      description="Use your email to receive a verification code, then set a new password."
      initialEmail={initialEmail}
    />
  )
}
