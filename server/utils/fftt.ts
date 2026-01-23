// FFTT (French Table Tennis Federation) Smartping API client

import type { FFTTJoueur, FFTTPlayerResult, FFTTApiResponse } from '~/types/fftt'
import { ApiError, withRetry } from './errors'
import { getFromCache, setInCache, CACHE_KEYS } from './cache'

const FFTT_API_BASE = 'https://apiv2.fftt.com/mobile/pxml'

// FFTT data cache TTL: 24 hours (stable data)
const FFTT_CACHE_TTL = 86400

/**
 * Generate FFTT API timestamp (format: YYYYMMDDHHmmss)
 */
function getTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  )
}

/**
 * Generate FFTT API hash using Web Crypto API compatible MD5
 * Hash = MD5(id_serial + password + timestamp)
 * Note: MD5 is not available in Web Crypto API, so we use a simple implementation
 */
async function generateHash(serial: string, password: string, timestamp: string): Promise<string> {
  const data = serial + password + timestamp
  // Use SubtleCrypto with SHA-256 as a fallback since MD5 isn't available in Web Crypto
  // The FFTT API actually uses MD5, so we need a polyfill
  return md5(data)
}

// Simple MD5 implementation for edge runtime compatibility
function md5(string: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift))
  }

  function addUnsigned(x: number, y: number): number {
    const lx4 = x & 0x40000000
    const ly4 = y & 0x40000000
    const lx8 = x & 0x80000000
    const ly8 = y & 0x80000000
    const result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF)
    if (lx4 & ly4) return result ^ 0x80000000 ^ lx8 ^ ly8
    if (lx4 | ly4) {
      if (result & 0x40000000) return result ^ 0xC0000000 ^ lx8 ^ ly8
      else return result ^ 0x40000000 ^ lx8 ^ ly8
    }
    return result ^ lx8 ^ ly8
  }

  function f(x: number, y: number, z: number): number { return (x & y) | (~x & z) }
  function g(x: number, y: number, z: number): number { return (x & z) | (y & ~z) }
  function h(x: number, y: number, z: number): number { return x ^ y ^ z }
  function i(x: number, y: number, z: number): number { return y ^ (x | ~z) }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function convertToWordArray(str: string): number[] {
    const wordArray: number[] = []
    const messageLength = str.length
    const numberOfWords = (((messageLength + 8) - ((messageLength + 8) % 64)) / 64 + 1) * 16
    for (let i = 0; i < numberOfWords; i++) wordArray[i] = 0
    let bytePosition = 0
    let byteCount = 0
    while (byteCount < messageLength) {
      const wordIndex = (byteCount - (byteCount % 4)) / 4
      bytePosition = (byteCount % 4) * 8
      wordArray[wordIndex] = wordArray[wordIndex] | (str.charCodeAt(byteCount) << bytePosition)
      byteCount++
    }
    const wordIndex = (byteCount - (byteCount % 4)) / 4
    bytePosition = (byteCount % 4) * 8
    wordArray[wordIndex] = wordArray[wordIndex] | (0x80 << bytePosition)
    wordArray[numberOfWords - 2] = messageLength << 3
    wordArray[numberOfWords - 1] = messageLength >>> 29
    return wordArray
  }

  function wordToHex(value: number): string {
    let result = ''
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 255
      result += ('0' + byte.toString(16)).slice(-2)
    }
    return result
  }

  const x = convertToWordArray(string)
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d
    a = ff(a, b, c, d, x[k], S11, 0xD76AA478)
    d = ff(d, a, b, c, x[k + 1], S12, 0xE8C7B756)
    c = ff(c, d, a, b, x[k + 2], S13, 0x242070DB)
    b = ff(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE)
    a = ff(a, b, c, d, x[k + 4], S11, 0xF57C0FAF)
    d = ff(d, a, b, c, x[k + 5], S12, 0x4787C62A)
    c = ff(c, d, a, b, x[k + 6], S13, 0xA8304613)
    b = ff(b, c, d, a, x[k + 7], S14, 0xFD469501)
    a = ff(a, b, c, d, x[k + 8], S11, 0x698098D8)
    d = ff(d, a, b, c, x[k + 9], S12, 0x8B44F7AF)
    c = ff(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1)
    b = ff(b, c, d, a, x[k + 11], S14, 0x895CD7BE)
    a = ff(a, b, c, d, x[k + 12], S11, 0x6B901122)
    d = ff(d, a, b, c, x[k + 13], S12, 0xFD987193)
    c = ff(c, d, a, b, x[k + 14], S13, 0xA679438E)
    b = ff(b, c, d, a, x[k + 15], S14, 0x49B40821)
    a = gg(a, b, c, d, x[k + 1], S21, 0xF61E2562)
    d = gg(d, a, b, c, x[k + 6], S22, 0xC040B340)
    c = gg(c, d, a, b, x[k + 11], S23, 0x265E5A51)
    b = gg(b, c, d, a, x[k], S24, 0xE9B6C7AA)
    a = gg(a, b, c, d, x[k + 5], S21, 0xD62F105D)
    d = gg(d, a, b, c, x[k + 10], S22, 0x2441453)
    c = gg(c, d, a, b, x[k + 15], S23, 0xD8A1E681)
    b = gg(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8)
    a = gg(a, b, c, d, x[k + 9], S21, 0x21E1CDE6)
    d = gg(d, a, b, c, x[k + 14], S22, 0xC33707D6)
    c = gg(c, d, a, b, x[k + 3], S23, 0xF4D50D87)
    b = gg(b, c, d, a, x[k + 8], S24, 0x455A14ED)
    a = gg(a, b, c, d, x[k + 13], S21, 0xA9E3E905)
    d = gg(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8)
    c = gg(c, d, a, b, x[k + 7], S23, 0x676F02D9)
    b = gg(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A)
    a = hh(a, b, c, d, x[k + 5], S31, 0xFFFA3942)
    d = hh(d, a, b, c, x[k + 8], S32, 0x8771F681)
    c = hh(c, d, a, b, x[k + 11], S33, 0x6D9D6122)
    b = hh(b, c, d, a, x[k + 14], S34, 0xFDE5380C)
    a = hh(a, b, c, d, x[k + 1], S31, 0xA4BEEA44)
    d = hh(d, a, b, c, x[k + 4], S32, 0x4BDECFA9)
    c = hh(c, d, a, b, x[k + 7], S33, 0xF6BB4B60)
    b = hh(b, c, d, a, x[k + 10], S34, 0xBEBFBC70)
    a = hh(a, b, c, d, x[k + 13], S31, 0x289B7EC6)
    d = hh(d, a, b, c, x[k], S32, 0xEAA127FA)
    c = hh(c, d, a, b, x[k + 3], S33, 0xD4EF3085)
    b = hh(b, c, d, a, x[k + 6], S34, 0x4881D05)
    a = hh(a, b, c, d, x[k + 9], S31, 0xD9D4D039)
    d = hh(d, a, b, c, x[k + 12], S32, 0xE6DB99E5)
    c = hh(c, d, a, b, x[k + 15], S33, 0x1FA27CF8)
    b = hh(b, c, d, a, x[k + 2], S34, 0xC4AC5665)
    a = ii(a, b, c, d, x[k], S41, 0xF4292244)
    d = ii(d, a, b, c, x[k + 7], S42, 0x432AFF97)
    c = ii(c, d, a, b, x[k + 14], S43, 0xAB9423A7)
    b = ii(b, c, d, a, x[k + 5], S44, 0xFC93A039)
    a = ii(a, b, c, d, x[k + 12], S41, 0x655B59C3)
    d = ii(d, a, b, c, x[k + 3], S42, 0x8F0CCC92)
    c = ii(c, d, a, b, x[k + 10], S43, 0xFFEFF47D)
    b = ii(b, c, d, a, x[k + 1], S44, 0x85845DD1)
    a = ii(a, b, c, d, x[k + 8], S41, 0x6FA87E4F)
    d = ii(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0)
    c = ii(c, d, a, b, x[k + 6], S43, 0xA3014314)
    b = ii(b, c, d, a, x[k + 13], S44, 0x4E0811A1)
    a = ii(a, b, c, d, x[k + 4], S41, 0xF7537E82)
    d = ii(d, a, b, c, x[k + 11], S42, 0xBD3AF235)
    c = ii(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB)
    b = ii(b, c, d, a, x[k + 9], S44, 0xEB86D391)
    a = addUnsigned(a, AA)
    b = addUnsigned(b, BB)
    c = addUnsigned(c, CC)
    d = addUnsigned(d, DD)
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
}

