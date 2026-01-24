// Statistics types for tournament data

import type { CategoryId } from './player'

export interface DailyCount {
  date: string
  count: number
}

export interface CategoryCount {
  categoryId: CategoryId
  label: string
  count: number
}

export interface ClubCount {
  club: string
  count: number
}

export interface TournamentStats {
  totalPlayers: number
  byCategory: CategoryCount[]
  byClub: ClubCount[]
  registrationTimeline: DailyCount[]
  lastUpdated: Date
}

export interface PlayersResponse {
  players: import('./player').Player[]
  fromCache: boolean
  lastUpdated: Date
  warning?: string
}

export interface StatsResponse {
  stats: TournamentStats
  fromCache: boolean
  lastUpdated: Date
}
