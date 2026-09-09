// NER SmartLogix — Government of India Official Home Page

import { state } from '../state.js';

export function renderHomePage() {
  const activeAlertsCount = state.top10Alerts.length || 10;

  return `
  <!-- Official Government Hero Banner -->
  <div class="gov-hero-banner reveal">
    <div class="gov-hero-container">
      <div class="gov-eyebrow">
        <span>🇮🇳</span> राष्ट्रीय लॉजिस्टिक्स नीति (NLP) एवं पीएम गतिशक्ति पहल | Government of India
      </div>
      <h1 class="gov-hero-title">
        पूर्वोत्तर क्षेत्र में सुरक्षित, निर्बाध एवं सुदृढ़ <br>
        <span>व्यावसायिक रसद परिवहन प्रणाली (SmartLogix)</span>
      </h1>
      <p class="gov-hero-sub">
        Official digital intelligence portal for commercial transport across the 8 North Eastern States (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura). Integrated with real-time IMD weather warnings, NDMA landslide radar, bridge clearance telemetry, and highway logistics amenities.
      </p>

      <div class="gov-hero-actions">
        <button class="btn primary" style="padding:11px 22px;font-size:13.5px" onclick="go('Plan Trip')">
          <span>⇄</span> यात्रा योजना प्रारंभ करें / Plan Route →
        </button>
        <button class="btn saffron" style="padding:11px 20px;font-size:13.5px" onclick="openSectionPopup('Alerts')">
          <span>⚠️</span> सक्रिय अलर्ट / Active Alerts (${activeAlertsCount})
        </button>
        <button class="btn" style="padding:11px 20px;font-size:13.5px" onclick="go('Live Network')">
          <span>◎</span> लाइव कॉरिडोर मैप / Live Corridor Map
        </button>
        <button class="btn" style="padding:11px 18px;font-size:13.5px" onclick="openSectionPopup('Help & Safety')">
          <span>🚨</span> हेल्पलाइन / Helpline 1033
        </button>
      </div>
    </div>
  </div>

  <section class="content">

    <!-- Official Statistics Counter (GIGW Standard) -->
    <div class="gov-stats-grid reveal">
      <div class="gov-stat-card" style="border-top-color:var(--gov-blue)">
        <div style="font-size:20px;margin-bottom:6px">🛣️</div>
        <div class="gov-stat-num" data-count="12500">12,500+ KM</div>
        <div class="gov-stat-label">National Highways in NER (MoRTH)</div>
      </div>
      <div class="gov-stat-card" style="border-top-color:var(--gov-saffron)">
        <div style="font-size:20px;margin-bottom:6px">🗺️</div>
        <div class="gov-stat-num" data-count="8">8 States</div>
        <div class="gov-stat-label">NER States Interconnected</div>
      </div>
      <div class="gov-stat-card" style="border-top-color:var(--red)">
        <div style="font-size:20px;margin-bottom:6px">⚠️</div>
        <div class="gov-stat-num" data-count="${activeAlertsCount}">${activeAlertsCount}</div>
        <div class="gov-stat-label">Active Monitored Hazards (NDMA/IMD)</div>
      </div>
      <div class="gov-stat-card" style="border-top-color:var(--green)">
        <div style="font-size:20px;margin-bottom:6px">⛽</div>
        <div class="gov-stat-num" data-count="350">350+</div>
        <div class="gov-stat-label">Verified Highway Logistics Amenities</div>
      </div>
    </div>

    <!-- Official Transporter Services Grid (Citizen / Transporter Services) -->
    <div style="margin: 32px 0 20px" class="reveal">
      <div class="row">
        <div>
          <div class="gov-eyebrow">ऑनलाइन सेवाएं / Online Services</div>
          <h2 style="font-size:22px;font-weight:800;color:var(--gov-navy);margin-top:2px">
            Transporter & Driver Information Services
          </h2>
          <p style="color:var(--text-muted);font-size:13px;margin-top:4px">
            Official logistics modules engineered for mountain commercial freight, driver safety, and emergency compliance.
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
                मार्ग व्यवहार्यता एवं जोखिम मूल्यांकन / Route Risk & Feasibility
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Commercial OSRM navigation calculating exact mileage, mountain road curvature, steep ascent warnings, and real-time hazard scores based on vehicle class.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" onclick="go('Plan Trip')">Open Service →</button>
            <button class="btn" onclick="openSectionPopup('Plan Trip')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Service 2 -->
        <div class="card" style="border-left:4px solid var(--red);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:24px">🚨</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--gov-navy)">
                भूस्खलन व मौसम चेतावनी रडार / Landslide & Weather Bulletin
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Live automated feed synchronized with India Meteorological Department (IMD Mausam) and NDMA for red/orange rainfall warnings, bridge washouts, and rockslides.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" onclick="go('Alerts')">View Bulletin →</button>
            <button class="btn" onclick="openSectionPopup('Alerts')">⚡ Quick Pop-up</button>
          </div>
        </div>

        <!-- Service 3 -->
        <div class="card" style="border-left:4px solid var(--teal);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:24px">◇</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--gov-navy)">
                राष्ट्रीय राजमार्ग सुविधाएं / Highway Way-side Amenities
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Verified directory of 24/7 petrol pumps, heavy vehicle repair stations, government district hospitals, and rest stops along primary NER highway corridors.
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
                राष्ट्रीय राजमार्ग आपातकालीन हेल्पलाइन / NHAI Helpline 1033
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              Official toll-free emergency dispatch for breakdown assistance, medical transit, and highway patrol support across Assam, Meghalaya, Sikkim, and hill corridors.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn primary" onclick="go('Help & Safety')">Emergency Contacts →</button>
            <button class="btn" onclick="openSectionPopup('Help & Safety')">⚡ Quick Pop-up</button>
          </div>
        </div>

      </div>
    </div>

    <!-- Official Fleet Classification Showcase (Real NER Vehicle Photography) -->
    <div style="margin: 40px 0 20px" class="reveal">
      <div class="row">
        <div>
          <div class="gov-eyebrow">वाहन वर्गीकरण / Vehicle Fleet Classification</div>
          <h2 style="font-size:22px;font-weight:800;color:var(--gov-navy);margin-top:2px">
            Authorized Commercial Logistics Classes in Northeast India
          </h2>
          <p style="color:var(--text-muted);font-size:13px;margin-top:4px">
            Operational guidelines, axle-weight limitations, and bridge clearance authorizations per MoRTH specifications.
          </p>
        </div>
      </div>

      <div class="gov-fleet-grid">

        <!-- Fleet 1: Heavy Mountain Truck -->
        <div class="gov-fleet-card">
          <div class="gov-fleet-img-wrap">
            <img src="/assets/vehicles/mountain-truck.jpg" alt="Heavy Multi-Axle Freight Truck in Meghalaya">
            <span class="gov-fleet-badge">Class: Heavy Freight (16-25T)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">Multi-Axle Mountain Freight Carrier</div>
            <div class="gov-fleet-desc">
              Multi-axle commercial freight carrier authorized for NH27 Guwahati bypass, Shillong corridor, and primary industrial zones. Subject to weight compliance at district weighbridges.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge info">NH27 Corridor</span>
              <span class="badge">Axle Safe</span>
              <span class="badge success">GPS Mandatory</span>
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
            <span class="gov-fleet-badge">Class: Cold Chain (14T)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">Refrigerated Perishable Express</div>
            <div class="gov-fleet-desc">
              Temperature-controlled transport for agricultural produce, fresh dairy, and medical vaccines traversing Brahmaputra river crossings and Siliguri transit corridors.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge info">River Bridge Safe</span>
              <span class="badge">Perishables</span>
              <span class="badge success">Priority Lane</span>
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
            <span class="gov-fleet-badge">Class: Hazardous Petroleum (12KL)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">Petroleum Mountain Tanker</div>
            <div class="gov-fleet-desc">
              Dedicated hazardous fuel transport feeding district retail outlets along NH29 (Dimapur-Kohima) and Manipur hill corridors. Subject to strict safety speed governors.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge warning">Hazmat Certified</span>
              <span class="badge">NH29 Corridor</span>
              <span class="badge">Hill Low-Gear</span>
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
            <span class="gov-fleet-badge">Class: Light Commercial 4x4 (2.5T)</span>
          </div>
          <div class="gov-fleet-body">
            <div class="gov-fleet-title">All-Terrain 4x4 Hill Freighter</div>
            <div class="gov-fleet-desc">
              Rugged all-weather commercial pickup truck authorized for high-altitude passes, border roads, and narrow village distribution networks in Arunachal Pradesh and Sikkim.
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
              <span class="badge info">4x4 Mountain Pass</span>
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

    <!-- Official Initiative Banner (PM GatiShakti & Digital India) -->
    <div class="card reveal" style="border-top:3px solid var(--gov-saffron);padding:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;background:#ffffff">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--gov-saffron);text-transform:uppercase;letter-spacing:1px">भारत सरकार की प्रमुख पहल / Government of India Flagship Initiative</div>
        <div style="font-size:18px;font-weight:800;color:var(--gov-navy);margin-top:3px">
          PM GatiShakti — National Master Plan for Multi-Modal Connectivity
        </div>
        <p style="font-size:12.5px;color:var(--text-muted);margin-top:4px;max-width:700px">
          NER SmartLogix operationalizes multi-modal freight planning across roadways, inland waterways, and railway freight terminals across the entire North Eastern Region.
        </p>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn primary" onclick="go('Plan Trip')">Start Journey Planning →</button>
        <button class="btn" onclick="go('Help & Safety')">Read Safety Guidelines</button>
      </div>
    </div>

  </section>`;
}

window.planWithVehicle = (v) => {
  state.vehicleType = v;
  import('../router.js').then(m => m.go('Plan Trip'));
};