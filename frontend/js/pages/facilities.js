// NER SmartLogix — Facilities page

import { state } from '../state.js';
import { t } from '../i18n.js';
import { snapToRoute, distanceAlongRoute, haversine, formatDistance } from '../geo.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

const TYPE_LABEL = {
  hospital: 'Hospital',
  lodging: 'Hotel / Lodge',
  gas_station: 'Petrol Pump',
  restaurant: 'Restaurant / Dhaba',
  pharmacy: 'Pharmacy',
  police: 'Police Station',
  parking: 'Parking',
  car_repair: 'Vehicle Repair',
  atm: 'ATM'
};

const TYPE_COLOR = {
  hospital: 'var(--red)',
  lodging: 'var(--orange)',
  gas_station: 'var(--teal)',
  restaurant: '#a78bfa',
  pharmacy: '#34d399',
  police: '#60a5fa',
  parking: '#94a3b8',
  car_repair: '#fbbf24',
  atm: '#6ee7b7'
};

export async function loadFacilitiesPage() {
  if (!state.origin || !state.destination || !state.selectedRoute) return;
  if (state.facilities.length > 0 && state._loadedRouteForFacilities === state.selectedRoute) return;
  
  state.loadingFacilities = true;
  state.facilitiesError = null;
  window.render();
  
  try {
    const coords = state.selectedRoute.geometry.coordinates;
    const sampleCount = Math.min(coords.length, 30);
    const step = Math.max(1, Math.floor(coords.length / sampleCount));
    const points = [];
    for (let i = 0; i < coords.length; i += step) points.push(coords[i]);
    if (points[points.length - 1] !== coords[coords.length - 1]) points.push(coords[coords.length - 1]);
    
    const aroundCoords = points.map(p => `${p[1]},${p[0]}`).join(',');
    const around = `(around:1000,${aroundCoords})`;
    const query = `[out:json][timeout:25];
(
  nwr["amenity"~"hospital|clinic"]${around};
  nwr["tourism"~"hotel|motel|guest_house"]${around};
  nwr["amenity"="fuel"]${around};
  nwr["amenity"~"restaurant|cafe|food_court"]${around};
  nwr["amenity"="police"]${around};
  nwr["shop"~"car_repair|motorcycle_repair"]${around};
  nwr["amenity"="pharmacy"]${around};
  nwr["amenity"="atm"]${around};
  nwr["amenity"="parking"]${around};
);
out center tags;`;

    const params = new URLSearchParams();
    params.append('data', query);
    
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: params,
      headers: { 'Accept': 'application/json' }
    });
    
    if (!res.ok) throw new Error('Overpass API error');
    const data = await res.json();
    
    const facilities = (data.elements || []).map(element => {
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;
      const tags = element.tags || {};
      if (!lat || !lon) return null;
      
      let type = 'unknown';
      if (tags.amenity === 'hospital' || tags.amenity === 'clinic') type = 'hospital';
      else if (tags.amenity === 'fuel') type = 'gas_station';
      else if (tags.tourism) type = 'lodging';
      else if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'food_court') type = 'restaurant';
      else if (tags.amenity === 'police') type = 'police';
      else if (tags.shop === 'car_repair' || tags.shop === 'motorcycle_repair') type = 'car_repair';
      else if (tags.amenity === 'pharmacy') type = 'pharmacy';
      else if (tags.amenity === 'atm') type = 'atm';
      else if (tags.amenity === 'parking') type = 'parking';
      
      const snap = snapToRoute(lat, lon, coords);
      const distToRoute = snap ? snap.distanceToRoute : Infinity;
      
      return {
        id: element.id,
        name: tags.name || TYPE_LABEL[type] || 'Facility',
        address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', '),
        coordinates: { lat, lng: lon },
        facilityType: type,
        distanceMeters: distToRoute // straight distance to nearest point on route
      };
    }).filter(f => f && f.distanceMeters <= 1500); // within 1.5km of road
    
    const seen = new Set();
    state.facilities = facilities.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);
    
    state._loadedRouteForFacilities = state.selectedRoute;
  } catch (err) {
    state.facilitiesError = "Facilities could not be loaded right now. Please try again.";
    state.facilities = [];
  }
  
  state.loadingFacilities = false;
  window.render();
}

