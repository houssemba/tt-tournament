// FFTT (French Table Tennis Federation) API types

export interface FFTTJoueur {
  licence: string
  nom: string
  prenom: string
  club: string
  nclub: string
  sexe: string
  cat: string
  point: string
  echelon: string
  place: string
}

export interface FFTTPlayerResult {
  licenseNumber: string
  firstName: string
  lastName: string
  club: string
  clubCode: string
  points: number
  category: string
  gender: string
}

export interface FFTTApiResponse<T> {
  liste: T[]
}
