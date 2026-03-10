import { chromium } from "playwright"

const baseURL = process.env.ACC_UI_SMOKE_BASE_URL || "http://127.0.0.1:3001"
const testSecret = process.env.PORTAL_TEST_SESSION_SECRET || ""
const residentUserId = process.env.ACC_UI_SMOKE_RESIDENT_USER_ID || "user_3AikBIlJF2PsguL2LOeMIYxvhmr"
const chairUserId = process.env.ACC_UI_SMOKE_CHAIR_USER_ID || "user_3Aik70boX5ILSpeuN4FRy7ybn1N"
const adminUserId = process.env.ACC_UI_SMOKE_ADMIN_USER_ID || "user_3Aik9OmAxKl6YrOFIEvFYAB7C2V"

if (!testSecret) {
  throw new Error("PORTAL_TEST_SESSION_SECRET is required for the ACC dashboard UI smoke test.")
}

const unique = `Dashboard Smoke ${Date.now()}`
const summary = {
  unique,
  requestId: null,
  nativeCreated: false,
  fullNativeModalStayed: false,
  fullNativeQueueOpened: false,
  fullLegacyModalStayed: false,
  fullLegacyQueueOpened: false,
  redactedNativeModalStayed: false,
  redactedNativeModalRedacted: false,
  redactedNativeQueueOpened: false,
  redactedLegacyModalStayed: false,
  redactedLegacyModalRedacted: false,
  redactedLegacyQueueOpened: false,
  purgeStatus: null,
}

function expectTruthy(value, label) {
  if (!value) throw new Error(`${label} was not truthy.`)
}

