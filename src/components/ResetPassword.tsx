import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'

export default function ResetPassword() {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Erreur lors de la mise à jour. Réessayez.')
    } else {
      setSuccess(true)
      // Déconnecter après 3s pour forcer une reconnexion propre
      setTimeout(() => supabase.auth.signOut(), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-800 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚓</div>
          <h1 className="text-3xl font-bold text-blue-800">{CONFIG.businessName}</h1>
          <p className="text-gray-500 mt-2 text-sm">Nouveau mot de passe</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-2">✅</div>
            <h3 className="text-xl font-bold text-green-700">Mot de passe mis à jour !</h3>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-800">
              <p>Votre nouveau mot de passe a été enregistré.</p>
              <p className="text-green-600 text-xs mt-1">
                Vous allez être redirigé vers la page de connexion dans quelques secondes...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center mb-2">
              <p className="text-blue-800 font-semibold text-sm">🔑 Choisissez un nouveau mot de passe</p>
              <p className="text-blue-600 text-xs mt-1">Au moins 8 caractères</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
              {confirm && password !== confirm && (
                <p className="text-red-500 text-xs mt-1">⚠️ Les mots de passe ne correspondent pas</p>
              )}
              {confirm && password === confirm && confirm.length >= 8 && (
                <p className="text-green-500 text-xs mt-1">✅ Les mots de passe correspondent</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || password !== confirm || password.length < 8}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors text-lg"
            >
              {loading ? '⏳ Mise à jour...' : '🔐 Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        )}

        <p className="text-center text-gray-400 text-xs mt-8">
          {CONFIG.company} · ICE {CONFIG.ice}
        </p>
      </div>
    </div>
  )
}
