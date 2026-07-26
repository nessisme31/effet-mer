import { useState } from 'react'

export interface ClientData {
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
}

interface Props {
  onNext: (data: ClientData) => void
  onBack: () => void
  // Nouveau : mémorisation en temps réel
  onPartialChange?: (data: ClientData) => void
  initialData?: Partial<ClientData>
}

export default function Step2Client({ onNext, onBack, onPartialChange, initialData }: Props) {
  // Pré-remplir avec les données sauvegardées si elles existent
  const [clientName, setClientName] = useState(initialData?.clientName ?? '')
  const [clientFirstname, setClientFirstname] = useState(initialData?.clientFirstname ?? '')
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone ?? '')
  const [clientIdNumber, setClientIdNumber] = useState(initialData?.clientIdNumber ?? '')

  const canContinue = clientName.trim() && clientFirstname.trim() && clientPhone.trim() && clientIdNumber.trim()

  // À chaque modification d'un champ → mémoriser dans le parent
  const notify = (overrides: Partial<ClientData>) => {
    onPartialChange?.({
      clientName,
      clientFirstname,
      clientPhone,
      clientIdNumber,
      ...overrides,
    })
  }

  const handleSubmit = () => {
    if (!canContinue) return
    onNext({ clientName, clientFirstname, clientPhone, clientIdNumber })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 2 — Informations client</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientName}
            onChange={e => {
              const v = e.target.value
              setClientName(v)
              notify({ clientName: v })
            }}
            placeholder="DUPONT"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientFirstname}
            onChange={e => {
              const v = e.target.value
              setClientFirstname(v)
              notify({ clientFirstname: v })
            }}
            placeholder="Jean"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={e => {
              const v = e.target.value
              setClientPhone(v)
              notify({ clientPhone: v })
            }}
            placeholder="+212 6XX XXX XXX"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            N° Pièce d'identité <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientIdNumber}
            onChange={e => {
              const v = e.target.value
              setClientIdNumber(v)
              notify({ clientIdNumber: v })
            }}
            placeholder="CIN / Passeport"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow uppercase"
          />
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
