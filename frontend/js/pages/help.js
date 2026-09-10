// NER SmartLogix — Help & Safety page

import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export function renderHelpPage() {
  const checks = [
    t('help.check1'), t('help.check2'), t('help.check3'),
    t('help.check4'), t('help.check5'), t('help.check6')
  ];

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Logistics safety</div>
        <h2>${t('help.title')}</h2>
        <p class="desc">${t('help.subtitle')}</p>
      </div>
    </div>

    <div class="help-grid">
      ${helpCard('✚', t('help.emergency'), t('help.emergencyDesc'),
        "notify('Emergency: Call 112 (National), 1033 (NHAI Helpline)', 'success')")}
      ${helpCard('◇', t('help.find'), t('help.findDesc'), "go('Facilities')")}
      ${helpCard('☎', t('help.contacts'), t('help.contactsDesc'), 'showEmergencyContacts()')}
      ${helpCard('↗', t('help.shareTrip'), t('help.shareTripDesc'),
        "notify('Share your live location via WhatsApp or phone call to a trusted contact.', 'success')")}
    </div>

    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:16px">${t('help.checklist')}</h3>
      <div>
        ${checks.map(c => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #ffffff08;font-size:14px">
          <span style="color:var(--teal);font-size:16px">✓</span>
          <span>${esc(c)}</span>
        </div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:16px">Emergency Contacts — NER Region</h3>
      <div class="detail-grid">
        ${[
          ['🚨 National Emergency', '112'],
          ['🏥 Ambulance', '108'],
          ['🚒 Fire', '101'],
          ['👮 Police', '100'],
          ['🛣️ NHAI Helpline', '1033'],
          ['🌊 NDMA Helpline', '1078'],
          ['🌧️ IMD Weather', '1800-180-1717'],
          ['⛽ NE Fuel Emergency', '1800-233-3555']
        ].map(([label, num]) => `
        <div>
          <small>${label}</small>
          <strong style="display:block;margin-top:5px;color:var(--teal);font-size:18px">${num}</strong>
        </div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:16px">Logistics Safety Tips — NER Terrain</h3>
      <div>
        ${[
          '⛰️ On hill roads (Manipur, Arunachal, Sikkim): Reduce speed to 20-30 km/h and use low gear when descending.',
          '🌧️ During monsoon (June-September): Check IMD forecasts before departure. Avoid night travel in high landslide zones.',
          '🌉 Before crossing bridges: Verify weight limits. Several NER bridges restrict vehicles above 10 tonnes.',
          '⛽ Fuel planning: Fuel stations are sparse in Arunachal Pradesh and interior Nagaland. Always start with a full tank.',
          '📱 Communication: Cell coverage is weak on many NER mountain passes. Download offline maps before departing.',
          '⏰ Timing: Avoid rush hours at Guwahati (7-10 AM, 5-8 PM). NH29 Dimapur-Kohima best traversed before noon.',
          '🚛 Overloading: Heavy trucks above 16 tonnes face restrictions on several NER state highways. Carry permit documents.',
          '🌫️ Visibility: Fog is common in Sikkim and Meghalaya October-February. Use fog lights and maintain safe distances.'
        ].map(tip => `
        <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #ffffff08;font-size:13px;line-height:1.6">
          <span>${tip}</span>
        </div>`).join('')}
      </div>
    </div>

  </section>`;
}

function helpCard(icon, title, text, action) {
  return `
  <button class="help" onclick="${action}">
    <div style="color:var(--teal);font-size:28px;margin-bottom:10px">${icon}</div>
    <h3>${esc(title)}</h3>
    <p style="margin-top:8px;font-size:13px;color:var(--muted)">${esc(text)}</p>
  </button>`;
}

window.showEmergencyContacts = () => {
  import('../render.js').then(m =>
    m.notify('Emergency: 112 | Ambulance: 108 | NHAI: 1033 | NDMA: 1078', 'success')
  );
};
