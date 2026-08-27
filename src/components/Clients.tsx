import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'
import { openContractPDF } from '../utils/contractHTML'

type ClientOrigin = 'hotel' | 'exterieur' | null

type RentalWithClientData = Rental & {
  client_origin?: ClientOrigin
  client_id_document_path?: string | null
}

interface ClientSummary {
  key: string
  name: string
  firstname: string
  phone: string
  idNumber: string
  origin: ClientOrigin
  idDocumentPath: string | null
  rentals: RentalWithClientData[]
}

interface EditData {
  name: string
  firstname: string
  phone: string
  idNumber: string
  origin: Exclude<ClientOrigin, null>
}

const normalizePhone = (phone: string) => phone.replace(/\s/g, '')

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

const formatTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export default function Clients() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(null)
  const [editData, setEditData] = useState<EditData | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const fetchClients = async () => {
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError('Impossible de charger les clients.')
      setClients([])
      setLoading(false)
      return
    }

    const map = new Map<string, ClientSummary>()

    ;((data || []) as RentalWithClientData[]).forEach(rental => {
      const key = normalizePhone(rental.client_phone)
      const existing = map.get(key)

      if (existing) {
        existing.rentals.push(rental)
        if (!existing.idDocumentPath && rental.client_id_document_path) {
          existing.idDocumentPath = rental.client_id_document_path
        }
        if (!existing.origin && rental.client_origin) {
          existing.origin = rental.client_origin
        }
      } else {
        map.set(key, {
          key,
          name: rental.client_name,
          firstname: rental.client_firstname,
          phone: rental.client_phone,
          idNumber: rental.client_id_number,
          origin: rental.client_origin || null,
          idDocumentPath: rental.client_id_document_path || null,
          rentals: [rental],
        })
      }
    })

    setClients(
      Array.from(map.values()).sort((a, b) => {
        const byName = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
        if (byName !== 0) return byName
        return a.firstname.localeCompare(b.firstname, 'fr', { sensitivity: 'base' })
      }),
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return clients

    return clients.filter(client =>
      `${client.firstname} ${client.name}`.toLowerCase().includes(value) ||
      client.phone.toLowerCase().includes(value) ||
      client.idNumber.toLowerCase().includes(value),
    )
  }, [clients, search])

  const openEdit = (client: ClientSummary) => {
    setEditingClient(client)
    setEditData({
      name: client.name,
      firstname: client.firstname,
      phone: client.phone,
      idNumber: client.idNumber,
      origin: client.origin || 'exterieur',
    })
  }

  const updateEditField = (field: keyof EditData, value: string) => {
    setEditData(previous => previous ? { ...previous, [field]: value } : previous)
  }

  const handleSaveEdit = async () => {
    if (!editingClient || !editData) return

    if (!editData.name.trim() || !editData.firstname.trim() || !editData.phone.trim() || !editData.idNumber.trim()) {
      alert('Veuillez remplir tous les champs obligatoires.')
      return
    }

    setSaving(true)
    const rentalIds = editingClient.rentals.map(rental => rental.id)
    const { error: updateError } = await supabase
      .from('rentals')
      .update({
        client_name: editData.name.trim().toUpperCase(),
        client_firstname: editData.firstname.trim(),
        client_phone: editData.phone.trim(),
        client_id_number: editData.idNumber.trim().toUpperCase(),
        client_origin: editData.origin,
      })
      .in('id', rentalIds)

    if (updateError) {
      alert('La modification n’a pas pu être enregistrée.')
    } else {
      setEditingClient(null)
      setEditData(null)
      await fetchClients()
    }
    setSaving(false)
  }

  const handleDelete = async (client: ClientSummary) => {
    const fullName = `${client.firstname} ${client.name}`
    const reservationCount = client.rentals.length

    const firstConfirmation = window.confirm(
      `Attention : vous allez supprimer définitivement ${fullName} et ses ${reservationCount} réservation(s).\n\nCette action supprimera également son historique des statistiques. Continuer ?`,
    )

    if (!firstConfirmation) return

    const typedConfirmation = window.prompt(
      `Deuxième vérification. Pour confirmer la suppression définitive de ${fullName}, tapez exactement : SUPPRIMER`,
    )

    if (typedConfirmation?.trim().toUpperCase() !== 'SUPPRIMER') {
      alert('Suppression annulée : le mot de confirmation n’est pas correct.')
      return
    }

    setDeletingKey(client.key)
    const rentalIds = client.rentals.map(rental => rental.id)

    const [rentalsResult, waitingResult] = await Promise.all([
      supabase.from('rentals').delete().in('id', rentalIds),
      supabase.from('waiting_list').delete().eq('client_phone', client.phone),
    ])

    if (rentalsResult.error || waitingResult.error) {
      alert('Une erreur est survenue pendant la suppression. Vérifiez que le client n’apparaît plus, puis réessayez si nécessaire.')
    } else {
      setExpandedKey(null)
      await fetchClients()
    }

    setDeletingKey(null)
  }

  const downloadIdentity = async (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      window.open(path, '_blank', 'noopener,noreferrer')
      return
    }

    const { data, error: downloadError } = await supabase
      .storage
      .from('client-documents')
      .download(path)

    if (downloadError || !data) {
      alert('La carte d’identité n’a pas pu être téléchargée.')
      return
    }

    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = path.split('/').pop() || 'carte-identite'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clients</h2>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client(s)</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="🔍 Rechercher un nom, téléphone ou pièce d’identité..."
        value={search}
        onChange={event => setSearch(event.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm"
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4">{error}</div>}

      <div className="space-y-3">
        {filteredClients.map(client => {
          const isExpanded = expandedKey === client.key
          const isDeleting = deletingKey === client.key

          return (
            <div key={client.key} className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedKey(isExpanded ? null : client.key)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="font-semibold text-gray-800 truncate">
                    {client.name} {client.firstname}
                  </p>
                  <p className="text-gray-500 text-sm mt-0.5">{client.phone}</p>
                </button>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(client)}
                    className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(client)}
                    disabled={isDeleting}
                    className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
                  >
                    {isDeleting ? 'Suppression…' : 'Supprimer'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-400">N° carte d’identité</p>
                      <p className="font-semibold text-gray-800 mt-1">{client.idNumber || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-400">Origine</p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {client.origin === 'hotel' ? '🏨 Hôtel' : client.origin === 'exterieur' ? '🌊 Extérieur' : 'Non renseignée'}
                      </p>
                    </div>
                  </div>

                  {client.idDocumentPath && (
                    <button
                      type="button"
                      onClick={() => downloadIdentity(client.idDocumentPath!)}
                      className="w-full bg-white border border-blue-200 text-blue-700 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-blue-50"
                    >
                      🪪 Télécharger la carte d’identité
                    </button>
                  )}

                  <div>
                    <h3 className="font-bold text-gray-700 mb-2">Réservations</h3>
                    <div className="space-y-2">
                      {client.rentals.map(rental => (
                        <div key={rental.id} className="bg-white border rounded-lg p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800">{formatDate(rental.created_at)}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {rental.activity_name} · {formatTime(rental.start_time)} · {rental.price.toLocaleString()} {CONFIG.currency}
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5">Contrat {rental.contract_number}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openContractPDF(rental)}
                            className="shrink-0 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-blue-100"
                          >
                            📄 Contrat
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">👤</div>
            <p>Aucun client trouvé</p>
          </div>
        )}
      </div>

      {editingClient && editData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Modifier le client</h3>
            <div className="space-y-3">
              <input value={editData.name} onChange={event => updateEditField('name', event.target.value)} placeholder="Nom" className="w-full border rounded-xl px-3 py-2.5 uppercase" />
              <input value={editData.firstname} onChange={event => updateEditField('firstname', event.target.value)} placeholder="Prénom" className="w-full border rounded-xl px-3 py-2.5" />
              <input value={editData.phone} onChange={event => updateEditField('phone', event.target.value)} placeholder="Téléphone" className="w-full border rounded-xl px-3 py-2.5" />
              <input value={editData.idNumber} onChange={event => updateEditField('idNumber', event.target.value)} placeholder="N° carte d’identité" className="w-full border rounded-xl px-3 py-2.5 uppercase" />
              <select value={editData.origin} onChange={event => updateEditField('origin', event.target.value)} className="w-full border rounded-xl px-3 py-2.5">
                <option value="exterieur">🌊 Extérieur</option>
                <option value="hotel">🏨 Hôtel</option>
              </select>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => { setEditingClient(null); setEditData(null) }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold">Annuler</button>
              <button type="button" onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
