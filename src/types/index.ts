export type ContractLanguage = 'fr' | 'en' | 'ar'

export interface WaitingEntry {
  id: string
  created_at: string
  client_name: string
  client_firstname: string
  client_phone: string
  client_id_number: string
  activity_id: string
  activity_name: string
  activity_subtype: string | null
  jet_ski_id: string
  status: 'waiting' | 'converted' | 'cancelled'
}

export interface Rental {
  id: string
  created_at: string
  client_name: string
  client_firstname: string
  client_phone: string
  client_id_number: string
  activity_id: string
  activity_name: string
  activity_subtype: string | null
  duration: string
  duration_minutes: number
  price: number
  jet_ski_id: string | null
  payment_method: string
  signature: string
  contract_number: string
  start_time: string
  end_time: string
  status: 'active' | 'archived'
  notes: string | null
  id_photo_url: string | null   // ← Photo de la pièce d'identité
}
