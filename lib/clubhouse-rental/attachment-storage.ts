import {
  ACC_WORKFLOW_ALLOWED_EXTENSIONS,
  ACC_WORKFLOW_MAX_FILES,
  ACC_WORKFLOW_MAX_FILE_SIZE,
  uploadAccWorkflowFileToWordPress,
  validateAccWorkflowUploadFiles,
} from "@/lib/acc-workflow/attachment-storage"

export const CLUBHOUSE_RENTAL_ALLOWED_EXTENSIONS = ACC_WORKFLOW_ALLOWED_EXTENSIONS
export const CLUBHOUSE_RENTAL_MAX_FILES = ACC_WORKFLOW_MAX_FILES
export const CLUBHOUSE_RENTAL_MAX_FILE_SIZE = ACC_WORKFLOW_MAX_FILE_SIZE

export const validateClubhouseRentalUploadFiles = validateAccWorkflowUploadFiles
export const uploadClubhouseRentalFileToWordPress = uploadAccWorkflowFileToWordPress
