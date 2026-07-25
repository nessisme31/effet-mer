import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface DraftRental {
  id: string
  form_data: Record<string, unknown>
  current_step: number
  client_name: string
  client_firstname: string
  activities_summary: string
  created_at: string
  status: string
}

interface Props {
  onResume: (draftId: string, formData: Record<string, unknown>, step: number) => void
}

const fmt = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STEP_LABELS: Record<number, string> = {
  1: 'Choix activités',
  2: 'Infos client',
  3: 'Récapitulatif',
  4: 'Contrat',
  5: 'Paiement',
  6: 'Horaires',
}

export default function DraftRentals({ onResume }: Props) {
  const [drafts, setDrafts] = useState<DraftRental[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDrafts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('draft_rentals')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })

    setDrafts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchDrafts()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce brouillon ?')) return
    await supabase.from('draft_rentals').delete().eq('id', id)
    fetchDrafts()
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3 animate-pulse">⏸️</div>
        <p>Chargement des locations en pause...</p>
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-lg font-semibold text-gray-500">Aucune location en attente</p>
        <p className="text-sm mt-2 text-gray-400">
          Utilisez le bouton ⏸️ Pause pendant une location pour la retrouver ici
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Locations en pause</h2>
        <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
          {drafts.length}
        </span>
      </div>

      <div className="space-y-4">
        {drafts.map(draft => {
          const hasClient = draft.client_firstname || draft.client_name
          const clientName = hasClient
            ? `${draft.client_firstname} ${draft.client_name}`.trim()
            : 'Client à renseigner'

          return (
            <div
              key={draft.id}
              className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Client */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⏸️</span>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{clientName}</p>
                      <p className="text-amber-600 text-xs font-medium">
                        Arrêté à l'étape {draft.current_step} — {STEP_LABELS[draft.current_step] ?? 'En cours'}
                      </p>
                    </div>
                  </div>

                  {/* Activités */}
                  {draft.activities_summary && (
                    <div className="bg-amber-50 rounded-xl px-3 py-2 mb-2">
                      <p className="text-gray-600 text-sm">
                        🛒 {draft.activities_summary}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-gray-400 text-xs">
                    Sauvegardé le {fmt(draft.created_at)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleDelete(draft.id)}
                  className="flex-none px-4 py-2.5 bg-red-50 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  🗑️ Supprimer
                </button>
                <button
                  onClick={() => onResume(draft.id, draft.form_data, draft.current_step)}
                  className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
                >
                  ▶️ Reprendre la location
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
