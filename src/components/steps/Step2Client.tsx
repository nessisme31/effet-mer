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
  initialData?: Partial<ClientData>   // ← NOUVEAU : pré-remplissage en mode édition
}

export default function Step2Client({ onNext, onBack, initialData }: Props) {
  const [data, setData] = useState<ClientData>({
    clientName: initialData?.clientName ?? '',
    clientFirstname: initialData?.clientFirstname ?? '',
    clientPhone: initialData?.clientPhone ?? '',
    clientIdNumber: initialData?.clientIdNumber ?? '',
  })

  const set = (field: keyof ClientData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(prev => ({ ...prev, [field]: e.target.value }))

  const isValid = data.clientName.trim() && data.clientFirstname.trim() &&
                  data.clientPhone.trim() && data.clientIdNumber.trim()

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 2 — Informations client</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={data.clientName}
              onChange={set('clientName')}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              placeholder="NOM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
            <input
              type="text"
              value={data.clientFirstname}
              onChange={set('clientFirstname')}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Prénom"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
          <input
            type="tel"
            value={data.clientPhone}
            onChange={set('clientPhone')}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="+212 6XX XXX XXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            N° Pièce d'identité (CIN / Passeport) *
          </label>
          <input
            type="text"
            value={data.clientIdNumber}
            onChange={set('clientIdNumber')}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
            placeholder="Ex: AB123456"
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
          onClick={() => isValid && onNext(data)}
          disabled={!isValid}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
