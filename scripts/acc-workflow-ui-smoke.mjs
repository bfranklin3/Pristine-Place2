import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { chromium } from "playwright"

const baseURL = process.env.ACC_UI_SMOKE_BASE_URL || "http://127.0.0.1:3001"
const testSecret = process.env.PORTAL_TEST_SESSION_SECRET || ""
const residentUserId = process.env.ACC_UI_SMOKE_RESIDENT_USER_ID || "user_3AikBIlJF2PsguL2LOeMIYxvhmr"
const chairUserId = process.env.ACC_UI_SMOKE_CHAIR_USER_ID || "user_3Aik70boX5ILSpeuN4FRy7ybn1N"
const adminUserId = process.env.ACC_UI_SMOKE_ADMIN_USER_ID || "user_3Aik9OmAxKl6YrOFIEvFYAB7C2V"

if (!testSecret) {
  throw new Error("PORTAL_TEST_SESSION_SECRET is required for the ACC workflow UI smoke test.")
}

const unique = `UI Smoke ${Date.now()}`
const firstFile = path.join(os.tmpdir(), `acc-ui-smoke-${Date.now()}-1.txt`)
const secondFile = path.join(os.tmpdir(), `acc-ui-smoke-${Date.now()}-2.txt`)
fs.writeFileSync(firstFile, `First attachment for ${unique}\n`)
fs.writeFileSync(secondFile, `Second attachment for ${unique}\n`)

function expectStatus(response, expected, label) {
  if (response.status() !== expected) {
    throw new Error(`${label} returned ${response.status()} instead of ${expected}.`)
  }
}

