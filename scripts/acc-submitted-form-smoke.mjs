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
  throw new Error("PORTAL_TEST_SESSION_SECRET is required for the ACC submitted-form smoke test.")
}

const unique = `PDF Smoke ${Date.now()}`
const firstFile = path.join(os.tmpdir(), `acc-pdf-smoke-${Date.now()}-1.txt`)
fs.writeFileSync(firstFile, `Attachment for ${unique}\n`)

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

async function assertPdfDownload(requestContext, url, label) {
  const response = await requestContext.get(url)
  expectStatus(response, 200, label)
  const contentType = response.headers()["content-type"] || ""
  if (!contentType.includes("application/pdf")) {
    throw new Error(`${label} returned unexpected content-type: ${contentType}`)
  }
  const body = await response.body()
  if (!body || body.length < 500) {
    throw new Error(`${label} returned an unexpectedly small PDF payload.`)
  }
  return body.length
}

const browser = await chromium.launch({ headless: true })
const summary = {
  unique,
  requestId: null,
  requestNumber: null,
  submitStatus: null,
  attachmentUploadStatus: null,
  notifyStatus: null,
  notifyPdfAttached: false,
  notifyPdfFilename: null,
  queueDownloadBytes: 0,
  dashboardNativeDownloadBytes: 0,
  dashboardLegacyDownloadBytes: 0,
  purged: false,
}

let residentContext
let chairContext
let adminContext

try {
  residentContext = await createSessionContext(browser, residentUserId)
  chairContext = await createSessionContext(browser, chairUserId)
  adminContext = await createSessionContext(browser, adminUserId)

  const chairPage = await chairContext.newPage()

  const formData = {
    ownerName: `Resident ${unique}`,
    streetAddress: "123 PDF Smoke Lane",
    ownerPhone: "555-111-2222",
    ownerEmail: "resident-pdf-smoke@example.com",
    phase: "",
    lot: "",
    role: "owner",
    authorizedRepName: "",
    workType: "other",
    projectDescription: `Submitted form PDF smoke ${unique}`,
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
  summary.submitStatus = submitResponse.status()
  expectStatus(submitResponse, 201, "Resident submit")
  const submitBody = await submitResponse.json()
  const requestId = submitBody?.request?.id
  const requestNumber = submitBody?.request?.requestNumber
  if (!requestId || !requestNumber) {
    throw new Error("Submit response did not include request id and request number.")
  }
  summary.requestId = requestId
  summary.requestNumber = requestNumber

  const attachmentUploadResponse = await residentContext.request.post(`/api/acc/requests/${requestId}/attachments`, {
    multipart: {
      files: {
        name: path.basename(firstFile),
        mimeType: "text/plain",
        buffer: fs.readFileSync(firstFile),
      },
    },
  })
  summary.attachmentUploadStatus = attachmentUploadResponse.status()
  expectStatus(attachmentUploadResponse, 200, "Attachment upload")

  const notifyResponse = await residentContext.request.post(`/api/acc/requests/${requestId}/notify-submission`, {
    data: { kind: "submitted" },
  })
  summary.notifyStatus = notifyResponse.status()
  expectStatus(notifyResponse, 200, "Notify submission")
  const notifyBody = await notifyResponse.json()
  summary.notifyPdfAttached = Boolean(notifyBody?.pdfAttached)
  summary.notifyPdfFilename = notifyBody?.pdfFilename || null
  if (!summary.notifyPdfAttached) {
    throw new Error("Notify submission did not report an attached PDF.")
  }

  await chairPage.goto("/resident-portal/management/acc-queue", { waitUntil: "domcontentloaded" })
  await chairPage.getByPlaceholder("Search request number, name, address, title, or description").fill(unique)
  const queueFilterResponse = chairPage.waitForResponse(
    (response) => response.url().includes("/api/acc/queue?") && response.request().method() === "GET",
  )
  await chairPage.getByRole("button", { name: "Filter" }).click()
  await queueFilterResponse
  const requestRow = chairPage.locator("tbody tr").filter({ hasText: unique }).first()
  await requestRow.waitFor({ timeout: 60000 })
  await requestRow.click()
  const queueDownloadLink = chairPage.getByRole("link", { name: "Download Submitted Form" }).first()
  await queueDownloadLink.waitFor({ timeout: 60000 })
  const queueHref = await queueDownloadLink.getAttribute("href")
  if (!queueHref) throw new Error("Queue download button did not include an href.")
  summary.queueDownloadBytes = await assertPdfDownload(chairContext.request, queueHref, "Queue submitted-form PDF")

  await chairPage.goto("/resident-portal/management/acc-dashboard", { waitUntil: "domcontentloaded" })
  await chairPage.getByPlaceholder("Search source, resident, address, request, permit").fill(unique)
  const dashboardFilterResponse = chairPage.waitForResponse(
    (response) => response.url().includes("/api/acc/dashboard?") && response.request().method() === "GET",
  )
  await chairPage.getByRole("button", { name: "Filter" }).click()
  await dashboardFilterResponse
  const nativeRow = chairPage.locator("tbody tr").filter({ hasText: requestNumber }).first()
  await nativeRow.waitFor({ timeout: 60000 })
  await nativeRow.getByRole("button", { name: "View" }).click()
  const nativeModalDownloadLink = chairPage.getByRole("link", { name: "Download Submitted Form" }).last()
  await nativeModalDownloadLink.waitFor({ timeout: 60000 })
  const nativeModalHref = await nativeModalDownloadLink.getAttribute("href")
  if (!nativeModalHref) throw new Error("Native dashboard modal download button did not include an href.")
  summary.dashboardNativeDownloadBytes = await assertPdfDownload(chairContext.request, nativeModalHref, "Dashboard native submitted-form PDF")
  await chairPage.getByRole("button", { name: "Close" }).click()

  const sourceSelect = chairPage.locator('select').nth(0)
  await sourceSelect.selectOption("legacy")
  const legacyFilterResponse = chairPage.waitForResponse(
    (response) => response.url().includes("/api/acc/dashboard?") && response.request().method() === "GET",
  )
  await chairPage.getByRole("button", { name: "Filter" }).click()
  await legacyFilterResponse
  const legacyViewButton = chairPage.locator("tbody tr").first().getByRole("button", { name: "View" })
  await legacyViewButton.waitFor({ timeout: 60000 })
  await legacyViewButton.click()
  const legacyModalDownloadLink = chairPage.getByRole("link", { name: "Download Submitted Form" }).last()
  await legacyModalDownloadLink.waitFor({ timeout: 60000 })
  const legacyModalHref = await legacyModalDownloadLink.getAttribute("href")
  if (!legacyModalHref) throw new Error("Legacy dashboard modal download button did not include an href.")
  summary.dashboardLegacyDownloadBytes = await assertPdfDownload(chairContext.request, legacyModalHref, "Dashboard legacy submitted-form PDF")
  await chairPage.getByRole("button", { name: "Close" }).click()

  const purge = await adminContext.request.patch(`/api/acc/queue/${requestId}`, {
    data: { action: "purge", confirmText: "PURGE" },
  })
  expectStatus(purge, 200, "Admin purge")
  summary.purged = true

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
