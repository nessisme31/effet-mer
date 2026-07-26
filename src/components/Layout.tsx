import { useState } from 'react'
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
  { id: 'fleet',      label: '🛥️ Ma Flotte' },
  { id: 'active',     label: '🚤 Locations actives' },
  { id: 'new-rental', label: '➕ Nouvelle' },
  { id: 'drafts',     label: '⏸️ En pause' },
  { id: 'parking',    label: '🅿️ Parking' },
  { id: 'archives',   label: '📁 Archives' },
  { id: 'clients',    label: '👥 Clients' },
  { id: 'dashboard',  label: '📊 Statistiques' },
]

export default function Layout({ currentPage, setCurrentPage }: Props) {
  const [resumeState, setResumeState] = useState<ResumeState | null>(null)

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
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  currentPage === item.id
                    ? 'border-white text-white'
                    : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
                }`}
              >
                {item.label}
              </button>
            ))}
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
        {currentPage === 'fleet'     && <Fleet />}
        {currentPage === 'parking'   && <Parking />}
        {currentPage === 'archives'  && <Archives />}
        {currentPage === 'clients'   && <Clients />}
        {currentPage === 'dashboard' && <Analytics />}

      </main>
    </div>
  )
}
