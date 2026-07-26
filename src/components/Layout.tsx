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

interface Props {
  currentPage: Page
  setCurrentPage: (page: Page) => void
}

// ─── État de reprise d'un brouillon ──────────────────────────
interface ResumeState {
  draftId: string
  formData: Record<string, unknown>
  step: number
}

const navItems: { id: Page; label: string }[] = [
  { id: 'active',     label: '🚤 Locations actives' },
  { id: 'new-rental', label: '➕ Nouvelle location' },
  { id: 'drafts',     label: '⏸️ En pause' },
  { id: 'archives',   label: '📁 Archives' },
  { id: 'clients',    label: '👥 Clients' },
  { id: 'dashboard',  label: '📊 Tableau de bord' },
]

export default function Layout({ currentPage, setCurrentPage }: Props) {
  const [resumeState, setResumeState] = useState<ResumeState | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Reprendre un brouillon : on restaure les données et on navigue vers "new-rental"
  const handleResume = (draftId: string, formData: Record<string, unknown>, step: number) => {
    setResumeState({ draftId, formData, step })
    setCurrentPage('new-rental')
  }

  // Quand NewRental est complété (location finalisée)
  const handleNewRentalComplete = () => {
    setResumeState(null)
    setCurrentPage('active')
  }

  // Quand NewRental est mis en pause
  const handlePause = () => {
    setResumeState(null)
    setCurrentPage('active')
  }

  // Quand on navigue ailleurs, effacer l'état de reprise
  const handleNavigation = (page: Page) => {
    if (page !== 'new-rental') {
      setResumeState(null)
    }
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
            // Si on reprend un brouillon, passer les données sauvegardées
            initialFormData={resumeState?.formData as Parameters<typeof NewRental>[0]['initialFormData']}
            initialStep={resumeState?.step}
            draftId={resumeState?.draftId}
          />
        )}

        {currentPage === 'drafts' && (
          <DraftRentals onResume={handleResume} />
        )}

        {currentPage === 'archives' && <Archives />}
        {currentPage === 'clients'  && <Clients />}
        {currentPage === 'dashboard' && <Analytics />}

      </main>
    </div>
  )
}
