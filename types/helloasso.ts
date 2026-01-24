// HelloAsso API types

export interface HelloAssoCustomField {
  name: string
  type: string
  answer: string
}

export interface HelloAssoItemUser {
  firstName: string
  lastName: string
}

export interface HelloAssoItem {
  id: number
  name: string
  priceCategory: string
  customFields?: HelloAssoCustomField[]
  amount: number
  type: string
  state: string
  user?: HelloAssoItemUser
  payer?: HelloAssoPayer
  order?: {
    id: number
    date: string
    formSlug: string
  }
}

export interface HelloAssoPayer {
  firstName: string
  lastName: string
  email: string
}

export interface HelloAssoOrder {
  id: number
  date: string
  formSlug: string
  formType: string
  organizationSlug: string
  payer: HelloAssoPayer
  items: HelloAssoItem[]
  amount: {
    total: number
    vat: number
    discount: number
  }
  state: string
}

export interface HelloAssoPagination {
  pageSize: number
  totalCount: number
  pageIndex: number
  totalPages: number
  continuationToken?: string
}

export interface HelloAssoPaginatedResponse<T> {
  data: T[]
  pagination: HelloAssoPagination
}

export interface HelloAssoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}
