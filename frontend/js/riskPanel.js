/**
 * Route Risk Intelligence Panel Component
 * Seamlessly integrates into Plan Trip route cards.
 * Visualizes Multi-Factor ML predictions: Heavy Rain, Landslide, Flood, Traffic.
 */

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLevelBadgeClass(level) {
  switch (level) {
    case 'LOW': return 'badge-low';
    case 'MODERATE': return 'badge-mod';
    case 'HIGH': return 'badge-high';
    case 'VERY HIGH': return 'badge-crit';
    default: return '';
  }
}

function getLevelColor(level) {
  switch (level) {
    case 'LOW': return '#10b981';
    case 'MODERATE': return '#f59e0b';
    case 'HIGH': return '#f97316';
    case 'VERY HIGH': return '#ef4444';
    default: return '#64748b';
  }
}

/**
 * Returns HTML string for loading state inside the route card
 */
export function renderRiskPanelLoading() {
  return `
    <div class="risk-panel-container risk-panel-loading">
      <div class="risk-panel-spinner"></div>
      <div style="font-size:13px;font-weight:600;color:var(--teal,#14b8a6)">Updating route risk intelligence…</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px">Querying live weather radar, elevation profiles & historical hazard patterns</div>
    </div>
  `;
}

/**
 * Returns HTML string when data is insufficient or error
 */
export function renderRiskPanelError(msg) {
  return `
    <div class="risk-panel-container" style="border-left: 3px solid #f59e0b;">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">⚠️</span>
        <div style="font-size:12px;color:#cbd5e1">${escapeHtml(msg || 'Limited historical data available for this route.')}</div>
      </div>
    </div>
  `;
}

/**
 * Renders the full Route Risk Intelligence panel
 */
