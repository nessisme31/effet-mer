import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export interface ClientData {
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  clientOrigin: 'hotel' | 'externe' | ''
  villaNumber?: string
  clientIdPhotoUrl?: string   // ← Chemin fichier dans Supabase Storage (bucket privé)
}

interface ClientRecord {
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  clientOrigin: 'hotel' | 'externe' | ''
  villaNumber?: string
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
  const [villaNumber,     setVillaNumber]     = useState(initialData?.villaNumber ?? '')

  // ── Photo pièce d'identité ─────────────────────────────────
  const [clientIdPhotoPath, setClientIdPhotoPath] = useState(initialData?.clientIdPhotoUrl ?? '')
  const [uploadingPhoto,    setUploadingPhoto]     = useState(false)
  const [ocrLoading,        setOcrLoading]         = useState(false)
  const [ocrStatus,         setOcrStatus]          = useState<'idle' | 'found' | 'not_found'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Recherche client existant ──────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState<ClientRecord[]>([])
  const [isSearching,    setIsSearching]    = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [clientSelected, setClientSelected] = useState(false)
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
        .from('clients')
        .select('client_name, client_firstname, client_phone, client_id_number, client_origin')
        .or(
          `client_name.ilike.%${searchQuery}%,client_firstname.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`
        )
        .order('updated_at', { ascending: false })
        .limit(20)

      const unique: ClientRecord[] = (data ?? []).map(r => ({
        clientName:      r.client_name      ?? '',
        clientFirstname: r.client_firstname ?? '',
        clientPhone:     r.client_phone     ?? '',
        clientIdNumber:  r.client_id_number ?? '',
        clientOrigin:    (r.client_origin   ?? '') as 'hotel' | 'externe' | '',
      }))
      setSearchResults(unique)
      setShowDropdown(unique.length > 0)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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

  const handleReset = () => {
    setSearchQuery('')
    setClientName('')
    setClientFirstname('')
    setClientPhone('')
    setClientIdNumber('')
    setClientOrigin('')
    setClientSelected(false)
    setSearchResults([])
    setClientIdPhotoPath('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const notify = (overrides: Partial<ClientData>) => {
    onPartialChange?.({
      clientName, clientFirstname, clientPhone, clientIdNumber, clientOrigin,
      ...overrides,
    })
  }

  // ── Upload photo + OCR numéro CIN en parallèle ────────────
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setOcrLoading(true)
    setOcrStatus('idle')

    await Promise.all([
      // 1. Upload vers Supabase Storage
      (async () => {
        try {
          const ext  = file.name.split('.').pop() || 'jpg'
          const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { data: uploadData, error } = await supabase.storage
            .from('id-photos')
            .upload(path, file, { upsert: true })
          if (error) {
            alert('❌ Erreur upload. Vérifiez que le bucket "id-photos" existe dans Supabase Storage.')
          } else if (uploadData) {
            setClientIdPhotoPath(uploadData.path)
          }
        } catch {
          alert('❌ Erreur lors de l\'upload de la photo.')
        }
        setUploadingPhoto(false)
      })(),

      // 2. OCR — lecture du numéro CIN en parallèle
      (async () => {
        try {
          const objectUrl = URL.createObjectURL(file)
          // Import dynamique pour ne pas alourdir le chargement initial
          const Tesseract = await import('tesseract.js')
          const { data } = await Tesseract.recognize(objectUrl, 'fra+eng', {
            logger: () => {},   // silence les logs
          })
          URL.revokeObjectURL(objectUrl)

          const text = data.text.toUpperCase().replace(/\n/g, ' ')

          // Pattern CIN Maroc : 1-2 lettres majuscules + 5-6 chiffres (ex: B123456, AB123456)
          const match = text.match(/\b([A-Z]{1,2}\d{5,6})\b/)
          if (match?.[1]) {
            const detected = match[1]
            setClientIdNumber(detected)
            notify({ clientIdNumber: detected })
            setOcrStatus('found')
          } else {
            setOcrStatus('not_found')
          }
        } catch (err) {
          console.error('OCR error:', err)
          setOcrStatus('not_found')
        }
        setOcrLoading(false)
      })(),
    ])
  }

