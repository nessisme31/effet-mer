import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Session } from '@supabase/supabase-js'
import Login from './components/Login'
import Layout from './components/Layout'

export type Page = 'active' | 'new-rental' | 'archives' | 'clients' | 'dashboard'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<Page>('active')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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

  if (!session) return <Login />

  return <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} />
}
