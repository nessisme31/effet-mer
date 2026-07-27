import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Session } from '@supabase/supabase-js'
import Login from './components/Login'
import Layout from './components/Layout'
import ResetPassword from './components/ResetPassword'

export type Page = 'active' | 'new-rental' | 'drafts' | 'archives' | 'clients' | 'dashboard' | 'parking' | 'fleet' | 'reservations'

export default function App() {
  const [session,      setSession]      = useState<Session | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [currentPage,  setCurrentPage]  = useState<Page>('active')
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Quand l'utilisateur clique sur le lien "reset password" dans son email,
      // Supabase envoie l'événement PASSWORD_RECOVERY → on affiche l'écran de reset
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      }
      // Après avoir changé le mot de passe, on revient en mode normal
      if (event === 'USER_UPDATED') {
        setRecoveryMode(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Chargement initial
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="text-5xl mb-4">⚓</div>
          <p className="text-blue-600 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  // Mode réinitialisation mot de passe (lien email cliqué)
  if (recoveryMode) return <ResetPassword />

  // Pas connecté → page de login
  if (!session) return <Login />

  // Connecté → application principale
  return <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} />
}
