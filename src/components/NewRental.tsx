import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ContractLanguage, CartItem } from '../types'
import { ClientData } from './steps/Step2Client'
import Step1Activity from './steps/Step1Activity'
import Step2Client from './steps/Step2Client'
import Step3Recap from './steps/Step3Recap'
import Step4Contract from './steps/Step4Contract'
import Step5Payment from './steps/Step5Payment'
import Step6Schedule from './steps/Step6Schedule'

interface Props {
  onComplete: () => void
  onPause: () => void
  initialFormData?: Partial<FormData>
  initialStep?: number
  draftId?: string
}

interface FormData {
  cart: CartItem[]
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  discount: number
  finalTTC: number
  signature: string
  contractLanguage: ContractLanguage
  contractNumber: string
  paymentMethod: string
}

const generateContractNumber = () => {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `EM-${date}-${rand}`
}

const DEFAULT_FORM: FormData = {
  cart: [],
  clientName: '',
  clientFirstname: '',
  clientPhone: '',
  clientIdNumber: '',
  discount: 0,
  finalTTC: 0,
  signature: '',
  contractLanguage: 'fr',
  contractNumber: generateContractNumber(),
  paymentMethod: '',
}

export default function NewRental({ onComplete, onPause, initialFormData, initialStep, draftId }: Props) {
  const [step, setStep] = useState(initialStep ?? 1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM, ...initialFormData })

  // Le panier contient-il un jet ski ?
  const hasJetSki = formData.cart.some(item => item.activity.requiresJetSki)

  // Étapes : avec ou sans jet ski
  // Sans jet ski : Panier → Client → Récap → Contrat → Paiement → Horaires (6)
  // Avec jet ski  : Panier → Client → Récap → Contrat → Paiement → (location pending_jet, pas d'horaires)
  const stepLabels = hasJetSki
    ? ['Panier', 'Client', 'Récap', 'Contrat', 'Paiement']
    : ['Panier', 'Client', 'Récap', 'Contrat', 'Paiement', 'Horaires']

  const displayStep = step

  // ─── Résumé des activités ──────────────────────────────────
  const cartSummary = formData.cart
    .map(item => {
      let s = item.activity.name
      if (item.subtype) s += ` — ${item.subtype}`
      if (item.numberOfPersons && item.numberOfPersons > 1) s += ` ×${item.numberOfPersons}`
      return s
    })
    .join(' + ')

  // ─── Handlers ─────────────────────────────────────────────
  const handleStep1 = (cart: CartItem[]) => {
    setFormData(prev => ({ ...prev, cart }))
    setStep(2)
  }

  const handleStep2 = (clientData: ClientData) => {
    setFormData(prev => ({ ...prev, ...clientData }))
    setStep(3)
  }

  const handleStep3 = (discount: number, finalTTC: number) => {
    setFormData(prev => ({ ...prev, discount, finalTTC }))
    setStep(4)
  }

  const handleStep4 = (signature: string, language: ContractLanguage) => {
    setFormData(prev => ({ ...prev, signature, contractLanguage: language }))
    setStep(5)
  }

  const handleStep5 = async (paymentMethod: string) => {
    setFormData(prev => ({ ...prev, paymentMethod }))

    if (hasJetSki) {
      // Sauvegarder comme "pending_jet" (jet ski à attribuer plus tard)
      setIsSubmitting(true)
      try {
        const originalTotal = formData.cart.reduce((sum, item) => sum + item.itemPrice, 0)
        const ht = Math.round(formData.finalTTC / 1.2)
        const jetItem = formData.cart.find(item => item.activity.requiresJetSki)

        const { error } = await supabase.from('rentals').insert({
          client_name: formData.clientName.toUpperCase(),
          client_firstname: formData.clientFirstname,
          client_phone: formData.clientPhone,
          client_id_number: formData.clientIdNumber.toUpperCase(),
          activity_name: cartSummary || formData.cart[0]?.activity.name,
          activity_id: formData.cart[0]?.activity.id ?? null,
          cart_items: formData.cart,
          duration: jetItem?.activity.duration ?? formData.cart[0]?.activity.duration,
          duration_minutes: jetItem?.activity.durationMinutes ?? formData.cart[0]?.activity.durationMinutes ?? 0,
          price: formData.finalTTC,
          discount: formData.discount,
          price_ht: ht,
          jet_ski_id: null,
          payment_method: paymentMethod,
          signature: formData.signature,
          contract_number: formData.contractNumber,
          start_time: null,
          end_time: null,
          status: 'pending_jet',
        })
        if (error) throw error

        // Supprimer le brouillon si on en avait un
        if (draftId) {
          await supabase.from('draft_rentals').delete().eq('id', draftId)
        }

        onComplete()
      } catch (err) {
        console.error(err)
        alert('❌ Erreur lors de l\'enregistrement.')
      }
      setIsSubmitting(false)
    } else {
      // Pas de jet ski → passer aux horaires
      setStep(6)
    }
  }

  const handleStep6 = async (startTime: string, endTime: string) => {
    setIsSubmitting(true)
    try {
      const ht = Math.round(formData.finalTTC / 1.2)

      const { error } = await supabase.from('rentals').insert({
        client_name: formData.clientName.toUpperCase(),
        client_firstname: formData.clientFirstname,
        client_phone: formData.clientPhone,
        client_id_number: formData.clientIdNumber.toUpperCase(),
        activity_name: cartSummary || formData.cart[0]?.activity.name,
        activity_id: formData.cart[0]?.activity.id ?? null,
        cart_items: formData.cart,
        duration: formData.cart[0]?.activity.duration,
        duration_minutes: formData.cart.reduce((max, item) =>
          item.activity.durationMinutes > max ? item.activity.durationMinutes : max, 0),
        price: formData.finalTTC,
        discount: formData.discount,
        price_ht: ht,
        jet_ski_id: null,
        payment_method: formData.paymentMethod,
        signature: formData.signature,
        contract_number: formData.contractNumber,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        status: 'active',
      })
      if (error) throw error

      // Supprimer le brouillon
      if (draftId) {
        await supabase.from('draft_rentals').delete().eq('id', draftId)
      }

      onComplete()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de l\'enregistrement.')
    }
    setIsSubmitting(false)
  }

  // ─── Mettre en pause (sauvegarder le brouillon) ─────────────
  const handlePause = async () => {
    setIsSavingDraft(true)
    try {
      const draftData = {
        form_data: formData,
        current_step: step,
        client_name: formData.clientName || '',
        client_firstname: formData.clientFirstname || '',
        activities_summary: cartSummary || 'Activités à définir',
        status: 'draft',
      }

      if (draftId) {
        // Mettre à jour le brouillon existant
        await supabase.from('draft_rentals').update(draftData).eq('id', draftId)
      } else {
        // Créer un nouveau brouillon
        await supabase.from('draft_rentals').insert(draftData)
      }

      onPause()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de la sauvegarde.')
    }
    setIsSavingDraft(false)
  }

  // ─── Activité principale pour Step6 ───────────────────────
  const mainActivity = formData.cart.length > 0
    ? formData.cart.reduce((main, item) =>
        item.activity.durationMinutes > main.activity.durationMinutes ? item : main,
        formData.cart[0]
      ).activity
    : null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border p-6">

        {/* Barre de progression + bouton pause */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <div className="flex justify-between flex-1">
              {stepLabels.map((label, i) => {
                const done = displayStep > i + 1
                const active = displayStep === i + 1
                return (
                  <div key={label} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      done   ? 'bg-green-500 text-white' :
                      active ? 'bg-blue-700 text-white ring-2 ring-blue-300' :
                               'bg-gray-200 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 hidden sm:block text-center leading-tight">
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Bouton Pause (visible dès l'étape 2) */}
            {step >= 2 && (
              <button
                onClick={handlePause}
                disabled={isSavingDraft}
                className="ml-3 flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isSavingDraft ? '💾...' : '⏸️ Pause'}
              </button>
            )}
          </div>

          <div className="h-1.5 bg-gray-200 rounded-full mx-4">
            <div
              className="h-1.5 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((displayStep - 1) / (stepLabels.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* ─── Étapes ─────────────────────────────────────── */}
        {step === 1 && (
          <Step1Activity
            initialCart={formData.cart}
            onNext={handleStep1}
          />
        )}

        {step === 2 && (
          <Step2Client
            onNext={handleStep2}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3Recap
            cart={formData.cart}
            onNext={handleStep3}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <Step4Contract
            formData={{
              cart: formData.cart,
              totalPrice: formData.finalTTC,
              discount: formData.discount,
              clientName: formData.clientName,
              clientFirstname: formData.clientFirstname,
              clientPhone: formData.clientPhone,
              clientIdNumber: formData.clientIdNumber,
              contractNumber: formData.contractNumber,
            }}
            onNext={handleStep4}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && (
          <Step5Payment
            cart={formData.cart}
            totalPrice={formData.finalTTC}
            discount={formData.discount}
            onNext={handleStep5}
            onBack={() => setStep(4)}
          />
        )}

        {step === 6 && !hasJetSki && mainActivity && (
          <Step6Schedule
            activity={mainActivity}
            onComplete={handleStep6}
            onBack={() => setStep(5)}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Message de chargement si en attente */}
        {isSubmitting && (
          <div className="text-center py-4 text-gray-500 text-sm">
            ⏳ Enregistrement en cours...
          </div>
        )}
      </div>
    </div>
  )
}
