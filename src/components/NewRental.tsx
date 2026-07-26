import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ContractLanguage, CartItem } from '../types'
import { ClientData } from './steps/Step2Client'
import Step1Activity from './steps/Step1Activity'
import Step2Client from './steps/Step2Client'
import Step3Recap from './steps/Step3Recap'
import Step4Contract from './steps/Step4Contract'
import Step5Payment from './steps/Step5Payment'
import Step3JetSki from './steps/Step3JetSki'
import StepScheduleMulti from './steps/StepScheduleMulti'

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
  jetSkiId?: string
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

type FlowState = 'form' | 'waiting-success'

export default function NewRental({ onComplete, onPause, initialFormData, initialStep, draftId }: Props) {
  const [step, setStep] = useState(initialStep ?? 1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>('form')
  const [waitingJetId, setWaitingJetId] = useState('')
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM, ...initialFormData })

  const hasJetSki = formData.cart.some(item => item.activity.requiresJetSki)
  const jetItem = formData.cart.find(item => item.activity.requiresJetSki)
  const jetType = jetItem?.activity.jetType ?? 'VX'

  // Étapes : avec ou sans jet ski
  const stepLabels = hasJetSki
    ? ['Panier', 'Client', 'Récap', 'Contrat', 'Paiement', 'Jet Ski', 'Horaires']
    : ['Panier', 'Client', 'Récap', 'Contrat', 'Paiement', 'Horaires']

  const cartSummary = formData.cart
    .map(item => {
      let s = item.activity.name
      if (item.subtype) s += ` — ${item.subtype}`
      if (item.numberOfPersons && item.numberOfPersons > 1) s += ` ×${item.numberOfPersons}`
      return s
    })
    .join(' + ')

  // ─── Sauvegarde finale ────────────────────────────────────
  const saveRental = async (scheduledCart: CartItem[]) => {
    const ht = Math.round(formData.finalTTC / 1.2)

    // Calculer les horaires globaux depuis les items actifs
    const activeItems = scheduledCart.filter(i => i.itemStatus === 'active' && i.itemStartTime && i.itemEndTime)
    const overallStart = activeItems.length > 0
      ? activeItems.reduce((min, i) => (i.itemStartTime! < min ? i.itemStartTime! : min), activeItems[0].itemStartTime!)
      : null
    const overallEnd = activeItems.length > 0
      ? activeItems.reduce((max, i) => (i.itemEndTime! > max ? i.itemEndTime! : max), activeItems[0].itemEndTime!)
      : null

    const buildPayload = (contractNumber: string) => ({
      client_name: formData.clientName.toUpperCase(),
      client_firstname: formData.clientFirstname,
      client_phone: formData.clientPhone,
      client_id_number: formData.clientIdNumber.toUpperCase(),
      activity_name: cartSummary || formData.cart[0]?.activity.name,
      activity_id: formData.cart[0]?.activity.id ?? null,
      cart_items: scheduledCart,
      duration: formData.cart[0]?.activity.duration ?? '',
      duration_minutes: formData.cart[0]?.activity.durationMinutes ?? 0,
      price: formData.finalTTC,
      discount: formData.discount,
      price_ht: ht,
      jet_ski_id: formData.jetSkiId ?? null,
      payment_method: formData.paymentMethod,
      signature: formData.signature,
      contract_number: contractNumber,
      start_time: overallStart,
      end_time: overallEnd,
      status: 'active',
      returned_cart_ids: [],
    })

    let { error } = await supabase.from('rentals').insert(buildPayload(formData.contractNumber))

    // Si numéro de contrat déjà utilisé → regénérer automatiquement
    if (error?.code === '23505') {
      const newNum = generateContractNumber()
      const retry = await supabase.from('rentals').insert(buildPayload(newNum))
      error = retry.error
    }

    if (error) throw error

    if (draftId) {
      await supabase.from('draft_rentals').delete().eq('id', draftId)
    }
  }

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

  const handleStep5 = (paymentMethod: string) => {
    setFormData(prev => ({ ...prev, paymentMethod }))
    setStep(6)
  }

  const handleStep6JetSki = (jetSkiId: string) => {
    setFormData(prev => ({ ...prev, jetSkiId }))
    setStep(7)
  }

  // File d'attente jet ski
  const handleAddToWaitingList = async (jetSkiId: string) => {
    setIsSubmitting(true)
    try {
      const ht = Math.round(formData.finalTTC / 1.2)
      const { error } = await supabase.from('rentals').insert({
        client_name: formData.clientName.toUpperCase(),
        client_firstname: formData.clientFirstname,
        client_phone: formData.clientPhone,
        client_id_number: formData.clientIdNumber.toUpperCase(),
        activity_name: cartSummary,
        activity_id: formData.cart[0]?.activity.id ?? null,
        cart_items: formData.cart,
        duration: jetItem?.activity.duration ?? '',
        duration_minutes: jetItem?.activity.durationMinutes ?? 0,
        price: formData.finalTTC,
        discount: formData.discount,
        price_ht: ht,
        jet_ski_id: null,
        payment_method: formData.paymentMethod,
        signature: formData.signature,
        contract_number: formData.contractNumber,
        start_time: null,
        end_time: null,
        status: 'pending_jet',
        returned_cart_ids: [],
      })
      if (error) throw error

      await supabase.from('waiting_list').insert({
        client_name: formData.clientName.toUpperCase(),
        client_firstname: formData.clientFirstname,
        client_phone: formData.clientPhone,
        client_id_number: formData.clientIdNumber.toUpperCase(),
        activity_id: jetItem?.activity.id ?? '',
        activity_name: cartSummary,
        activity_subtype: null,
        jet_ski_id: jetSkiId,
        status: 'waiting',
      })

      setWaitingJetId(jetSkiId)
      setFlowState('waiting-success')
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de l\'ajout en file d\'attente.')
    }
    setIsSubmitting(false)
  }

  // Horaires finaux (étape 6 ou 7)
  const handleSchedule = async (scheduledCart: CartItem[]) => {
    setIsSubmitting(true)
    try {
      await saveRental(scheduledCart)
      onComplete()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de l\'enregistrement.')
    }
    setIsSubmitting(false)
  }

  // ─── Pause ────────────────────────────────────────────────
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
        await supabase.from('draft_rentals').update(draftData).eq('id', draftId)
      } else {
        await supabase.from('draft_rentals').insert(draftData)
      }
      onPause()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de la sauvegarde.')
    }
    setIsSavingDraft(false)
  }

  // ─── Écran file d'attente ──────────────────────────────────
  if (flowState === 'waiting-success') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-orange-700 mb-2">Ajouté en file d'attente !</h2>
          <p className="text-gray-600 mb-1"><strong>{formData.clientFirstname} {formData.clientName}</strong></p>
          <p className="text-gray-500 text-sm mb-4">{formData.clientPhone}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <p className="text-orange-800 font-semibold">🚤 En attente du jet {waitingJetId}</p>
            <p className="text-orange-600 text-sm mt-1">Une alerte apparaîtra dès que ce jet sera rendu.</p>
          </div>
          <button onClick={onComplete} className="w-full bg-blue-700 text-white py-3.5 rounded-2xl font-bold hover:bg-blue-800">
            ✅ Retour aux locations actives
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border p-6">

        {/* Barre de progression + bouton pause */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <div className="flex justify-between flex-1">
              {stepLabels.map((label, i) => {
                const done = step > i + 1
                const active = step === i + 1
                return (
                  <div key={label} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      done   ? 'bg-green-500 text-white' :
                      active ? 'bg-blue-700 text-white ring-2 ring-blue-300' :
                               'bg-gray-200 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 hidden sm:block text-center leading-tight">{label}</span>
                  </div>
                )
              })}
            </div>
            {step >= 2 && (
              <button onClick={handlePause} disabled={isSavingDraft}
                className="ml-3 flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 whitespace-nowrap">
                {isSavingDraft ? '💾...' : '⏸️ Pause'}
              </button>
            )}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mx-4">
            <div className="h-1.5 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / (stepLabels.length - 1)) * 100}%` }} />
          </div>
        </div>

        {/* ─── Étapes ─────────────────────────────────── */}

        {step === 1 && <Step1Activity initialCart={formData.cart} onNext={handleStep1} />}

        {step === 2 && (
          <Step2Client
            onNext={handleStep2}
            onBack={() => setStep(1)}
            onPartialChange={(partial) => setFormData(prev => ({ ...prev, ...partial }))}
            initialData={{
              clientName: formData.clientName,
              clientFirstname: formData.clientFirstname,
              clientPhone: formData.clientPhone,
              clientIdNumber: formData.clientIdNumber,
            }}
          />
        )}

        {step === 3 && (
          <Step3Recap cart={formData.cart} onNext={handleStep3} onBack={() => setStep(2)} />
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

        {/* Étape 6 : Jet Ski (si jet ski) OU Horaires (si pas de jet ski) */}
        {step === 6 && hasJetSki && (
          <Step3JetSki
            jetType={jetType}
            clientFirstname={formData.clientFirstname}
            clientName={formData.clientName}
            onNext={handleStep6JetSki}
            onBack={() => setStep(5)}
            onAddToWaitingList={handleAddToWaitingList}
          />
        )}

        {step === 6 && !hasJetSki && (
          <StepScheduleMulti
            cart={formData.cart}
            onComplete={handleSchedule}
            onBack={() => setStep(5)}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Étape 7 : Horaires (avec jet ski) */}
        {step === 7 && hasJetSki && (
          <StepScheduleMulti
            cart={formData.cart}
            onComplete={handleSchedule}
            onBack={() => setStep(6)}
            isSubmitting={isSubmitting}
          />
        )}

      </div>
    </div>
  )
}
