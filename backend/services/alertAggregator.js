const axios = require('axios');
const Alert = require('../models/Alert');
const Parser = require('rss-parser');
const crypto = require('crypto');

const rssParser = new Parser({ timeout: 10000 });
const TRUSTED_NER_FEEDS = [
  { name: 'Indian Express North East', url: 'https://indianexpress.com/section/north-east-india/feed/' },
  { name: 'Times of Guwahati North East', url: 'https://timesofguwahati.com/rss/category/north-east-india-news' }
];

// NER state detection patterns
const NER_STATES = [
  { name: 'Assam', patterns: ['assam','guwahati','dispur','dibrugarh','jorhat','silchar','tezpur','nagaon','bongaigaon','sivasagar','golaghat','lakhimpur','dhubri','barpeta'] },
  { name: 'Arunachal Pradesh', patterns: ['arunachal','itanagar','pasighat','ziro','bomdila','tawang','naharlagun','tezu','roing'] },
  { name: 'Manipur', patterns: ['manipur','imphal','churachandpur','bishnupur','thoubal','senapati','ukhrul','chandel','jiribam'] },
  { name: 'Meghalaya', patterns: ['meghalaya','shillong','tura','jowai','nongstoin','nongpoh','williamnagar','baghmara','ri bhoi','east khasi','west khasi'] },
  { name: 'Mizoram', patterns: ['mizoram','aizawl','lunglei','champhai','kolasib','serchhip','lawngtlai','mamit','saiha'] },
  { name: 'Nagaland', patterns: ['nagaland','kohima','dimapur','mokokchung','tuensang','wokha','zunheboto','mon','phek','longleng'] },
  { name: 'Sikkim', patterns: ['sikkim','gangtok','namchi','gyalshing','mangan','singtam','rangpo','jorethang'] },
  { name: 'Tripura', patterns: ['tripura','agartala','dharmanagar','udaipur','kailasahar','belonia','ambassa','sabroom','gomati'] }
];

const ALERT_TYPE_PATTERNS = [
  { type: 'Landslide', patterns: ['landslide','land slide','mudslide','slope failure'] },
  { type: 'Flood', patterns: ['flood','flooding','inundation','waterlogging','flash flood'] },
  { type: 'Road Blockage', patterns: ['road block','roadblock','blocked road','road blocked'] },
  { type: 'Road Closure', patterns: ['road closure','route closure','closed to traffic','road closed'] },
  { type: 'Heavy Rainfall', patterns: ['heavy rain','heavy rainfall','red alert','orange alert','extreme rainfall','very heavy rain'] },
  { type: 'Bridge Damage', patterns: ['bridge damage','bridge collapse','bridge closure','bridge repair','bridge failure'] },
  { type: 'Traffic Disruption', patterns: ['traffic disruption','traffic jam','traffic congestion','traffic block'] },
  { type: 'Infrastructure Damage', patterns: ['infrastructure damage','road damage','highway damage','road repair'] }
];

const SEVERITY_PATTERNS = [
  { severity: 'CRITICAL', patterns: ['red alert','extreme','severe','emergency','critical','collapse','closed indefinitely'] },
  { severity: 'HIGH', patterns: ['orange alert','high alert','heavy rain','landslide','flood warning','bridge damage','road closure'] },
  { severity: 'MEDIUM', patterns: ['yellow alert','moderate','disruption','delay','blockage','road block'] },
  { severity: 'LOW', patterns: ['low','advisory','minor','watch','light rain'] }
];

function detectState(text) {
  const lower = text.toLowerCase();
  for (const s of NER_STATES) {
    if (s.patterns.some(p => lower.includes(p))) return s.name;
  }
  return null;
}

function detectAlertType(text) {
  const lower = text.toLowerCase();
  for (const at of ALERT_TYPE_PATTERNS) {
    if (at.patterns.some(p => lower.includes(p))) return at.type;
  }
  return 'Other';
}

