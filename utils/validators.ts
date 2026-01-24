// Validation utilities

/**
 * Validate a French FFTT license number
 * License numbers are typically 6-7 digits
 * @param licenseNumber - The license number to validate
 * @returns true if valid, false otherwise
 */
export function validateLicenseNumber(licenseNumber: string): boolean {
  if (!licenseNumber) {
    return false
  }

  // Remove any spaces or dashes
  const cleaned = licenseNumber.replace(/[\s-]/g, '')

  // Must be 6-7 digits only
  return /^\d{6,7}$/.test(cleaned)
}

/**
 * Clean and normalize a license number
 * @param licenseNumber - The license number to clean
 * @returns The cleaned license number or null if invalid
 */
export function cleanLicenseNumber(licenseNumber: string): string | null {
  if (!licenseNumber) {
    return null
  }

  const cleaned = licenseNumber.replace(/[\s-]/g, '')

  if (!validateLicenseNumber(cleaned)) {
    return null
  }

  return cleaned
}

