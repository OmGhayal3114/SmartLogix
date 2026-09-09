// NER SmartLogix — Clean Portal Style Home Page

import { state } from '../state.js';

export function renderHomePage() {
  const activeAlertsCount = state.top10Alerts.length || 10;

  return `
  <!-- Portal Hero Banner -->
  <div class="gov-hero-banner reveal">
    <div class="gov-hero-container">
      <div class="gov-eyebrow">
        <span>🇮🇳</span> North Eastern Region Logistics & Corridor Intelligence
      </div>
      <h1 class="gov-hero-title">
        Intelligent Logistics & Freight Navigation Across <br>
        <span>Northeast India</span>
      </h1>
      <p class="gov-hero-sub">
        Dedicated digital intelligence for commercial transport across the 8 North Eastern States (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura). Real-time landslide detection, weather-aware route scoring, bridge clearance telemetry, and verified highway amenities.
      </p>

      <div class="gov-hero-actions">
        <button class="btn primary" style="padding:11px 22px;font-size:13.5px" onclick="go('Plan Trip')">
          <span>⇄</span> Plan Journey / Calculate Route →
        </button>
        <button class="btn saffron" style="padding:11px 20px;font-size:13.5px" onclick="openSectionPopup('Alerts')">
          <span>⚠️</span> Active Hazard Alerts (${activeAlertsCount})
        </button>
        <button class="btn" style="padding:11px 20px;font-size:13.5px" onclick="go('Live Network')">
          <span>◎</span> Live Corridor Map
        </button>
        <button class="btn" style="padding:11px 18px;font-size:13.5px" onclick="openSectionPopup('Help & Safety')">
          <span>🚨</span> Emergency SOS (1033)
        </button>
      </div>
    </div>
  </div>

  <section class="content">

    <!-- Highway Statistics Banner -->
    <div class="gov-stats-grid reveal">
      <div class="gov-stat-card" style="border-top-color:var(--gov-blue)">
        <div style="font-size:20px;margin-bottom:6px">🛣️</div>
        <div class="gov-stat-num" data-count="12500">12,500+ KM</div>
        <div class="gov-stat-label">National Highways in NER</div>
      </div>
      <div class="gov-stat-card" style="border-top-color:var(--gov-saffron)">
        <div style="font-size:20px;margin-bottom:6px">🗺️</div>
        <div class="gov-stat-num" data-count="8">8 States</div>
        <div class="gov-stat-label">NER States Interconnected</div>
      </div>
      <div class="gov-stat-card" style="border-top-color:var(--red)">
        <div style="font-size:20px;margin-bottom:6px">⚠️</div>
        <div class="gov-stat-num" data-count="${activeAlertsCount}">${activeAlertsCount}</div>
        <div class="gov-stat-label">Active Monitored Hazards</div>
      </div>
      <div class="gov-stat-card" style="border-top-color:var(--green)">
        <div style="font-size:20px;margin-bottom:6px">⛽</div>
        <div class="gov-stat-num" data-count="350">350+</div>
        <div class="gov-stat-label">Verified Highway Amenities</div>
      </div>
    </div>

    <!-- Commercial Vehicle Fleet Showcase (Requirement #2) -->
    <div style="margin: 36px 0 20px" class="reveal">
      <div class="row">
        <div>
          <div class="gov-eyebrow">Real Transport Fleet</div>
          <h2 style="font-size:22px;font-weight:800;color:var(--gov-navy);margin-top:2px">
            Commercial Logistics Classes in Northeast India
          </h2>
          <p style="color:var(--text-muted);font-size:13px;margin-top:4px">
            Engineered routing, axle-weight limitations, and mountain suitability tailored for every commercial class.
          </p>
        </div>
      </div>

      <div class="gov-fleet-grid">

        <!-- Fleet 1: Heavy Mountain Truck -->
        <div class="gov-fleet-card">
          <div class="gov-fleet-img-wrap">
            <img src="/assets/vehicles/mountain-truck.jpg" alt="Heavy Multi-Axle Freight Truck in Meghalaya">
            <span class="gov-fleet-badge">Heavy Freight (16-25T)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">Multi-Axle Mountain Freight Carrier</div>
            <div class="gov-fleet-desc">
              Heavy-duty transport for industrial and bulk freight navigating NH27 Guwahati bypass and the steep Meghalaya plateau.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge info">NH27 Corridor</span>
              <span class="badge">Hill Climbing</span>
              <span class="badge success">Bridge Verified</span>
            </div>
            <button class="btn primary" style="width:100%" onclick="planWithVehicle('Heavy Truck')">
              Plan Route with Heavy Truck →
            </button>
          </div>
        </div>

        <!-- Fleet 2: Refrigerated Container -->
        <div class="gov-fleet-card">
          <div class="gov-fleet-img-wrap">
            <img src="/assets/vehicles/refrigerated-truck.jpg" alt="Cold Chain Transport crossing Brahmaputra Bridge">
            <span class="gov-fleet-badge">Cold Chain (14T)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">Refrigerated Perishable Express</div>
            <div class="gov-fleet-desc">
              Temperature-controlled transport for agricultural produce, fresh dairy, and medical goods traversing Brahmaputra river crossings.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge info">River Bridge Safe</span>
              <span class="badge">Cold Chain</span>
              <span class="badge success">Priority Transit</span>
            </div>
            <button class="btn primary" style="width:100%" onclick="planWithVehicle('Refrigerated Truck')">
              Plan Route with Reefer →
            </button>
          </div>
        </div>

        <!-- Fleet 3: Fuel Tanker -->
        <div class="gov-fleet-card">
          <div class="gov-fleet-img-wrap">
            <img src="/assets/vehicles/fuel-tanker.jpg" alt="Indian Oil Fuel Tanker in Nagaland">
            <span class="gov-fleet-badge">Petroleum (12,000L)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">Petroleum Mountain Tanker</div>
            <div class="gov-fleet-desc">
              Essential liquid fuel transport serving district retail outlets along NH29 (Dimapur-Kohima) and Manipur hill corridors.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge warning">Hazmat Safe</span>
              <span class="badge">NH29 Corridor</span>
              <span class="badge">Low Gear Advisory</span>
            </div>
            <button class="btn primary" style="width:100%" onclick="planWithVehicle('Tanker')">
              Plan Route with Tanker →
            </button>
          </div>
        </div>

        <!-- Fleet 4: Rugged Pickup -->
        <div class="gov-fleet-card">
          <div class="gov-fleet-img-wrap">
            <img src="/assets/vehicles/cargo-pickup.jpg" alt="Commercial Hill Pickup in Arunachal Pradesh">
            <span class="gov-fleet-badge">Commercial 4x4 (2.5T)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">All-Terrain 4x4 Hill Freighter</div>
            <div class="gov-fleet-desc">
              Rugged commercial pickup truck for high-altitude passes, border roads, and narrow distribution networks in Arunachal Pradesh and Sikkim.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge info">4x4 Agility</span>
              <span class="badge">Snow & Mud</span>
              <span class="badge success">Last Mile</span>
            </div>
            <button class="btn primary" style="width:100%" onclick="planWithVehicle('Pickup')">
              Plan Route with Pickup →
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Transporter & Driver Services Grid -->
    <div style="margin: 36px 0 20px" class="reveal">
      <div class="row">
        <div>
          <div class="gov-eyebrow">Portal Services</div>
          <h2 style="font-size:22px;font-weight:800;color:var(--gov-navy);margin-top:2px">
            Transporter & Driver Tools
          </h2>
          <p style="color:var(--text-muted);font-size:13px;margin-top:4px">
            Access any tool instantly as an interactive pop-up or as a full page.
          </p>
        </div>
      </div>

      <div class="grid two" style="margin-top:16px">

        <!-- Service 1 -->
        <div class="card" style="border-left:4px solid var(--gov-blue);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:24px">⇄</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--gov-navy)">
                Commercial Route Feasibility & Hazard Risk
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Commercial OSRM navigation calculating exact mileage, mountain road curvature, steep ascent warnings, and real-time hazard scores based on vehicle class.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" onclick="go('Plan Trip')">Open Plan Trip →</button>
            <button class="btn" onclick="openSectionPopup('Plan Trip')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Service 2 -->
        <div class="card" style="border-left:4px solid var(--red);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:24px">🚨</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--gov-navy)">
                Landslide & Weather Hazard Radar
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Live automated feed synchronized with IMD and NDMA for red/orange rainfall warnings, bridge washouts, and rockslide alerts across all 8 NER states.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" onclick="go('Alerts')">View Alerts Feed →</button>
            <button class="btn" onclick="openSectionPopup('Alerts')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Service 3 -->
        <div class="card" style="border-left:4px solid var(--teal);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:24px">◇</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--gov-navy)">
                National Highway Amenities & Fuel Locator
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Verified directory of 24/7 petrol pumps, heavy vehicle repair garages, hospitals, and rest stops along primary NER highway corridors.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" onclick="go('Facilities')">Locate Amenities →</button>
            <button class="btn" onclick="openSectionPopup('Facilities')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Service 4 -->
        <div class="card" style="border-left:4px solid var(--gov-saffron);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:24px">✚</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--gov-navy)">
                Emergency Driver SOS & Helplines (1033 / 112)
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Instant one-tap emergency numbers for breakdown assistance, medical transit, and highway patrol support across Assam, Meghalaya, Sikkim, and hill roads.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" onclick="go('Help & Safety')">Emergency Contacts →</button>
            <button class="btn" onclick="openSectionPopup('Help & Safety')">⚡ Quick Pop-up</button>
          </div>
        </div>

      </div>
    </div>

    <!-- Call to action card -->
    <div class="card reveal" style="border-top:3px solid var(--gov-saffron);padding:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;background:#ffffff;margin-top:32px">
      <div>
        <div style="font-size:18px;font-weight:800;color:var(--gov-navy)">
          Ready to plan a commercial journey across Northeast India?
        </div>
        <p style="font-size:12.5px;color:var(--text-muted);margin-top:4px;max-width:680px">
          Select your vehicle type, input origin and destination points, and inspect automated route risk scores before departure.
        </p>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn primary" onclick="go('Plan Trip')">Launch Route Planner →</button>
        <button class="btn" onclick="go('Help & Safety')">Safety Guidelines</button>
      </div>
    </div>

  </section>`;
}

window.planWithVehicle = (v) => {
  state.vehicleType = v;
  import('../router.js').then(m => m.go('Plan Trip'));
};