function detectSeverity(text) {
  const lower = text.toLowerCase();
  for (const s of SEVERITY_PATTERNS) {
    if (s.patterns.some(p => lower.includes(p))) return s.severity;
  }
  return 'MEDIUM';
}

function calcPriorityScore(alert) {
  let score = 0;
  const severityMap = { CRITICAL: 100, HIGH: 70, MEDIUM: 40, LOW: 10 };
  score += severityMap[alert.severity] || 40;

  const typeBonus = {
    'Road Closure': 30, 'Bridge Damage': 30, 'Landslide': 25,
    'Flood': 25, 'Heavy Rainfall': 20, 'Road Blockage': 15,
    'Infrastructure Damage': 10, 'Traffic Disruption': 8
  };
  score += typeBonus[alert.alertType] || 0;

  // Recency bonus
  const hoursAgo = (Date.now() - new Date(alert.createdAt || Date.now()).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 6) score += 30;
  else if (hoursAgo < 24) score += 15;

  return score;
}

/**
 * Fetch alerts from IMD (India Meteorological Department).
 */
async function fetchIMDAlerts() {
  const alerts = [];
  try {
    const response = await axios.get(
      'https://mausam.imd.gov.in/backend/assets/warning_pdf_upload/warning_table.json',
      { timeout: 8000 }
    );
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(item => {
        const text = (item.heading || '') + ' ' + (item.description || '') + ' ' + (item.state || '');
        const state = detectState(text);
        if (!state) return;
        alerts.push({
          title: item.heading || 'IMD Weather Warning',
          description: item.description || '',
          location: item.district || item.state || state,
          district: item.district || '',
          state,
          severity: detectSeverity(text),
          alertType: detectAlertType(text),
          source: 'IMD (India Meteorological Department)',
          sourceUrl: 'https://mausam.imd.gov.in',
          status: 'active'
        });
      });
    }
  } catch (err) {
    console.warn('[Alerts] IMD feed unavailable:', err.message);
  }
  return alerts;
}

async function fetchTrustedNewsAlerts() {
  const alerts = [];
  for (const feed of TRUSTED_NER_FEEDS) {
    try {
      const result = await rssParser.parseURL(feed.url);
      for (const item of (result.items || []).slice(0, 30)) {
        const text = [item.title, item.contentSnippet, item.content, item.summary].filter(Boolean).join(' ');
        const state = detectState(text);
        const alertType = detectAlertType(text);
        if (!state || alertType === 'Other') continue;
        const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
        if (Date.now() - new Date(publishedAt).getTime() > 72 * 60 * 60 * 1000) continue;
        alerts.push({
          title: item.title || 'NER news alert',
          description: item.contentSnippet || item.content || '',
          location: state,
          district: '',
          state,
          severity: detectSeverity(text),
          alertType,
          source: feed.name,
          sourceUrl: item.link || feed.url,
          publishedAt: new Date(publishedAt),
          verificationLevel: 'reputable-report',
          status: 'active'
        });
      }
    } catch (err) {
      console.warn(`[Alerts] ${feed.name} feed unavailable:`, err.message);
    }
  }
  return alerts;
}

function fingerprint(alert) {
  const value = [alert.state, alert.alertType, alert.location, alert.title]
    .join('|').toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha1').update(value).digest('hex');
}

/**
 * Main aggregation: fetch from all external sources, normalize, rank, store top-20.
 */