export function renderRiskPanel(data, routeIndex = 0) {
  if (!data || !data.success) {
    return renderRiskPanelError(data?.error);
  }

  const { overall, factors, segments, metadata } = data;

  const factorList = [
    { key: 'rain', name: 'Heavy Rain', item: factors.rain },
    { key: 'landslide', name: 'Landslide', item: factors.landslide },
    { key: 'flood', name: 'Flood', item: factors.flood },
    { key: 'traffic', name: 'Traffic', item: factors.traffic }
  ];

  return `
    <div class="risk-panel-container" id="risk-panel-content-${routeIndex}">
      <!-- Header -->
      <div class="risk-panel-header">
        <div class="risk-panel-title">
          <span class="risk-title-icon">⚡</span>
          <span class="risk-title-text">ROUTE RISK INTELLIGENCE</span>
          <span class="risk-badge-proto">PROTOTYPE — ESTIMATED RISK</span>
        </div>
        <div class="risk-overall-chip" style="background:${overall.color}20;border:1px solid ${overall.color}60;color:${overall.color}">
          <span class="risk-chip-dot" style="background:${overall.color}"></span>
          <span>${escapeHtml(overall.level)}</span>
          <span style="font-weight:700;margin-left:4px">${overall.score}%</span>
        </div>
      </div>

      <!-- 4 Risk Factor Cards Grid -->
      <div class="risk-factors-grid">
        ${factorList.map(f => {
          const color = getLevelColor(f.item.level);
          return `
            <div class="risk-factor-card" title="${escapeHtml(f.item.dataSource)}">
              <div class="risk-factor-top">
                <span class="risk-factor-icon">${f.item.icon}</span>
                <span class="risk-factor-name">${f.name}</span>
                <span class="risk-factor-score" style="color:${color}">${f.item.score}%</span>
              </div>
              <div class="risk-bar-track">
                <div class="risk-bar-fill" style="width:${f.item.score}%;background:${color}"></div>
              </div>
              <div class="risk-factor-level" style="color:${color}">${f.item.level}</div>
              <div class="risk-factor-desc">${escapeHtml(f.item.explanation)}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Route Segment Risk Visualization Strip -->
      ${segments && segments.length > 0 ? `
        <div class="risk-segment-strip-section">
          <div class="risk-strip-header">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Corridor Risk Segments</span>
            <button class="risk-map-view-btn" onclick="window.highlightRiskZonesOnMap(${routeIndex})" title="Highlight colored hazard zones on map">
              🗺️ View on Map
            </button>
          </div>
          <div class="risk-segment-strip">
            <span class="risk-strip-terminal">Origin</span>
            ${segments.map((seg, sIdx) => `
              <div class="risk-segment-bar" onclick="window.inspectRiskSegment(${routeIndex}, ${sIdx})" title="${seg.name}: ${seg.riskLevel} (${seg.riskScore}%) - ${seg.primaryHazardType}">
                <div class="risk-seg-line" style="background:${seg.color}"></div>
                <div class="risk-seg-node" style="border-color:${seg.color};background:${seg.color}30">
                  <span style="color:${seg.color}">${sIdx + 1}</span>
                </div>
                <div class="risk-seg-label">${seg.riskLevel}</div>
              </div>
            `).join('')}
            <span class="risk-strip-terminal">Dest</span>
          </div>
        </div>
      ` : ''}

      <!-- Detailed Segment Inspector Drawer (Dynamic target) -->
      <div id="risk-segment-inspector-${routeIndex}" class="risk-segment-inspector" style="display:none"></div>

      <!-- Safety Summary & Recommendation -->
      <div class="risk-safety-summary">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <span style="font-size:16px;line-height:1.2">🛡️</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
              <span style="font-size:12px;font-weight:700;color:#f8fafc">SAFETY ADVISORY & FACTORS</span>
              <span style="font-size:11px;color:#94a3b8">Model Confidence: <b style="color:var(--teal,#14b8a6)">${overall.confidencePct}%</b></span>
            </div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:4px;line-height:1.4">
              ${escapeHtml(overall.recommendation)}
            </div>
            <div class="risk-factors-tags" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
              ${overall.keyFactors.map(kf => `
                <span class="risk-factor-tag">${escapeHtml(kf)}</span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Metadata & Attributions Footer -->
      <div class="risk-panel-footer">
        <div class="risk-footer-sources">
          Data: Open-Meteo Weather Radar · IMD Climatology · GSI Zonation · ${escapeHtml(factors.traffic.dataSource)}
        </div>
        <div class="risk-footer-time">
          Analyzed in ${metadata.calculationDurationMs}ms
        </div>
      </div>
    </div>
  `;
}

/**
 * Inspect a specific segment in an expanded modal or inline card
 */
window.inspectRiskSegment = function(routeIndex, segmentIndex) {
  const container = document.getElementById(`risk-segment-inspector-${routeIndex}`);
  if (!container) return;

  const analysis = window._routeRiskCache?.[routeIndex];
  if (!analysis || !analysis.segments || !analysis.segments[segmentIndex]) return;

  const seg = analysis.segments[segmentIndex];
  const color = getLevelColor(seg.riskLevel);

  if (container.style.display !== 'none' && container.dataset.activeSegment == segmentIndex) {
    container.style.display = 'none';
    return;
  }

  container.dataset.activeSegment = segmentIndex;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="background:#0f172a;border:1px solid ${color}60;border-radius:8px;padding:10px;margin-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e293b;padding-bottom:6px">
        <b style="color:${color};font-size:12px">Segment ${segmentIndex + 1}: ${escapeHtml(seg.terrain)} (${seg.state})</b>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}60">${seg.riskLevel} (${seg.riskScore}%)</span>
          <button onclick="document.getElementById('risk-segment-inspector-${routeIndex}').style.display='none'" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px">✕</button>
        </div>
      </div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:6px;line-height:1.4">
        <b>Primary Risk:</b> ${escapeHtml(seg.primaryHazardType)} — ${escapeHtml(seg.explanation)}
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px;font-size:10px;color:#94a3b8">
        <div>🌧️ Forecast Precip: <b style="color:#f8fafc">${seg.currentConditions.forecast_24h_mm} mm (${seg.currentConditions.precipitation_probability}%)</b></div>
        <div>🏔️ Landslide Corridor: <b style="color:#f8fafc">${escapeHtml(seg.historicalContext.landslideCorridor)}</b></div>
        <div>🌊 Flood Zone: <b style="color:#f8fafc">${escapeHtml(seg.historicalContext.floodZone)}</b></div>
        <div>🌡️ Temp & Humidity: <b style="color:#f8fafc">${seg.currentConditions.temperature}, ${seg.currentConditions.humidity}</b></div>
      </div>
      <div style="margin-top:8px;display:flex;justify-content:flex-end">
        <button class="btn primary" style="padding:3px 10px;font-size:11px" onclick="window.focusSegmentOnMap(${routeIndex}, ${segmentIndex})">
          Zoom to Segment on Map
        </button>
      </div>
    </div>
  `;
};

/**
 * Highlights colored risk zone polylines on the OpenStreetMap
 */
window.highlightRiskZonesOnMap = async function(routeIndex) {
  const { notify } = await import('./render.js');
  const analysis = window._routeRiskCache?.[routeIndex];
  if (!analysis || !analysis.segments) {
    notify('Risk analysis not available for map overlay.', 'error');
    return;
  }

  // Ensure user is on Live Network page
  const { go } = await import('./router.js');
  go('Live Network');

  setTimeout(async () => {
    try {
      const { displayRiskZoneOverlay } = await import('./maps.js');
      if (typeof displayRiskZoneOverlay === 'function') {
        displayRiskZoneOverlay(analysis.segments);
        notify('Overlaying route risk zones on OpenStreetMap', 'success');
      }
    } catch (e) {
      console.warn('[Risk Map] Overlay error:', e.message);
    }
  }, 300);
};

window.focusSegmentOnMap = async function(routeIndex, segmentIndex) {
  const analysis = window._routeRiskCache?.[routeIndex];
  if (!analysis || !analysis.segments || !analysis.segments[segmentIndex]) return;

  const seg = analysis.segments[segmentIndex];
  const { go } = await import('./router.js');
  go('Live Network');

  setTimeout(async () => {
    try {
      const { focusOnSegment } = await import('./maps.js');
      if (typeof focusOnSegment === 'function') {
        focusOnSegment(seg);
      }
    } catch (e) {
      console.warn('[Risk Map] Focus error:', e.message);
    }
  }, 300);
};
