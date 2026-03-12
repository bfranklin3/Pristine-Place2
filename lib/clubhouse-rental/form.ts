export type ClubhouseRentalVendorOption = "no" | "yes" | ""
export type ClubhouseRentalRequestedSpace = "grand_ballroom"

export type ClubhouseRentalFormData = {
  residentName: string
  bestContactPhone: string
  bestEmailAddress: string
  propertyAddress: string
  eventType: string
  reservationDate: string
  startTime: string
  endTime: string
  guestCount: string
  requestedSpace: ClubhouseRentalRequestedSpace
  eventDescription: string
  specialRequests: string
  vendorsInvolved: ClubhouseRentalVendorOption
  vendorDetails: string
  insuranceCompany: string
  policyNumber: string
  typedConfirmationName: string
  clubhouseAgreementInitials: string
  insuranceInitials: string
  decorationInitials: string
  acknowledgeRentalRules: boolean
  acknowledgeDepositResponsibility: boolean
  acknowledgeAttendanceResponsibility: boolean
  acknowledgeCapacitySafety: boolean
}

export const EMPTY_CLUBHOUSE_RENTAL_FORM_DATA: ClubhouseRentalFormData = {
  residentName: "",
  bestContactPhone: "",
  bestEmailAddress: "",
  propertyAddress: "",
  eventType: "",
  reservationDate: "",
  startTime: "",
  endTime: "",
  guestCount: "",
  requestedSpace: "grand_ballroom",
  eventDescription: "",
  specialRequests: "",
  vendorsInvolved: "",
  vendorDetails: "",
  insuranceCompany: "",
  policyNumber: "",
  typedConfirmationName: "",
  clubhouseAgreementInitials: "",
  insuranceInitials: "",
  decorationInitials: "",
  acknowledgeRentalRules: false,
  acknowledgeDepositResponsibility: false,
  acknowledgeAttendanceResponsibility: false,
  acknowledgeCapacitySafety: false,
}

export const CLUBHOUSE_RENTAL_TIME_OPTIONS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
] as const

export const CLUBHOUSE_RENTAL_EVENT_TYPE_OPTIONS = [
  "Birthday Party",
  "Anniversary Celebration",
  "Reception",
  "Family Gathering",
  "Meeting",
  "Other",
] as const

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function cleanVendorOption(value: unknown): ClubhouseRentalVendorOption {
  return value === "yes" || value === "no" ? value : ""
}

function cleanRequestedSpace(value: unknown): ClubhouseRentalRequestedSpace {
  return value === "grand_ballroom" ? value : "grand_ballroom"
}

function cleanBoolean(value: unknown): boolean {
  return value === true
}

export function normalizeClubhouseRentalFormData(input: unknown): ClubhouseRentalFormData {
  if (!isObject(input)) {
    return { ...EMPTY_CLUBHOUSE_RENTAL_FORM_DATA }
  }

  return {
    residentName: cleanString(input.residentName),
    bestContactPhone: cleanString(input.bestContactPhone),
    bestEmailAddress: cleanString(input.bestEmailAddress),
    propertyAddress: cleanString(input.propertyAddress),
    eventType: cleanString(input.eventType),
    reservationDate: cleanString(input.reservationDate),
    startTime: cleanString(input.startTime),
    endTime: cleanString(input.endTime),
    guestCount: cleanString(input.guestCount),
    requestedSpace: cleanRequestedSpace(input.requestedSpace),
    eventDescription: cleanString(input.eventDescription),
    specialRequests: cleanString(input.specialRequests),
    vendorsInvolved: cleanVendorOption(input.vendorsInvolved),
    vendorDetails: cleanString(input.vendorDetails),
    insuranceCompany: cleanString(input.insuranceCompany),
    policyNumber: cleanString(input.policyNumber),
    typedConfirmationName: cleanString(input.typedConfirmationName),
    clubhouseAgreementInitials: cleanString(input.clubhouseAgreementInitials),
    insuranceInitials: cleanString(input.insuranceInitials),
    decorationInitials: cleanString(input.decorationInitials),
    acknowledgeRentalRules: cleanBoolean(input.acknowledgeRentalRules),
    acknowledgeDepositResponsibility: cleanBoolean(input.acknowledgeDepositResponsibility),
    acknowledgeAttendanceResponsibility: cleanBoolean(input.acknowledgeAttendanceResponsibility),
    acknowledgeCapacitySafety: cleanBoolean(input.acknowledgeCapacitySafety),
  }
}

export function validateClubhouseRentalFormData(form: ClubhouseRentalFormData): string[] {
  const errors: string[] = []

  if (!form.residentName) errors.push("Resident name is required.")
  if (!form.bestContactPhone) errors.push("Best contact phone is required.")
  if (!form.bestEmailAddress) errors.push("Best email address is required.")
  if (!form.propertyAddress) errors.push("Property address is required.")
  if (!form.eventType) errors.push("Event type is required.")
  if (!form.reservationDate) errors.push("Reservation date is required.")
  if (!form.startTime) errors.push("Start time is required.")
  if (!form.endTime) errors.push("End time is required.")
  if (!form.guestCount) {
    errors.push("Estimated guest count is required.")
  } else {
    const guestCount = Number.parseInt(form.guestCount, 10)
    if (!Number.isFinite(guestCount) || guestCount < 1) {
      errors.push("Estimated guest count must be at least 1.")
    }
  }
  if (!form.eventDescription) errors.push("Event description is required.")
  if (!form.vendorsInvolved) errors.push("Please indicate whether vendors are involved.")
  if (form.vendorsInvolved === "yes" && !form.vendorDetails) {
    errors.push("Please describe the vendors or entertainment involved.")
  }
  if (!form.insuranceCompany) errors.push("Insurance company is required.")
  if (!form.policyNumber) errors.push("Policy number is required.")
  if (!form.clubhouseAgreementInitials) {
    errors.push("Initials are required for the clubhouse rental terms.")
  }
  if (!form.insuranceInitials) {
    errors.push("Initials are required for the insurance section.")
  }
  if (!form.decorationInitials) {
    errors.push("Initials are required for the decoration rules section.")
  }
  if (!form.acknowledgeRentalRules) {
    errors.push("Please acknowledge the rental rules.")
  }
  if (!form.acknowledgeDepositResponsibility) {
    errors.push("Please acknowledge the deposit and damage responsibility.")
  }
  if (!form.acknowledgeAttendanceResponsibility) {
    errors.push("Please acknowledge attendance responsibility.")
  }
  if (!form.acknowledgeCapacitySafety) {
    errors.push("Please acknowledge capacity and safety requirements.")
  }
  if (!form.typedConfirmationName) {
    errors.push("Typed confirmation name is required.")
  }

  return errors
}