export function renderFacilitiesPage() {
  const noRoute = !state.origin || !state.destination || !state.selectedRoute;
  
  // Apply category filter if one is selected
  const filterCat = state.facilityFilter || 'all';
  const displayFacilities = state.facilities.filter(f => filterCat === 'all' || f.facilityType === filterCat);

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Route-based facilities</div>
        <h2>${t('facilities.title')}</h2>
        <p class="desc">${t('facilities.subtitle')}</p>
      </div>
    </div>

    ${noRoute
      ? `<div class="empty">
           <div>
             <div style="font-size:38px;color:var(--teal)">?</div>
             <b>${t('facilities.noRoute')}</b>
             <button class="btn primary" style="margin-top:15px" onclick="go('Plan Trip')">Plan a Trip</button>
           </div>
         </div>`
      : state.loadingFacilities
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--teal)">?</div><b>${t('facilities.loading')}</b></div></div>`
      : state.facilitiesError
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--red)">?</div><b>${esc(state.facilitiesError)}</b></div></div>`
      : state.facilities.length === 0
      ? `<div class="empty"><div><b>${t('facilities.noResults')}</b></div></div>`
      : `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;align-items:center;">
          <select style="background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:13px;"
                  onchange="state.facilityFilter=this.value;window.render()">
            <option value="all" ${filterCat === 'all' ? 'selected' : ''}>All Categories</option>
            <option value="hospital" ${filterCat === 'hospital' ? 'selected' : ''}>Hospitals</option>
            <option value="gas_station" ${filterCat === 'gas_station' ? 'selected' : ''}>Petrol Pumps</option>
            <option value="lodging" ${filterCat === 'lodging' ? 'selected' : ''}>Hotels</option>
            <option value="restaurant" ${filterCat === 'restaurant' ? 'selected' : ''}>Restaurants</option>
            <option value="police" ${filterCat === 'police' ? 'selected' : ''}>Police</option>
            <option value="car_repair" ${filterCat === 'car_repair' ? 'selected' : ''}>Vehicle Repair</option>
            <option value="pharmacy" ${filterCat === 'pharmacy' ? 'selected' : ''}>Pharmacy</option>
            <option value="atm" ${filterCat === 'atm' ? 'selected' : ''}>ATM</option>
            <option value="parking" ${filterCat === 'parking' ? 'selected' : ''}>Parking</option>
          </select>
          <div style="color:var(--muted);font-size:13px;margin-left:auto;">
            Facilities along route: <b style="color:var(--text)">${esc(state.origin)} ? ${esc(state.destination)}</b>
            <span class="badge" style="margin-left:10px">${displayFacilities.length} found</span>
          </div>
        </div>

        <div class="facilities">
          ${displayFacilities.map((f, idx) => facilityCard(f, idx)).join('')}
        </div>`
    }
  </section>`;
}

function facilityCard(f, idx) {
  const label = TYPE_LABEL[f.facilityType] || f.facilityType || 'Facility';
  const color = TYPE_COLOR[f.facilityType] || 'var(--teal)';
  const distText = formatDistance(f.distanceMeters);

  return `
  <div class="facility" style="cursor:pointer" onclick="selectFacility('${f.id}')" title="View on map">
    <div class="row">
      <div style="flex:1;min-width:0">
        <b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.name)}</b>
        <div class="muted" style="margin-top:3px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.address || '')}</div>
      </div>
      <span class="badge" style="color:${color};flex-shrink:0;margin-left:8px">${esc(label)}</span>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;align-items:center;flex-wrap:wrap">
      ${distText ? `<span class="muted" style="font-size:11px">?? ${distText} off route</span>` : ''}
      <span class="badge info" style="margin-left:auto;cursor:pointer" onclick="event.stopPropagation();selectFacility('${f.id}')">View Map ?</span>
    </div>
  </div>`;
}

window.selectFacility = async (id) => {
  const facility = state.facilities.find(f => f.id === id || f.id == id);
  if (!facility || !facility.coordinates) return;
  state.selectedFacility = facility;
  const { go } = await import('../router.js');
  go('Live Network');
};