exports.aggregate = async () => {
  console.log('[Alerts] Starting five-minute NER alert aggregation...');

  // Never present the old demo/sample records as current intelligence.
  await Alert.updateMany({ status: 'active', source: /^Sample Data/ }, { $set: { status: 'resolved', updatedAt: new Date() } });

  const imdAlerts = await fetchIMDAlerts();
  const newsAlerts = await fetchTrustedNewsAlerts();
  const allRaw = [...imdAlerts, ...newsAlerts];

  console.log(`[Alerts] Fetched ${allRaw.length} raw alerts from external sources.`);

  if (allRaw.length === 0) {
    console.warn('[Alerts] No verified external NER alerts retrieved. Existing alerts retained.');
    return;
  }

  // Score and deduplicate
  const seen = new Set();
  const scored = allRaw
    .map(a => ({ ...a, fingerprint: fingerprint(a), priorityScore: calcPriorityScore({ ...a, createdAt: new Date() }) }))
    .filter(a => {
      const key = a.fingerprint;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 20);

  const now = new Date();
  const previous = await Alert.find({ fingerprint: { $in: scored.map(a => a.fingerprint) } }).lean();
  const previousByFingerprint = new Map(previous.map(alert => [alert.fingerprint, alert]));
  for (const alert of scored) {
    const old = previousByFingerprint.get(alert.fingerprint);
    const changed = !old || old.severity !== alert.severity || old.description !== alert.description;
    const update = {
      ...alert,
      firstSeenAt: old?.firstSeenAt || now,
      lastSeenAt: now,
      lastChangedAt: changed ? now : (old.lastChangedAt || now),
      confirmationCount: (old?.confirmationCount || 0) + 1,
      changeType: !old ? 'NEW' : changed ? 'UPDATED' : 'UNCHANGED',
      updatedAt: now
    };
    await Alert.updateOne({ fingerprint: alert.fingerprint }, { $set: update, $setOnInsert: { createdAt: old?.createdAt || now } }, { upsert: true });
  }
  console.log(`[Alerts] Stored ${scored.length} current NER alerts; ${scored.filter(a => !previousByFingerprint.has(a.fingerprint)).length} new.`);
};

/**
 * Seed realistic NER sample alerts when external APIs return nothing.
 * Used ONLY when DB has zero active alerts. Clearly labeled as sample data.
 */
exports.seedSampleAlerts = async () => {
  const count = await Alert.countDocuments({ status: 'active' });
  if (count > 0) return;

  console.log('[Alerts] No active alerts in DB. Seeding NER sample alerts...');

  const samples = [
    {
      title: 'Cyclonic Circulation — Mizoram-Manipur Border',
      description: 'A cyclonic circulation over the Mizoram-Manipur border is likely to bring very heavy rainfall over the next 48 hours. NH54 (Jiribam-Imphal) corridor is potentially affected. Logistics operators advised to monitor conditions before departure.',
      location: 'Churachandpur', district: 'Churachandpur', state: 'Manipur',
      severity: 'CRITICAL', alertType: 'Heavy Rainfall',
      source: 'Sample Data (External API unavailable — see README for real data setup)',
      sourceUrl: 'https://mausam.imd.gov.in', priorityScore: 130, status: 'active'
    },
    {
      title: 'Landslide Alert — Manipur Hill Roads',
      description: 'Landslide risk is elevated on Manipur hill roads due to continuous heavy rainfall. NH37 (Imphal-Jiribam) section may face disruptions. Heavy vehicles advised alternate routing through Assam.',
      location: 'Senapati District', district: 'Senapati', state: 'Manipur',
      severity: 'HIGH', alertType: 'Landslide',
      source: 'Sample Data (External API unavailable)', sourceUrl: 'https://ndma.gov.in', priorityScore: 95, status: 'active'
    },
    {
      title: 'Flash Flood Warning — Tripura Low-lying Areas',
      description: 'Flash flood warning issued for low-lying areas of Tripura. Gomati and Gumti river basins are under watch. Trucks carrying perishables or time-sensitive cargo advised alternate routes via Sabroom-Agartala highway.',
      location: 'Gomati District', district: 'Gomati', state: 'Tripura',
      severity: 'HIGH', alertType: 'Flood',
      source: 'Sample Data (External API unavailable)', sourceUrl: 'https://ndma.gov.in', priorityScore: 93, status: 'active'
    },
    {
      title: 'Heavy Rainfall Warning — Assam Valley Districts',
      description: 'IMD has issued a heavy to very heavy rainfall warning for Assam valley districts including Kamrup, Cachar, and Nagaon. NH27 and NH715 corridors require caution. Expect surface waterlogging and reduced visibility.',
      location: 'Assam Valley', district: 'Kamrup', state: 'Assam',
      severity: 'HIGH', alertType: 'Heavy Rainfall',
      source: 'Sample Data (External API unavailable)', sourceUrl: 'https://mausam.imd.gov.in', priorityScore: 90, status: 'active'
    },
    {
      title: 'Road Closure — Nagaland NH29 (Dimapur-Kohima)',
      description: 'NH29 (Dimapur-Kohima National Highway) is temporarily closed for repair works near Chumoukedima. Traffic diverted via old state highway. Add 45-60 minutes to journey time. Heavy vehicles use designated diversion route.',
      location: 'Dimapur-Kohima Corridor', district: 'Dimapur', state: 'Nagaland',
      severity: 'HIGH', alertType: 'Road Closure',
      source: 'Sample Data (External API unavailable)', sourceUrl: '', priorityScore: 85, status: 'active'
    },
    {
      title: 'Road Blockage Reported — Guwahati-Shillong Highway',
      description: 'A road blockage has been reported on the Guwahati-Shillong highway (NH6) near Nongpoh due to ongoing construction activity. Expect delays of 1-2 hours. One-lane traffic in operation.',
      location: 'Nongpoh, Ri Bhoi', district: 'Ri Bhoi', state: 'Meghalaya',
      severity: 'MEDIUM', alertType: 'Road Blockage',
      source: 'Sample Data (External API unavailable)', sourceUrl: '', priorityScore: 70, status: 'active'
    },
    {
      title: 'Bridge Maintenance — Arunachal Pradesh NH415',
      description: 'Bridge maintenance work is in progress on NH415 in Papum Pare district. Heavy vehicles above 10 tonnes restricted. Single-lane traffic in operation. Expected completion in 72 hours.',
      location: 'Papum Pare District', district: 'Papum Pare', state: 'Arunachal Pradesh',
      severity: 'MEDIUM', alertType: 'Bridge Damage',
      source: 'Sample Data (External API unavailable)', sourceUrl: '', priorityScore: 65, status: 'active'
    },
    {
      title: 'Heavy Rain Advisory — Sikkim NH10 (Siliguri-Gangtok)',
      description: 'Heavy rain advisory for the NH10 Siliguri-Gangtok corridor. Risk of small landslides near Rangpo and Singtam sections. Refrigerated trucks and tankers advised to travel during daylight hours only.',
      location: 'East Sikkim', district: 'East Sikkim', state: 'Sikkim',
      severity: 'MEDIUM', alertType: 'Heavy Rainfall',
      source: 'Sample Data (External API unavailable)', sourceUrl: 'https://mausam.imd.gov.in', priorityScore: 60, status: 'active'
    },
    {
      title: 'Road Damage — Meghalaya East Khasi Hills',
      description: 'Road surface damage reported on several stretches in East Khasi Hills and Jaintia Hills districts due to recent heavy rainfall. Drive slowly and avoid night travel on hill sections. Potholes reported on Shillong-Jowai road.',
      location: 'East Khasi Hills', district: 'East Khasi Hills', state: 'Meghalaya',
      severity: 'MEDIUM', alertType: 'Infrastructure Damage',
      source: 'Sample Data (External API unavailable)', sourceUrl: '', priorityScore: 55, status: 'active'
    },
    {
      title: 'Traffic Congestion — Guwahati Entry Points',
      description: 'Heavy congestion reported at major Guwahati entry points (Amingaon Bridge and Saraighat Bridge) during morning hours due to increased freight movement. Logistics operators advised to plan departures after 10:00 AM or after 8:00 PM.',
      location: 'Guwahati', district: 'Kamrup Metro', state: 'Assam',
      severity: 'LOW', alertType: 'Traffic Disruption',
      source: 'Sample Data (External API unavailable)', sourceUrl: '', priorityScore: 25, status: 'active'
    }
  ];

  await Alert.insertMany(samples.map(a => ({ ...a, createdAt: new Date(), updatedAt: new Date() })));
  console.log('[Alerts] 10 sample NER alerts seeded successfully.');
};
