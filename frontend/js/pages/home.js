// NER SmartLogix — Clean Portal Style Home Page

import { state } from '../state.js';

export function renderHomePage() {
  const activeAlertsCount = state.top10Alerts.length || 10;

  return `
  <!-- ULIP-Inspired Hero Sliding Carousel -->
  <div class="ulip-slider-wrap reveal" id="ulip-hero-slider">
    <div class="ulip-slider-viewport">
      <div class="ulip-slides-track" id="ulip-track">

        <!-- Slide 1: Multi-Axle Mountain Freight Carrier -->
        <div class="ulip-slide">
          <img class="ulip-slide-bg" src="/assets/vehicles/mountain-truck.jpg" alt="Heavy Mountain Freight Carrier in Meghalaya" />
          <div class="ulip-slide-overlay"></div>
          <div class="ulip-slide-content">
            <div class="ulip-slide-badge">
              <span>🇮🇳</span> NH27 & NH29 Mountain Freight Corridor
            </div>
            <h2 class="ulip-slide-title">
              Commercial Mountain Logistics & <span>Slope Risk Telemetry</span>
            </h2>
            <p class="ulip-slide-desc">
              Engineered route feasibility for multi-axle freight carriers traversing Meghalaya hill passes, Assam valley trunk routes, and high-gradient curves with real-time landslide warnings.
            </p>
            <div class="ulip-slide-actions">
              <button class="btn saffron" style="padding:11px 22px;font-size:13.5px;font-weight:800" onclick="go('Plan Trip')">
                ⇄ Plan Freight Journey →
              </button>
              <button class="btn" style="padding:11px 20px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="openSectionPopup('Alerts')">
                ⚠️ Active Hazards (${activeAlertsCount})
              </button>
              <button class="btn" style="padding:11px 18px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="go('Live Network')">
                ◎ Live Corridor Map
              </button>
            </div>
          </div>
        </div>

        <!-- Slide 2: Refrigerated Perishable Express -->
        <div class="ulip-slide">
          <img class="ulip-slide-bg" src="/assets/vehicles/refrigerated-truck.jpg" alt="Refrigerated Cold Chain Truck on Brahmaputra River Bridge" />
          <div class="ulip-slide-overlay"></div>
          <div class="ulip-slide-content">
            <div class="ulip-slide-badge">
              <span>❄️</span> Brahmaputra Cold Chain & River Bridges
            </div>
            <h2 class="ulip-slide-title">
              Temperature-Controlled Transit & <span>Bridge Clearance</span>
            </h2>
            <p class="ulip-slide-desc">
              Priority corridors for agricultural produce, fresh tea shipments, and essential medical supplies crossing Bogibeel and Saraighat river crossings with verified weight limitations.
            </p>
            <div class="ulip-slide-actions">
              <button class="btn saffron" style="padding:11px 22px;font-size:13.5px;font-weight:800" onclick="planWithVehicle('Refrigerated Truck')">
                ⇄ Plan Reefer Route →
              </button>
              <button class="btn" style="padding:11px 20px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="openSectionPopup('Facilities')">
                ◇ Verified Highway Amenities
              </button>
              <button class="btn" style="padding:11px 18px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="go('Plan Trip')">
                Route Feasibility
              </button>
            </div>
          </div>
        </div>

        <!-- Slide 3: Petroleum Mountain Tanker -->
        <div class="ulip-slide">
          <img class="ulip-slide-bg" src="/assets/vehicles/fuel-tanker.jpg" alt="Indian Oil Fuel Tanker navigating Nagaland Highway" />
          <div class="ulip-slide-overlay"></div>
          <div class="ulip-slide-content">
            <div class="ulip-slide-badge">
              <span>⛽</span> Essential Petroleum & Hazmat Fleet
            </div>
            <h2 class="ulip-slide-title">
              Fuel Supply Chain & <span>Hazard Mitigation Radar</span>
            </h2>
            <p class="ulip-slide-desc">
              Ensuring uninterrupted energy supply across Dimapur-Kohima-Imphal national corridors with automated steep-gradient caution advisories and breakdown response.
            </p>
            <div class="ulip-slide-actions">
              <button class="btn saffron" style="padding:11px 22px;font-size:13.5px;font-weight:800" onclick="planWithVehicle('Tanker')">
                ⇄ Tanker Route Feasibility →
              </button>
              <button class="btn" style="padding:11px 20px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="openSectionPopup('Help & Safety')">
                🚨 Emergency Driver SOS (1033)
              </button>
              <button class="btn" style="padding:11px 18px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="go('Live Network')">
                Corridor Telemetry
              </button>
            </div>
          </div>
        </div>

        <!-- Slide 4: All-Terrain 4x4 Hill Freighter -->
        <div class="ulip-slide">
          <img class="ulip-slide-bg" src="/assets/vehicles/cargo-pickup.jpg" alt="Commercial 4x4 Cargo Pickup in Arunachal Pradesh" />
          <div class="ulip-slide-overlay"></div>
          <div class="ulip-slide-content">
            <div class="ulip-slide-badge">
              <span>🏔️</span> Frontier & Last-Mile Connectivity
            </div>
            <h2 class="ulip-slide-title">
              High-Altitude 4x4 Logistics for <span>Arunachal & Sikkim</span>
            </h2>
            <p class="ulip-slide-desc">
              Rugged all-weather commercial routing through Sela Pass, Tawang, and border district routes with continuous cloudburst monitoring and unpaved terrain warnings.
            </p>
            <div class="ulip-slide-actions">
              <button class="btn saffron" style="padding:11px 22px;font-size:13.5px;font-weight:800" onclick="planWithVehicle('Pickup')">
                ⇄ Plan 4x4 Hill Journey →
              </button>
              <button class="btn" style="padding:11px 20px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="go('Plan Trip')">
                Interactive Route Scoring
              </button>
              <button class="btn" style="padding:11px 18px;font-size:13.5px;background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.4)" onclick="openSectionPopup('Alerts')">
                Landslide Warnings
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Navigation Arrows -->
      <button class="ulip-nav-arrow ulip-arrow-prev" onclick="prevUlipSlide()" aria-label="Previous Slide">‹</button>
      <button class="ulip-nav-arrow ulip-arrow-next" onclick="nextUlipSlide()" aria-label="Next Slide">›</button>

      <!-- Slide Indicator Dots -->
      <div class="ulip-dots-wrap">
        <div class="ulip-dot active" onclick="setUlipSlide(0)" title="Slide 1: Mountain Freight"></div>
        <div class="ulip-dot" onclick="setUlipSlide(1)" title="Slide 2: Cold Chain"></div>
        <div class="ulip-dot" onclick="setUlipSlide(2)" title="Slide 3: Petroleum Tanker"></div>
        <div class="ulip-dot" onclick="setUlipSlide(3)" title="Slide 4: 4x4 Hill Logistics"></div>
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

// ─── ULIP SLIDER INTERACTION LOGIC ──────────────────────────────────────────
let currentUlipSlide = 0;
let ulipAutoTimer = null;
const ULIP_SLIDE_COUNT = 4;

export function setUlipSlide(idx) {
  const track = document.getElementById('ulip-track');
  const dots = document.querySelectorAll('.ulip-dot');
  if (!track) return;
  currentUlipSlide = (idx + ULIP_SLIDE_COUNT) % ULIP_SLIDE_COUNT;
  track.style.transform = `translateX(-${currentUlipSlide * 100}%)`;
  dots.forEach((d, i) => {
    if (i === currentUlipSlide) d.classList.add('active');
    else d.classList.remove('active');
  });
}

export function nextUlipSlide() {
  setUlipSlide(currentUlipSlide + 1);
}

export function prevUlipSlide() {
  setUlipSlide(currentUlipSlide - 1);
}

export function initUlipSlider() {
  if (ulipAutoTimer) {
    clearInterval(ulipAutoTimer);
    ulipAutoTimer = null;
  }
  const slider = document.getElementById('ulip-hero-slider');
  if (!slider) return;

  setUlipSlide(currentUlipSlide || 0);

  // Auto-advance every 5.5 seconds
  ulipAutoTimer = setInterval(() => {
    nextUlipSlide();
  }, 5500);

  // Pause on hover
  if (!slider.dataset.sliderListeners) {
    slider.dataset.sliderListeners = '1';
    slider.addEventListener('mouseenter', () => {
      if (ulipAutoTimer) {
        clearInterval(ulipAutoTimer);
        ulipAutoTimer = null;
      }
    });
    slider.addEventListener('mouseleave', () => {
      if (ulipAutoTimer) clearInterval(ulipAutoTimer);
      ulipAutoTimer = setInterval(() => {
        nextUlipSlide();
      }, 5500);
    });
  }
}

window.setUlipSlide = setUlipSlide;
window.nextUlipSlide = nextUlipSlide;
window.prevUlipSlide = prevUlipSlide;
window.initUlipSlider = initUlipSlider;

window.planWithVehicle = (v) => {
  state.vehicleType = v;
  import('../router.js').then(m => m.go('Plan Trip'));
};