// NER SmartLogix — Help & Safety page

import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

// Verified Indian emergency numbers
const EMERGENCY_CONTACTS = [
  { icon: '🚨', label: 'National Emergency', number: '112', color: 'var(--red)' },
  { icon: '🏥', label: 'Ambulance', number: '108', color: 'var(--red)' },
  { icon: '🚒', label: 'Fire Brigade', number: '101', color: 'var(--orange)' },
  { icon: '👮', label: 'Police', number: '100', color: '#60a5fa' },
  { icon: '🛣️', label: 'NHAI Helpline', number: '1033', color: 'var(--teal)' },
  { icon: '🌊', label: 'NDMA Disaster', number: '1078', color: 'var(--orange)' },
  { icon: '🌧️', label: 'IMD Weather', number: '1800-180-1717', color: '#a78bfa' },
  { icon: '⛽', label: 'NE Fuel Emergency', number: '1800-233-3555', color: 'var(--teal)' }
];

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
      ${helpCard('✚', t('help.emergency'), t('help.emergencyDesc'), 'tel:112')}
      ${helpCard('◇', t('help.find'), t('help.findDesc'), null, "go('Facilities')")}
      ${helpCard('☎', t('help.contacts'), t('help.contactsDesc'), null, "document.getElementById('emergency-contacts-section').scrollIntoView({behavior:'smooth'})")}
      ${helpCard('↗', t('help.shareTrip'), t('help.shareTripDesc'), null, "shareTrip()")}
    </div>

    <!-- Emergency Contacts — Direct Call Buttons -->
    <div class="card" style="margin-top:20px" id="emergency-contacts-section">
      <h3 style="margin-bottom:20px">📞 ${t('help.emergencyContactsTitle') || 'Emergency Contacts — NER Region'}</h3>
      <div class="help-call-grid">
        ${EMERGENCY_CONTACTS.map(c => `
        <a href="tel:${esc(c.number)}" class="help-call-card" style="border-color:${c.color}33">
          <div style="font-size:24px;margin-bottom:8px">${c.icon}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${esc(c.label)}</div>
          <div style="font-size:20px;font-weight:700;color:${c.color};letter-spacing:1px">${esc(c.number)}</div>
          <div style="margin-top:10px" class="badge info">📞 Tap to Call</div>
        </a>`).join('')}
      </div>
    </div>

    <!-- Safety Checklist -->
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

    <!-- Logistics Safety Tips -->
    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:16px">🏔️ Logistics Safety Tips — NER Terrain</h3>
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
          <span>${esc(tip)}</span>
        </div>`).join('')}
      </div>
    </div>

  </section>`;
}

function helpCard(icon, title, text, telLink, action) {
  if (telLink) {
    return `
  <a href="${telLink}" class="help" style="display:block;text-decoration:none">
    <div style="color:var(--teal);font-size:28px;margin-bottom:10px">${icon}</div>
    <h3>${esc(title)}</h3>
    <p style="margin-top:8px;font-size:13px;color:var(--muted)">${esc(text)}</p>
    <div class="badge danger" style="margin-top:12px">📞 Call 112</div>
  </a>`;
  }
  return `
  <button class="help" onclick="${action}">
    <div style="color:var(--teal);font-size:28px;margin-bottom:10px">${icon}</div>
    <h3>${esc(title)}</h3>
    <p style="margin-top:8px;font-size:13px;color:var(--muted)">${esc(text)}</p>
  </button>`;
}

window.shareTrip = () => {
  if (navigator.share && window.state && window.state.selectedRoute) {
    navigator.share({
      title: 'NER SmartLogix — Live Trip',
      text: `I am travelling from ${window.state.origin} to ${window.state.destination} via ${window.state.selectedRoute.summary}. Track my journey on NER SmartLogix.`,
      url: window.location.href
    }).catch(() => {});
  } else {
    import('../render.js').then(m =>
      m.notify('Share your live location via WhatsApp or phone call to a trusted contact.', 'success')
    );
  }
};
