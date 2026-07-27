import { useState, useEffect } from 'react'
import { CONFIG } from '../config'
import { supabase } from '../lib/supabase'
import { Page } from '../App'
import NewRental from './NewRental'
import ActiveRentals from './ActiveRentals'
import Archives from './Archives'
import Clients from './Clients'
import Analytics from './Analytics'
import DraftRentals from './DraftRentals'
import Parking from './Parking'
import Fleet from './Fleet'
import Reservations from './Reservations'

interface Props {
  currentPage: Page
  setCurrentPage: (page: Page) => void
}

interface ResumeState {
  draftId: string
  formData: Record<string, unknown>
  step: number
}

const navItems: { id: Page; label: string }[] = [
  { id: 'fleet',        label: '🛥️ Ma Flotte' },
  { id: 'active',       label: '🚤 Locations actives' },
  { id: 'new-rental',   label: '➕ Nouvelle' },
  { id: 'drafts',       label: '⏸️ En pause' },
  { id: 'reservations', label: '📅 Réservations' },
  { id: 'parking',      label: '🅿️ Parking' },
  { id: 'archives',     label: '📁 Archives' },
  { id: 'clients',      label: '👥 Clients' },
  { id: 'dashboard',    label: '📊 Statistiques' },
]

export default function Layout({ currentPage, setCurrentPage }: Props) {
  const [resumeState, setResumeState] = useState<ResumeState | null>(null)
  const [draftCount, setDraftCount] = useState(0)

  // Surveille le nombre de brouillons en temps réel
  useEffect(() => {
    const fetchDrafts = async () => {
      const { count } = await supabase
        .from('draft_rentals')
        .select('*', { count: 'exact', head: true })
      setDraftCount(count ?? 0)
    }
    fetchDrafts()
    const interval = setInterval(fetchDrafts, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleResume = (draftId: string, formData: Record<string, unknown>, step: number) => {
    setResumeState({ draftId, formData, step })
    setCurrentPage('new-rental')
  }

  const handleNewRentalComplete = () => {
    setResumeState(null)
    setCurrentPage('active')
  }

  const handlePause = () => {
    setResumeState(null)
    setCurrentPage('active')
  }

  const handleNavigation = (page: Page) => {
    if (page !== 'new-rental') setResumeState(null)
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚓</span>
            <div>
              <h1 className="text-xl font-bold leading-tight">{CONFIG.businessName}</h1>
              <p className="text-blue-300 text-xs">{CONFIG.location}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-blue-300 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-blue-700 shadow">
        <div className="max-w-5xl mx-auto px-2">
          <div className="flex overflow-x-auto scrollbar-hide">
            {navItems.map(item => {
              const isDrafts = item.id === 'drafts'
              const hasDrafts = isDrafts && draftCount > 0
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    currentPage === item.id
                      ? 'border-white text-white'
                      : hasDrafts
                        ? 'border-transparent text-red-300 hover:text-red-100 hover:border-red-300'
                        : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
                  }`}
                >
                  {item.label}
                  {hasDrafts && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {draftCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {currentPage === 'active' && (
          <ActiveRentals onNewRental={() => setCurrentPage('new-rental')} />
        )}

        {currentPage === 'new-rental' && (
          <NewRental
            onComplete={handleNewRentalComplete}
            onPause={handlePause}
            initialFormData={resumeState?.formData as Parameters<typeof NewRental>[0]['initialFormData']}
            initialStep={resumeState?.step}
            draftId={resumeState?.draftId}
          />
        )}

        {currentPage === 'drafts'    && <DraftRentals onResume={handleResume} />}
        {currentPage === 'fleet'        && <Fleet />}
        {currentPage === 'reservations' && <Reservations />}
        {currentPage === 'parking'      && <Parking />}
        {currentPage === 'archives'  && <Archives />}
        {currentPage === 'clients'   && <Clients />}
        {currentPage === 'dashboard' && <Analytics />}

      </main>
    </div>
  )
}