function expectStatus(status, expected, label) {
  if (status !== expected) {
    throw new Error(`${label} returned ${status} instead of ${expected}.`)
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

async function filterDashboard(page, { query = "" }) {
  await page.getByPlaceholder("Search source, resident, address, request, permit").fill(query)
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/acc/dashboard?") && response.request().method() === "GET",
    { timeout: 60000 },
  )
  await page.getByRole("button", { name: "Filter" }).click()
  await responsePromise
}

async function openLegacyModalAndQueue(page, dashboardPath, expectRedacted) {
  await page.goto(dashboardPath, { waitUntil: "domcontentloaded" })
  await page.getByRole("heading", { name: /Combined ACC Dashboard/i }).waitFor({ timeout: 60000 })

  const row = page.locator("tbody tr").filter({ hasText: "WordPress legacy" }).first()
  await row.waitFor({ timeout: 60000 })
  const rowText = (await row.innerText()).trim()
  expectTruthy(rowText, "Legacy row text")

  await row.getByRole("button", { name: "View" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor({ timeout: 60000 })

  if (!page.url().includes(dashboardPath)) {
    throw new Error(`Legacy view navigated away from ${dashboardPath}.`)
  }

  if (expectRedacted) {
    await dialog.getByText("REDACTED").first().waitFor({ timeout: 60000 })
    summary.redactedLegacyModalRedacted = true
  }

  const openLink = dialog.getByRole("link", { name: "Open in WP Queue" })
  const href = await openLink.getAttribute("href")
  expectTruthy(href, "Legacy queue href")
  const hrefUrl = new URL(href, baseURL)
  const entryId = hrefUrl.searchParams.get("entry")
  expectTruthy(entryId, "Legacy entry id")
  const detailResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith(`/api/gf-entries/${entryId}`) && response.request().method() === "GET",
    { timeout: 60000 },
  )
  await Promise.all([
    page.waitForURL((url) => url.pathname.includes(expectRedacted ? "/resident-portal/management/wp-acc-queue-redacted" : "/resident-portal/management/wp-acc-queue"), { timeout: 60000 }),
    openLink.click(),
  ])
  await detailResponsePromise
  await page.getByText(new RegExp(`View ACC Request\\s+#${entryId}`)).waitFor({ timeout: 60000 })

  if (expectRedacted) {
    summary.redactedLegacyModalStayed = true
    summary.redactedLegacyQueueOpened = true
  } else {
    summary.fullLegacyModalStayed = true
    summary.fullLegacyQueueOpened = true
  }
}

async function openNativeModalAndQueue(page, dashboardPath, requestId, expectRedacted) {
  await page.goto(dashboardPath, { waitUntil: "domcontentloaded" })
  await filterDashboard(page, { query: unique })

  const row = page.locator("tbody tr").filter({ hasText: unique }).first()
  await row.waitFor({ timeout: 60000 })
  await row.getByRole("button", { name: "View" }).click()

  const dialog = page.getByRole("dialog")
  await dialog.waitFor({ timeout: 60000 })
  await dialog.getByText(`Native dashboard flow ${unique}`).first().waitFor({ timeout: 60000 })

  if (!page.url().includes(dashboardPath)) {
    throw new Error(`Native view navigated away from ${dashboardPath}.`)
  }

  if (expectRedacted) {
    await dialog.getByText("REDACTED").first().waitFor({ timeout: 60000 })
    summary.redactedNativeModalStayed = true
    summary.redactedNativeModalRedacted = true
  } else {
    summary.fullNativeModalStayed = true
  }

  const detailResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith(`/api/acc/queue/${requestId}`) && response.request().method() === "GET",
    { timeout: 60000 },
  )
  await Promise.all([
    page.waitForURL((url) => url.pathname.includes("/resident-portal/management/acc-queue") && url.searchParams.get("selected") === requestId, { timeout: 60000 }),
    dialog.getByRole("link", { name: "Open in Native Queue" }).click(),
  ])
  await detailResponsePromise
  await page.getByRole("heading", { name: "ACC Workflow Queue" }).waitFor({ timeout: 60000 })

  if (expectRedacted) {
    summary.redactedNativeQueueOpened = true
  } else {
    summary.fullNativeQueueOpened = true
  }
}

const browser = await chromium.launch({ headless: true })
let residentContext
let chairContext
let adminContext

try {
  residentContext = await createSessionContext(browser, residentUserId)
  chairContext = await createSessionContext(browser, chairUserId)
  adminContext = await createSessionContext(browser, adminUserId)

  const createResponse = await residentContext.request.post("/api/acc/requests", {
    data: {
      formData: {
        ownerName: `Resident ${unique}`,
        streetAddress: "123 Dashboard Test Lane",
        ownerPhone: "555-222-3333",
        ownerEmail: "resident-dashboard-smoke@example.com",
        phase: "",
        lot: "",
        role: "owner",
        authorizedRepName: "",
        workType: "other",
        projectDescription: `Native dashboard flow ${unique}`,
        startDate: "2026-03-21",
        completionDate: "2026-03-29",
        hasSupportingDocs: "no",
        paintBodyColor: "",
        paintTrimColor: "",
        paintDoorColor: "",
        roofColor: "",
        roofType: "",
        fenceStyle: "",
        landscapingDetails: "",
        otherWorkDetails: `Native dashboard details ${unique}`,
      },
    },
  })
  expectStatus(createResponse.status(), 201, "Resident native request create")
  const createBody = await createResponse.json()
  const requestId = createBody?.request?.id
  expectTruthy(requestId, "Native dashboard request id")
  summary.requestId = requestId
  summary.nativeCreated = true

  const chairPage = await chairContext.newPage()

  await openNativeModalAndQueue(chairPage, "/resident-portal/management/acc-dashboard", requestId, false)
  await openLegacyModalAndQueue(chairPage, "/resident-portal/management/acc-dashboard", false)
  await openNativeModalAndQueue(chairPage, "/resident-portal/management/acc-dashboard-redacted", requestId, true)
  await openLegacyModalAndQueue(chairPage, "/resident-portal/management/acc-dashboard-redacted", true)

  const purgeResponse = await adminContext.request.patch(`/api/acc/queue/${requestId}`, {
    data: { action: "purge", confirmText: "PURGE" },
  })
  summary.purgeStatus = purgeResponse.status()
  expectStatus(purgeResponse.status(), 200, "Admin purge")

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