/**
 * Make an authenticated request to FFTT API
 */
async function ffttFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const config = useRuntimeConfig()
  const serial = config.ffttApiId
  const password = config.ffttApiKey

  if (!serial || !password) {
    throw ApiError.badRequest('FFTT API credentials not configured')
  }

  const timestamp = getTimestamp()
  const hash = await generateHash(serial, password, timestamp)

  const queryParams = new URLSearchParams({
    serie: serial,
    tm: timestamp,
    tmc: hash,
    ...params,
  })

  const response = await withRetry(async () => {
    const res = await fetch(`${FFTT_API_BASE}/${endpoint}?${queryParams}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      if (res.status === 401 || res.status === 403) {
        throw ApiError.unauthorized(`FFTT authentication failed: ${errorText}`)
      }
      if (res.status === 404) {
        throw ApiError.notFound('FFTT resource not found')
      }
      if (res.status === 429) {
        throw ApiError.rateLimited('FFTT rate limit exceeded')
      }
      throw new ApiError(`FFTT API error: ${errorText}`, res.status, 'FFTT_API_ERROR', true)
    }

    return res.json() as Promise<T>
  })

  return response
}

/**
 * Get player information by license number
 * @param licenseNumber - The player's FFTT license number
 * @returns Player information or null if not found
 */
export async function getPlayerByLicense(licenseNumber: string): Promise<FFTTPlayerResult | null> {
  // Check cache first
  const cacheKey = CACHE_KEYS.ffttPlayer(licenseNumber)
  const cached = await getFromCache<FFTTPlayerResult | 'NOT_FOUND'>(cacheKey)

  if (cached === 'NOT_FOUND') {
    return null
  }

  if (cached) {
    return cached
  }

  try {
    const response = await ffttFetch<FFTTApiResponse<FFTTJoueur>>('xml_joueur.php', {
      licence: licenseNumber,
    })

    if (!response.liste || response.liste.length === 0) {
      // Cache the "not found" result
      await setInCache(cacheKey, 'NOT_FOUND', FFTT_CACHE_TTL)
      return null
    }

    const joueur = response.liste[0]
    const result: FFTTPlayerResult = {
      licenseNumber: joueur.licence,
      firstName: joueur.prenom,
      lastName: joueur.nom,
      club: joueur.club,
      clubCode: joueur.nclub,
      points: parseInt(joueur.point, 10) || 500,
      category: joueur.cat,
      gender: joueur.sexe,
    }

    // Cache the result
    await setInCache(cacheKey, result, FFTT_CACHE_TTL)

    return result
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      // Cache the "not found" result
      await setInCache(cacheKey, 'NOT_FOUND', FFTT_CACHE_TTL)
      return null
    }
    throw error
  }
}

/**
 * Get player information for multiple license numbers in parallel
 * @param licenseNumbers - Array of license numbers
 * @returns Map of license number to player result
 */
export async function getPlayersByLicenses(
  licenseNumbers: string[]
): Promise<Map<string, FFTTPlayerResult | null>> {
  const results = new Map<string, FFTTPlayerResult | null>()

  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 10
  const batches: string[][] = []

  for (let i = 0; i < licenseNumbers.length; i += BATCH_SIZE) {
    batches.push(licenseNumbers.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (license) => {
        try {
          const player = await getPlayerByLicense(license)
          return { license, player }
        } catch (error) {
          console.error(`Failed to fetch FFTT data for license ${license}:`, error)
          return { license, player: null }
        }
      })
    )

    for (const { license, player } of batchResults) {
      results.set(license, player)
    }
  }

  return results
}
