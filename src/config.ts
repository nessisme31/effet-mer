export interface ActivityConfig {
  id: string
  name: string
  duration: string
  durationMinutes: number
  price: number
  requiresJetSki: boolean
  jetType?: 'FX' | 'VX'
  hasSubtype?: boolean
}

export interface JetSkiConfig {
  id: string
  name: string
  type: 'FX' | 'VX'
}

// ============================================================
// TEXTES DES CONTRATS EN 3 LANGUES (textes officiels intégrés)
// ============================================================
export interface ContractSection {
  num: string
  title: string
  intro?: string
  bullets?: string[]
}

export interface ContractText {
  dir: 'ltr' | 'rtl'
  flag: string
  langLabel: string
  title: string
  lesseeLabel: string
  prestationLabel: string
  sections: ContractSection[]
  disclaimer: string // {{name}} sera remplacé par le nom du client
  fields: {
    contract: string
    date: string
    location: string
    fullName: string
    phone: string
    idCard: string
    activity: string
    jetSki: string
    duration: string
    price: string
  }
}

export const CONTRACT_TEXTS: Record<'fr' | 'en' | 'ar', ContractText> = {
  // ─── FRANÇAIS ───────────────────────────────────────────────
  fr: {
    dir: 'ltr',
    flag: '🇫🇷',
    langLabel: 'Français',
    title: "CONTRAT DE LOCATION D'ENGINS NAUTIQUES",
    lesseeLabel: 'LOCATAIRE',
    prestationLabel: 'PRESTATION',
    sections: [
      {
        num: '1',
        title: 'Objet du contrat',
        intro: "Le présent contrat a pour objet la location d'un véhicule nautique à moteur (jet-ski / motomarine) destiné à un usage de loisirs, dont les caractéristiques sont précisées dans la description ci-dessus.",
      },
      {
        num: '2',
        title: 'Responsabilité et assurance',
        bullets: [
          "L'assurance couvre uniquement la responsabilité civile envers les tiers. Tout dommage matériel ou mécanique est à la charge du client.",
          "Le client est responsable de tout dommage causé au jet-ski pendant la durée de la location.",
          "Le non-respect des lois et réglementations maritimes relève de la seule responsabilité du client.",
          "Le jet-ski est placé sous la responsabilité exclusive de la personne signataire du présent contrat.",
          "La perte du cordon de sécurité moteur (coupe-circuit) entraînera une pénalité de 500 MAD.",
          "Tout retard de restitution supérieur à 5 minutes et inférieur à 10 minutes entraînera une pénalité de 200 MAD. Tout retard supérieur à 10 minutes sera facturé comme une demi-heure de location supplémentaire.",
        ],
      },
      {
        num: '3',
        title: 'Obligations du client',
        intro: "Le client s'engage à :",
        bullets: [
          "Utiliser le jet-ski conformément à l'ensemble des lois et réglementations en vigueur.",
          "Porter un gilet de sauvetage en permanence.",
          "Respecter la limitation de vitesse de 5 nœuds dans le chenal de navigation.",
          "Naviguer exclusivement au-delà de la zone des 300 mètres à partir du rivage.",
          "Rester dans une zone visible depuis la base nautique.",
          "Respecter toutes les règles de sécurité et ne jamais conduire le jet-ski sous l'emprise de l'alcool ou de substances illicites.",
          "Rester à proximité du jet-ski en cas de panne.",
          "Restituer le jet-ski dans le même état que celui dans lequel il a été reçu, à l'exception de l'usure normale.",
          "Accorder la priorité aux embarcations non motorisées.",
        ],
      },
      {
        num: '4',
        title: 'Entretien et réparations',
        bullets: [
          "En cas de panne ou de dommage, le client doit immédiatement en informer le propriétaire.",
          "Tout dommage matériel causé au jet-ski entraînera une pénalité forfaitaire de 5 000 MAD.",
        ],
      },
      {
        num: '5',
        title: 'Clause de résiliation',
        intro: "Le propriétaire se réserve le droit de résilier le présent contrat si le client ne respecte pas les conditions générales de location. Dans ce cas, le contrat sera résilié sans qu'aucun remboursement ne puisse être réclamé.",
      },
      {
        num: '6',
        title: 'Litiges',
        intro: "Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis à la compétence du tribunal compétent du lieu de résidence du propriétaire.",
      },
    ],
    disclaimer: "Je soussigné(e) {{name}} reconnais avoir lu, compris et accepté les conditions du présent contrat de location.",
    fields: {
      contract: "N° Contrat", date: "Date", location: "Lieu",
      fullName: "Nom & Prénom", phone: "Tél", idCard: "Pièce d'identité",
      activity: "Activité", jetSki: "Jet Ski", duration: "Durée", price: "Tarif",
    },
  },

  // ─── ENGLISH ────────────────────────────────────────────────
  en: {
    dir: 'ltr',
    flag: '🇬🇧',
    langLabel: 'English',
    title: "PERSONAL WATERCRAFT RENTAL AGREEMENT",
    lesseeLabel: 'CUSTOMER',
    prestationLabel: 'SERVICE DETAILS',
    sections: [
      {
        num: '1',
        title: 'Purpose of the Agreement',
        intro: "The purpose of this agreement is the rental of a recreational personal watercraft (PWC), the details of which are set out in the description above.",
      },
      {
        num: '2',
        title: 'Liability and Insurance',
        bullets: [
          "Insurance covers third-party liability only. Any material or mechanical damage is the responsibility of the customer.",
          "The customer is responsible for any damage caused to the personal watercraft during the rental period.",
          "Failure to comply with maritime laws and regulations shall be the sole responsibility of the customer.",
          "The personal watercraft (PWC) is under the exclusive responsibility of the person who signs this agreement.",
          "The loss of the engine cut-off safety lanyard (kill switch lanyard) will result in a 500 MAD penalty.",
          "Any delay in returning the watercraft of more than 5 minutes and less than 10 minutes will result in a 200 MAD penalty. Any delay of more than 10 minutes will be charged as an additional half-hour rental.",
        ],
      },
      {
        num: '3',
        title: 'Customer Obligations',
        intro: "The customer agrees to:",
        bullets: [
          "Operate the personal watercraft in accordance with all applicable laws and regulations.",
          "Wear a life jacket at all times.",
          "Respect the speed limit of 5 nautical miles per hour within the navigation channel.",
          "Navigate strictly beyond the 300-meter zone from the shoreline.",
          "Remain within an area that is visible from the watersports base.",
          "Comply with all safety rules and never operate the watercraft while under the influence of alcohol or illegal substances.",
          "Remain with the personal watercraft in the event of a breakdown.",
          "Return the personal watercraft in the same condition in which it was received, except for normal wear and tear.",
          "Give priority to non-motorized vessels while on the water.",
        ],
      },
      {
        num: '4',
        title: 'Maintenance and Repairs',
        bullets: [
          "In the event of a breakdown or damage, the customer must immediately notify the owner.",
          "Any material damage to the personal watercraft will result in a fixed penalty of 5,000 MAD.",
        ],
      },
      {
        num: '5',
        title: 'Termination Clause',
        intro: "The owner reserves the right to terminate this agreement if the customer fails to comply with the rental terms and conditions. In such a case, the agreement shall be terminated without any right to a refund.",
      },
      {
        num: '6',
        title: 'Disputes',
        intro: "Any dispute relating to the interpretation or performance of this agreement shall be subject to the jurisdiction of the competent court at the owner's place of residence.",
      },
    ],
    disclaimer: "I the undersigned {{name}} acknowledge having read, understood and accepted all the terms and conditions of this rental agreement.",
    fields: {
      contract: "Contract N°", date: "Date", location: "Location",
      fullName: "Full Name", phone: "Phone", idCard: "ID Document",
      activity: "Activity", jetSki: "Jet Ski", duration: "Duration", price: "Price",
    },
  },

  // ─── ARABE ──────────────────────────────────────────────────
  ar: {
    dir: 'rtl',
    flag: '🇲🇦',
    langLabel: 'عربية',
    title: "عقد تأجير دراجة مائية",
    lesseeLabel: 'المستأجر',
    prestationLabel: 'تفاصيل الخدمة',
    sections: [
      {
        num: '١',
        title: 'موضوع العقد',
        intro: "يهدف هذا العقد إلى تأجير دراجة مائية ترفيهية (VNM)، وترد تفاصيلها في الوصف أعلاه.",
      },
      {
        num: '٢',
        title: 'المسؤولية والتأمين',
        bullets: [
          "يغطي التأمين المسؤولية المدنية فقط. أما الأضرار المادية والميكانيكية فتكون على نفقة العميل.",
          "يتحمل العميل المسؤولية الكاملة عن أي ضرر يلحق بالدراجة المائية خلال فترة الإيجار.",
          "يكون العميل مسؤولًا وحده عن أي مخالفة للقوانين والأنظمة البحرية المعمول بها.",
          "تكون الدراجة المائية (VNM) تحت المسؤولية الحصرية للشخص الموقّع على هذا العقد.",
          "في حالة فقدان سوار مفتاح إيقاف المحرك (سوار الأمان)، تُفرض غرامة قدرها 500 درهم مغربي.",
          "أي تأخير في إعادة الدراجة المائية يزيد عن 5 دقائق ويقل عن 10 دقائق يترتب عليه غرامة قدرها 200 درهم مغربي. أما إذا تجاوز التأخير 10 دقائق، فسيُحتسب كنصف ساعة إضافية.",
        ],
      },
      {
        num: '٣',
        title: 'التزامات العميل',
        intro: "يلتزم العميل بما يلي:",
        bullets: [
          "استخدام الدراجة المائية وفقًا للقوانين والأنظمة المعمول بها.",
          "ارتداء سترة النجاة في جميع الأوقات.",
          "احترام الحد الأقصى للسرعة وهو 5 أميال بحرية في الساعة داخل قناة الملاحة.",
          "الإبحار حصريًا خارج المنطقة الواقعة ضمن 300 متر من الشاطئ.",
          "الإبحار داخل منطقة تبقى مرئية من القاعدة البحرية.",
          "الالتزام بقواعد السلامة وعدم قيادة الدراجة المائية تحت تأثير الكحول أو أي مواد محظورة.",
          "البقاء بجانب الدراجة المائية في حالة حدوث عطل.",
          "إعادة الدراجة المائية بالحالة التي استلمها بها، باستثناء الاستهلاك العادي الناتج عن الاستخدام.",
          "احترام أولوية القوارب غير المزودة بمحركات في الماء.",
        ],
      },
      {
        num: '٤',
        title: 'الصيانة والإصلاحات',
        bullets: [
          "في حالة حدوث عطل أو أي ضرر، يجب على العميل إبلاغ المالك فورًا.",
          "أي ضرر مادي يلحق بالدراجة المائية يترتب عليه غرامة جزافية قدرها 5000 درهم مغربي.",
        ],
      },
      {
        num: '٥',
        title: 'بند فسخ العقد',
        intro: "يحتفظ المالك بحق فسخ هذا العقد حال عدم التزام العميل بشروط وأحكام الإيجار. ويتم فسخ العقد دون أي حق للعميل في استرداد المبلغ المدفوع.",
      },
      {
        num: '٦',
        title: 'النزاعات',
        intro: "أي نزاع يتعلق بتفسير أو تنفيذ هذا العقد يخضع لاختصاص المحكمة المختصة في مكان إقامة المالك.",
      },
    ],
    disclaimer: "أنا الموقع أدناه {{name}} أقر بأنني قرأت وفهمت وقبلت جميع شروط وأحكام عقد الإيجار هذا.",
    fields: {
      contract: "رقم العقد", date: "التاريخ", location: "الموقع",
      fullName: "الاسم الكامل", phone: "الهاتف", idCard: "وثيقة الهوية",
      activity: "النشاط", jetSki: "جت سكي", duration: "المدة", price: "السعر",
    },
  },
}

