// Formatting utilities

/**
 * Format a date for display
 * @param date - The date to format
 * @param locale - The locale to use (default: 'fr-FR')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return 'Date invalide'
  }

  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date with time for display
 * @param date - The date to format
 * @param locale - The locale to use (default: 'fr-FR')
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return 'Date invalide'
  }

  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a player name for display
 * @param firstName - The player's first name
 * @param lastName - The player's last name
 * @returns Formatted name (LASTNAME FirstName)
 */
export function formatPlayerName(firstName: string, lastName: string): string {
  const formattedLastName = lastName.toUpperCase().trim()
  const formattedFirstName = capitalizeFirstLetter(firstName.trim())

  return `${formattedLastName} ${formattedFirstName}`
}

/**
 * Capitalize the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with first letter capitalized
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Format points for display
 * @param points - The points value (can be null)
 * @returns Formatted points string
 */
export function formatPoints(points: number | null): string {
  if (points === null || points === undefined) {
    return 'N/A'
  }
  return points.toString()
}

/**
 * Format club name for display
 * @param club - The club name (can be null)
 * @returns Formatted club string
 */
export function formatClub(club: string | null): string {
  if (!club) {
    return 'Club inconnu'
  }
  return club
}
