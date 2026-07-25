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
  const handleLogout = async () => {
    await supabase.auth.signOut()
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
                onClick={() => setCurrentPage(item.id)}
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
        {currentPage === 'active'     && <ActiveRentals onNewRental={() => setCurrentPage('new-rental')} />}
        {currentPage === 'new-rental' && <NewRental onComplete={() => setCurrentPage('active')} />}
        {currentPage === 'archives'   && <Archives />}
        {currentPage === 'clients'    && <Clients />}
        {currentPage === 'dashboard'  && <Analytics />}
      </main>
    </div>
  )
}
