/**
 * NER Historical Environmental, Terrain & Hazard Reference Data
 * Grounded in India Meteorological Department (IMD) climatological normals
 * and Geological Survey of India (GSI) landslide hazard zonation maps for North East India.
 */

// Monthly normal rainfall (mm) for NER states (Jan=0 .. Dec=11) based on IMD 1981-2010 normals
const IMD_MONTHLY_NORMALS_MM = {
  // Assam (Guwahati, Brahmaputra valley)
  assam: [15, 28, 75, 180, 290, 430, 410, 340, 240, 110, 20, 10],
  // Meghalaya (Shillong, Sohra, Jaintia hills - one of the wettest regions in the world)
  meghalaya: [18, 35, 120, 280, 480, 780, 750, 620, 430, 190, 35, 12],
  // Arunachal Pradesh (High rainfall mountain zone)
  arunachal: [25, 45, 110, 220, 360, 560, 520, 430, 310, 140, 30, 18],
  // Nagaland (Kohima, Dimapur)
  nagaland: [16, 32, 70, 140, 240, 380, 370, 320, 210, 115, 25, 12],
  // Manipur (Imphal valley and surrounding hills)
  manipur: [14, 28, 65, 130, 210, 320, 310, 290, 190, 110, 25, 10],
  // Mizoram (Aizawl, steep shale hills)
  mizoram: [15, 30, 80, 170, 320, 460, 440, 410, 310, 160, 35, 12],
  // Tripura (Agartala)
  tripura: [12, 25, 60, 150, 280, 410, 390, 350, 240, 140, 30, 10],
  // Sikkim (Gangtok, Himalayan terrain)
  sikkim: [28, 55, 130, 240, 420, 610, 590, 510, 390, 160, 35, 18]
};

// Known high-risk landslide corridors in North East India (GSI landslide susceptibility zonation)
const LANDSLIDE_CORRIDORS = [
  // NH-6 / NH-27 Guwahati - Shillong - Jowai - Silchar corridor (steep Meghalaya plateau slopes)
  { name: 'Guwahati-Shillong Highway (Byrnihat-Umiam section)', minLat: 25.65, maxLat: 26.00, minLng: 91.75, maxLng: 91.95, riskWeight: 0.85 },
  { name: 'Shillong-Jowai-Silchar (NH-6 Meghalaya-Barak Valley)', minLat: 25.05, maxLat: 25.60, minLng: 92.10, maxLng: 92.75, riskWeight: 0.90 },
  // Dima Hasao hill section (Lumding-Haflong-Silchar)
  { name: 'Dima Hasao Hill Section (Haflong-Jatinga)', minLat: 25.00, maxLat: 25.40, minLng: 92.80, maxLng: 93.30, riskWeight: 0.88 },
  // Dimapur - Kohima - Senapati - Imphal (NH-29 / NH-2)
  { name: 'Dimapur-Kohima-Imphal corridor (Paglapahar / Zubza)', minLat: 25.50, maxLat: 25.85, minLng: 93.85, maxLng: 94.20, riskWeight: 0.86 },
  // Gangtok - Siliguri (NH-10 Teesta river gorge)
  { name: 'NH-10 Teesta Valley (Sikkim lifeline corridor)', minLat: 27.00, maxLat: 27.35, minLng: 88.40, maxLng: 88.65, riskWeight: 0.92 },
  // Itanagar / Tawang mountain passes
  { name: 'Balipara-Charduar-Tawang (BCT road / Sela Pass)', minLat: 27.20, maxLat: 27.65, minLng: 91.80, maxLng: 92.60, riskWeight: 0.89 },
  // Aizawl hill slopes
  { name: 'Aizawl-Lunglei highway hill slopes', minLat: 23.20, maxLat: 23.85, minLng: 92.60, maxLng: 92.85, riskWeight: 0.78 }
];

// Known recurring flood-prone zones (Brahmaputra & Barak River plains)
const FLOOD_PRONE_ZONES = [
  // Lower Brahmaputra Valley (Guwahati / Kamrup / Goalpara / Dhubri)
  { name: 'Lower Brahmaputra Floodplain', minLat: 26.00, maxLat: 26.35, minLng: 89.90, maxLng: 91.90, riskWeight: 0.80 },
  // Upper Brahmaputra (Jorhat, Kaziranga, Majuli, Lakhimpur, Dibrugarh)
  { name: 'Kaziranga-Bokakhat Brahmaputra Basin', minLat: 26.50, maxLat: 26.75, minLng: 93.10, maxLng: 93.70, riskWeight: 0.88 },
  { name: 'Dibrugarh-Dhemaji-Majuli riverine belt', minLat: 26.80, maxLat: 27.55, minLng: 94.10, maxLng: 95.10, riskWeight: 0.85 },
  // Barak Valley lowlands (Silchar, Karimganj, Hailakandi)
  { name: 'Barak Valley Lowland Basin', minLat: 24.60, maxLat: 24.95, minLng: 92.40, maxLng: 92.95, riskWeight: 0.82 }
];

