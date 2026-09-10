export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rLat1 = lat1 * Math.PI / 180;
  const rLat2 = lat2 * Math.PI / 180;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

export function pointToSegment(pLat, pLon, aLat, aLon, bLat, bLon) {
  const x = pLon - aLon;
  const y = pLat - aLat;
  const dx = bLon - aLon;
  const dy = bLat - aLat;
  const l2 = dx*dx + dy*dy;
  let t = l2 !== 0 ? Math.max(0, Math.min(1, (x*dx + y*dy) / l2)) : 0;
  const projLon = aLon + t * dx;
  const projLat = aLat + t * dy;
  return { lat: projLat, lon: projLon, distance: haversine(pLat, pLon, projLat, projLon), t };
}

export function snapToRoute(lat, lon, coords) {
  if (!coords || coords.length < 2) return null;
  let minDist = Infinity;
  let bestIndex = 0;
  let bestProj = null;
  for (let i = 0; i < coords.length - 1; i++) {
    const proj = pointToSegment(lat, lon, coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
    if (proj.distance < minDist) { minDist = proj.distance; bestIndex = i; bestProj = proj; }
  }
  return { distanceToRoute: minDist, index: bestIndex, fraction: bestProj.t, lat: bestProj.lat, lon: bestProj.lon };
}

export function distanceAlongRoute(snapResult, coords) {
  if (!snapResult || !coords) return 0;
  let dist = haversine(snapResult.lat, snapResult.lon, coords[snapResult.index+1][1], coords[snapResult.index+1][0]);
  for (let i = snapResult.index + 1; i < coords.length - 1; i++) {
    dist += haversine(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
  }
  return dist;
}

export function formatDistance(meters) {
  if (meters == null) return "";
  return meters >= 1000 ? (meters / 1000).toFixed(1) + " km" : Math.round(meters) + " m";
}

export function formatDuration(seconds) {
  if (seconds == null) return "";
  const m = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(m / 60);
  return h ? `${h} hr ${m % 60} min` : `${m % 60} min`;
}
