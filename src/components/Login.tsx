import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'

type View = 'login' | 'forgot' | 'forgot-sent'

export default function Login() {
  const [view,     setView]     = useState<View>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // ── Connexion ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou mot de passe incorrect. Vérifiez vos identifiants.')
    setLoading(false)
  }

  // ── Réinitialisation mot de passe ─────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Veuillez entrer votre adresse email.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (error) {
      setError('Erreur lors de l\'envoi. Vérifiez l\'adresse email.')
    } else {
      setView('forgot-sent')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-800 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚓</div>
          <h1 className="text-3xl font-bold text-blue-800">{CONFIG.businessName}</h1>
          <p className="text-gray-500 mt-2 text-sm">Gestion des locations nautiques</p>
          <p className="text-gray-400 text-xs mt-1">{CONFIG.location}</p>
        </div>

        {/* ── VUE : Connexion ─────────────────────────────── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors mt-2 text-lg"
            >
              {loading ? '⏳ Connexion...' : '🔐 Se connecter'}
            </button>

            {/* Lien mot de passe oublié */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setView('forgot'); setError('') }}
                className="text-blue-500 hover:text-blue-700 text-sm underline transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        )}

        {/* ── VUE : Formulaire réinitialisation ───────────── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center mb-2">
              <p className="text-blue-800 font-semibold text-sm">🔑 Réinitialisation du mot de passe</p>
              <p className="text-blue-600 text-xs mt-1">
                Entrez votre email — vous recevrez un lien pour choisir un nouveau mot de passe.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Votre adresse email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="votre@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors text-lg"
            >
              {loading ? '⏳ Envoi en cours...' : '📧 Envoyer le lien de réinitialisation'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setView('login'); setError('') }}
                className="text-gray-400 hover:text-gray-600 text-sm underline transition-colors"
              >
                ← Retour à la connexion
              </button>
            </div>
          </form>
        )}

        {/* ── VUE : Email envoyé ───────────────────────────── */}
        {view === 'forgot-sent' && (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-2">📧</div>
            <h3 className="text-xl font-bold text-green-700">Email envoyé !</h3>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-800">
              <p className="font-semibold mb-1">Vérifiez votre boîte mail</p>
              <p className="text-green-600 text-xs">
                Un email a été envoyé à <strong>{email}</strong>.<br />
                Cliquez sur le lien dans l'email pour choisir un nouveau mot de passe.<br />
                <span className="text-gray-400">(Vérifiez aussi vos spams)</span>
              </p>
            </div>
            <button
              onClick={() => { setView('login'); setError('') }}
              className="text-blue-500 hover:text-blue-700 text-sm underline transition-colors"
            >
              ← Retour à la connexion
            </button>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-8">
          {CONFIG.company} · ICE {CONFIG.ice}
        </p>
      </div>
    </div>
  )
}
