// NER SmartLogix — Home / Landing Page

import { state } from '../state.js';
import { t } from '../i18n.js';

export function renderHomePage() {
  const activeAlertsCount = state.top10Alerts.length || 10;
  
  return `
  <section class="content" style="padding-top:16px">
    
    <!-- Hero Section -->
    <div class="hero reveal">
      <div class="hero-badge">
        <span>◉</span> Official North East Logistics Intelligence
      </div>
      <h1 class="hero-title">
        Master the Mountain Roads of <br>
        <span class="gradient-text">Northeast India</span>
      </h1>
      <p class="hero-sub">
        Real-time landslide detection, weather-aware route scoring, bridge clearance telemetry, and verified highway amenities across Assam, Meghalaya, Arunachal Pradesh, Manipur, Nagaland, Mizoram, Sikkim & Tripura.
      </p>
      
      <div class="hero-cta-row">
        <button class="btn primary" style="padding:14px 26px;font-size:14px;font-weight:700" onclick="go('Plan Trip')">
          Plan Your Route →
        </button>
        <button class="btn" style="padding:14px 22px;font-size:14px" onclick="openSectionPopup('Alerts')">
          🚨 Active Alerts <span class="nav-count" style="margin-left:6px">${activeAlertsCount}</span>
        </button>
        <button class="btn" style="padding:14px 22px;font-size:14px" onclick="go('Live Network')">
          ◎ Regional Map View
        </button>
      </div>
    </div>

    <!-- Real-time Stats Grid -->
    <div class="stats-row reveal">
      <div class="stat-card" style="--stat-color:var(--teal)">
        <div class="stat-icon">🛣️</div>
        <div class="stat-value" data-count="8">8 States</div>
        <div class="stat-label">Full NER Corridor Coverage</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">⚠</div>
        <div class="stat-value" data-count="${activeAlertsCount}">${activeAlertsCount}</div>
        <div class="stat-label">Active Hazard Alerts</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--green)">
        <div class="stat-icon">✓</div>
        <div class="stat-value">99.8%</div>
        <div class="stat-label">Network Reliability</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--blue)">
        <div class="stat-icon">⛽</div>
        <div class="stat-value" data-count="350">350+</div>
        <div class="stat-label">Verified Highway Amenities</div>
      </div>
    </div>

    <!-- Vehicle Fleet Showcase Section (Requirement #2) -->
    <div style="margin: 44px 0 24px" class="reveal">
      <div class="row">
        <div>
          <div class="eyebrow">Real Transport Fleet</div>
          <h2 style="font-size:24px;font-weight:800;margin-top:4px">Built for Northeast India's Extreme Terrains</h2>
          <p class="desc">Engineered routing and hazard assessment tailored specifically to your commercial vehicle class.</p>
        </div>
      </div>

      <div class="fleet-grid">
        
        <!-- Heavy Mountain Truck -->
        <div class="fleet-card">
          <div class="fleet-img-wrap">
            <img src="/assets/vehicles/mountain-truck.jpg" alt="Heavy Mountain Freight Truck in Meghalaya">
            <span class="fleet-badge-floating">Up to 25 Tonnes</span>
          </div>
          <div class="fleet-body">
            <div class="fleet-name">Multi-Axle Mountain Freight</div>
            <div class="fleet-desc">Heavy-duty transport for industrial and bulk freight navigating NH27, Guwahati, and the steep Meghalaya plateau.</div>
            <div class="fleet-tags">
              <span class="fleet-tag">🏔 Hill Climbing</span>
              <span class="fleet-tag">🌉 Bridge Verified</span>
              <span class="fleet-tag">⚡ Heavy Truck</span>
            </div>
            <button class="btn primary" onclick="planWithVehicle('Heavy Truck')">
              Plan with Heavy Truck →
            </button>
          </div>
        </div>

        <!-- Refrigerated Truck -->
        <div class="fleet-card">
          <div class="fleet-img-wrap">
            <img src="/assets/vehicles/refrigerated-truck.jpg" alt="Delhi Guwahati Refrigerated Truck crossing Brahmaputra Bridge">
            <span class="fleet-badge-floating">Cold Chain 14T</span>
          </div>
          <div class="fleet-body">
            <div class="fleet-name">Refrigerated Express Carrier</div>
            <div class="fleet-desc">Temperature-monitored transport for perishable agricultural goods, dairy, and pharmaceuticals crossing Brahmaputra corridors.</div>
            <div class="fleet-tags">
              <span class="fleet-tag">❄️ Temp Controlled</span>
              <span class="fleet-tag">🌊 River Bridge Safe</span>
              <span class="fleet-tag">⏱ Priority Transit</span>
            </div>
            <button class="btn primary" onclick="planWithVehicle('Refrigerated Truck')">
              Plan with Refrigerated Truck →
            </button>
          </div>
        </div>

        <!-- Petroleum Fuel Tanker -->
        <div class="fleet-card">
          <div class="fleet-img-wrap">
            <img src="/assets/vehicles/fuel-tanker.jpg" alt="Petroleum Fuel Tanker in Nagaland">
            <span class="fleet-badge-floating">12,000 Litres</span>
          </div>
          <div class="fleet-body">
            <div class="fleet-name">Mountain Fuel Tanker</div>
            <div class="fleet-desc">Essential hazardous liquid supply lines serving remote fuel depots across NH29 Dimapur-Kohima and Manipur corridors.</div>
            <div class="fleet-tags">
              <span class="fleet-tag">⛽ Fuel Depots</span>
              <span class="fleet-tag">⚠ Hazmat Routing</span>
              <span class="fleet-tag">⛰ High Altitude</span>
            </div>
            <button class="btn primary" onclick="planWithVehicle('Tanker')">
              Plan with Tanker →
            </button>
          </div>
        </div>

        <!-- Rugged 4x4 Hill Pickup -->
        <div class="fleet-card">
          <div class="fleet-img-wrap">
            <img src="/assets/vehicles/cargo-pickup.jpg" alt="Commercial Hill Pickup in Arunachal Pradesh">
            <span class="fleet-badge-floating">2.5 Tonnes 4x4</span>
          </div>
          <div class="fleet-body">
            <div class="fleet-name">All-Terrain Hill Pickup</div>
            <div class="fleet-desc">Agile commercial cargo truck for narrow mountain roads, high-altitude passes, and remote border settlements in Arunachal.</div>
            <div class="fleet-tags">
              <span class="fleet-tag">🛻 4x4 Agility</span>
              <span class="fleet-tag">❄️ Snow & Mud</span>
              <span class="fleet-tag">📍 Rural Drops</span>
            </div>
            <button class="btn primary" onclick="planWithVehicle('Pickup')">
              Plan with Pickup →
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Core Features / Capabilities (Requirement #5: Pop up & Direct Links) -->
    <div style="margin: 44px 0 24px" class="reveal">
      <div class="row">
        <div>
          <div class="eyebrow">Interactive Platform Tools</div>
          <h2 style="font-size:24px;font-weight:800;margin-top:4px">Everything Drivers & Fleet Managers Need</h2>
          <p class="desc">Access any tool instantly as an interactive pop-up or a dedicated full-screen view.</p>
        </div>
      </div>

      <div class="grid two" style="margin-top:20px">
        
        <!-- Tool 1: Route Planning -->
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="font-size:28px;margin-bottom:10px">⇄</div>
            <h3 style="font-size:18px;font-weight:700">OSRM Mountain Navigation</h3>
            <p class="desc" style="margin-top:8px">
              Accurate highway distance, mountain curvature ETA, traffic conditions, and automatic danger zone detection for Indian logistics.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="btn primary" onclick="go('Plan Trip')">Open Plan Trip →</button>
            <button class="btn" onclick="openSectionPopup('Plan Trip')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Tool 2: Safety Alerts -->
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;border-left:4px solid var(--orange)">
          <div>
            <div style="font-size:28px;margin-bottom:10px">🚨</div>
            <h3 style="font-size:18px;font-weight:700">Real-Time Hazard & Weather Radar</h3>
            <p class="desc" style="margin-top:8px">
              Live updates on landslides, cloudbursts, bridge damage, and highway closures aggregated from IMD, NDMA, and ground telemetry.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="btn primary" onclick="go('Alerts')">View Alerts Feed →</button>
            <button class="btn" onclick="openSectionPopup('Alerts')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Tool 3: Highway Facilities -->
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="font-size:28px;margin-bottom:10px">◇</div>
            <h3 style="font-size:18px;font-weight:700">Corridor Facilities & Amenities</h3>
            <p class="desc" style="margin-top:8px">
              Locate 24/7 petrol pumps, certified truck repair garages, rest stop lodgings, and emergency hospitals along your route.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="btn primary" onclick="go('Facilities')">Find Facilities →</button>
            <button class="btn" onclick="openSectionPopup('Facilities')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Tool 4: Safety & SOS Helpline -->
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;border-left:4px solid var(--red)">
          <div>
            <div style="font-size:28px;margin-bottom:10px">✚</div>
            <h3 style="font-size:18px;font-weight:700">Driver SOS & Emergency Directory</h3>
            <p class="desc" style="margin-top:8px">
              Instant one-tap helplines for NHAI 1033, National Police 112, Disaster 1078, and terrain-tested hill driving safety protocols.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="btn primary" onclick="go('Help & Safety')">Emergency Contacts →</button>
            <button class="btn" onclick="openSectionPopup('Help & Safety')">⚡ Quick Pop-up</button>
          </div>
        </div>

      </div>
    </div>

    <!-- Quick action footer callout -->
    <div class="card reveal" style="margin-top:36px;background:linear-gradient(135deg,#f0fdfa,#eff6ff);border:1.5px solid var(--teal-border);padding:32px;text-align:center">
      <h2 style="font-size:22px;font-weight:800;color:var(--text)">Ready to calculate a safe route across the North East?</h2>
      <p style="color:var(--text-muted);max-width:540px;margin:8px auto 20px">
        Start by selecting your vehicle and entering origin and destination points.
      </p>
      <button class="btn primary" style="padding:14px 32px;font-size:15px;font-weight:700" onclick="go('Plan Trip')">
        Launch Route Calculator →
      </button>
    </div>

  </section>`;
}

window.planWithVehicle = (v) => {
  state.vehicleType = v;
  import('../router.js').then(m => m.go('Plan Trip'));
};