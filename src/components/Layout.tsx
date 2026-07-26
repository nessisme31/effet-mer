import { useState } from 'react'
import { CONFIG } from '../config'
import { supabase } from '../lib/supabase'
import { Page } from '../App'
import NewRental from './NewRental'
import ActiveRentals from './ActiveRentals'
import Archives from './Archives'
import Clients from './Clients'
import Analytics from './Analytics'

interface Props {
  currentPage: Page
  setCurrentPage: (page: Page) => void
}

const navItems: { id: Page; label: string }[] = [
  { id: 'active',     label: '🚤 Locations actives' },
  { id: 'new-rental', label: '➕ Nouvelle location' },
  { id: 'archives',   label: '📁 Archives' },
  { id: 'clients',    label: '👥 Clients' },
  { id: 'dashboard',  label: '📊 Tableau de bord' },
]

export default function Layout({ currentPage, setCurrentPage }: Props) {
  // ── État de l'édition ────────────────────────────────────
  const [editRentalId, setEditRentalId] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Ouvrir une location en mode édition
  const handleEditRental = (id: string) => {
    setEditRentalId(id)
    setCurrentPage('new-rental')
  }

  // Quand on navigue ailleurs, effacer l'id d'édition
  const handleNav = (page: Page) => {
    if (page !== 'new-rental') {
      setEditRentalId(null)
    }
    setCurrentPage(page)
  }

  // Quand la nouvelle location / édition est terminée
  const handleRentalComplete = () => {
    setEditRentalId(null)
    setCurrentPage('active')
  }

  // Nouvelle location (sans édition)
  const handleNewRental = () => {
    setEditRentalId(null)
    setCurrentPage('new-rental')
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
            className="text-blue-300 hover:text-white text-sm transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  currentPage === item.id
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.id === 'new-rental' && editRentalId ? '✏️ Modifier location' : item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {currentPage === 'active' && (
          <ActiveRentals
            onNewRental={handleNewRental}
            onEditRental={handleEditRental}
          />
        )}
        {currentPage === 'new-rental' && (
          <NewRental
            onComplete={handleRentalComplete}
            rentalId={editRentalId ?? undefined}
          />
        )}
        {currentPage === 'archives' && (
          <Archives onEditRental={handleEditRental} />
        )}
        {currentPage === 'clients' && <Clients />}
        {currentPage === 'dashboard' && <Analytics />}
      </main>
    </div>
  )
}
