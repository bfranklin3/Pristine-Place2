import PasswordResetFlow from "@/components/auth/password-reset-flow"

type WelcomeSetPasswordPageProps = {
  searchParams?: {
    email?: string
  }
}

export default function WelcomeSetPasswordPage({ searchParams }: WelcomeSetPasswordPageProps) {
  const initialEmail = typeof searchParams?.email === "string" ? searchParams.email : ""

  return (
    <PasswordResetFlow
      title="Welcome to the Pristine Place Resident Portal"
      description="To get started, set your new portal password. Enter your email to receive a verification code, then create your password."
      initialEmail={initialEmail}
      showBackLink={false}
      requestButtonLabel="Email Me a Verification Code"
      verifyButtonLabel="Create My New Password"
      codeSentMessage="Verification code sent. Please check your email."
    />
  )
}