  const removePhoto = () => {
    setClientIdPhotoPath('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Validation : téléphone OPTIONNEL ──────────────────────
  const canContinue =
    clientName.trim() !== '' &&
    clientFirstname.trim() !== '' &&
    clientOrigin !== ''

  const handleSubmit = () => {
    if (!canContinue) return
    onNext({
      clientName,
      clientFirstname,
      clientPhone,
      clientIdNumber,
      clientOrigin,
      villaNumber: clientOrigin === 'hotel' ? villaNumber : undefined,
      clientIdPhotoUrl: clientIdPhotoPath || undefined,
    })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 2 — Informations client</h2>

      {/* ── Recherche client existant ── */}
      <div ref={searchRef} className="relative mb-5">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          🔍 Rechercher un client existant
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setClientSelected(false) }}
            placeholder="Nom, prénom ou téléphone..."
            className="w-full border-2 border-blue-200 bg-blue-50 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none pr-20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearching  && <span className="text-blue-400 text-xs animate-pulse">⏳</span>}
            {clientSelected && <span className="text-green-500 text-sm font-bold">✅</span>}
            {searchQuery && (
              <button onClick={handleReset} className="text-gray-400 hover:text-red-500 text-lg" title="Nouveau client">✕</button>
            )}
          </div>
        </div>

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
              <p className="text-xs text-blue-600 font-medium">
                {searchResults.length} client(s) trouvé(s) — cliquez pour remplir automatiquement
              </p>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {searchResults.map((client, i) => (
                <button key={i} onClick={() => handleSelectClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-bold text-gray-800">{client.clientFirstname} {client.clientName}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                        <span>📞 {client.clientPhone}</span>
                        {client.clientIdNumber && <span>🪪 {client.clientIdNumber}</span>}
                        {client.clientOrigin && <span>{client.clientOrigin === 'hotel' ? '🏨 Hôtel' : '🌍 Externe'}</span>}
                      </div>
                    </div>
                    <span className="ml-auto text-blue-500 text-sm">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && !clientSelected && (
          <p className="mt-1.5 text-gray-400 text-xs">Aucun client trouvé — remplissez le formulaire ci-dessous</p>
        )}

        {clientSelected && (
          <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <p className="text-green-700 text-sm font-medium">✅ Client pré-rempli depuis l'historique</p>
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-red-500 underline">Nouveau client</button>
          </div>
        )}
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">ou remplir manuellement</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* ── Formulaire ── */}
      <div className="space-y-4">

        {/* Nom + Prénom */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
            <input type="text" value={clientName}
              onChange={e => { setClientName(e.target.value); setClientSelected(false); notify({ clientName: e.target.value }) }}
              placeholder="DUPONT"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Prénom <span className="text-red-500">*</span></label>
            <input type="text" value={clientFirstname}
              onChange={e => { setClientFirstname(e.target.value); setClientSelected(false); notify({ clientFirstname: e.target.value }) }}
              placeholder="Jean"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        {/* Téléphone — OPTIONNEL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Téléphone
            <span className="text-gray-400 text-xs font-normal ml-1">(optionnel)</span>
          </label>
          <input type="tel" value={clientPhone}
            onChange={e => { setClientPhone(e.target.value); setClientSelected(false); notify({ clientPhone: e.target.value }) }}
            placeholder="+212 6XX XXX XXX"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        {/* N° Pièce d'identité + bouton photo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            N° Pièce d'identité
            <span className="text-gray-400 text-xs font-normal ml-1">(optionnel)</span>
          </label>
          <div className="flex gap-2">
            <input type="text" value={clientIdNumber}
              onChange={e => { setClientIdNumber(e.target.value); setClientSelected(false); notify({ clientIdNumber: e.target.value }) }}
              placeholder="CIN / Passeport"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase" />

            {/* Bouton photo 📷 */}
            <label className={`flex-shrink-0 cursor-pointer flex items-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl border transition-colors ${
              uploadingPhoto ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : clientIdPhotoPath ? 'bg-green-50 text-green-700 border-green-300'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}>
              {uploadingPhoto ? '⏳' : clientIdPhotoPath ? '✅ Photo' : '📷 Photo'}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                onChange={handlePhotoCapture} disabled={uploadingPhoto} className="hidden" />
            </label>
          </div>

          {/* Feedback OCR */}
          {ocrLoading && (
            <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
              <span className="animate-pulse text-sm">🔍</span>
              <span className="text-blue-700 text-sm font-medium">Lecture du numéro de carte en cours...</span>
            </div>
          )}
          {!ocrLoading && ocrStatus === 'found' && (
            <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <span className="text-sm">✨</span>
              <span className="text-green-700 text-sm font-medium">Numéro détecté automatiquement — vérifiez et corrigez si nécessaire</span>
            </div>
          )}
          {!ocrLoading && ocrStatus === 'not_found' && (
            <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-sm">⚠️</span>
              <span className="text-amber-700 text-sm">Numéro non détecté — saisissez-le manuellement</span>
            </div>
          )}

          {/* Aperçu photo */}
          {clientIdPhotoPath && !uploadingPhoto && (
            <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <span className="text-green-600 text-sm">🔒 Photo enregistrée de façon sécurisée</span>
              <button onClick={removePhoto} className="ml-auto text-xs text-red-400 hover:text-red-600 underline">
                Supprimer
              </button>
            </div>
          )}
          {!clientIdPhotoPath && (
            <p className="text-xs text-gray-400 mt-1">📷 iPad : ouvre l'appareil photo · Ordinateur : sélectionne une image</p>
          )}
        </div>

        {/* Origine client */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Origine client <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setClientOrigin('hotel'); notify({ clientOrigin: 'hotel' }) }}
              className={`py-4 rounded-2xl border-2 font-bold text-base transition-all flex flex-col items-center gap-1 ${
                clientOrigin === 'hotel' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:bg-blue-50/30'
              }`}>
              <span className="text-2xl">🏨</span><span>Hôtel</span>
            </button>
            <button type="button" onClick={() => { setClientOrigin('externe'); notify({ clientOrigin: 'externe' }) }}
              className={`py-4 rounded-2xl border-2 font-bold text-base transition-all flex flex-col items-center gap-1 ${
                clientOrigin === 'externe' ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-500 hover:border-green-300 hover:bg-green-50/30'
              }`}>
              <span className="text-2xl">🌍</span><span>Externe</span>
            </button>
          </div>
          {clientOrigin === '' && (
            <p className="text-xs text-gray-400 mt-1.5 text-center">Sélectionnez une option pour continuer</p>
          )}

          {clientOrigin === 'hotel' && (
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                🏠 N° de villa <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
              </label>
              <input type="text" value={villaNumber}
                onChange={e => setVillaNumber(e.target.value)}
                placeholder="Ex: Villa 12, Bungalow 4..."
                className="w-full border-2 border-blue-200 bg-blue-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none text-gray-800" />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
          ← Retour
        </button>
        <button onClick={handleSubmit} disabled={!canContinue}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors">
          Suivant →
        </button>
      </div>
    </div>
  )
}