async function createSessionContext(browser, userId) {
  const context = await browser.newContext({ baseURL })
  const sessionRes = await context.request.post("/api/test-auth/session", {
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
  await context.request.delete("/api/test-auth/session", {
    headers: { "x-portal-test-secret": testSecret },
  }).catch(() => {})
  await context.close().catch(() => {})
}

const browser = await chromium.launch({ headless: true })
const summary = {
  unique,
  requestId: null,
  submitStatus: null,
  initialAttachmentUploadStatus: null,
  residentDetailSawAttachment: false,
  residentListSawRequest: false,
  moreInfoStatus: null,
  residentSawNeedsMoreInfo: false,
  residentEditPageLoaded: false,
  residentPatchStatus: null,
  residentResubmitStatus: null,
  resubmitAttachmentStatus: null,
  chairSawResubmittedRequest: false,
  approveStatus: null,
  residentSawApprovedStatus: false,
  adminPurgeStatus: null,
}

let residentContext
let chairContext
let adminContext

try {
  residentContext = await createSessionContext(browser, residentUserId)
  chairContext = await createSessionContext(browser, chairUserId)
  adminContext = await createSessionContext(browser, adminUserId)

  const residentPage = await residentContext.newPage()
  const chairPage = await chairContext.newPage()
  const adminPage = await adminContext.newPage()

  const formData = {
    ownerName: `Resident ${unique}`,
    streetAddress: "123 Smoke Test Lane",
    ownerPhone: "555-111-2222",
    ownerEmail: "resident-smoke@example.com",
    phase: "",
    lot: "",
    role: "owner",
    authorizedRepName: "",
    workType: "other",
    projectDescription: `Browser workflow test ${unique}`,
    startDate: "2026-03-20",
    completionDate: "2026-03-27",
    hasSupportingDocs: "yes",
    paintBodyColor: "",
    paintTrimColor: "",
    paintDoorColor: "",
    roofColor: "",
    roofType: "",
    fenceStyle: "",
    landscapingDetails: "",
    otherWorkDetails: `Other workflow details ${unique}`,
  }

  const submitResponse = await residentContext.request.post("/api/acc/requests", {
    data: { formData },
  })
  const submitBody = await submitResponse.json()
  summary.submitStatus = submitResponse.status()
  expectStatus(submitResponse, 201, "Resident submit")
  const requestId = submitBody?.request?.id
  if (!requestId) {
    throw new Error("Missing request id after resident submit.")
  }
  summary.requestId = requestId

  const initialAttachmentResponse = await residentContext.request.post(`/api/acc/requests/${requestId}/attachments`, {
    multipart: {
      files: {
        name: path.basename(firstFile),
        mimeType: "text/plain",
        buffer: fs.readFileSync(firstFile),
      },
    },
  })
  summary.initialAttachmentUploadStatus = initialAttachmentResponse.status()
  expectStatus(initialAttachmentResponse, 200, "Initial attachment upload")

  await residentPage.goto(`/resident-portal/acc/requests/${requestId}`, { waitUntil: "domcontentloaded" })
  await residentPage.getByRole("link", { name: path.basename(firstFile) }).waitFor({ timeout: 60000 })
  summary.residentDetailSawAttachment = true

  await residentPage.goto("/resident-portal/acc/requests", { waitUntil: "domcontentloaded" })
  await residentPage.locator(`a[href="/resident-portal/acc/requests/${requestId}"]`).waitFor({ timeout: 60000 })
  summary.residentListSawRequest = true

  await chairPage.goto("/resident-portal/management/acc-queue", { waitUntil: "domcontentloaded" })
  await chairPage.getByRole("heading", { name: "ACC Workflow Queue" }).waitFor({ timeout: 60000 })
  await chairPage.getByPlaceholder("Search name, address, title, or description").fill(unique)
  const filterQueueResponsePromise = chairPage.waitForResponse(
    (response) => response.url().includes("/api/acc/queue?") && response.request().method() === "GET",
  )
  await chairPage.getByRole("button", { name: "Filter" }).click()
  await filterQueueResponsePromise
  const requestRow = chairPage.locator("tbody tr").filter({ hasText: unique }).first()
  await requestRow.waitFor({ timeout: 60000 })
  await requestRow.click()
  await chairPage.getByRole("button", { name: "Request More Info" }).waitFor({ timeout: 60000 })

  await chairPage.locator("textarea").fill("Please add one more attachment and confirm updated paint details.")
  const moreInfoResponsePromise = chairPage.waitForResponse(
    (response) => response.url().endsWith(`/api/acc/queue/${requestId}`) && response.request().method() === "PATCH",
  )
  await chairPage.getByRole("button", { name: "Request More Info" }).click()
  const moreInfoResponse = await moreInfoResponsePromise
  summary.moreInfoStatus = moreInfoResponse.status()
  expectStatus(moreInfoResponse, 200, "Request more info")

  await residentPage.goto("/resident-portal/acc/requests", { waitUntil: "domcontentloaded" })
  await residentPage.getByText("Please add one more attachment and confirm updated paint details.").first().waitFor({ timeout: 60000 })
  summary.residentSawNeedsMoreInfo = true

  await residentPage.goto(`/resident-portal/acc/requests/${requestId}/edit`, { waitUntil: "domcontentloaded" })
  await residentPage.getByRole("heading", { name: "Update ACC Request" }).waitFor({ timeout: 60000 })
  summary.residentEditPageLoaded = true

  const patchResponse = await residentContext.request.patch(`/api/acc/requests/${requestId}`, {
    data: {
      formData: {
        ...formData,
        projectDescription: `Browser workflow test ${unique} resubmitted`,
      },
    },
  })
  const resubmitAttachmentResponse = await residentContext.request.post(`/api/acc/requests/${requestId}/attachments`, {
    multipart: {
      files: {
        name: path.basename(secondFile),
        mimeType: "text/plain",
        buffer: fs.readFileSync(secondFile),
      },
    },
  })
  const resubmitResponse = await residentContext.request.post(`/api/acc/requests/${requestId}/resubmit`, {
    data: {},
  })
  summary.residentPatchStatus = patchResponse.status()
  summary.resubmitAttachmentStatus = resubmitAttachmentResponse.status()
  summary.residentResubmitStatus = resubmitResponse.status()
  expectStatus(patchResponse, 200, "Resident patch")
  expectStatus(resubmitAttachmentResponse, 200, "Resubmission attachment upload")
  expectStatus(resubmitResponse, 200, "Resident resubmit")

  await residentPage.goto(`/resident-portal/acc/requests/${requestId}`, { waitUntil: "domcontentloaded" })
  await residentPage.getByRole("link", { name: path.basename(secondFile) }).waitFor({ timeout: 60000 })

  await chairPage.goto("/resident-portal/management/acc-queue", { waitUntil: "domcontentloaded" })
  await chairPage.getByPlaceholder("Search name, address, title, or description").fill(unique)
  const refilterQueueResponsePromise = chairPage.waitForResponse(
    (response) => response.url().includes("/api/acc/queue?") && response.request().method() === "GET",
  )
  await chairPage.getByRole("button", { name: "Filter" }).click()
  await refilterQueueResponsePromise
  const resubmittedRow = chairPage.locator("tbody tr").filter({ hasText: `${unique} resubmitted` }).first()
  await resubmittedRow.waitFor({ timeout: 60000 })
  await resubmittedRow.click()
  await chairPage.getByRole("button", { name: "Approve" }).waitFor({ timeout: 60000 })
  summary.chairSawResubmittedRequest = true

  await chairPage.locator("textarea").fill("Approved during browser smoke pass.")
  const approveResponsePromise = chairPage.waitForResponse(
    (response) => response.url().endsWith(`/api/acc/queue/${requestId}`) && response.request().method() === "PATCH",
  )
  await chairPage.getByRole("button", { name: "Approve" }).click()
  const approveResponse = await approveResponsePromise
  summary.approveStatus = approveResponse.status()
  expectStatus(approveResponse, 200, "Chair approve")

  await residentPage.goto(`/resident-portal/acc/requests/${requestId}`, { waitUntil: "domcontentloaded" })
  await residentPage.getByText("Approved during browser smoke pass.").first().waitFor({ timeout: 60000 })
  summary.residentSawApprovedStatus = true

  await adminPage.goto("/resident-portal/management/acc-queue", { waitUntil: "domcontentloaded" })
  await adminPage.getByPlaceholder("Search name, address, title, or description").fill(unique)
  const adminFilterResponsePromise = adminPage.waitForResponse(
    (response) => response.url().includes("/api/acc/queue?") && response.request().method() === "GET",
  )
  await adminPage.getByRole("button", { name: "Filter" }).click()
  await adminFilterResponsePromise
  const adminRow = adminPage.locator("tbody tr").filter({ hasText: `${unique} resubmitted` }).first()
  await adminRow.waitFor({ timeout: 60000 })
  await adminRow.click()
  await adminPage.getByPlaceholder('Type "PURGE" to confirm').fill("PURGE")
  const purgeResponsePromise = adminPage.waitForResponse(
    (response) => response.url().endsWith(`/api/acc/queue/${requestId}`) && response.request().method() === "PATCH",
  )
  await adminPage.getByRole("button", { name: "Purge" }).click()
  const purgeResponse = await purgeResponsePromise
  summary.adminPurgeStatus = purgeResponse.status()
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
  await browser.close().catch(() => {})
}
