import { request } from "@playwright/test"

const baseURL = process.env.ACC_UI_SMOKE_BASE_URL || "http://127.0.0.1:3001"
const testSecret = process.env.PORTAL_TEST_SESSION_SECRET || ""
const residentUserId = process.env.ACC_UI_SMOKE_RESIDENT_USER_ID || "user_3AikBIlJF2PsguL2LOeMIYxvhmr"
const chairUserId = process.env.ACC_UI_SMOKE_CHAIR_USER_ID || "user_3Aik70boX5ILSpeuN4FRy7ybn1N"
const adminUserId = process.env.ACC_UI_SMOKE_ADMIN_USER_ID || "user_3Aik9OmAxKl6YrOFIEvFYAB7C2V"

if (!testSecret) {
  throw new Error("PORTAL_TEST_SESSION_SECRET is required for the ACC email reroute smoke test.")
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
  await context.delete("/api/test-auth/session", {
    headers: { "x-portal-test-secret": testSecret },
  }).catch(() => {})
  await context.dispose().catch(() => {})
}

function expectStatus(response, expected, label) {
  if (response.status() !== expected) {
    throw new Error(`${label} returned ${response.status()} instead of ${expected}.`)
  }
}

const unique = `Email Sanity Smoke ${Date.now()}`

const formData = {
  ownerName: `Resident ${unique}`,
  streetAddress: "123 Sanity Email Lane",
  ownerPhone: "555-111-2222",
  ownerEmail: "resident-sanity-smoke@example.com",
  phase: "",
  lot: "",
  role: "owner",
  authorizedRepName: "",
  workType: "other",
  projectDescription: `Email Sanity test ${unique}`,
  startDate: "2026-03-20",
  completionDate: "2026-03-27",
  hasSupportingDocs: "no",
  paintBodyColor: "",
  paintTrimColor: "",
  paintDoorColor: "",
  roofColor: "",
  roofType: "",
  fenceStyle: "",
  landscapingDetails: "",
  otherWorkDetails: `Email Sanity details ${unique}`,
}

const summary = {
  unique,
  requestId: null,
  requestNumber: null,
  submitStatus: null,
  submitNotificationResult: null,
  moreInfoStatus: null,
  moreInfoNotificationResult: null,
  purgeStatus: null,
}

let residentContext
let chairContext
let adminContext

try {
  residentContext = await createSessionContext(residentUserId)
  chairContext = await createSessionContext(chairUserId)
  adminContext = await createSessionContext(adminUserId)

  const submitResponse = await residentContext.post("/api/acc/requests", {
    data: { formData },
  })
  summary.submitStatus = submitResponse.status()
  expectStatus(submitResponse, 201, "Resident submit")
  const submitBody = await submitResponse.json()
  summary.requestId = submitBody?.request?.id || null
  summary.requestNumber = submitBody?.request?.requestNumber || null
  summary.submitNotificationResult = submitBody?.notificationResult || null

  if (!summary.requestId) {
    throw new Error("Resident submit response did not include request id.")
  }

  const moreInfoResponse = await chairContext.patch(`/api/acc/queue/${summary.requestId}`, {
    data: {
      action: "request_more_info",
      note: "Please add one more document for Sanity email verification.",
    },
  })
  summary.moreInfoStatus = moreInfoResponse.status()
  expectStatus(moreInfoResponse, 200, "Request more info")
  const moreInfoBody = await moreInfoResponse.json()
  summary.moreInfoNotificationResult = moreInfoBody?.notificationResult || null

  const purgeResponse = await adminContext.patch(`/api/acc/queue/${summary.requestId}`, {
    data: {
      action: "purge",
      confirmText: "PURGE",
    },
  })
  summary.purgeStatus = purgeResponse.status()
  expectStatus(purgeResponse, 200, "Admin purge")

  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  console.error(error)
  console.log(JSON.stringify(summary, null, 2))
  process.exitCode = 1
} finally {
  await clearSessionContext(residentContext)
  await clearSessionContext(chairContext)
  await clearSessionContext(adminContext)
}
