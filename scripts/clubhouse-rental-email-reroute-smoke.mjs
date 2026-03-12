import { request } from "@playwright/test"

const baseURL = process.env.CLUBHOUSE_RENTAL_SMOKE_BASE_URL || "http://127.0.0.1:3001"
const testSecret = process.env.PORTAL_TEST_SESSION_SECRET || ""
const residentUserId = process.env.CLUBHOUSE_RENTAL_SMOKE_RESIDENT_USER_ID || "user_3AikBIlJF2PsguL2LOeMIYxvhmr"
const adminUserId = process.env.CLUBHOUSE_RENTAL_SMOKE_ADMIN_USER_ID || "user_3Aik9OmAxKl6YrOFIEvFYAB7C2V"

if (!testSecret) {
  throw new Error("PORTAL_TEST_SESSION_SECRET is required for the clubhouse rental email reroute smoke test.")
}

async function createSessionContext(userId) {
  const context = await request.newContext({ baseURL })
  const sessionRes = await context.post("/api/test-auth/session", {
    headers: { "x-portal-test-secret": testSecret },
    data: { userId },
  })
  if (!sessionRes.ok()) {
    throw new Error(`Failed to create test session for ${userId}: ${sessionRes.status()} ${await sessionRes.text()}`)
  }
  return context
}

async function clearSessionContext(context) {
  if (!context) return
  await context
    .delete("/api/test-auth/session", {
      headers: { "x-portal-test-secret": testSecret },
    })
    .catch(() => {})
  await context.dispose().catch(() => {})
}

function expectStatus(response, expected, label) {
  if (response.status() !== expected) {
    throw new Error(`${label} returned ${response.status()} instead of ${expected}.`)
  }
}

const unique = `Clubhouse Email Smoke ${Date.now()}`

const formData = {
  residentName: `Resident ${unique}`,
  bestContactPhone: "555-111-3333",
  bestEmailAddress: "resident-clubhouse-smoke@example.com",
  propertyAddress: "123 Clubhouse Test Lane",
  eventType: "Meeting",
  reservationDate: "2026-04-18",
  startTime: "2:00 PM",
  endTime: "4:00 PM",
  guestCount: "24",
  requestedSpace: "grand_ballroom",
  eventDescription: `Clubhouse email test ${unique}`,
  specialRequests: "Initial clubhouse smoke submission.",
  vendorsInvolved: "no",
  vendorDetails: "",
  insuranceCompany: "Pristine Mutual",
  policyNumber: "CBR-TEST-1001",
  typedConfirmationName: `Resident ${unique}`,
  clubhouseAgreementInitials: "RS",
  insuranceInitials: "RS",
  decorationInitials: "RS",
  acknowledgeRentalRules: true,
  acknowledgeDepositResponsibility: true,
  acknowledgeAttendanceResponsibility: true,
  acknowledgeCapacitySafety: true,
}

const summary = {
  unique,
  requestId: null,
  requestNumber: null,
  submitStatus: null,
  submitNotificationResult: null,
  attachmentUploadStatus: null,
  moreInfoStatus: null,
  moreInfoNotificationResult: null,
  residentPatchStatus: null,
  resubmitStatus: null,
  resubmitNotificationResult: null,
  approveStatus: null,
  finalDecisionNotificationResult: null,
  finalStatus: null,
}

let residentContext
let adminContext

try {
  residentContext = await createSessionContext(residentUserId)
  adminContext = await createSessionContext(adminUserId)

  const submitResponse = await residentContext.post("/api/clubhouse-rental/requests", {
    data: { formData },
  })
  summary.submitStatus = submitResponse.status()
  expectStatus(submitResponse, 201, "Clubhouse resident submit")
  const submitBody = await submitResponse.json()
  summary.requestId = submitBody?.request?.id || null
  summary.requestNumber = submitBody?.request?.requestNumber || null
  summary.submitNotificationResult = submitBody?.notificationResult || null

  if (!summary.requestId) {
    throw new Error("Clubhouse resident submit response did not include request id.")
  }

  const attachmentResponse = await residentContext.post(`/api/clubhouse-rental/requests/${summary.requestId}/attachments`, {
    multipart: {
      files: {
        name: "clubhouse-email-smoke.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(`Clubhouse reroute smoke attachment for ${unique}\n`, "utf8"),
      },
    },
  })
  summary.attachmentUploadStatus = attachmentResponse.status()
  expectStatus(attachmentResponse, 200, "Clubhouse attachment upload")

  const moreInfoResponse = await adminContext.patch(`/api/clubhouse-rental/queue/${summary.requestId}`, {
    data: {
      action: "request_more_info",
      note: "Please confirm final guest count for the clubhouse email smoke test.",
    },
  })
  summary.moreInfoStatus = moreInfoResponse.status()
  expectStatus(moreInfoResponse, 200, "Clubhouse request more info")
  const moreInfoBody = await moreInfoResponse.json()
  summary.moreInfoNotificationResult = moreInfoBody?.notificationResult || null

  const updatedFormData = {
    ...formData,
    guestCount: "28",
    specialRequests: "Updated after more-info request for email reroute verification.",
  }

  const patchResponse = await residentContext.patch(`/api/clubhouse-rental/requests/${summary.requestId}`, {
    data: { formData: updatedFormData },
  })
  summary.residentPatchStatus = patchResponse.status()
  expectStatus(patchResponse, 200, "Clubhouse resident patch")

  const resubmitResponse = await residentContext.post(`/api/clubhouse-rental/requests/${summary.requestId}/resubmit`)
  summary.resubmitStatus = resubmitResponse.status()
  expectStatus(resubmitResponse, 200, "Clubhouse resident resubmit")
  const resubmitBody = await resubmitResponse.json()
  summary.resubmitNotificationResult = resubmitBody?.notificationResult || null

  const approveResponse = await adminContext.patch(`/api/clubhouse-rental/queue/${summary.requestId}`, {
    data: {
      action: "approve",
      note: "Approved for clubhouse email reroute smoke verification.",
    },
  })
  summary.approveStatus = approveResponse.status()
  expectStatus(approveResponse, 200, "Clubhouse approve")
  const approveBody = await approveResponse.json()
  summary.finalDecisionNotificationResult = approveBody?.notificationResult || null
  summary.finalStatus = approveBody?.request?.status || null

  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  console.error(error)
  console.log(JSON.stringify(summary, null, 2))
  process.exitCode = 1
} finally {
  await clearSessionContext(residentContext)
  await clearSessionContext(adminContext)
}
