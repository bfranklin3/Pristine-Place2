const WP_API = process.env.WORDPRESS_API_URL ?? "https://www.pristineplace.us/wp-json/wp/v2"
const WP_USER = process.env.WORDPRESS_USERNAME ?? ""
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD ?? ""

export const ACC_WORKFLOW_ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "bmp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "xlsm",
  "txt",
])

export const ACC_WORKFLOW_MAX_FILES = 20
export const ACC_WORKFLOW_MAX_FILE_SIZE = 256 * 1024 * 1024

export interface UploadedAccWorkflowFile {
  originalFilename: string
  storageProvider: string
  storageKey: string
  storageBucket: string | null
  mimeType: string
  fileSizeBytes: number
}

function wpAuthHeader() {
  const token = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")
  return { Authorization: `Basic ${token}` }
}

function mediaEndpoint() {
  return `${WP_API.replace(/\/wp\/v2\/?$/, "")}/wp/v2/media`
}

function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const cleaned = raw.trim().replace(/^"+|"+$/g, "")
  if (!/^https?:\/\//i.test(cleaned)) return null
  return cleaned
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf(".")
  if (idx === -1) return ""
  return name.slice(idx + 1).toLowerCase()
}

export function validateAccWorkflowUploadFiles(files: File[]) {
  const errors: string[] = []

  if (files.length > ACC_WORKFLOW_MAX_FILES) {
    errors.push(`You can upload up to ${ACC_WORKFLOW_MAX_FILES} files.`)
  }

  for (const file of files) {
    const ext = getExtension(file.name)
    if (!ACC_WORKFLOW_ALLOWED_EXTENSIONS.has(ext)) {
      errors.push(`Unsupported file type: ${file.name}`)
    }
    if (file.size > ACC_WORKFLOW_MAX_FILE_SIZE) {
      errors.push(`${file.name} exceeds 256 MB.`)
    }
  }

  return errors
}

export async function uploadAccWorkflowFileToWordPress(file: File): Promise<UploadedAccWorkflowFile> {
  if (!WP_USER || !WP_PASS) {
    throw new Error("WordPress credentials are not configured.")
  }
  if (!file.name) {
    throw new Error("Invalid file name.")
  }

  const validationErrors = validateAccWorkflowUploadFiles([file])
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0])
  }

  const fd = new FormData()
  fd.append("file", file, file.name)

  const res = await fetch(mediaEndpoint(), {
    method: "POST",
    headers: wpAuthHeader(),
    body: fd,
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`WordPress upload failed (${res.status}): ${JSON.stringify(json).slice(0, 180)}`)
  }

  const source = normalizeUrl(json?.source_url)
  if (!source) {
    throw new Error("WordPress upload returned no valid source URL.")
  }

  return {
    originalFilename: file.name,
    storageProvider: "wordpress_media",
    storageKey: source,
    storageBucket: null,
    mimeType: file.type || "application/octet-stream",
    fileSizeBytes: file.size,
  }
}
