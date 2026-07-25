import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ActivityConfig } from '../config'
import { ContractLanguage } from '../types'
import { ClientData } from './steps/Step2Client'
import Step1Activity from './steps/Step1Activity'
import Step2Client from './steps/Step2Client'
import Step3JetSki from './steps/Step3JetSki'
import Step4Contract from './steps/Step4Contract'
import Step5Payment from './steps/Step5Payment'
import Step6Schedule from './steps/Step6Schedule'

interface Props {
  onComplete: () => void
}

interface FormData {
  activity: ActivityConfig | null
  activitySubtype?: string
  numberOfPersons?: number
  finalPrice?: number
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  jetSkiId?: string
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

type FlowState = 'form' | 'waiting-success'

export default function NewRental({ onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>('form')
  const [waitingJetId, setWaitingJetId] = useState('')
  const [formData, setFormData] = useState<FormData>({
    activity: null,
    clientName: '',
    clientFirstname: '',
    clientPhone: '',
    clientIdNumber: '',
    signature: '',
    contractLanguage: 'fr',
    contractNumber: generateContractNumber(),
    paymentMethod: '',
  })

  const requiresJetSki = formData.activity?.requiresJetSki ?? false

  const stepLabels = requiresJetSki
    ? ['Activité', 'Client', 'Jet Ski', 'Contrat', 'Paiement', 'Horaires']
    : ['Activité', 'Client', 'Contrat', 'Paiement', 'Horaires']

  const displayStep = requiresJetSki ? step : step <= 2 ? step : step - 1

  // ── Handlers ──────────────────────────────────────────────
  const handleStep1 = (activity: ActivityConfig, subtype?: string, numberOfPersons?: number) => {
    const finalPrice = numberOfPersons
      ? activity.price * numberOfPersons
      : activity.price
    setFormData(prev => ({
      ...prev,
      activity,
      activitySubtype: subtype,
      numberOfPersons: numberOfPersons ?? 1,
      finalPrice,
    }))
    setStep(2)
  }

  const handleStep2 = (clientData: ClientData) => {
    setFormData(prev => ({ ...prev, ...clientData }))
    setStep(formData.activity?.requiresJetSki ? 3 : 4)
  }

  const handleStep3 = (jetSkiId: string) => {
    setFormData(prev => ({ ...prev, jetSkiId }))
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

  const handleStep6 = async (startTime: string, endTime: string) => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('rentals').insert({
        client_name: formData.clientName.toUpperCase(),
        client_firstname: formData.clientFirstname,
        client_phone: formData.clientPhone,
        client_id_number: formData.clientIdNumber.toUpperCase(),
        activity_id: formData.activity!.id,
        activity_name: formData.activity!.name,
        activity_subtype: formData.activitySubtype || null,
        duration: formData.activity!.duration,
        duration_minutes: formData.activity!.durationMinutes,
        price: formData.finalPrice ?? formData.activity!.price,
        jet_ski_id: formData.jetSkiId || null,
        payment_method: formData.paymentMethod,
        signature: formData.signature,
        contract_number: formData.contractNumber,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        status: 'active',
      })
      if (error) throw error
      onComplete()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de l\'enregistrement. Vérifiez votre connexion et réessayez.')
    }
    setIsSubmitting(false)
  }

  // ── File d'attente ─────────────────────────────────────────
  const handleAddToWaitingList = async (jetSkiId: string) => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('waiting_list').insert({
        client_name: formData.clientName.toUpperCase(),
        client_firstname: formData.clientFirstname,
        client_phone: formData.clientPhone,
        client_id_number: formData.clientIdNumber.toUpperCase(),
        activity_id: formData.activity!.id,
        activity_name: formData.activity!.name,
        activity_subtype: formData.activitySubtype || null,
        jet_ski_id: jetSkiId,
        status: 'waiting',
      })
      if (error) throw error
      setWaitingJetId(jetSkiId)
      setFlowState('waiting-success')
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de l\'ajout en file d\'attente.')
    }
    setIsSubmitting(false)
  }

  // ── Waiting success screen ─────────────────────────────────
  if (flowState === 'waiting-success') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-orange-700 mb-2">
            Ajouté en file d'attente !
          </h2>
          <p className="text-gray-600 mb-1">
            <strong>{formData.clientFirstname} {formData.clientName}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-4">{formData.clientPhone}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <p className="text-orange-800 font-semibold">🚤 En attente du jet {waitingJetId}</p>
            <p className="text-orange-600 text-sm mt-1">
              Une alerte apparaîtra automatiquement dès que ce jet sera rendu.
            </p>
          </div>
          <button
            onClick={onComplete}
            className="w-full bg-blue-700 text-white py-3.5 rounded-2xl font-bold hover:bg-blue-800 transition-colors"
          >
            ✅ Retour aux locations actives
          </button>
        </div>
      </div>
    )
  }

  const handleBack4 = () => setStep(requiresJetSki ? 3 : 2)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border p-6">

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
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
          <div className="h-1.5 bg-gray-200 rounded-full mx-4">
            <div
              className="h-1.5 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((displayStep - 1) / (stepLabels.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        {step === 1 && (
          <Step1Activity onNext={handleStep1} />
        )}
        {step === 2 && (
          <Step2Client onNext={handleStep2} onBack={() => setStep(1)} />
        )}
        {step === 3 && requiresJetSki && formData.activity && (
          <Step3JetSki
            jetType={formData.activity.jetType!}
            clientFirstname={formData.clientFirstname}
            clientName={formData.clientName}
            onNext={handleStep3}
            onBack={() => setStep(2)}
            onAddToWaitingList={handleAddToWaitingList}
          />
        )}
        {step === 4 && formData.activity && (
          <Step4Contract
            formData={{
              activity: formData.activity,
              activitySubtype: formData.activitySubtype,
              numberOfPersons: formData.numberOfPersons,
              totalPrice: formData.finalPrice,
              clientName: formData.clientName,
              clientFirstname: formData.clientFirstname,
              clientPhone: formData.clientPhone,
              clientIdNumber: formData.clientIdNumber,
              jetSkiId: formData.jetSkiId,
              contractNumber: formData.contractNumber,
            }}
            onNext={handleStep4}
            onBack={handleBack4}
          />
        )}
        {step === 5 && formData.activity && (
          <Step5Payment
            activity={formData.activity}
            activitySubtype={formData.activitySubtype}
            numberOfPersons={formData.numberOfPersons}
            totalPrice={formData.finalPrice}
            onNext={handleStep5}
            onBack={() => setStep(4)}
          />
        )}
        {step === 6 && formData.activity && (
          <Step6Schedule
            activity={formData.activity}
            onComplete={handleStep6}
            onBack={() => setStep(5)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  )
}
