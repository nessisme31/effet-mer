import { CONFIG, CONTRACT_TEXTS } from '../config'
import { Rental } from '../types'

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

export const openContractPDF = (rental: Rental): void => {
  const text = CONTRACT_TEXTS.fr
  const clientFullName = `${rental.client_firstname} ${rental.client_name}`
  const disclaimer = text.disclaimer.replace('{{name}}', clientFullName)
  const date = fmtDate(rental.created_at)

  const sectionsHTML = text.sections.map(section => `
    <div class="section">
      <div class="section-title">${section.num}. ${section.title}</div>
      ${section.intro ? `<p>${section.intro}</p>` : ''}
      ${section.bullets ? `<ul>${section.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat ${rental.contract_number} — ${clientFullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #222; max-width: 780px; margin: 0 auto; padding: 24px; }

    .print-bar {
      display: flex; gap: 12px; margin-bottom: 24px; align-items: center;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px;
    }
    .print-bar span { flex: 1; color: #1e40af; font-size: 13px; font-weight: 600; }
    .btn-print {
      background: #1d4ed8; color: white; border: none; padding: 10px 22px;
      border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600;
    }
    .btn-print:hover { background: #1e40af; }

    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; font-size: 11px; }
    }

    /* ── EN-TÊTE ── */
    .header { text-align: center; border-bottom: 2px solid #1d4ed8; padding-bottom: 14px; margin-bottom: 16px; }
    .header .brand { font-size: 18px; font-weight: bold; color: #1e3a8a; }
    .header .company-name { font-size: 12px; font-weight: 600; color: #374151; margin-top: 2px; }
    .header .info { font-size: 10px; color: #6b7280; margin-top: 2px; line-height: 1.5; }

    .contract-title {
      text-align: center; font-size: 12px; font-weight: bold;
      color: #1d4ed8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;
    }

    /* ── MÉTA ── */
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f9fafb; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
    .meta .col-2 { grid-column: 1 / -1; }
    .meta .lbl { font-size: 9px; color: #9ca3af; text-transform: uppercase; }
    .meta .val { font-size: 12px; font-weight: 600; color: #1f2937; }
    .meta .price { color: #1d4ed8; font-size: 14px; }

    /* ── BOXES ── */
    .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
    .box-title { font-size: 10px; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .col-2 { grid-column: 1 / -1; }
    .field .lbl { font-size: 9px; color: #9ca3af; text-transform: uppercase; }
    .field .val { font-size: 11px; font-weight: 600; color: #1f2937; }

    /* ── SECTIONS ── */
    .section { margin-bottom: 8px; }
    .section-title { font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 3px; }
    .section p { font-size: 10px; color: #4b5563; line-height: 1.4; }
    .section ul { padding-left: 14px; }
    .section ul li { font-size: 10px; color: #4b5563; line-height: 1.4; margin-bottom: 2px; }
    .disclaimer { font-style: italic; color: #6b7280; font-size: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; }

    /* ── SIGNATURE ── */
    .sig-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .sig-box .lbl { font-size: 10px; color: #9ca3af; margin-bottom: 8px; }
    .sig-box img { max-height: 90px; max-width: 280px; border: 1px solid #f3f4f6; border-radius: 4px; display: block; }
    .sig-box .name { font-size: 11px; font-weight: 600; color: #374151; margin-top: 6px; }

    /* ── PIED DE PAGE ── */
    .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #d1d5db; padding-top: 12px; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>

  <div class="print-bar">
    <span>📄 Contrat ${rental.contract_number} — ${clientFullName}</span>
    <button class="btn-print" onclick="window.print()">🖨️ Enregistrer en PDF</button>
  </div>

  <!-- EN-TÊTE SOCIÉTÉ -->
  <div class="header">
    <div class="brand">⚓ ${CONFIG.businessName}</div>
    <div class="company-name">${CONFIG.company}</div>
    <div class="info">${CONFIG.address} — ${CONFIG.city}</div>
    <div class="info">ICE : ${CONFIG.ice} &nbsp;|&nbsp; RC : ${CONFIG.rc}</div>
    <div class="info">${CONFIG.email}</div>
    <div class="info">${CONFIG.location}</div>
  </div>

  <div class="contract-title">${text.title}</div>

  <!-- RÉFÉRENCE -->
  <div class="meta">
    <div>
      <div class="lbl">N° Contrat</div>
      <div class="val">${rental.contract_number}</div>
    </div>
    <div>
      <div class="lbl">Date</div>
      <div class="val">${date}</div>
    </div>
    <div class="col-2">
      <div class="lbl">Lieu</div>
      <div class="val">${CONFIG.location}</div>
    </div>
  </div>

  <!-- CLIENT -->
  <div class="box">
    <div class="box-title">Locataire</div>
    <div class="grid-2">
      <div class="field">
        <div class="lbl">Nom &amp; Prénom</div>
        <div class="val">${clientFullName}</div>
      </div>
      <div class="field">
        <div class="lbl">Téléphone</div>
        <div class="val">${rental.client_phone}</div>
      </div>
      <div class="field col-2">
        <div class="lbl">Pièce d'identité</div>
        <div class="val">${rental.client_id_number || '—'}</div>
      </div>
      ${rental.villa_number ? `
      <div class="field col-2">
        <div class="lbl">🏠 N° de villa</div>
        <div class="val">${rental.villa_number}</div>
      </div>` : ''}
      ${rental.client_origin ? `
      <div class="field">
        <div class="lbl">Origine</div>
        <div class="val">${rental.client_origin === 'hotel' ? '🏨 Hôtel' : '🌍 Externe'}</div>
      </div>` : ''}
    </div>
  </div>

  <!-- PRESTATION -->
  <div class="box">
    <div class="box-title">Prestation louée</div>
    <div class="grid-2">
      <div class="field col-2">
        <div class="lbl">Activité</div>
        <div class="val">${rental.activity_name}${rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''}</div>
      </div>
      ${rental.jet_ski_id ? `
      <div class="field">
        <div class="lbl">Jet Ski</div>
        <div class="val">🚤 ${rental.jet_ski_id}</div>
      </div>` : ''}
      <div class="field">
        <div class="lbl">Durée</div>
        <div class="val">${rental.duration}</div>
      </div>
      <div class="field">
        <div class="lbl">Horaires</div>
        <div class="val">${fmtTime(rental.start_time)} → ${fmtTime(rental.end_time)}</div>
      </div>
      <div class="field">
        <div class="lbl">Tarif</div>
        <div class="val price">${rental.price.toLocaleString()} ${CONFIG.currency}</div>
      </div>
      <div class="field">
        <div class="lbl">Mode de paiement</div>
        <div class="val">${rental.payment_method}</div>
      </div>
    </div>
  </div>

  <!-- CONDITIONS -->
  <div class="box">
    <div class="box-title">Conditions générales de location</div>
    ${sectionsHTML}
    <div class="disclaimer">${disclaimer}</div>
  </div>

  <!-- SIGNATURE -->
  <div class="sig-box">
    <div class="lbl">✍️ Signature électronique du client</div>
    ${rental.signature ? `<img src="${rental.signature}" alt="Signature de ${clientFullName}" />` : '<p style="color:#9ca3af;font-size:10px;">Signature non disponible</p>'}
    <div class="name">${clientFullName} — ${date}</div>
  </div>

  <div class="footer">
    Document généré par ${CONFIG.businessName} (${CONFIG.company}) · ${CONFIG.location}
  </div>

  <!-- Auto-print au chargement de la page -->
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>

</body>
</html>`

  // Méthode 1 : ouvrir dans un nouvel onglet (préféré)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')

  if (win) {
    // Nettoyage de l'URL blob après chargement
    win.addEventListener('load', () => {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  } else {
    // Méthode 2 : si popup bloqué → téléchargement direct du fichier HTML
    const a = document.createElement('a')
    a.href = url
    a.download = `Contrat-${rental.contract_number}-${rental.client_firstname}-${rental.client_name}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    alert('💡 Le contrat a été téléchargé. Ouvrez le fichier dans votre navigateur puis faites Fichier → Imprimer → Enregistrer en PDF.')
  }
}
