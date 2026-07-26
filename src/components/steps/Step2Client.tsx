import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export interface ClientData {
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  clientOrigin: 'hotel' | 'externe' | ''
}

interface ClientRecord {
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  clientOrigin: 'hotel' | 'externe' | ''
}

interface Props {
  onNext: (data: ClientData) => void
  onBack: () => void
  onPartialChange?: (data: ClientData) => void
  initialData?: Partial<ClientData>
}

export default function Step2Client({ onNext, onBack, onPartialChange, initialData }: Props) {
  // ── Champs du formulaire ───────────────────────────────────
  const [clientName,      setClientName]      = useState(initialData?.clientName      ?? '')
  const [clientFirstname, setClientFirstname] = useState(initialData?.clientFirstname ?? '')
  const [clientPhone,     setClientPhone]     = useState(initialData?.clientPhone     ?? '')
  const [clientIdNumber,  setClientIdNumber]  = useState(initialData?.clientIdNumber  ?? '')
  const [clientOrigin,    setClientOrigin]    = useState<'hotel' | 'externe' | ''>(initialData?.clientOrigin ?? '')

  // ── Recherche client existant ──────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<ClientRecord[]>([])
  const [isSearching,   setIsSearching]   = useState(false)
  const [showDropdown,  setShowDropdown]  = useState(false)
  const [clientSelected, setClientSelected] = useState(false)   // client pré-rempli ?
  const searchRef = useRef<HTMLDivElement>(null)

  // Fermer dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Recherche avec debounce (300ms)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const { data } = await supabase
        .from('rentals')
        .select('client_name, client_firstname, client_phone, client_id_number, client_origin')
        .or(
          `client_name.ilike.%${searchQuery}%,client_firstname.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`
        )
        .order('created_at', { ascending: false })
        .limit(50)

      // Dédoublonner par numéro de pièce d'identité
      const seen = new Set<string>()
      const unique: ClientRecord[] = []
      data?.forEach(r => {
        const key = r.client_id_number ?? r.client_phone
        if (!seen.has(key)) {
          seen.add(key)
          unique.push({
            clientName:      r.client_name      ?? '',
            clientFirstname: r.client_firstname ?? '',
            clientPhone:     r.client_phone     ?? '',
            clientIdNumber:  r.client_id_number ?? '',
            clientOrigin:    (r.client_origin   ?? '') as 'hotel' | 'externe' | '',
          })
        }
      })

      setSearchResults(unique)
      setShowDropdown(unique.length > 0)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Remplir les champs avec le client sélectionné
  const handleSelectClient = (client: ClientRecord) => {
    setClientName(client.clientName)
    setClientFirstname(client.clientFirstname)
    setClientPhone(client.clientPhone)
    setClientIdNumber(client.clientIdNumber)
    setClientOrigin(client.clientOrigin)
    setSearchQuery(`${client.clientFirstname} ${client.clientName}`)
    setShowDropdown(false)
    setClientSelected(true)
    onPartialChange?.({
      clientName:      client.clientName,
      clientFirstname: client.clientFirstname,
      clientPhone:     client.clientPhone,
      clientIdNumber:  client.clientIdNumber,
      clientOrigin:    client.clientOrigin,
    })
  }

  // Effacer et repartir de zéro
  const handleReset = () => {
    setSearchQuery('')
    setClientName('')
    setClientFirstname('')
    setClientPhone('')
    setClientIdNumber('')
    setClientOrigin('')
    setClientSelected(false)
    setSearchResults([])
  }

  // Notifier le parent des changements
  const notify = (overrides: Partial<ClientData>) => {
    onPartialChange?.({
      clientName, clientFirstname, clientPhone, clientIdNumber, clientOrigin,
      ...overrides,
    })
  }

  const canContinue =
    clientName.trim() && clientFirstname.trim() &&
    clientPhone.trim() && clientIdNumber.trim() &&
    clientOrigin !== ''

  const handleSubmit = () => {
    if (!canContinue) return
    onNext({ clientName, clientFirstname, clientPhone, clientIdNumber, clientOrigin })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 2 — Informations client</h2>

      {/* ── Barre de recherche client existant ── */}
      <div ref={searchRef} className="relative mb-5">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          🔍 Rechercher un client existant
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setClientSelected(false)
            }}
            placeholder="Nom, prénom ou téléphone..."
            className="w-full border-2 border-blue-200 bg-blue-50 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none pr-20"
          />
          {/* Indicateurs droite */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearching && (
              <span className="text-blue-400 text-xs animate-pulse">⏳</span>
            )}
            {clientSelected && (
              <span className="text-green-500 text-sm font-bold">✅</span>
            )}
            {searchQuery && (
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                title="Nouveau client"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Dropdown résultats ── */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
              <p className="text-xs text-blue-600 font-medium">
                {searchResults.length} client(s) trouvé(s) — cliquez pour remplir automatiquement
              </p>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {searchResults.map((client, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-bold text-gray-800">
                        {client.clientFirstname} {client.clientName}
                      </p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                        <span>📞 {client.clientPhone}</span>
                        {client.clientIdNumber && (
                          <span>🪪 {client.clientIdNumber}</span>
                        )}
                        {client.clientOrigin && (
                          <span>{client.clientOrigin === 'hotel' ? '🏨 Hôtel' : '🌍 Externe'}</span>
                        )}
                      </div>
                    </div>
                    <span className="ml-auto text-blue-500 text-sm">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message "aucun résultat" */}
        {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && !clientSelected && (
          <p className="mt-1.5 text-gray-400 text-xs">
            Aucun client trouvé — remplissez le formulaire ci-dessous
          </p>
        )}

        {/* Bandeau client sélectionné */}
        {clientSelected && (
          <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <p className="text-green-700 text-sm font-medium">
              ✅ Client pré-rempli depuis l'historique
            </p>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
            >
              Nouveau client
            </button>
          </div>
        )}
      </div>

      {/* ── Séparateur ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">ou remplir manuellement</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* ── Formulaire client ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={e => { setClientName(e.target.value); setClientSelected(false); notify({ clientName: e.target.value }) }}
              placeholder="DUPONT"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientFirstname}
              onChange={e => { setClientFirstname(e.target.value); setClientSelected(false); notify({ clientFirstname: e.target.value }) }}
              placeholder="Jean"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={e => { setClientPhone(e.target.value); setClientSelected(false); notify({ clientPhone: e.target.value }) }}
            placeholder="+212 6XX XXX XXX"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            N° Pièce d'identité <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientIdNumber}
            onChange={e => { setClientIdNumber(e.target.value); setClientSelected(false); notify({ clientIdNumber: e.target.value }) }}
            placeholder="CIN / Passeport"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
          />
        </div>

        {/* ── Origine client ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Origine client <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setClientOrigin('hotel'); notify({ clientOrigin: 'hotel' }) }}
              className={`py-4 rounded-2xl border-2 font-bold text-base transition-all flex flex-col items-center gap-1 ${
                clientOrigin === 'hotel'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <span className="text-2xl">🏨</span>
              <span>Hôtel</span>
            </button>
            <button
              type="button"
              onClick={() => { setClientOrigin('externe'); notify({ clientOrigin: 'externe' }) }}
              className={`py-4 rounded-2xl border-2 font-bold text-base transition-all flex flex-col items-center gap-1 ${
                clientOrigin === 'externe'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-green-300 hover:bg-green-50/30'
              }`}
            >
              <span className="text-2xl">🌍</span>
              <span>Externe</span>
            </button>
          </div>
          {clientOrigin === '' && (
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              Sélectionnez une option pour continuer
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canContinue}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
