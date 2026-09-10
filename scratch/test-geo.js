
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const rLat1 = lat1 * Math.PI / 180;
  const rLat2 = lat2 * Math.PI / 180;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(rLat1) * Math.cos(rLat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Distance from point to line segment
// Projects point P onto segment AB. Returns closest point on segment and distance.
function pointToSegment(pLat, pLon, aLat, aLon, bLat, bLon) {
  // Rough flat earth approximation for projection (valid for small distances)
  const x = pLon - aLon;
  const y = pLat - aLat;
  const dx = bLon - aLon;
  const dy = bLat - aLat;
  const l2 = dx*dx + dy*dy;
  let t = 0;
  if (l2 !== 0) {
    t = Math.max(0, Math.min(1, (x*dx + y*dy) / l2));
  }
  const projLon = aLon + t * dx;
  const projLat = aLat + t * dy;
  return {
    lat: projLat,
    lon: projLon,
    distance: haversine(pLat, pLon, projLat, projLon),
    t: t
  };
}

function snapToRoute(lat, lon, coords) {
  // coords is [[lng, lat], ...]
  let minDist = Infinity;
  let bestIndex = 0;
  let bestProj = null;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i+1];
    const proj = pointToSegment(lat, lon, a[1], a[0], b[1], b[0]);
    if (proj.distance < minDist) {
      minDist = proj.distance;
      bestIndex = i;
      bestProj = proj;
    }
  }
  return {
    distanceToRoute: minDist,
    index: bestIndex,
    fraction: bestProj.t,
    lat: bestProj.lat,
    lon: bestProj.lon
  };
}

function distanceAlongRoute(snapResult, coords) {
  let dist = 0;
  // Distance from snapped point to the end of the segment
  const a = coords[snapResult.index];
  const b = coords[snapResult.index + 1];
  dist += haversine(snapResult.lat, snapResult.lon, b[1], b[0]);
  // Distance for remaining segments
  for (let i = snapResult.index + 1; i < coords.length - 1; i++) {
    dist += haversine(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
  }
  return dist;
}

const route = [[91.73, 26.14], [91.74, 26.15], [91.75, 26.16]];
const snap = snapToRoute(26.145, 91.735, route);
console.log(snap);
console.log(distanceAlongRoute(snap, route));