export const CONFIG = {
  businessName: "Effet Mer",
  company: "WAVELY MAROC SARLAU",
  address: "3 RUE BOUTRIKA 3EME ETAGE N°6",
  city: "MESNANA, TANGER",
  ice: "003907466000080",
  rc: "173707",
  email: "wavelymaroc@gmail.com",
  location: "Fnideq-M'diq — Plage Banyan Tree Tamuda Bay",
  currency: "DH",

  jetSkis: [
    { id: "FX1", name: "FX1", type: "FX" as const },
    { id: "FX2", name: "FX2", type: "FX" as const },
    { id: "FX3", name: "FX3", type: "FX" as const },
    { id: "VX4", name: "VX4", type: "VX" as const },
    { id: "VX5", name: "VX5", type: "VX" as const },
    { id: "VX6", name: "VX6", type: "VX" as const },
    { id: "VX7", name: "VX7", type: "VX" as const },
    { id: "VX9", name: "VX9", type: "VX" as const },
  ] as JetSkiConfig[],

  activities: [
    { id: "jet-vx-30",    name: "Jet Ski VX",         duration: "30 min", durationMinutes: 30,  price: 800,  requiresJetSki: true,  jetType: "VX" as const },
    { id: "jet-vx-60",    name: "Jet Ski VX",         duration: "1h00",   durationMinutes: 60,  price: 1400, requiresJetSki: true,  jetType: "VX" as const },
   { id: "jet-vx-90",  name: "Jet Ski VX", duration: "1h30", durationMinutes: 90,  price: 2200, requiresJetSki: true, jetType: "VX" as const },
{ id: "jet-vx-120", name: "Jet Ski VX", duration: "2h00", durationMinutes: 120, price: 2800, requiresJetSki: true, jetType: "VX" as const },
{ id: "jet-vx-150", name: "Jet Ski VX", duration: "2h30", durationMinutes: 150, price: 3600, requiresJetSki: true, jetType: "VX" as const },
{ id: "jet-vx-180", name: "Jet Ski VX", duration: "3h00", durationMinutes: 180, price: 4200, requiresJetSki: true, jetType: "VX" as const },
{ id: "jet-vx-210", name: "Jet Ski VX", duration: "3h30", durationMinutes: 210, price: 5000, requiresJetSki: true, jetType: "VX" as const },
{ id: "jet-vx-240", name: "Jet Ski VX", duration: "4h00", durationMinutes: 240, price: 5600, requiresJetSki: true, jetType: "VX" as const },
    { id: "jet-fx-30",    name: "Jet Ski FX",         duration: "30 min", durationMinutes: 30,  price: 1200, requiresJetSki: true,  jetType: "FX" as const },
    { id: "jet-fx-60",    name: "Jet Ski FX",         duration: "1h00",   durationMinutes: 60,  price: 2000, requiresJetSki: true,  jetType: "FX" as const },
    { id: "jet-fx-90",  name: "Jet Ski FX", duration: "1h30", durationMinutes: 90,  price: 3200, requiresJetSki: true, jetType: "FX" as const },
{ id: "jet-fx-120", name: "Jet Ski FX", duration: "2h00", durationMinutes: 120, price: 4000, requiresJetSki: true, jetType: "FX" as const },
{ id: "jet-fx-150", name: "Jet Ski FX", duration: "2h30", durationMinutes: 150, price: 5200, requiresJetSki: true, jetType: "FX" as const },
{ id: "jet-fx-180", name: "Jet Ski FX", duration: "3h00", durationMinutes: 180, price: 6000, requiresJetSki: true, jetType: "FX" as const },
{ id: "jet-fx-210", name: "Jet Ski FX", duration: "3h30", durationMinutes: 210, price: 7200, requiresJetSki: true, jetType: "FX" as const },
{ id: "jet-fx-240", name: "Jet Ski FX", duration: "4h00", durationMinutes: 240, price: 8000, requiresJetSki: true, jetType: "FX" as const },
    { id: "bouee-15",     name: "Bouée Tractée",      duration: "15 min", durationMinutes: 15,  price: 300,  requiresJetSki: false, hasSubtype: true },
    { id: "ski-15",       name: "Ski Nautique",       duration: "15 min", durationMinutes: 15,  price: 450,  requiresJetSki: false },
    { id: "ski-30",       name: "Ski Nautique",       duration: "30 min", durationMinutes: 30,  price: 800,  requiresJetSki: false },
    { id: "wake-15",      name: "Wakeboard",          duration: "15 min", durationMinutes: 15,  price: 450,  requiresJetSki: false },
    { id: "wake-30",      name: "Wakeboard",          duration: "30 min", durationMinutes: 30,  price: 800,  requiresJetSki: false },
    { id: "paddle-2h",    name: "Paddle",             duration: "2h00",   durationMinutes: 120, price: 300,  requiresJetSki: false },
    { id: "kayak-2h",     name: "Kayak",              duration: "2h00",   durationMinutes: 120, price: 300,  requiresJetSki: false },
    { id: "scooter-20",   name: "Scooter sous-marin", duration: "20 min", durationMinutes: 20,  price: 250,  requiresJetSki: false },
    { id: "scooter-40",   name: "Scooter sous-marin", duration: "40 min", durationMinutes: 40,  price: 600,  requiresJetSki: false },
  ] as ActivityConfig[],

  boueeSubtypes: ["Bouée", "Banane", "Air Stream", "Canapé"],
  paymentMethods: ["Espèces", "Carte bancaire", "Virement"],
}
