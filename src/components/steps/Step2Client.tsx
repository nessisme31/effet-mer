import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export interface ClientData {
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  clientIdPhotoUrl: string
}

interface Props {
  onNext: (data: ClientData) => void
  onBack: () => void
}

export default function Step2Client({ onNext, onBack }: Props) {
  const [data, setData] = useState<ClientData>({
    clientName: '',
    clientFirstname: '',
    clientPhone: '',
    clientIdNumber: '',
    clientIdPhotoUrl: '',
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof ClientData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(prev => ({ ...prev, [field]: e.target.value }))

  // ── Téléphone n'est plus obligatoire ──────────────────────
  const isValid = data.clientName.trim() && data.clientFirstname.trim()

  // ── Upload photo vers Supabase Storage ────────────────────
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data: uploadData, error } = await supabase.storage
        .from('id-photos')
        .upload(fileName, file, { upsert: true })

      if (error) {
        alert('❌ Erreur upload photo. Vérifiez que le bucket "id-photos" existe dans Supabase Storage.')
        console.error(error)
      } else if (uploadData) {
        // ✅ On stocke uniquement le chemin du fichier (pas une URL publique)
        // Les URLs temporaires seront générées à la demande lors de la consultation
        setData(prev => ({ ...prev, clientIdPhotoUrl: uploadData.path }))
      }
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de l\'upload de la photo.')
    }

    setUploadingPhoto(false)
  }

  const removePhoto = () => {
    setData(prev => ({ ...prev, clientIdPhotoUrl: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 2 — Informations client</h2>

      <div className="space-y-4">

        {/* Nom + Prénom */}
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

        {/* Téléphone — optionnel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone
            <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
          </label>
          <input
            type="tel"
            value={data.clientPhone}
            onChange={set('clientPhone')}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="+212 6XX XXX XXX"
          />
        </div>

        {/* N° Pièce d'identité + bouton photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            N° Pièce d'identité (CIN / Passeport)
            <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
          </label>

          {/* Champ texte + bouton photo */}
          <div className="flex gap-2">
            <input
              type="text"
              value={data.clientIdNumber}
              onChange={set('clientIdNumber')}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              placeholder="Ex: AB123456"
            />

            {/* Bouton appareil photo */}
            <label className={`flex-shrink-0 cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border transition-colors ${
              uploadingPhoto
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}>
              {uploadingPhoto ? (
                <>⏳ Upload...</>
              ) : (
                <>📷 Photo</>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
          </div>

          {/* Aperçu de la photo si uploadée */}
          {data.clientIdPhotoUrl && (
            <div className="mt-3 relative inline-block">
              <div className="border-2 border-green-300 rounded-xl overflow-hidden bg-green-50 p-2">
                <p className="text-green-700 text-xs font-semibold mb-2">✅ Photo de la pièce d'identité</p>
                <img
                  src={data.clientIdPhotoUrl}
                  alt="Pièce d'identité"
                  className="max-h-36 max-w-xs rounded-lg object-cover border border-green-200"
                />
                <button
                  onClick={removePhoto}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline block"
                >
                  🗑️ Supprimer la photo
                </button>
              </div>
            </div>
          )}

          {/* Indicateur si pas encore de photo */}
          {!data.clientIdPhotoUrl && !uploadingPhoto && (
            <p className="text-xs text-gray-400 mt-1.5">
              📷 Sur iPad : ouvre l'appareil photo · Sur ordinateur : sélectionne une image
            </p>
          )}
        </div>

      </div>

      {/* Boutons navigation */}
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
