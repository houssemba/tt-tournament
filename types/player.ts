// Player and Category types for tournament registration

export type CategoryId = '500-799' | '500-999' | '500-1199' | '500-1399' | '500-1799' | 'tc-feminin'

export interface Category {
  id: CategoryId
  label: string
  pattern: RegExp
  sortOrder: number
}

export interface Player {
  id: string
  firstName: string
  lastName: string
  email?: string
  licenseNumber: string
  club: string | null
  clubCode: string | null
  officialPoints: number | null
  categories: CategoryId[]
  registrationDate: Date
}
