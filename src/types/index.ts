import type { ActivityConfig } from '../config'

export type ContractLanguage = 'fr' | 'en' | 'ar'

export type ItemStatus = 'waiting' | 'active' | 'returned'

export interface CartItem {
  cartId: string
  activity: ActivityConfig
  subtype?: string
  numberOfPersons?: number
  itemPrice: number
  itemStatus?: ItemStatus
  itemStartTime?: string | null
  itemEndTime?: string | null
  assignedJetSkiId?: string
}

export interface Rental {
  id: string
  client_name: string
  client_firstname: string
  client_phone: string
  client_id_number: string
  activity_id: string | null
  activity_name: string
  activity_subtype: string | null
  duration: string
  duration_minutes: number
  price: number
  discount: number
  price_ht: number
  jet_ski_id: string | null
  payment_method: string
  signature: string
  contract_number: string
  start_time: string | null
  end_time: string | null
  status: 'active' | 'archived' | 'pending_jet' | 'reserved'
  created_at: string
  cart_items: CartItem[] | null
  returned_cart_ids: string[] | null
  id_photo_url: string | null
  villa_number: string | null
  reservation_time: string | null
  client_origin: string | null
}

export interface WaitingEntry {
  id: string
  client_name: string
  client_firstname: string
  client_phone: string
  client_id_number: string
  activity_id: string
  activity_name: string
  activity_subtype: string | null
  jet_ski_id: string
  status: string
  created_at: string
}
