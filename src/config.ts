export interface ActivityConfig {
  id: string
  name: string
  duration: string
  durationMinutes: number
  price: number
  requiresJetSki: boolean
  jetType?: 'FX' | 'VX'
  hasSubtype?: boolean
  image?: string   // chemin dans /public (ex: /activities/jetski_FX.png)
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
    title: "CONTRAT DE LOCATION DE MATÉRIEL NAUTIQUE DE LOISIR",
    lesseeLabel: 'LOCATAIRE',
    prestationLabel: 'PRESTATION',
    sections: [
      {
        num: '1',
        title: 'Objet du contrat',
        intro: "Le présent contrat a pour objet la location de matériel nautique de loisir, incluant selon la réservation effectuée : véhicule nautique à moteur (VNM / jet-ski), kayak, paddle, bouées tractées (bouée, banane, air stream, canapé), ski nautique, wakeboard et scooter sous-marin. Les caractéristiques précises du matériel loué sont mentionnées dans la fiche de réservation annexée au présent contrat.",
      },
      {
        num: '2',
        title: 'Responsabilité et assurance',
        bullets: [
          "L'assurance souscrite par le loueur couvre uniquement la responsabilité civile envers les tiers. Tout dommage matériel ou mécanique demeure à la charge exclusive du client.",
          "Le client est pleinement responsable de tout dommage causé au matériel loué pendant toute la durée de la location.",
          "Le non-respect des lois et réglementations maritimes en vigueur engage la seule responsabilité du client.",
          "Le matériel loué est placé sous la responsabilité exclusive de la personne signataire du présent contrat, qui ne peut en déléguer l'usage qu'avec l'accord préalable du loueur.",
        ],
      },
      {
        num: '3',
        title: 'Dispositions spécifiques par type de matériel',
      },
      {
        num: '3.1',
        title: 'Véhicule nautique à moteur (VNM / jet-ski)',
        bullets: [
          "Le port du gilet de sauvetage est obligatoire en permanence.",
          "La navigation est autorisée exclusivement au-delà de la zone des 300 mètres à partir du rivage.",
          "La limite de vitesse de 5 nœuds doit être strictement respectée à l'intérieur du chenal de navigation.",
          "Le client doit rester à tout moment dans une zone visible depuis la base nautique.",
          "La perte du cordon de sécurité de coupure moteur (coupe-circuit) entraînera une pénalité de 500 MAD.",
          "Tout retard de restitution compris entre 5 et 10 minutes entraînera une pénalité de 200 MAD. Tout retard supérieur à 10 minutes sera facturé au tarif d'une demi-heure de location supplémentaire.",
          "Le VNM doit être restitué dans le même état qu'à la prise en charge, à l'exception de l'usure normale.",
        ],
      },
      {
        num: '3.2',
        title: 'Paddle (Stand-Up Paddleboard)',
        bullets: [
          "La navigation est autorisée dans la zone des 300 mètres à partir du rivage.",
          "Le port du gilet de sauvetage n'est pas obligatoire.",
          "Le matériel doit être restitué dans le même état qu'à la prise en charge.",
          "Le client doit respecter l'ensemble des consignes de sécurité communiquées par le loueur.",
          "Le client atteste sur l'honneur savoir nager et être en bonne condition physique et sanitaire.",
        ],
      },
      {
        num: '3.3',
        title: 'Kayak',
        bullets: [
          "La navigation est autorisée dans la zone des 300 mètres à partir du rivage.",
          "Le port du gilet de sauvetage n'est pas obligatoire, mais fortement recommandé.",
          "Le matériel doit être restitué dans le même état qu'à la prise en charge.",
          "Le client doit respecter l'ensemble des consignes de sécurité communiquées par le loueur.",
          "Le client atteste sur l'honneur savoir nager et être en bonne condition physique et sanitaire.",
        ],
      },
      {
        num: '3.4',
        title: 'Bouées tractées (bouée, banane, air stream, canapé)',
        bullets: [
          "Le client doit respecter l'ensemble des consignes de sécurité communiquées par le loueur avant le départ.",
          "Le client atteste sur l'honneur savoir nager et être en bonne condition physique et sanitaire.",
          "Décharge de responsabilité : Le loueur décline toute responsabilité en cas d'accident corporel résultant d'une mauvaise utilisation du matériel par le client ou d'un non-respect des consignes de sécurité. L'activité est pratiquée sous l'entière responsabilité du client.",
        ],
      },
      {
        num: '3.5',
        title: 'Ski nautique et Wakeboard',
        bullets: [
          "Le port du gilet de sauvetage est obligatoire en permanence.",
          "Le client doit respecter l'ensemble des consignes de sécurité communiquées par le loueur.",
          "Le matériel doit être restitué dans le même état qu'à la prise en charge.",
        ],
      },
      {
        num: '3.6',
        title: 'Scooter sous-marin',
        bullets: [
          "Le port du gilet de sauvetage n'est pas obligatoire pour cette activité.",
          "Le client doit respecter l'ensemble des consignes de sécurité communiquées par le loueur.",
          "Le matériel doit être restitué dans le même état qu'à la prise en charge.",
        ],
      },
      {
        num: '4',
        title: 'Obligations générales du client',
        intro: "Quel que soit le matériel loué, le client s'engage à :",
        bullets: [
          "Utiliser le matériel conformément à sa destination et aux lois et réglementations en vigueur.",
          "Respecter scrupuleusement toutes les consignes de sécurité communiquées par le loueur.",
          "Ne jamais utiliser le matériel sous l'influence de l'alcool ou de substances illicites.",
          "Céder la priorité aux embarcations non motorisées.",
          "Demeurer avec le matériel en cas de panne ou d'incident.",
          "Restituer le matériel loué dans le même état qu'à la prise en charge, à l'exception de l'usure normale.",
        ],
      },
      {
        num: '5',
        title: 'Entretien et dommages',
        bullets: [
          "En cas de panne, dommage ou incident, le client doit en informer immédiatement le loueur.",
          "Tout dommage matériel causé au matériel loué entraînera une pénalité forfaitaire de 5 000 MAD, sans préjudice de toute réparation supplémentaire si le coût réel des dommages excède ce montant.",
        ],
      },
      {
        num: '6',
        title: 'Clause de résiliation',
        intro: "Le loueur se réserve le droit de mettre fin au présent contrat de manière immédiate et sans mise en demeure préalable si le client ne respecte pas les termes et conditions de location. Dans ce cas, le contrat sera résilié sans qu'aucun remboursement ne soit dû au client.",
      },
      {
        num: '7',
        title: 'Règlement des litiges',
        intro: "Tout litige relatif à l'interprétation, à l'exécution ou à la résiliation du présent contrat sera soumis à la compétence exclusive du tribunal du lieu de résidence du loueur, après tentative de résolution amiable entre les parties.",
      },
    ],
    disclaimer: "En signant le présent contrat, le client {{name}} reconnaît avoir lu et accepté l'intégralité des conditions générales de location, et certifie l'exactitude des informations déclarées, notamment quant à son aptitude physique et sa capacité à nager, le cas échéant.",
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
    title: "CONTRACT FOR THE RENTAL OF RECREATIONAL WATER-SPORTS EQUIPMENT",
    lesseeLabel: 'CUSTOMER',
    prestationLabel: 'SERVICE DETAILS',
    sections: [
      {
        num: '1',
        title: 'Purpose of the Contract',
        intro: "The purpose of this contract is the rental of recreational water-sports equipment, including, according to the reservation made: personal watercraft (PWC / jet ski), kayak, paddleboard, towed inflatables (tube, banana, Air Stream, sofa), water skiing, wakeboarding and underwater scooter. The precise characteristics of the rented equipment are stated in the reservation form attached to this contract.",
      },
      {
        num: '2',
        title: 'Liability and Insurance',
        bullets: [
          "The insurance taken out by the lessor covers third-party civil liability only. Any material or mechanical damage shall remain the sole responsibility of the client.",
          "The client shall be fully responsible for any damage caused to the rented equipment throughout the rental period.",
          "Any failure to comply with the maritime laws and regulations in force shall be the sole responsibility of the client.",
          "The rented equipment is placed under the sole responsibility of the person signing this contract, who may delegate its use only with the lessor's prior consent.",
        ],
      },
      {
        num: '3',
        title: 'Specific Provisions by Type of Equipment',
      },
      {
        num: '3.1',
        title: 'Personal Watercraft (PWC / Jet Ski)',
        bullets: [
          "Wearing a life jacket is mandatory at all times.",
          "Navigation is authorized exclusively beyond the 300-metre zone from the shore.",
          "The speed limit of 5 knots must be strictly observed inside the navigation channel.",
          "The client must remain at all times within an area visible from the water-sports base.",
          "Loss of the engine cut-off safety lanyard (kill switch) shall result in a penalty of 500 MAD.",
          "Any return delay of between 5 and 10 minutes shall result in a penalty of 200 MAD. Any delay exceeding 10 minutes shall be charged at the rate of an additional half-hour of rental.",
          "The PWC must be returned in the same condition as when taken over, except for normal wear and tear.",
        ],
      },
      {
        num: '3.2',
        title: 'Paddleboard (Stand-Up Paddleboard)',
        bullets: [
          "Navigation is authorized within the 300-metre zone from the shore.",
          "Wearing a life jacket is not mandatory.",
          "The equipment must be returned in the same condition as when taken over.",
          "The client must comply with all safety instructions communicated by the lessor.",
          "The client solemnly declares that they know how to swim and are in good physical and medical condition.",
        ],
      },
      {
        num: '3.3',
        title: 'Kayak',
        bullets: [
          "Navigation is authorized within the 300-metre zone from the shore.",
          "Wearing a life jacket is not mandatory, but is strongly recommended.",
          "The equipment must be returned in the same condition as when taken over.",
          "The client must comply with all safety instructions communicated by the lessor.",
          "The client solemnly declares that they know how to swim and are in good physical and medical condition.",
        ],
      },
      {
        num: '3.4',
        title: 'Towed Inflatables (Tube, Banana, Air Stream, Sofa)',
        bullets: [
          "The client must comply with all safety instructions communicated by the lessor before departure.",
          "The client solemnly declares that they know how to swim and are in good physical and medical condition.",
          "Release of liability: The lessor disclaims all liability in the event of bodily injury resulting from improper use of the equipment by the client or failure to comply with the safety instructions. The activity is undertaken under the client's entire responsibility.",
        ],
      },
      {
        num: '3.5',
        title: 'Water Skiing and Wakeboarding',
        bullets: [
          "Wearing a life jacket is mandatory at all times.",
          "The client must comply with all safety instructions communicated by the lessor.",
          "The equipment must be returned in the same condition as when taken over.",
        ],
      },
      {
        num: '3.6',
        title: 'Underwater Scooter',
        bullets: [
          "Wearing a life jacket is not mandatory for this activity.",
          "The client must comply with all safety instructions communicated by the lessor.",
          "The equipment must be returned in the same condition as when taken over.",
        ],
      },
      {
        num: '4',
        title: 'General Obligations of the Client',
        intro: "Regardless of the equipment rented, the client undertakes to:",
        bullets: [
          "Use the equipment in accordance with its intended purpose and with the laws and regulations in force.",
          "Strictly comply with all safety instructions communicated by the lessor.",
          "Never use the equipment under the influence of alcohol or illicit substances.",
          "Give right of way to non-motorized vessels.",
          "Remain with the equipment in the event of a breakdown or incident.",
          "Return the rented equipment in the same condition as when taken over, except for normal wear and tear.",
        ],
      },
      {
        num: '5',
        title: 'Maintenance and Damage',
        bullets: [
          "In the event of a breakdown, damage or incident, the client must inform the lessor immediately.",
          "Any material damage caused to the rented equipment shall result in a fixed penalty of 5,000 MAD, without prejudice to any additional repair costs if the actual cost of the damage exceeds this amount.",
        ],
      },
      {
        num: '6',
        title: 'Termination Clause',
        intro: "The lessor reserves the right to terminate this contract immediately and without prior formal notice if the client fails to comply with the rental terms and conditions. In such case, the contract shall be terminated without any refund being due to the client.",
      },
      {
        num: '7',
        title: 'Dispute Resolution',
        intro: "Any dispute relating to the interpretation, performance or termination of this contract shall be subject to the exclusive jurisdiction of the court of the place of residence of the lessor, following an attempt at amicable resolution between the parties.",
      },
    ],
    disclaimer: "By signing this contract, the client {{name}} acknowledges having read and accepted all of the general rental terms and conditions, and certifies the accuracy of the information provided, particularly with regard to their physical fitness and ability to swim, where applicable.",
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
    title: "عقد تأجير معدات مائية ترفيهية",
    lesseeLabel: 'المستأجر',
    prestationLabel: 'تفاصيل الخدمة',
    sections: [
      {
        num: '١',
        title: 'موضوع العقد',
        intro: "يهدف هذا العقد إلى تأجير معدات مائية ترفيهية، تشمل وفق الحجز المُنجز: مركبة مائية بمحرك (VNM / جت سكي)، قارب كاياك، لوح الوقوف والتجديف، العوامات التي تُجرّ (عوامة، موزة، إير ستريم، أريكة)، التزلج على الماء، وايك بورد، وسكوتر تحت الماء. وترد الخصائص الدقيقة للمعدات المؤجرة في استمارة الحجز المرفقة بهذا العقد.",
      },
      {
        num: '٢',
        title: 'المسؤولية والتأمين',
        bullets: [
          "يغطي التأمين الذي أبرمه المؤجر المسؤولية المدنية تجاه الغير فقط. وتبقى كل أضرار مادية أو ميكانيكية على عاتق العميل وحده.",
          "يكون العميل مسؤولاً مسؤولية كاملة عن أي ضرر يلحق بالمعدات المؤجرة طوال مدة الإيجار.",
          "يتحمل العميل وحده مسؤولية عدم احترام القوانين والأنظمة البحرية السارية.",
          "توضع المعدات المؤجرة تحت المسؤولية الحصرية للشخص الموقّع على هذا العقد، ولا يجوز له تفويض استخدامها إلا بموافقة مسبقة من المؤجر.",
        ],
      },
      {
        num: '٣',
        title: 'أحكام خاصة حسب نوع المعدات',
      },
      {
        num: '٣.١',
        title: 'المركبة المائية بمحرك (VNM / جت سكي)',
        bullets: [
          "يجب ارتداء سترة النجاة بصورة مستمرة.",
          "لا يُسمح بالملاحة إلا خارج منطقة 300 متر من الشاطئ.",
          "يجب التقيد الصارم بحد السرعة البالغ 5 عقد داخل ممر الملاحة.",
          "يجب على العميل أن يبقى في جميع الأوقات داخل منطقة يمكن رؤيتها من القاعدة المائية.",
          "يترتب على فقدان حبل الأمان الخاص بقطع تشغيل المحرك (قاطع الدائرة) غرامة قدرها 500 MAD.",
          "يترتب على أي تأخير في إعادة المعدات يتراوح بين 5 و10 دقائق غرامة قدرها 200 MAD. وكل تأخير يتجاوز 10 دقائق يُحتسب بسعر نصف ساعة إضافية من الإيجار.",
          "يجب إعادة المركبة المائية بمحرك بالحالة نفسها التي كانت عليها عند تسلّمها، باستثناء الاستهلاك العادي.",
        ],
      },
      {
        num: '٣.٢',
        title: 'لوح الوقوف والتجديف (البادِل)',
        bullets: [
          "يُسمح بالملاحة داخل منطقة 300 متر من الشاطئ.",
          "لا يُشترط ارتداء سترة النجاة.",
          "يجب إعادة المعدات بالحالة نفسها التي كانت عليها عند تسلّمها.",
          "يجب على العميل احترام جميع تعليمات السلامة التي يبلّغها إليه المؤجر.",
          "يقرّ العميل شرفياً بأنه يعرف السباحة وأنه في حالة بدنية وصحية جيدة.",
        ],
      },
      {
        num: '٣.٣',
        title: 'الكاياك',
        bullets: [
          "يُسمح بالملاحة داخل منطقة 300 متر من الشاطئ.",
          "لا يُشترط ارتداء سترة النجاة، إلا أنه يُوصى بارتدائها بشدة.",
          "يجب إعادة المعدات بالحالة نفسها التي كانت عليها عند تسلّمها.",
          "يجب على العميل احترام جميع تعليمات السلامة التي يبلّغها إليه المؤجر.",
          "يقرّ العميل شرفياً بأنه يعرف السباحة وأنه في حالة بدنية وصحية جيدة.",
        ],
      },
      {
        num: '٣.٤',
        title: 'العوامات التي تُجرّ (عوامة، موزة، إير ستريم، أريكة)',
        bullets: [
          "يجب على العميل احترام جميع تعليمات السلامة التي يبلّغها إليه المؤجر قبل الانطلاق.",
          "يقرّ العميل شرفياً بأنه يعرف السباحة وأنه في حالة بدنية وصحية جيدة.",
          "إخلاء المسؤولية: يتنصل المؤجر من أي مسؤولية في حال وقوع حادث جسدي ناتج عن سوء استخدام العميل للمعدات أو عن عدم احترام تعليمات السلامة. ويُمارس النشاط تحت المسؤولية الكاملة للعميل.",
        ],
      },
      {
        num: '٣.٥',
        title: 'التزلج على الماء ووايك بورد',
        bullets: [
          "يجب ارتداء سترة النجاة بصورة مستمرة.",
          "يجب على العميل احترام جميع تعليمات السلامة التي يبلّغها إليه المؤجر.",
          "يجب إعادة المعدات بالحالة نفسها التي كانت عليها عند تسلّمها.",
        ],
      },
      {
        num: '٣.٦',
        title: 'السكوتر تحت الماء',
        bullets: [
          "لا يُشترط ارتداء سترة النجاة لهذا النشاط.",
          "يجب على العميل احترام جميع تعليمات السلامة التي يبلّغها إليه المؤجر.",
          "يجب إعادة المعدات بالحالة نفسها التي كانت عليها عند تسلّمها.",
        ],
      },
      {
        num: '٤',
        title: 'الالتزامات العامة للعميل',
        intro: "بغض النظر عن المعدات المؤجرة، يلتزم العميل بما يلي:",
        bullets: [
          "استخدام المعدات وفقاً للغرض المخصصة له، ووفقاً للقوانين والأنظمة السارية.",
          "التقيد بدقة بجميع تعليمات السلامة التي يبلّغها إليه المؤجر.",
          "عدم استخدام المعدات مطلقاً تحت تأثير الكحول أو المواد غير المشروعة.",
          "إعطاء الأولوية للقوارب غير المزودة بمحرك.",
          "البقاء مع المعدات في حال حدوث عطل أو واقعة.",
          "إعادة المعدات المؤجرة بالحالة نفسها التي كانت عليها عند تسلّمها، باستثناء الاستهلاك العادي.",
        ],
      },
      {
        num: '٥',
        title: 'الصيانة والأضرار',
        bullets: [
          "في حال حدوث عطل أو ضرر أو واقعة، يجب على العميل إبلاغ المؤجر فوراً.",
          "يترتب على أي ضرر مادي يلحق بالمعدات المؤجرة غرامة جزافية قدرها 5000 MAD، دون الإخلال بأي إصلاح إضافي إذا تجاوزت التكلفة الفعلية للأضرار هذا المبلغ.",
        ],
      },
      {
        num: '٦',
        title: 'شرط الفسخ',
        intro: "يحتفظ المؤجر بالحق في إنهاء هذا العقد فوراً ودون إعذار مسبق إذا لم يحترم العميل شروط وأحكام الإيجار. وفي هذه الحالة، يُفسخ العقد دون استحقاق أي مبلغ مسترد للعميل.",
      },
      {
        num: '٧',
        title: 'تسوية النزاعات',
        intro: "يُعرض أي نزاع يتعلق بتفسير هذا العقد أو تنفيذه أو فسخه على الاختصاص الحصري لمحكمة مكان إقامة المؤجر، وذلك بعد محاولة التوصل إلى حل ودي بين الطرفين.",
      },
    ],
    disclaimer: "بتوقيعه على هذا العقد، يقرّ العميل {{name}} بأنه قرأ وقبل جميع الشروط العامة للإيجار، ويشهد بصحة المعلومات المصرّح بها، ولا سيما ما يتعلق بلياقته البدنية وقدرته على السباحة، عند الاقتضاء.",
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
    { id: "jet-vx-30",  name: "Jet Ski VX", duration: "30 min", durationMinutes: 30,  price: 800,  requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-vx-60",  name: "Jet Ski VX", duration: "1h00",  durationMinutes: 60,  price: 1400, requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-vx-90",  name: "Jet Ski VX", duration: "1h30",  durationMinutes: 90,  price: 2200, requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-vx-120", name: "Jet Ski VX", duration: "2h00",  durationMinutes: 120, price: 2800, requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-vx-150", name: "Jet Ski VX", duration: "2h30",  durationMinutes: 150, price: 3600, requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-vx-180", name: "Jet Ski VX", duration: "3h00",  durationMinutes: 180, price: 4200, requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-vx-210", name: "Jet Ski VX", duration: "3h30",  durationMinutes: 210, price: 5000, requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-vx-240", name: "Jet Ski VX", duration: "4h00",  durationMinutes: 240, price: 5600, requiresJetSki: true, jetType: "VX" as const, image: "/activities/JetSki_VX.webp" },
    { id: "jet-fx-30",  name: "Jet Ski FX", duration: "30 min", durationMinutes: 30,  price: 1200, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "jet-fx-60",  name: "Jet Ski FX", duration: "1h00",  durationMinutes: 60,  price: 2000, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "jet-fx-90",  name: "Jet Ski FX", duration: "1h30",  durationMinutes: 90,  price: 3200, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "jet-fx-120", name: "Jet Ski FX", duration: "2h00",  durationMinutes: 120, price: 4000, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "jet-fx-150", name: "Jet Ski FX", duration: "2h30",  durationMinutes: 150, price: 5200, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "jet-fx-180", name: "Jet Ski FX", duration: "3h00",  durationMinutes: 180, price: 6000, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "jet-fx-210", name: "Jet Ski FX", duration: "3h30",  durationMinutes: 210, price: 7200, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "jet-fx-240", name: "Jet Ski FX", duration: "4h00",  durationMinutes: 240, price: 8000, requiresJetSki: true, jetType: "FX" as const, image: "/activities/jetski_FX.png" },
    { id: "bouee-15",   name: "Bouée Tractée", duration: "15 min", durationMinutes: 15, price: 300, requiresJetSki: false, hasSubtype: true, image: "/activities/bouee.png" },
    { id: "ski-15",     name: "Ski Nautique",  duration: "15 min", durationMinutes: 15, price: 450, requiresJetSki: false, image: "/activities/Ski_Nautique.png" },
    { id: "ski-30",     name: "Ski Nautique",  duration: "30 min", durationMinutes: 30, price: 800, requiresJetSki: false, image: "/activities/Ski_Nautique.png" },
    { id: "wake-15",    name: "Wakeboard",     duration: "15 min", durationMinutes: 15, price: 450, requiresJetSki: false, image: "/activities/Wakeboard.png" },
    { id: "wake-30",    name: "Wakeboard",     duration: "30 min", durationMinutes: 30, price: 800, requiresJetSki: false, image: "/activities/Wakeboard.png" },
    { id: "paddle-1h",  name: "Paddle",        duration: "1h00",   durationMinutes: 60,  price: 200, requiresJetSki: false, image: "/activities/paddle.png" },
    { id: "paddle-2h",  name: "Paddle",        duration: "2h00",   durationMinutes: 120, price: 300, requiresJetSki: false, image: "/activities/paddle.png" },
    { id: "kayak-1h",   name: "Kayak",         duration: "1h00",   durationMinutes: 60,  price: 200, requiresJetSki: false, image: "/activities/Kayak.png" },
    { id: "kayak-2h",   name: "Kayak",         duration: "2h00",   durationMinutes: 120, price: 300, requiresJetSki: false, image: "/activities/Kayak.png" },
    { id: "scooter-20", name: "Scooter sous-marin", duration: "20 min", durationMinutes: 20, price: 350, requiresJetSki: false, image: "/activities/Scootersousmarin.png" },
    { id: "scooter-40", name: "Scooter sous-marin", duration: "40 min", durationMinutes: 40, price: 600, requiresJetSki: false, image: "/activities/Scootersousmarin.png" },
  ] as ActivityConfig[],

  // Images des sous-types de bouées
  boueeSubtypeImages: {
    'Bouée':      '/activities/bouee.png',
    'Banane':     '/activities/banane.png',
    'Air Stream': '/activities/AirStream.png',
    'Canapé':     '/activities/Canape.png',
  } as Record<string, string>,

  boueeSubtypes: ["Bouée", "Banane", "Air Stream", "Canapé"],
  paymentMethods: ["Espèces", "Carte bancaire", "Virement"],
}
