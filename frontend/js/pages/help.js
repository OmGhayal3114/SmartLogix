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

  const contacts = [
    { emoji: '🚨', label: 'National Emergency', num: '112', color: 'var(--red)' },
    { emoji: '🏥', label: 'Ambulance', num: '108', color: 'var(--red)' },
    { emoji: '🚒', label: 'Fire Helpline', num: '101', color: 'var(--orange)' },
    { emoji: '👮', label: 'Police Support', num: '100', color: 'var(--blue)' },
    { emoji: '🛣️', label: 'NHAI Helpline', num: '1033', color: 'var(--teal)' },
    { emoji: '🌊', label: 'NDMA Helpline', num: '1078', color: 'var(--blue)' },
    { emoji: '🌧️', label: 'IMD Weather SOS', num: '1800-180-1717', color: 'var(--teal)' },
    { emoji: '⛽', label: 'NE Fuel Emergency', num: '1800-233-3555', color: 'var(--orange)' }
  ];

  return `
  <section class="content">

    <!-- Hero -->
    <div class="hero">
      <div class="hero-eyebrow">Logistics Safety & Support</div>
      <h1 class="hero-title">${t('help.title')}</h1>
      <p class="hero-sub">${t('help.subtitle')}</p>
      <div class="hero-actions">
        <button class="btn" style="background:#ef444415;border-color:#ef444440;color:var(--red);font-weight:700" onclick="notify('Emergency: Call 112 (National), 1033 (NHAI Helpline)', 'success')">🚨 Emergency: 112</button>
        <button class="btn" style="background:#34d39912;border-color:#34d39930;color:var(--green)" onclick="go('Facilities')">◇ Find Nearby Facilities →</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card" style="--stat-color:var(--red)">
        <div class="stat-icon">🚨</div>
        <div class="stat-value">112</div>
        <div class="stat-label">National SOS</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--teal)">
        <div class="stat-icon">🛣️</div>
        <div class="stat-value">1033</div>
        <div class="stat-label">NHAI Highway SOS</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">🌊</div>
        <div class="stat-value">1078</div>
        <div class="stat-label">Disaster Control</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--green)">
        <div class="stat-icon">🏥</div>
        <div class="stat-value">108</div>
        <div class="stat-label">Medical Transit</div>
      </div>
    </div>

    <div class="content-body">

      <!-- Quick Actions -->
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--teal)">Quick Actions</div>
          <h2>Emergency Protocols</h2>
        </div>
      </div>

      <div class="help-grid">
        ${helpCard('✚', t('help.emergency'), t('help.emergencyDesc'),
          "notify('Emergency: Call 112 (National), 1033 (NHAI Helpline)', 'success')",
          'var(--red)')}
        ${helpCard('◇', t('help.find'), t('help.findDesc'), "go('Facilities')", 'var(--teal)')}
        ${helpCard('☎', t('help.contacts'), t('help.contactsDesc'), 'showEmergencyContacts()', 'var(--orange)')}
        ${helpCard('↗', t('help.shareTrip'), t('help.shareTripDesc'),
          "notify('Share your live location via WhatsApp or phone call to a trusted contact.', 'success')",
          'var(--green)')}
      </div>

      <div class="divider"></div>

      <!-- Emergency Contacts Grid -->
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--orange)">Instant Helplines</div>
          <h2>NER Emergency Directory</h2>
        </div>
        <span class="badge warning">Tap any card to copy</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:28px">
        ${contacts.map(c => `
        <div class="card" style="padding:18px 20px;cursor:pointer;border-left:3px solid ${c.color}" onclick="navigator.clipboard?.writeText('${c.num}');notify('${c.num} copied to clipboard!','success')">
          <div style="font-size:24px;margin-bottom:8px">${c.emoji}</div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">${c.label}</div>
          <div style="font-size:22px;font-weight:800;color:${c.color};letter-spacing:-0.5px">${c.num}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px;display:flex;align-items:center;gap:4px"><span style="color:var(--teal)">📋</span> Tap to copy</div>
        </div>`).join('')}
      </div>

      <div class="divider"></div>

      <!-- Pre-trip Checklist -->
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--teal)">Safety Protocol</div>
          <h2>${t('help.checklist')}</h2>
        </div>
      </div>

      <div class="card" style="margin-bottom:28px">
        ${checks.map((c, i) => `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;${i > 0 ? 'border-top:1px solid #1e3a5f25' : ''};font-size:14px">
          <div style="width:26px;height:26px;background:#5eead412;border:1px solid #5eead430;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--teal);font-size:12px;font-weight:700">${i + 1}</div>
          <span style="line-height:1.6;color:var(--text)">${esc(c)}</span>
        </div>`).join('')}
      </div>

      <!-- Terrain Tips -->
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--orange)">Terrain Intelligence</div>
          <h2>NER Hill Driving Advisory</h2>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        ${[
          { tip: 'On hill roads (Manipur, Arunachal, Sikkim): Reduce speed to 20-30 km/h and use low gear when descending.', icon: '⛰️', color: 'var(--teal)' },
          { tip: 'During monsoon (June-September): Check IMD forecasts before departure. Avoid night travel in high landslide zones.', icon: '🌧️', color: 'var(--blue)' },
          { tip: 'Before crossing bridges: Verify weight limits. Several NER bridges restrict vehicles above 10 tonnes.', icon: '🌉', color: 'var(--orange)' },
          { tip: 'Fuel planning: Fuel stations are sparse in Arunachal Pradesh and interior Nagaland. Always start with a full tank.', icon: '⛽', color: 'var(--orange)' },
          { tip: 'Cell coverage is weak on many NER mountain passes. Download offline maps before departing.', icon: '📱', color: 'var(--muted)' },
          { tip: 'Avoid rush hours at Guwahati (7-10 AM, 5-8 PM). NH29 Dimapur-Kohima best traversed before noon.', icon: '⏰', color: 'var(--teal)' },
          { tip: 'Heavy trucks above 16 tonnes face restrictions on several NER state highways. Carry permit documents.', icon: '🚛', color: 'var(--red)' },
          { tip: 'Fog is common in Sikkim and Meghalaya October-February. Use fog lights and maintain safe distances.', icon: '🌫️', color: 'var(--muted)' }
        ].map(({ tip, icon, color }) => `
        <div class="card" style="padding:20px;border-left:3px solid ${color}">
          <div style="font-size:26px;margin-bottom:10px">${icon}</div>
          <div style="font-size:13px;color:var(--text);line-height:1.65">${tip}</div>
        </div>`).join('')}
      </div>

    </div>
  </section>`;
}

function helpCard(icon, title, text, action, color = 'var(--teal)') {
  return `
  <button class="help" onclick="${action}">
    <div class="help-icon" style="background:${color}12;border-color:${color}25;color:${color}">${icon}</div>
    <h3>${esc(title)}</h3>
    <p style="margin-top:8px;font-size:13px;color:var(--muted);line-height:1.6">${esc(text)}</p>
  </button>`;
}

window.showEmergencyContacts = () => {
  import('../render.js').then(m =>
    m.notify('Emergency: 112 | Ambulance: 108 | NHAI: 1033 | NDMA: 1078', 'success')
  );
};