// Terrain classification bounding areas
function classifyTerrain(lat, lng) {
  // Check if inside Meghalaya Plateau / Hills
  if (lat >= 25.1 && lat <= 25.8 && lng >= 90.0 && lng <= 92.8) {
    return { type: 'Hills & Escarpment', code: 'hills', slopeFactor: 0.85, baseElevation: 1200 };
  }
  // Sikkim / High Himalaya
  if (lat >= 27.1 && lat <= 28.0 && lng >= 88.2 && lng <= 89.0) {
    return { type: 'High Mountain Pass', code: 'mountains', slopeFactor: 0.95, baseElevation: 2100 };
  }
  // Arunachal Hills / Mountain Slopes
  if (lat >= 27.0 && lat <= 28.5 && lng >= 91.5 && lng <= 96.0) {
    return { type: 'Rugged Mountain Foothills', code: 'mountains', slopeFactor: 0.90, baseElevation: 1500 };
  }
  // Nagaland / Manipur Hills
  if (lat >= 24.0 && lat <= 26.8 && lng >= 93.5 && lng <= 95.0) {
    return { type: 'Folded Mountain Ridges', code: 'hills', slopeFactor: 0.80, baseElevation: 1100 };
  }
  // Brahmaputra Plains
  if (lat >= 26.0 && lat <= 27.5 && lng >= 90.0 && lng <= 95.5) {
    return { type: 'Alluvial River Plains', code: 'plains', slopeFactor: 0.15, baseElevation: 65 };
  }
  // Default plateau / undulating terrain
  return { type: 'Undulating Plateau', code: 'undulating', slopeFactor: 0.45, baseElevation: 350 };
}

function resolveState(lat, lng) {
  if (lat >= 27.0 && lng <= 89.0) return 'sikkim';
  if (lat >= 25.1 && lat <= 25.9 && lng >= 90.0 && lng <= 92.8) return 'meghalaya';
  if (lat >= 27.0 && lng >= 91.5) return 'arunachal';
  if (lat >= 25.4 && lat <= 27.0 && lng >= 93.5 && lng <= 95.3) return 'nagaland';
  if (lat >= 23.8 && lat <= 25.7 && lng >= 93.0 && lng <= 94.8) return 'manipur';
  if (lat >= 21.9 && lat <= 24.5 && lng >= 92.2 && lng <= 93.5) return 'mizoram';
  if (lat >= 23.0 && lat <= 24.6 && lng >= 91.1 && lng <= 92.4) return 'tripura';
  return 'assam';
}

function getMonthlyRainfallNorm(lat, lng, monthIndex = new Date().getMonth()) {
  const st = resolveState(lat, lng);
  const monthlyList = IMD_MONTHLY_NORMALS_MM[st] || IMD_MONTHLY_NORMALS_MM.assam;
  const monthNorm = monthlyList[monthIndex % 12];
  return {
    state: st.toUpperCase(),
    monthIndex,
    monthlyNormalMm: monthNorm,
    dailyExpectedMm: Number((monthNorm / 30).toFixed(1)),
    isMonsoonMonth: monthIndex >= 5 && monthIndex <= 8
  };
}

function checkLandslideVulnerability(lat, lng) {
  for (const c of LANDSLIDE_CORRIDORS) {
    if (lat >= c.minLat && lat <= c.maxLat && lng >= c.minLng && lng <= c.maxLng) {
      return { isProne: true, corridor: c.name, weight: c.riskWeight };
    }
  }
  const terrain = classifyTerrain(lat, lng);
  if (terrain.code === 'hills' || terrain.code === 'mountains') {
    return { isProne: true, corridor: `General ${terrain.type}`, weight: terrain.slopeFactor * 0.6 };
  }
  return { isProne: false, corridor: null, weight: 0.1 };
}

function checkFloodVulnerability(lat, lng) {
  for (const z of FLOOD_PRONE_ZONES) {
    if (lat >= z.minLat && lat <= z.maxLat && lng >= z.minLng && lng <= z.maxLng) {
      return { isProne: true, zone: z.name, weight: z.riskWeight };
    }
  }
  const terrain = classifyTerrain(lat, lng);
  if (terrain.code === 'plains') {
    return { isProne: true, zone: 'Low-Lying Riverine Plain', weight: 0.45 };
  }
  return { isProne: false, zone: null, weight: 0.1 };
}

/**
 * Historical traffic congestion probability curve (hour 0-23, dayOfWeek 0-6)
 */
function getHistoricalTrafficPattern(hour = new Date().getHours(), dayOfWeek = new Date().getDay()) {
  // Peak hours: 8-10 AM and 17-19 PM on weekdays
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
  let congestionScore = 20; // baseline 20%

  if (isWeekend) {
    if (hour >= 11 && hour <= 19) congestionScore = 45;
    else if (hour >= 7 && hour <= 10) congestionScore = 30;
    else congestionScore = 15;
  } else {
    // Weekday rush hours
    if (hour >= 8 && hour <= 10) congestionScore = 68;
    else if (hour >= 17 && hour <= 19) congestionScore = 72;
    else if (hour >= 11 && hour <= 16) congestionScore = 42;
    else if (hour >= 6 && hour <= 7) congestionScore = 30;
    else congestionScore = 12; // night
  }

  return {
    hour,
    dayOfWeek,
    isWeekend,
    congestionScore,
    trafficPeriod: (hour >= 8 && hour <= 10) ? 'Morning Peak' :
                   (hour >= 17 && hour <= 19) ? 'Evening Peak' :
                   (hour >= 21 || hour < 6) ? 'Night Off-Peak' : 'Day Regular'
  };
}

module.exports = {
  IMD_MONTHLY_NORMALS_MM,
  classifyTerrain,
  resolveState,
  getMonthlyRainfallNorm,
  checkLandslideVulnerability,
  checkFloodVulnerability,
  getHistoricalTrafficPattern
};
