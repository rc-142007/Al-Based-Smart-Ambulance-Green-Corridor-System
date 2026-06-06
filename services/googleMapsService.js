/**
 * openMapsService.js  (replaces googleMapsService.js — same exports, no API key needed)
 *
 * Geocoding  → Nominatim  (OpenStreetMap)  https://nominatim.openstreetmap.org
 * Routing    → OSRM       (public demo)    https://router.project-osrm.org
 *
 * Nominatim policy: max 1 req/s, must include User-Agent header.
 * For a production system, self-host Nominatim + OSRM. For demo this is fine.
 */

const axios = require('axios');

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE      = 'https://router.project-osrm.org/route/v1/driving';

const HEADERS = {
  'User-Agent':  'SmartAmbulanceAI/1.0 (demo)',
  'Accept-Language': 'en',
};

// ─── Small delay helper (Nominatim rate-limit: 1 req/s) ──────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Haversine distance (meters) between two lat/lng points ──────────────────
const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R  = 6371000;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Build human-readable instruction from OSRM maneuver ─────────────────────
const buildInstruction = (step) => {
  const type     = step.maneuver?.type     || '';
  const modifier = step.maneuver?.modifier || '';
  const name     = step.name ? ` onto ${step.name}` : '';

  const map = {
    'depart':          `Head ${modifier || 'forward'}${name}`,
    'arrive':          `You have arrived${name}`,
    'turn left':       `Turn left${name}`,
    'turn right':      `Turn right${name}`,
    'turn slight left':'Bear left${name}',
    'turn slight right':'Bear right${name}',
    'turn sharp left': `Sharp left${name}`,
    'turn sharp right':`Sharp right${name}`,
    'continue':        `Continue straight${name}`,
    'new name':        `Continue straight${name}`,
    'merge':           `Merge${modifier ? ' ' + modifier : ''}${name}`,
    'roundabout':      `At the roundabout, take exit${name}`,
    'rotary':          `At the rotary, take exit${name}`,
    'fork':            `At the fork, keep ${modifier || 'straight'}`,
    'end of road':     `At the end of the road, turn ${modifier || 'right'}`,
    'use lane':        `Use the ${modifier || 'correct'} lane`,
  };

  const key = modifier ? `${type} ${modifier}` : type;
  return map[key] || map[type] || `${type} ${modifier}`.trim() || 'Continue';
};

// ─── Geocode an address string → { lat, lng, formattedAddress } ──────────────
const geocodeAddress = async (address) => {
  await delay(300);
  const res = await axios.get(`${NOMINATIM_BASE}/search`, {
    params: { q: address, format: 'json', limit: 1, addressdetails: 1 },
    headers: HEADERS,
  });

  if (!res.data || !res.data.length) {
    throw new Error(`Geocoding failed: no results for "${address}"`);
  }

  const result = res.data[0];
  return {
    lat:              parseFloat(result.lat),
    lng:              parseFloat(result.lon),
    formattedAddress: result.display_name,
  };
};

// ─── Reverse geocode lat/lng → address string ────────────────────────────────
const reverseGeocode = async (lat, lng) => {
  await delay(300);
  try {
    const res = await axios.get(`${NOMINATIM_BASE}/reverse`, {
      params: { lat, lon: lng, format: 'json' },
      headers: HEADERS,
    });
    return res.data?.display_name || '';
  } catch (_) {
    return '';
  }
};

/**
 * Get driving route between two points using OSRM.
 * Returns same structure as old Google Maps version so all other code is unchanged.
 *
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} destLat
 * @param {number} destLng
 * @returns {Array} routes array with distance, duration, coordinates, steps
 */
const getRoutes = async (originLat, originLng, destLat, destLng) => {
  // OSRM URL: /route/v1/driving/lng,lat;lng,lat
  const url = `${OSRM_BASE}/${originLng},${originLat};${destLng},${destLat}`;

  const res = await axios.get(url, {
    params: {
      overview:     'full',
      geometries:   'geojson',
      steps:        true,
      alternatives: true,
    },
    headers: HEADERS,
  });

  if (res.data.code !== 'Ok' || !res.data.routes?.length) {
    throw new Error(`OSRM routing error: ${res.data.code || 'No routes found'}`);
  }

  return res.data.routes.map((route, idx) => {
    const distance_km   = Math.round((route.distance / 1000) * 10) / 10;
    const googleETA_min = Math.ceil(route.duration / 60);

    // GeoJSON coordinates are [lng, lat] — flip to { lat, lng }
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

    // Build steps from OSRM leg steps
    const leg   = route.legs[0];
    const steps = (leg?.steps || []).map((step) => {
      const [mLng, mLat] = step.maneuver?.location || [destLng, destLat];
      return {
        instruction:     buildInstruction(step),
        distance:        step.distance < 1000
                           ? `${Math.round(step.distance)} m`
                           : `${(step.distance / 1000).toFixed(1)} km`,
        distanceMeters:  Math.round(step.distance),
        duration:        step.duration < 60
                           ? `${Math.round(step.duration)} sec`
                           : `${Math.ceil(step.duration / 60)} min`,
        startLocation:   { lat: mLat, lng: mLng },
        endLocation:     { lat: mLat, lng: mLng },
        maneuverLocation:{ lat: mLat, lng: mLng }, // for voice navigation proximity
        maneuverType:    step.maneuver?.type     || '',
        maneuverModifier:step.maneuver?.modifier || '',
        roadName:        step.name || '',
      };
    });

    return {
      routeIndex:    idx,
      distance_km,
      googleETA_min,
      polyline:      '',          // not used — coordinates array used directly
      coordinates,
      steps,
      startAddress:  '',          // filled by reverseGeocode in routeController if needed
      endAddress:    '',
    };
  });
};

/**
 * decodePolyline kept for backward compatibility but does nothing (OSRM uses GeoJSON).
 */
const decodePolyline = (encoded) => [];

module.exports = { geocodeAddress, reverseGeocode, getRoutes, decodePolyline };
