import { useState } from 'react'

export interface ClientData {
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  clientOrigin: 'hotel' | 'externe' | ''   // ← NOUVEAU
}

interface Props {
  onNext: (data: ClientData) => void
  onBack: () => void
  onPartialChange?: (data: ClientData) => void
  initialData?: Partial<ClientData>
}

export default function Step2Client({ onNext, onBack, onPartialChange, initialData }: Props) {
  const [clientName, setClientName] = useState(initialData?.clientName ?? '')
  const [clientFirstname, setClientFirstname] = useState(initialData?.clientFirstname ?? '')
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone ?? '')
  const [clientIdNumber, setClientIdNumber] = useState(initialData?.clientIdNumber ?? '')
  const [clientOrigin, setClientOrigin] = useState<'hotel' | 'externe' | ''>(
    initialData?.clientOrigin ?? ''
  )

  const canContinue =
    clientName.trim() &&
    clientFirstname.trim() &&
    clientPhone.trim() &&
    clientIdNumber.trim() &&
    clientOrigin !== ''   // ← obligatoire

  const notify = (overrides: Partial<ClientData>) => {
    onPartialChange?.({
      clientName,
      clientFirstname,
      clientPhone,
      clientIdNumber,
      clientOrigin,
      ...overrides,
    })
  }

  const handleSubmit = () => {
    if (!canContinue) return
    onNext({ clientName, clientFirstname, clientPhone, clientIdNumber, clientOrigin })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 2 — Informations client</h2>

      <div className="space-y-4">

        {/* ── Nom ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientName}
            onChange={e => { setClientName(e.target.value); notify({ clientName: e.target.value }) }}
            placeholder="DUPONT"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow uppercase"
          />
        </div>

        {/* ── Prénom ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientFirstname}
            onChange={e => { setClientFirstname(e.target.value); notify({ clientFirstname: e.target.value }) }}
            placeholder="Jean"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          />
        </div>

        {/* ── Téléphone ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={e => { setClientPhone(e.target.value); notify({ clientPhone: e.target.value }) }}
            placeholder="+212 6XX XXX XXX"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          />
        </div>

        {/* ── N° Pièce d'identité ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            N° Pièce d'identité <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientIdNumber}
            onChange={e => { setClientIdNumber(e.target.value); notify({ clientIdNumber: e.target.value }) }}
            placeholder="CIN / Passeport"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow uppercase"
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
