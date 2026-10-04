/**
 * lutarym-weather-go-card.js
 * Lovelace Custom Card for Home Assistant: "is the weather right for X?"
 *
 * Fetches an hourly forecast from Open-Meteo (DWD ICON, no API key) for the
 * 06:00-18:00 window of today (or tomorrow, after 18:00) and rates rain,
 * wind and temperature against activity specific ideal ranges.
 *
 * Each activity gets its own animated scene (for example a cyclist who
 * rides along a road) and the expected weather plays in that scene: rain
 * or snow by amount, clouds by probability, wind moves trees, clouds and
 * rain, the sun shines when it is dry, breath clouds show when it is cold.
 *
 * INSTALLATION
 *   1. Copy the file to /config/www/lutarym-weather-go-card.js
 *   2. Settings > Dashboards > Resources > Add resource:
 *        URL:  /local/lutarym-weather-go-card.js
 *        Type: JavaScript Module
 *   3. Clear your browser cache (Ctrl+F5)
 *
 * CONFIGURATION
 *   type: custom:lutarym-weather-go-card
 *   activity: bike                    # bike | running | walking | boating | sailing | football | bbq
 *   lat: 52.52                        # optional, default: 52.52 (Berlin, placeholder)
 *   lon: 13.405                       # optional, default: 13.405 (Berlin, placeholder)
 *   title: My Title                   # optional, overrides the activity's default question
 *   rain_prob_ideal_max: 20           # optional, %
 *   rain_prob_tolerance: 10           # optional, %
 *   rain_amount_ideal_max: 0.5        # optional, mm
 *   rain_amount_tolerance: 0.5        # optional, mm
 *   wind_ideal_max: 20                # optional, km/h
 *   wind_ideal_min: 10                # optional, km/h, only for wind range activities (sailing)
 *   wind_tolerance: 5                 # optional, km/h
 *   temp_ideal_min: 15                # optional, °C
 *   temp_ideal_max: 30                # optional, °C
 *   temp_tolerance: 2                 # optional, °C
 */

const CARD_TAG = 'lutarym-weather-go-card';
const EDITOR_TAG = 'lutarym-weather-go-card-editor';
const REFRESH_MS = 30 * 60 * 1000;
const WINDOW_START = 6;
const WINDOW_END = 18;

/* ------------------------------------------------------------------ *
 *  Texts
 * ------------------------------------------------------------------ */
const I18N = {
  en: {
    loading: 'Loading…',
    noData: 'No data',
    source: 'DWD via Open-Meteo',
    today: 'Today',
    tomorrow: 'Tomorrow',
    rainLabel: 'Rain',
    windLabel: 'Wind',
    tempLabel: 'Temperature',
    statusGo: "Yes, let's go!",
    statusMaybe: 'Maybe, take care',
    statusNogo: 'Better not',
    pre_max: 'max',
    pre_min: 'min',
    pre_avg: 'avg',
    ideal: 'ideal',
    editorActivity: 'Activity',
    editorLat: 'Latitude',
    editorLon: 'Longitude',
    editorTitle: 'Title',
    editorTitleHint: 'Optional, default: {title}',
    sectionRain: 'Rain',
    editorRainProbMax: 'Ideal max. rain probability (%)',
    editorRainProbTolerance: 'Tolerance (%)',
    editorRainAmountMax: 'Ideal max. rain amount (mm)',
    editorRainAmountTolerance: 'Tolerance (mm)',
    sectionWind: 'Wind',
    editorWindMax: 'Ideal max. wind speed (km/h)',
    editorWindMinRange: 'Ideal min. wind speed (km/h)',
    editorWindMaxRange: 'Ideal max. wind speed (km/h)',
    editorWindTolerance: 'Tolerance (km/h)',
    windRangeHint: 'This activity uses a wind range (some wind is desirable) instead of a simple maximum.',
    sectionTemp: 'Temperature',
    editorTempMin: 'Ideal min. temperature (°C)',
    editorTempMax: 'Ideal max. temperature (°C)',
    editorTempTolerance: 'Tolerance (°C)',
  },
  de: {
    loading: 'Wird geladen…',
    noData: 'Keine Daten',
    source: 'DWD via Open-Meteo',
    today: 'Heute',
    tomorrow: 'Morgen',
    rainLabel: 'Regen',
    windLabel: 'Wind',
    tempLabel: 'Temperatur',
    statusGo: "Ja, los geht's!",
    statusMaybe: 'Bedingt möglich',
    statusNogo: 'Besser nicht',
    pre_max: 'max',
    pre_min: 'min',
    pre_avg: 'ø',
    ideal: 'ideal',
    editorActivity: 'Aktivität',
    editorLat: 'Breitengrad',
    editorLon: 'Längengrad',
    editorTitle: 'Titel',
    editorTitleHint: 'Optional, Standard: {title}',
    sectionRain: 'Regen',
    editorRainProbMax: 'Ideal max. Regenwahrscheinlichkeit (%)',
    editorRainProbTolerance: 'Toleranz (%)',
    editorRainAmountMax: 'Ideal max. Regenmenge (mm)',
    editorRainAmountTolerance: 'Toleranz (mm)',
    sectionWind: 'Wind',
    editorWindMax: 'Ideal max. Windgeschwindigkeit (km/h)',
    editorWindMinRange: 'Ideal min. Windgeschwindigkeit (km/h)',
    editorWindMaxRange: 'Ideal max. Windgeschwindigkeit (km/h)',
    editorWindTolerance: 'Toleranz (km/h)',
    windRangeHint: 'Diese Aktivität nutzt einen Windbereich (etwas Wind ist erwünscht) statt eines einfachen Maximums.',
    sectionTemp: 'Temperatur',
    editorTempMin: 'Ideal min. Temperatur (°C)',
    editorTempMax: 'Ideal max. Temperatur (°C)',
    editorTempTolerance: 'Toleranz (°C)',
  },
};

const ACTIVITY_I18N = {
  en: {
    bike:     { label: 'Cycling',  question: 'Go cycling?' },
    running:  { label: 'Running',  question: 'Go running?' },
    walking:  { label: 'Walking',  question: 'Go for a walk?' },
    boating:  { label: 'Boating',  question: 'Go boating?' },
    sailing:  { label: 'Sailing',  question: 'Go sailing?' },
    football: { label: 'Football', question: 'Play football?' },
    bbq:      { label: 'Grilling', question: 'Time to grill?' },
  },
  de: {
    bike:     { label: 'Radfahren',  question: 'Fahrrad fahren?' },
    running:  { label: 'Laufen',     question: 'Laufen gehen?' },
    walking:  { label: 'Spazieren',  question: 'Spazieren gehen?' },
    boating:  { label: 'Bootfahren', question: 'Boot fahren?' },
    sailing:  { label: 'Segeln',     question: 'Segeln gehen?' },
    football: { label: 'Fußball',    question: 'Fußball spielen?' },
    bbq:      { label: 'Grillen',    question: 'Grillen?' },
  },
};

/* ------------------------------------------------------------------ *
 *  Activity presets (language independent)
 *  windMode 'max'   = less wind is better
 *  windMode 'range' = some wind is desirable (sailing)
 * ------------------------------------------------------------------ */
const ACTIVITY_PRESETS = {
  bike: {
    emoji: '🚲', windMode: 'max',
    rain_prob_ideal_max: 20, rain_prob_tolerance: 10,
    rain_amount_ideal_max: 0.5, rain_amount_tolerance: 0.5,
    wind_ideal_max: 20, wind_tolerance: 5,
    temp_ideal_min: 15, temp_ideal_max: 30, temp_tolerance: 2,
  },
  running: {
    emoji: '🏃', windMode: 'max',
    rain_prob_ideal_max: 30, rain_prob_tolerance: 15,
    rain_amount_ideal_max: 0.5, rain_amount_tolerance: 1,
    wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 5, temp_ideal_max: 25, temp_tolerance: 5,
  },
  walking: {
    emoji: '🚶', windMode: 'max',
    rain_prob_ideal_max: 30, rain_prob_tolerance: 20,
    rain_amount_ideal_max: 0.3, rain_amount_tolerance: 0.7,
    wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 0, temp_ideal_max: 28, temp_tolerance: 5,
  },
  boating: {
    emoji: '🚤', windMode: 'max',
    rain_prob_ideal_max: 20, rain_prob_tolerance: 15,
    rain_amount_ideal_max: 0.3, rain_amount_tolerance: 0.5,
    wind_ideal_max: 20, wind_tolerance: 10,
    temp_ideal_min: 15, temp_ideal_max: 32, temp_tolerance: 3,
  },
  sailing: {
    emoji: '⛵', windMode: 'range',
    rain_prob_ideal_max: 20, rain_prob_tolerance: 15,
    rain_amount_ideal_max: 0.3, rain_amount_tolerance: 0.5,
    wind_ideal_min: 10, wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 10, temp_ideal_max: 28, temp_tolerance: 5,
  },
  football: {
    emoji: '⚽', windMode: 'max',
    rain_prob_ideal_max: 30, rain_prob_tolerance: 20,
    rain_amount_ideal_max: 1, rain_amount_tolerance: 1,
    wind_ideal_max: 30, wind_tolerance: 10,
    temp_ideal_min: 5, temp_ideal_max: 28, temp_tolerance: 3,
  },
  bbq: {
    emoji: '🍖', windMode: 'max',
    rain_prob_ideal_max: 10, rain_prob_tolerance: 10,
    rain_amount_ideal_max: 0.1, rain_amount_tolerance: 0.3,
    wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 18, temp_ideal_max: 32, temp_tolerance: 3,
  },
};

const ACTIVITY_KEYS = Object.keys(ACTIVITY_PRESETS);
const OVERRIDE_KEYS = [
  'rain_prob_ideal_max', 'rain_prob_tolerance',
  'rain_amount_ideal_max', 'rain_amount_tolerance',
  'wind_ideal_min', 'wind_ideal_max', 'wind_tolerance',
  'temp_ideal_min', 'temp_ideal_max', 'temp_tolerance',
];


/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */
function lutarymLang(hass) {
  const raw = (hass && hass.language) || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  return raw.toLowerCase().startsWith('de') ? 'de' : 'en';
}

function t(hass, key, vars) {
  const dict = I18N[lutarymLang(hass)] || I18N.en;
  let str = dict[key] ?? I18N.en[key] ?? key;
  if (vars) Object.keys(vars).forEach((k) => { str = str.replace(`{${k}}`, vars[k]); });
  return str;
}

function activityInfo(hass, activity) {
  const dict = ACTIVITY_I18N[lutarymLang(hass)] || ACTIVITY_I18N.en;
  return dict[activity] ?? ACTIVITY_I18N.en[activity];
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const frac = (v, [lo, hi]) => clamp((v - lo) / (hi - lo), 0, 1);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function numberFormat(hass, digits) {
  const locale = lutarymLang(hass) === 'de' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function rateMax(value, idealMax, toleranceMax) {
  if (value <= idealMax) return 'ok';
  if (value <= toleranceMax) return 'warn';
  return 'bad';
}

function rateRange(value, idealMin, idealMax, toleranceMin, toleranceMax) {
  if (value >= idealMin && value <= idealMax) return 'ok';
  if (value >= toleranceMin && value <= toleranceMax) return 'warn';
  return 'bad';
}

/** Local calendar date the card looks at: today, or tomorrow after 18:00. */
function targetDate(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now.getHours() >= WINDOW_END) d.setDate(d.getDate() + 1);
  return d;
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Extracts the hours of the target day inside the 06:00-18:00 window. */
function dayHours(hourly, date) {
  if (!hourly || !Array.isArray(hourly.time)) return null;
  const prefix = isoDate(date);
  const out = [];
  hourly.time.forEach((time, i) => {
    if (!time.startsWith(prefix)) return;
    const hour = parseInt(time.slice(11, 13), 10);
    if (hour < WINDOW_START || hour > WINDOW_END) return;
    out.push({
      temp: hourly.temperature_2m?.[i],
      rainProb: hourly.precipitation_probability?.[i],
      rain: hourly.precipitation?.[i],
      wind: hourly.wind_speed_10m?.[i],
    });
  });
  return out.length ? out : null;
}

const maxOf = (arr) => (arr.length ? Math.max(...arr) : null);
const minOf = (arr) => (arr.length ? Math.min(...arr) : null);
const pick = (hours, key) => hours.map((h) => h[key]).filter(isNum);

/**
 * Rates the day. Same rules as before:
 *  - rain is fine if probability OR amount is in the ideal range
 *  - wind uses the daily maximum, or the average in range mode
 *  - temperature uses the daily minimum
 */
function evaluate(hours, c) {
  const probs = pick(hours, 'rainProb');
  const rains = pick(hours, 'rain');
  const winds = pick(hours, 'wind');
  const temps = pick(hours, 'temp');
  if (!rains.length || !winds.length || !temps.length) return null;

  const m = {
    rainProb: maxOf(probs),
    rainAmount: maxOf(rains),
    windMin: minOf(winds),
    windMax: maxOf(winds),
    windAvg: winds.reduce((a, b) => a + b, 0) / winds.length,
    tempMin: minOf(temps),
    tempMax: maxOf(temps),
  };

  const amountRating = rateMax(m.rainAmount, c.rain_amount_ideal_max, c.rain_amount_ideal_max + c.rain_amount_tolerance);
  let rain = amountRating;
  if (isNum(m.rainProb)) {
    const probRating = rateMax(m.rainProb, c.rain_prob_ideal_max, c.rain_prob_ideal_max + c.rain_prob_tolerance);
    if (probRating === 'ok' || amountRating === 'ok') rain = 'ok';
    else if (probRating === 'bad' && amountRating === 'bad') rain = 'bad';
    else rain = 'warn';
  }

  const wind = c.wind_mode === 'range'
    ? rateRange(m.windAvg, c.wind_ideal_min, c.wind_ideal_max,
      c.wind_ideal_min - c.wind_tolerance, c.wind_ideal_max + c.wind_tolerance)
    : rateMax(m.windMax, c.wind_ideal_max, c.wind_ideal_max + c.wind_tolerance);

  const temp = rateRange(m.tempMin, c.temp_ideal_min, c.temp_ideal_max,
    c.temp_ideal_min - c.temp_tolerance, c.temp_ideal_max + c.temp_tolerance);

  const ratings = [rain, wind, temp];
  const overall = ratings.includes('bad') ? 'nogo' : ratings.includes('warn') ? 'maybe' : 'go';
  return { m, rating: { rain, wind, temp }, overall };
}

/* ------------------------------------------------------------------ *
 *  Colours (Lutarym palette)
 * ------------------------------------------------------------------ */
const COLOR = {
  ok: '#22E07A',
  warn: '#FFC107',
  bad: '#FF5F52',
  neutral: '#7E8CA0',
};
const OVERALL_RATING = { go: 'ok', maybe: 'warn', nogo: 'bad' };

// Forward speed of the scene per verdict: go rides, maybe slowly, nogo stands.
const PACE = { go: 1, maybe: 0.55, nogo: 0 };

/* ------------------------------------------------------------------ *
 *  Scene geometry (SVG units)
 * ------------------------------------------------------------------ */
const SC = {
  W: 600,
  H: 270,
  HORIZON: 196,
  ROAD_Y: 222,
  ROAD_H: 30,
  RAIN_POOL: 90,
  SPLASH_POOL: 24,
  STREAKS: 7,
};

function hexRgb(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, f) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  const k = Math.min(1, Math.max(0, f));
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
const wrap = (v, lo, hi) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

/**
 * Two bone inverse kinematics: the joint between a and b for bone lengths
 * l1 and l2. side = 1 or -1 picks on which side the joint bends.
 */
function ik(a, b, l1, l2, side) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const ang = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const w = base - side * ang;
  return [a[0] + Math.cos(w) * l1, a[1] + Math.sin(w) * l1];
}

const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Ground silhouette that repeats every 600 units, drawn over 1200. */
function hillPath(base, waves) {
  let d = `M0 ${SC.H}`;
  for (let x = 0; x <= 1200; x += 10) {
    let y = base;
    waves.forEach(([amp, k, phase]) => { y += amp * Math.sin((2 * Math.PI * k * x) / 600 + phase); });
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L1200 ${SC.H} Z`;
}

/**
 * Translates the forecast numbers into what the scene shows.
 *  cloud  0..1  sky cover, from rain probability and amount
 *  rain   0..1  precipitation intensity, from the amount
 *  snow         precipitation falls as snow at or below freezing
 *  wind         km/h, drives clouds, trees, rain slant and gust lines
 *  hot / cold   0..1, sky tint, sun size, breath clouds
 */
function weatherLook(m) {
  if (!m) return { cloud: 0.3, rain: 0, snow: false, wind: 6, hot: 0, cold: 0 };
  const prob = isNum(m.rainProb) ? m.rainProb / 100 : null;
  const amount = m.rainAmount || 0;
  let rain = 0;
  if (amount >= 0.05) rain = clamp(0.2 + amount / 3, 0, 1);
  else if (prob !== null && prob >= 0.5) rain = 0.08;
  return {
    cloud: clamp(Math.max(prob ?? 0, amount / 1.5, 0.08), 0, 1),
    rain,
    snow: m.tempMin <= 0.5,
    wind: m.windMax,
    hot: clamp((m.tempMax - 22) / 10, 0, 1),
    cold: clamp((6 - m.tempMin) / 10, 0, 1),
  };
}

/* ------------------------------------------------------------------ *
 *  Figures, one per activity.
 *  env       which landscape the figure needs (see svg() of the scene)
 *  anchor    where the figure's origin sits in the scene
 *  scale     size of the figure
 *  speed     forward speed (or animation tempo) at full pace
 *  mouth     where breath clouds start, in figure units
 *  shadow    [x offset, radius] of the ground shadow, or null
 *  build()   SVG of the figure around its origin
 *  update()  moves the parts every frame
 *            c = { dist, t, dt, pace, look, v }
 * ------------------------------------------------------------------ */
const SKIN = '#E6BE9A';
const SKIN_FAR = '#B8937A';
const DARK = '#1B2230';
const DARK_FAR = '#121821';

const deg = (r) => (r * 180) / Math.PI;
const polar = (p, len, ang) => [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
const lerp = (a, b, f) => a + (b - a) * f;
const lerpPt = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
const ease = (f) => f * f * (3 - 2 * f);

function line(el, id, ...pts) {
  el(id).setAttribute('d', `M${pts.map(pt).join(' L')}`);
}

/** Interpolates between key poses: keys = [[time, value], ...] sorted. */
function keyed(keys, time, mixFn) {
  if (time <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    if (time <= keys[i][0]) {
      const f = ease((time - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      return mixFn(keys[i - 1][1], keys[i][1], f);
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * A person seen from the side, facing right. Far limbs are drawn darker
 * behind the body, near limbs in front. extra goes between body and near
 * arm (for example an umbrella or tongs).
 */
function personSvg(p, o) {
  const s = (id, color, width) => `<path id="${p}${id}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  return `
    ${s('ua2', o.shirtFar, 6)}${s('la2', SKIN_FAR, 5)}
    ${s('th2', o.pantsFar, 9)}${s('sh2', o.legFar || SKIN_FAR, 7)}${s('fo2', o.shoes, 5)}
    ${s('torso', o.shirt, 15)}
    <g id="${p}head">
      <circle r="7.4" fill="${SKIN}"/>
      ${o.hat || `<path d="M-7.4 -0.5 A7.4 7.4 0 0 1 6.9 -3 Q1 -5 -7.4 -0.5 Z" fill="${o.hair || '#4A3426'}"/>`}
      <circle cx="4" cy="-1" r="0.9" fill="#0B1017"/>
      <circle class="cheek" cx="3" cy="2.6" r="2.3" fill="#FF5F52" opacity="0"/>
    </g>
    ${s('th', o.pants, 10)}${s('sh', o.leg || SKIN, 7.5)}${s('fo', o.shoes, 5.5)}
    ${o.extra || ''}
    ${s('ua', o.shirt, 6.5)}${s('la', SKIN, 5.5)}`;
}

/** Writes a pose computed by the figure into the person's paths. */
function setPerson(el, p, P) {
  line(el, `${p}torso`, P.hip, P.shoulder);
  el(`${p}head`).setAttribute('transform', `translate(${pt(P.head)}) rotate(${(P.headTilt || 0).toFixed(1)})`);
  const leg = (sfx, foot, knee) => {
    line(el, `${p}th${sfx}`, P.hip, knee);
    line(el, `${p}sh${sfx}`, knee, foot);
    line(el, `${p}fo${sfx}`, [foot[0] - 2, foot[1] - 1], [foot[0] + 6, foot[1]]);
  };
  leg('', P.foot, P.knee);
  leg('2', P.foot2, P.knee2);
  line(el, `${p}ua`, P.shoulder, P.elbow);
  line(el, `${p}la`, P.elbow, P.hand);
  line(el, `${p}ua2`, P.shoulder, P.elbow2);
  line(el, `${p}la2`, P.elbow2, P.hand2);
}

/* ------------------------------------------------------------------ *
 *  Reactions to unsuitable weather.
 *  mood = { cold, hot, wind, rain, calm }, each 0 (fine), 0.5 (borderline)
 *  or 1 (unsuitable). Poses are only used at 1, while the figure stands.
 * ------------------------------------------------------------------ */
function rotAround(p, c, degrees) {
  const a = (degrees * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** The reason that shapes the pose; rain first, it is the most visible. */
function moodReason(mood) {
  if (!mood) return null;
  return ['rain', 'cold', 'wind', 'hot'].find((k) => mood[k] >= 1) || null;
}

/** Leans the upper body around the hip (positive = forward, into the wind). */
function leanPose(P, degrees) {
  ['shoulder', 'head', 'elbow', 'hand', 'elbow2', 'hand2'].forEach((k) => {
    if (P[k]) P[k] = rotAround(P[k], P.hip, degrees);
  });
}

/**
 * Arm and head pose for the reason. keepNear leaves the near arm alone
 * (it holds an umbrella or the handlebar).
 */
function moodPose(P, reason, t, keepNear) {
  if (!reason) return;
  const sh = P.shoulder;
  const hd = P.head;
  const near = (elbow, hand) => { if (!keepNear) { P.elbow = elbow; P.hand = hand; } };
  if (reason === 'cold') {
    // Arms wrapped around the body, head pulled in.
    near([sh[0] + 6, sh[1] + 13], [sh[0] - 5, sh[1] + 7]);
    P.elbow2 = [sh[0] + 4, sh[1] + 14];
    P.hand2 = [sh[0] - 7, sh[1] + 10];
    P.head = [hd[0] - 1, hd[1] + 2.5];
    P.headTilt = 12;
  } else if (reason === 'rain') {
    // Hands held over the head, ducking.
    near([sh[0] + 11, sh[1] - 5], [hd[0] + 2, hd[1] - 8]);
    P.elbow2 = [sh[0] - 8, sh[1] - 6];
    P.hand2 = [hd[0] - 4, hd[1] - 8.5];
    P.head = [hd[0] + 1, hd[1] + 2.5];
    P.headTilt = 14;
  } else if (reason === 'wind') {
    // Shields the face, far arm out for balance.
    near([sh[0] + 12, sh[1] + 5], [hd[0] + 9, hd[1] + 1]);
    P.elbow2 = [sh[0] - 8, sh[1] + 11];
    P.hand2 = [sh[0] - 15, sh[1] + 21];
    P.headTilt = 10;
  } else if (reason === 'hot') {
    // Wipes the forehead now and then, far arm hangs limp.
    const cyc = (t % 2.6) / 2.6;
    const wipe = cyc < 0.5 ? Math.sin(cyc * 2 * Math.PI * 2) : 0;
    near([sh[0] + 13, sh[1] + 1], [hd[0] + 7 - Math.abs(wipe) * 9, hd[1] - 3.5]);
    P.elbow2 = [sh[0] - 1, sh[1] + 14];
    P.hand2 = [sh[0] + 1, sh[1] + 27];
    P.head = [hd[0], hd[1] + Math.sin(t * 9) * 0.6];
    P.headTilt = -8;
  }
}

/** Applies lean and pose for a standing person. */
function moodPerson(P, c, keepNear) {
  const reason = c.pace < 0.3 ? moodReason(c.mood) : null;
  if (reason === 'wind') leanPose(P, 9);
  if (reason === 'rain' || reason === 'cold') leanPose(P, 4);
  moodPose(P, reason, c.t, keepNear);
}

/** Red cheeks when cold or hot. */
function cheeks(root, c) {
  const m = c.mood || {};
  const v = Math.max(m.hot || 0, (m.cold || 0) * 0.7);
  root.querySelectorAll('.cheek').forEach((e) => e.setAttribute('opacity', (v * 0.6).toFixed(2)));
}

/** Running or walking cycle. Foot moves forward in the air, back on the ground. */
function gaitPose(ph, o) {
  const foot = (a) => [o.stride * Math.sin(a), -Math.max(0, Math.cos(a)) * o.lift];
  const bob = o.bob(ph);
  const hip = [0, -o.hipY + bob];
  const shoulder = [o.lean, -o.hipY - 24 + bob];
  const P = { hip, shoulder, head: [o.lean + 3.5, shoulder[1] - 10.5], foot: foot(ph), foot2: foot(ph + Math.PI) };
  P.knee = ik(hip, P.foot, o.thigh, o.shin, 1);
  P.knee2 = ik(hip, P.foot2, o.thigh, o.shin, 1);
  const arm = (swing) => {
    const a = Math.PI / 2 + swing;
    const elbow = polar(shoulder, 14, a);
    return [elbow, polar(elbow, 13, a - o.elbowBend)];
  };
  [P.elbow, P.hand] = arm(o.armSwing * Math.sin(ph));
  [P.elbow2, P.hand2] = arm(-o.armSwing * Math.sin(ph));
  return P;
}

function wheelSvg(id, x) {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const w = (i * Math.PI) / 4;
    return `M0 0 L${(Math.cos(w) * 18).toFixed(1)} ${(Math.sin(w) * 18).toFixed(1)}`;
  }).join(' ');
  return `
    <g transform="translate(${x} 0)">
      <circle r="21" fill="none" stroke="#0B1017" stroke-width="5"/>
      <circle r="18.5" fill="none" stroke="#55657F" stroke-width="1.6"/>
      <path id="${id}" d="${spokes}" stroke="#7E8CA0" stroke-width="0.9"/>
      <circle r="2.6" fill="#C3D0E0"/>
    </g>`;
}

const UMBRELLA = `
  <g id="umb" opacity="0">
    <path d="M0 0 V-32" stroke="#2A3445" stroke-width="2"/>
    <path d="M0 0 q0 5 -4 4.5" stroke="#2A3445" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <g id="umb-c">
    <path d="M-27 -30 Q-25 -54 0 -56 Q25 -54 27 -30 q-4.5 -4 -9 0 q-4.5 -4 -9 0 q-4.5 -4 -9 0 q-4.5 -4 -9 0 q-4.5 -4 -9 0 q-4.5 -4 -9 0 Z" fill="#FF7A1A"/>
    <path d="M0 -56 Q-9 -46 -9 -30 M0 -56 Q9 -46 9 -30" stroke="#C9601A" stroke-width="1.2" fill="none"/>
    <path d="M0 -56 V-60" stroke="#2A3445" stroke-width="2" stroke-linecap="round"/>
    </g>
  </g>`;

const FIGURES = {
  /* ---------------- Cycling ---------------- */
  bike: {
    env: 'road',
    anchor: [250, 211],
    scale: 1.3,
    speed: 150,
    mouth: [37, -70],
    shadow: [6, 60],
    build() {
      return `
        <g id="f-far">
          <path id="f-thigh2" stroke="${DARK_FAR}" stroke-width="9" stroke-linecap="round" fill="none"/>
          <path id="f-shin2" stroke="${SKIN_FAR}" stroke-width="6" stroke-linecap="round" fill="none"/>
          <path id="f-shoe2" stroke="#0B1017" stroke-width="4" stroke-linecap="round"/>
          <path id="f-crank2" stroke="#7E8CA0" stroke-width="3" stroke-linecap="round"/>
        </g>
        ${wheelSvg('f-spk-r', -30)}
        ${wheelSvg('f-spk-f', 38)}
        <path d="M-30 0 L0 4 L-8 -34 Z M-8 -34 L30 -31 M0 4 L33 -22 M30 -31 L33 -22 L38 0"
          fill="none" stroke="#FF7A1A" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M-8 -34 L-9 -39 M30 -31 L32 -38 H37" fill="none" stroke="#A9B8C9" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M37 -38 q6.5 0 5.5 6.5 q-0.8 4 -4.6 3.6" fill="none" stroke="#C3D0E0" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M-16 -40 H-3" stroke="#0B1017" stroke-width="4" stroke-linecap="round"/>
        <circle cx="0" cy="4" r="6" fill="none" stroke="#7E8CA0" stroke-width="2"/>
        <g id="f-body">
          <path id="f-arm2" stroke="#2A62B8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M-9 -44 Q4 -62 20 -63" stroke="#3D8BFF" stroke-width="14" stroke-linecap="round" fill="none"/>
          <path d="M-9 -44 Q4 -62 20 -63" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="3" stroke-linecap="round" fill="none" transform="translate(0 -4)"/>
          <circle cx="29" cy="-71" r="7.5" fill="${SKIN}"/>
          <circle id="f-cheek" cx="32" cy="-68" r="2.3" fill="#FF5F52" opacity="0"/>
          <path d="M20.5 -72.5 a9 9 0 0 1 17.5 -2 l3 1.6 h-5 Z" fill="#FFC107"/>
          <path d="M32 -74.5 h7" stroke="#0B1017" stroke-width="2" stroke-linecap="round"/>
        </g>
        <path id="f-crank" stroke="#C3D0E0" stroke-width="3" stroke-linecap="round"/>
        <path id="f-thigh" stroke="${DARK}" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path id="f-shin" stroke="${SKIN}" stroke-width="6.5" stroke-linecap="round" fill="none"/>
        <path id="f-shoe" stroke="#E8EDF4" stroke-width="4.5" stroke-linecap="round"/>
        <path id="f-arm" stroke="#3D8BFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path id="f-fore" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    },
    update(el, c) {
      const wheel = deg(c.dist / 21);
      el('f-spk-r').setAttribute('transform', `rotate(${wheel.toFixed(1)})`);
      el('f-spk-f').setAttribute('transform', `rotate(${wheel.toFixed(1)})`);
      const crank = (c.dist / 21) * 0.55;
      // When the bike stops the rider slides forward and puts a foot down.
      const stop = 1 - Math.min(1, c.pace * 3);
      const bob = Math.sin(crank * 2) * 0.7 * Math.min(1, c.pace * 2);
      const reason = stop > 0.5 ? moodReason(c.mood) : null;
      const lean = reason === 'wind' ? 8 : reason === 'rain' || reason === 'cold' ? 4 : 0;
      const rotA = -12 * stop + lean;
      const dx = 10 * stop;
      const dy = 9 * stop + bob;
      el('f-body').setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rotA.toFixed(2)} -9 -44)`);
      const tp = (q) => { const r = rotAround(q, [-9, -44], rotA); return [r[0] + dx, r[1] + dy]; };
      const hip = tp([-8, -43]);
      const bb = [0, 4];
      const leg = (a, thigh, shin, shoe, crankEl, ground) => {
        const pedal = polar(bb, 10, a);
        const foot = ground ? lerpPt(pedal, [9, 21], stop) : pedal;
        const knee = ik(hip, foot, 26, 28, 1);
        line(el, thigh, hip, knee);
        line(el, shin, knee, foot);
        line(el, shoe, [foot[0] - 2, foot[1]], [foot[0] + 6, foot[1] + 0.8]);
        line(el, crankEl, bb, pedal);
      };
      leg(crank + Math.PI, 'f-thigh2', 'f-shin2', 'f-shoe2', 'f-crank2', false);
      leg(crank, 'f-thigh', 'f-shin', 'f-shoe', 'f-crank', true);
      const shoulder = tp([19, -62]);
      const P = { hip, shoulder, head: tp([29, -71]) };
      P.hand = [40, -36];
      P.elbow = ik(shoulder, P.hand, 17, 17, -1);
      const s2 = [shoulder[0] - 3, shoulder[1]];
      P.hand2 = [37, -37];
      P.elbow2 = ik(s2, P.hand2, 17, 17, -1);
      // Reaction poses use the arms; the head stays in the body group.
      moodPose(P, reason, c.t, false);
      line(el, 'f-arm', shoulder, P.elbow);
      line(el, 'f-fore', P.elbow, P.hand);
      el('f-arm2').setAttribute('d', `M${pt(s2)} L${pt(P.elbow2)} L${pt(P.hand2)}`);
      el('f-cheek').setAttribute('opacity', (Math.max(c.mood.hot || 0, (c.mood.cold || 0) * 0.7) * 0.6).toFixed(2));
      this.head = tp([29, -71]);
    },
  },

  /* ---------------- Running ---------------- */
  running: {
    env: 'path',
    anchor: [255, 240],
    scale: 1.35,
    speed: 105,
    mouth: [14, -78],
    shadow: [2, 22],
    build() {
      return personSvg('r-', {
        shirt: '#FF7A1A', shirtFar: '#B85412', pants: DARK, pantsFar: DARK_FAR, shoes: '#E8EDF4',
        hat: '<path d="M-7.4 -0.5 A7.4 7.4 0 0 1 6.9 -3 Q1 -5 -7.4 -0.5 Z" fill="#3A2A20"/><path d="M-7.2 -2.2 L7 -3.6" stroke="#22E07A" stroke-width="2.4" stroke-linecap="round"/>',
      });
    },
    update(el, c) {
      const ph = c.dist / 16;
      const k = Math.min(1, c.pace * 1.6);
      const P = gaitPose(ph, {
        stride: 6 + 10 * k, lift: 3 + 9 * k, hipY: 44, lean: 4 + 4 * k, thigh: 22, shin: 23,
        bob: (a) => -Math.abs(Math.cos(a)) * 2.4 * k, armSwing: 0.25 + 0.6 * k, elbowBend: 1.25 + 0.4 * k,
      });
      moodPerson(P, c, false);
      setPerson(el, 'r-', P);
      cheeks(this.root, c);
      this.head = P.head;
    },
  },

  /* ---------------- Walking ---------------- */
  walking: {
    env: 'path',
    anchor: [255, 240],
    scale: 1.35,
    speed: 48,
    mouth: [11, -79],
    shadow: [0, 20],
    build() {
      return personSvg('w-', {
        shirt: '#00B3AF', shirtFar: '#007F7C', pants: '#2A3445', pantsFar: '#1C2430', shoes: '#4A3426',
        leg: '#2A3445', legFar: '#1C2430', extra: UMBRELLA,
      });
    },
    update(el, c) {
      const ph = c.dist / 12;
      const k = Math.min(1, c.pace * 1.6);
      const P = gaitPose(ph, {
        stride: 3 + 9 * k, lift: 1 + 3.5 * k, hipY: 45, lean: 1.5, thigh: 22, shin: 23.5,
        bob: (a) => -(1 - Math.abs(Math.sin(a))) * 1.4 * k, armSwing: 0.1 + 0.32 * k, elbowBend: 0.3,
      });
      // With rain the near hand holds an umbrella, tilted into the wind.
      const umbrella = c.look.rain > 0;
      el('umb').setAttribute('opacity', umbrella ? '1' : '0');
      if (umbrella) {
        P.elbow = [P.shoulder[0] + 3, P.shoulder[1] + 13];
        P.hand = [P.shoulder[0] + 11, P.shoulder[1] + 5];
        const storm = (c.mood.wind || 0) >= 1;
        const shake = storm ? 9 : clamp(c.look.wind / 12, 0.4, 4);
        const tilt = 6 + clamp(c.look.wind, 0, 60) * 0.35 + Math.sin(c.t * (storm ? 11 : 5)) * shake;
        el('umb').setAttribute('transform', `translate(${pt(P.hand)}) rotate(${tilt.toFixed(1)})`);
        // Storm turns the umbrella inside out.
        el('umb-c').setAttribute('transform', storm ? `translate(0 ${(-60 + Math.sin(c.t * 13) * 1.5).toFixed(1)}) scale(1 -1)` : '');
      }
      moodPerson(P, c, umbrella);
      setPerson(el, 'w-', P);
      cheeks(this.root, c);
      this.head = P.head;
    },
  },

  /* ---------------- Boating ---------------- */
  boating: {
    env: 'water',
    anchor: [270, 224],
    scale: 1.55,
    speed: 130,
    mouth: [-6, -26],
    shadow: null,
    build() {
      const foam = Array.from({ length: 18 }, (_, i) => `<circle class="foam" id="fm${i}" r="3"/>`).join('');
      return `
        <g id="wake">${foam}</g>
        <g id="boat">
          <path d="M-56 -10 h9 v14 h-9 Z" fill="#2A3445"/>
          <path d="M-46 -8 L46 -8 L60 -16 Q54 2 36 8 L-40 8 Q-46 5 -46 -8 Z" fill="#E8EDF4"/>
          <path d="M-45 -1 L52 -1" stroke="#3D8BFF" stroke-width="3"/>
          <path d="M-45 4 L40 4" stroke="#C3D0E0" stroke-width="1" opacity="0.6"/>
          <circle cx="-14" cy="-22" r="6.5" fill="${SKIN}"/>
          <path d="M-21 -23 a7 7 0 0 1 14 -1.5 h3 v1.5 h-17 Z" fill="#FF5F52"/>
          <path d="M-20 -8 V-14 Q-20 -16 -14 -16 Q-8 -16 -8 -14 V-8 Z" fill="#FF7A1A"/>
          <path d="M-4 -8 L6 -24 H20 L30 -8 Z" fill="#2A3445"/>
          <path d="M9 -21 H19 L25 -11 H3 Z" fill="#6BB7E8" opacity="0.65"/>
        </g>`;
    },
    init() { this.foam = null; },
    update(el, c) {
      const sea = 1 + clamp(c.look.wind, 0, 60) * 0.06;
      const bob = Math.sin(c.t * 1.9) * 1.2 * sea;
      const pitch = Math.sin(c.t * 1.5 + 0.7) * 1.4 * sea - c.pace * 2.5;
      el('boat').setAttribute('transform', `translate(0 ${bob.toFixed(2)}) rotate(${pitch.toFixed(2)} 0 4)`);
      this.head = [-14, -22 + bob];
      // Foam trail behind the stern, carried away with the boat's speed.
      if (!this.foam) {
        this.foam = Array.from({ length: 18 }, (_, i) => ({ el: el(`fm${i}`), age: i / 18, x: 0, y: 0, r: 2 }));
      }
      const vx = c.v / 1.55;
      this.foam.forEach((f) => {
        f.age += c.dt / 1.4;
        if (f.age >= 1) {
          f.age -= 1;
          f.x = -50 + rnd(-3, 3);
          f.y = 6 + rnd(-2, 3) + bob;
          f.r = rnd(1.5, 3.5);
        }
        f.x -= vx * c.dt;
        f.el.setAttribute('cx', f.x.toFixed(1));
        f.el.setAttribute('cy', (f.y + f.age * 3).toFixed(1));
        f.el.setAttribute('r', (f.r * (1 + f.age * 1.5)).toFixed(1));
        f.el.style.opacity = (c.pace * 0.75 * (1 - f.age)).toFixed(2);
      });
    },
  },

  /* ---------------- Sailing ---------------- */
  sailing: {
    env: 'water',
    anchor: [285, 228],
    scale: 1.25,
    speed: 75,
    mouth: [-12, -18],
    shadow: null,
    build() {
      return `
        <g id="yacht">
          <path id="main" fill="#F2F6FB"/>
          <path id="main-sh" fill="#C3D0E0" opacity="0.55"/>
          <path id="jib" fill="#E8EDF4"/>
          <path d="M2 -2 V-98" stroke="#C3D0E0" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M2 -9 L-36 -9" stroke="#A9B8C9" stroke-width="2.4" stroke-linecap="round"/>
          <path id="flag" fill="#FF5F52"/>
          <path d="M-42 -3 H44 Q38 10 22 12 H-32 Q-40 10 -42 -3 Z" fill="#E8EDF4"/>
          <path d="M-41 2 H40" stroke="#FF5F52" stroke-width="2.6"/>
          <circle cx="-18" cy="-12" r="5.6" fill="${SKIN}"/>
          <path d="M-24 -12.5 a6 6 0 0 1 12 -1 h2 v1 h-14 Z" fill="#E8EDF4"/>
          <path d="M-23 -3 V-6 Q-23 -8 -18 -8 Q-13 -8 -13 -6 V-3 Z" fill="#FF7A1A"/>
        </g>`;
    },
    update(el, c) {
      const wind = clamp(c.look.wind, 0, 60);
      const sea = 1 + wind * 0.05;
      // Wind comes from the right, the boat heels to the left.
      const heel = -(3 + wind * 0.42) * (0.35 + 0.65 * Math.min(1, c.pace * 1.5)) * (1 - (c.mood.calm || 0) * 0.8)
        + Math.sin(c.t * 1.3) * 1.5 * sea;
      const bob = Math.sin(c.t * 1.7) * 1.3 * sea;
      el('yacht').setAttribute('transform', `translate(0 ${bob.toFixed(2)}) rotate(${heel.toFixed(2)} 0 8)`);
      // Sails fill with the wind and flutter a little.
      // Calm: sails hang slack and flap. Storm: mainsail reefed, jib down.
      const calm = c.mood.calm || 0;
      const reef = (c.mood.wind || 0) >= 1 ? 1 : 0;
      this.reef = lerp(this.reef || 0, reef, Math.min(1, c.dt * 1.5));
      const flap = calm ? Math.sin(c.t * 3.1) * 4 * calm : 0;
      const belly = (6 + wind * 0.45) * (1 - calm * 0.85) + Math.sin(c.t * 7) * (0.4 + wind * 0.02) + flap;
      const top = lerp(-96, -58, this.reef);
      el('main').setAttribute('d', `M3 ${top.toFixed(1)} L3 -10 L-35 -10 Q${(-14 - belly).toFixed(1)} ${((top - 10) / 2).toFixed(1)} 3 ${top.toFixed(1)} Z`);
      el('main-sh').setAttribute('d', `M3 ${top.toFixed(1)} L3 -10 L-8 -10 Q${(-3 - belly * 0.35).toFixed(1)} ${((top - 10) / 2).toFixed(1)} 3 ${top.toFixed(1)} Z`);
      el('jib').setAttribute('d', `M3 -86 L42 -4 L10 -6 Q${(4 - belly * 0.5).toFixed(1)} -40 3 -86 Z`);
      el('jib').style.opacity = (1 - this.reef).toFixed(2);
      this.head = [-18, -12 + bob];
      const fl = Math.sin(c.t * (6 + wind * 0.25)) * 2.5;
      el('flag').setAttribute('d', `M2 -98 L-12 ${(-96 + fl).toFixed(1)} L2 -92 Z`);
    },
  },

  /* ---------------- Football ---------------- */
  football: {
    env: 'pitch',
    anchor: [175, 242],
    scale: 1.35,
    speed: 1,
    mouth: [14, -79],
    shadow: [2, 22],
    build() {
      const net = [];
      for (let i = 0; i <= 6; i += 1) net.push(`M${236 + i * 8} ${-66 + i * 1.5} V0`);
      for (let j = 1; j <= 7; j += 1) net.push(`M236 ${-66 + j * 9.4} L284 ${-57 + j * 8.1}`);
      return `
        <g id="goal">
          <g id="net"><path d="${net.join(' ')}" stroke="#C3D0E0" stroke-width="0.8" opacity="0.55" fill="none"/></g>
          <path d="M236 0 V-66 L284 -57 V0" stroke="#E8EDF4" stroke-width="3.2" fill="none" stroke-linejoin="round"/>
          <path d="M284 -57 L284 0" stroke="#A9B8C9" stroke-width="2"/>
        </g>
        ${personSvg('k-', {
    shirt: '#FF5F52', shirtFar: '#B8433A', pants: '#E8EDF4', pantsFar: '#A9B8C9', shoes: '#0B1017',
    leg: '#E8EDF4', legFar: '#A9B8C9',
  })}
        <ellipse id="ball-sh" rx="7" ry="1.6" fill="#000" opacity="0.3"/>
        <g id="ball">
          <circle r="6.5" fill="#F2F6FB" stroke="#0B1017" stroke-width="1"/>
          <g id="ball-spin"><path d="M0 -2.4 L2.3 -0.7 L1.4 2 H-1.4 L-2.3 -0.7 Z M0 -2.4 V-6.5 M2.3 -0.7 L6.2 -2 M1.4 2 L3.8 5.2 M-1.4 2 L-3.8 5.2 M-2.3 -0.7 L-6.2 -2" fill="#0B1017" stroke="#0B1017" stroke-width="0.8"/></g>
        </g>`;
    },
    update(el, c) {
      // One shot every 2.6 s of pace time: run up, kick, ball flies into the net.
      const P_LEN = 2.6;
      const tau = c.dist % P_LEN;
      const still = c.pace < 0.02;
      const plant = [-3, 0];
      const kick = still ? [5, 0] : keyed([
        [0, [5, 0]], [0.35, [-6, -3]], [0.55, [-18, -9]], [0.7, [12, -4]], [0.82, [22, -15]], [1.1, [5, 0]],
      ], tau, lerpPt);
      const lean = still ? 2 : keyed([[0, 3], [0.55, -2], [0.72, 7], [1.1, 3]], tau, lerp);
      const hip = [0, -44];
      const shoulder = [lean + 2, -68];
      const P = { hip, shoulder, head: [lean + 5, -78.5], foot: kick, foot2: plant };
      P.knee = ik(hip, P.foot, 22, 23, 1);
      P.knee2 = ik(hip, P.foot2, 22, 23, 1);
      const sw = still ? 0 : keyed([[0, 0], [0.55, 0.9], [0.75, -0.7], [1.2, 0]], tau, lerp);
      P.elbow = polar(shoulder, 14, Math.PI / 2 - sw);
      P.hand = polar(P.elbow, 13, Math.PI / 2 - sw - 0.5);
      P.elbow2 = polar(shoulder, 14, Math.PI / 2 + sw * 0.8);
      P.hand2 = polar(P.elbow2, 13, Math.PI / 2 + sw * 0.8 - 0.5);
      moodPerson(P, c, false);
      setPerson(el, 'k-', P);
      cheeks(this.root, c);
      this.head = P.head;

      // Ball: rests at the foot, flies on an arc after the kick, drifts with the wind.
      const start = [14, -6.5];
      const target = [262, -36];
      let b = start;
      let spin = 0;
      let opacity = 1;
      let bulge = 0;
      if (!still) {
        if (tau > 0.7 && tau <= 1.5) {
          const f = (tau - 0.7) / 0.8;
          const drift = -clamp(c.look.wind, 0, 60) * 0.25 * Math.sin(f * Math.PI);
          b = [lerp(start[0], target[0], f) + drift, lerp(start[1], target[1], f) - Math.sin(f * Math.PI) * 55];
          spin = f * 720;
        } else if (tau > 1.5) {
          const f = Math.min(1, (tau - 1.5) / 0.35);
          b = [target[0] + 10 * f, lerp(target[1], -6.5, f * f)];
          bulge = Math.sin(Math.min(1, (tau - 1.5) / 0.5) * Math.PI) * 6;
          opacity = tau > 2.2 ? Math.max(0, 1 - (tau - 2.2) / 0.25) : 1;
        } else if (tau < 0.25 && c.dist > P_LEN) {
          opacity = tau / 0.25;
        }
      }
      el('ball').setAttribute('transform', `translate(${pt(b)})`);
      el('ball').style.opacity = opacity.toFixed(2);
      el('ball-spin').setAttribute('transform', `rotate(${spin.toFixed(0)})`);
      el('ball-sh').setAttribute('cx', b[0].toFixed(1));
      el('ball-sh').setAttribute('cy', '0.5');
      el('ball-sh').style.opacity = (opacity * 0.3 * clamp(1 + b[1] / 60, 0.2, 1)).toFixed(2);
      el('net').setAttribute('transform', `translate(${bulge.toFixed(1)} 0)`);
    },
  },

  /* ---------------- Grilling ---------------- */
  bbq: {
    env: 'garden',
    anchor: [300, 236],
    scale: 1.3,
    speed: 1,
    mouth: [-62, -80],
    shadow: [0, 40],
    build() {
      const flames = [-16, -6, 4, 14].map((x, i) => `<path class="flame" id="fl${i}" d="M0 0 Q-4 -6 0 -14 Q4 -6 0 0 Z" transform="translate(${x} -40)"/>`).join('');
      const smoke = Array.from({ length: 8 }, (_, i) => `<circle class="smoke" id="sm${i}" r="4"/>`).join('');
      return `
        ${personSvg('c-', {
    shirt: '#E8EDF4', shirtFar: '#A9B8C9', pants: '#2A3445', pantsFar: '#1C2430', shoes: '#0B1017',
    leg: '#2A3445', legFar: '#1C2430',
    hat: '<path d="M-6.5 -4 V-9 a4 4 0 0 1 3 -6 a4.5 4.5 0 0 1 7 0 a4 4 0 0 1 3 6 V-4 Z" fill="#F2F6FB" stroke="#C3D0E0" stroke-width="0.8"/>',
    extra: '<path id="tongs" stroke="#A9B8C9" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
  })}
        <path d="M-74 -46 H-56 V-20 Q-65 -16 -74 -20 Z" fill="#FF5F52" opacity="0.9" id="apron"/>
        <g id="smokes">${smoke}</g>
        <path d="M-18 -22 L-27 0 M18 -22 L27 0 M0 -16 V0" stroke="#2A3445" stroke-width="3" stroke-linecap="round"/>
        <circle cx="27" cy="0" r="3.5" fill="#0B1017"/>
        <ellipse id="coals" cx="0" cy="-36" rx="24" ry="4" fill="#FF7A1A" opacity="0.6"/>
        <g id="flames">${flames}</g>
        <path d="M-30 -40 H30 A30 24 0 0 1 -30 -40 Z" fill="#1F2733" stroke="#3A4658" stroke-width="1.5"/>
        <path d="M-28 -41 H28" stroke="#7E8CA0" stroke-width="1.6"/>
        <g id="sausages">
          <rect id="sg0" x="-20" y="-47" width="12" height="5.5" rx="2.75" fill="#B5532F"/>
          <rect id="sg1" x="-5" y="-47" width="12" height="5.5" rx="2.75" fill="#A84A2A"/>
          <rect id="sg2" x="10" y="-47" width="12" height="5.5" rx="2.75" fill="#B5532F"/>
        </g>
        <g id="lid">
          <path d="M-30 -40 A30 24 0 0 1 30 -40 Z" fill="#2A3445" stroke="#3A4658" stroke-width="1.5"/>
          <path d="M-5 -63 H5" stroke="#A9B8C9" stroke-width="3" stroke-linecap="round"/>
        </g>`;
    },
    update(el, c) {
      if (!this.smoke) {
        this.smoke = Array.from({ length: 8 }, (_, i) => ({ el: el(`sm${i}`), age: i / 8, x: 0 }));
        this.lid = 0;
      }
      const t = c.t;
      const open = c.pace > 0.02;
      // Lid swings open when grilling is on, stays shut otherwise.
      this.lid += ((open ? 1 : 0) - this.lid) * Math.min(1, c.dt * 2);
      el('lid').setAttribute('transform', `rotate(${(this.lid * 118).toFixed(1)} 30 -40)`);
      const heat = c.pace * this.lid;
      for (let i = 0; i < 4; i += 1) {
        const f = el(`fl${i}`);
        const s = 0.55 + 0.45 * Math.abs(Math.sin(t * (7 + i) + i * 1.7));
        f.setAttribute('transform', `translate(${-16 + i * 10} -40) scale(${(0.8 + 0.2 * Math.sin(t * 9 + i)).toFixed(2)} ${(s * heat).toFixed(2)})`);
      }
      el('coals').setAttribute('opacity', (0.15 + heat * (0.45 + 0.15 * Math.sin(t * 5))).toFixed(2));
      // Sausages sizzle; the middle one gets turned now and then.
      const flip = (t * c.pace * 0.5) % 1;
      el('sg1').setAttribute('transform', flip < 0.15 && open ? `translate(0 ${(-Math.sin((flip / 0.15) * Math.PI) * 6).toFixed(1)})` : '');
      ['sg0', 'sg2'].forEach((id, i) => el(id).setAttribute('transform', `translate(0 ${(Math.sin(t * 23 + i) * 0.3 * heat).toFixed(2)})`));
      // Smoke rises and is carried off by the wind.
      const wind = clamp(c.look.wind, 0, 60);
      this.smoke.forEach((p) => {
        p.age += c.dt / 2.4;
        if (p.age >= 1) { p.age -= 1; p.x = rnd(-10, 10); }
        const a = p.age;
        const x = p.x - a * (8 + wind * 1.6) + Math.sin(a * 6 + p.x) * 3;
        const y = -50 - a * (60 - wind * 0.6);
        p.el.setAttribute('cx', x.toFixed(1));
        p.el.setAttribute('cy', y.toFixed(1));
        p.el.setAttribute('r', (3 + a * 10).toFixed(1));
        p.el.style.opacity = (0.5 * heat * Math.sin(a * Math.PI)).toFixed(2);
      });
      // Cook stands left of the grill and works the tongs.
      const work = open ? Math.max(0, Math.sin(t * 2.2 * Math.max(0.3, c.pace))) : 0;
      const hip = [-68, -44];
      const shoulder = [-66, -68];
      const P = {
        hip, shoulder, head: [-63, -78.5], foot: [-60, 0], foot2: [-72, 0],
        headTilt: 8,
      };
      P.knee = ik(hip, P.foot, 22, 23, 1);
      P.knee2 = ik(hip, P.foot2, 22, 23, 1);
      P.elbow = [-56, -56 - work * 3];
      P.hand = [-44, -54 - work * 8];
      P.elbow2 = [-70, -54];
      P.hand2 = [-64, -46];
      moodPerson(P, c, false);
      setPerson(el, 'c-', P);
      cheeks(this.root, c);
      this.head = P.head;
      if (moodReason(c.mood) && c.pace < 0.3) el('tongs').setAttribute('d', '');
      else line(el, 'tongs', P.hand, [-14, -50 - work * 6]);
    },
  },
};

/* ------------------------------------------------------------------ *
 *  Water surface, repeats every 600 units.
 * ------------------------------------------------------------------ */
function wavePath(base, amp, k, phase, closed) {
  let d = closed ? `M0 ${SC.H}` : '';
  for (let x = 0; x <= 1200; x += 8) {
    const y = base + amp * Math.sin((2 * Math.PI * k * x) / 600 + phase)
      + amp * 0.35 * Math.sin((2 * Math.PI * (2 * k + 1) * x) / 600 + phase * 2);
    d += `${d ? ' L' : 'M'}${x} ${y.toFixed(1)}`;
  }
  return closed ? `${d} L1200 ${SC.H} Z` : d;
}

/* ------------------------------------------------------------------ *
 *  Scene: sky, sun, clouds, landscape, figure and weather.
 * ------------------------------------------------------------------ */
class WeatherScene {
  constructor(root, activity) {
    this.root = root;
    // Each card gets its own copy, figures keep particle state.
    this.figure = Object.create(FIGURES[activity] || FIGURES.bike);
    if (this.figure.init) this.figure.init();
    this.env = this.figure.env;
    this.look = weatherLook(null);
    this.mood = {};
    this.pace = 0;
    this.paceTarget = 0;
    this.dist = 0;
    this.t = 0;
    this.drops = [];
    this.splashes = [];
    this.streaks = [];
    this.puffs = [];
    this.trees = [];
    this.clouds = [];
    this.caps = [];
  }

  _ground() {
    const R = SC.ROAD_Y;
    const below = `<rect id="verge" y="${R + SC.ROAD_H}" width="${SC.W}" height="${SC.H - R - SC.ROAD_H}" fill="#121C16"/>`;
    switch (this.env) {
      case 'road':
        return `
          <rect y="${R}" width="${SC.W}" height="${SC.ROAD_H}" fill="#1F2733"/>
          <rect id="wet" y="${R}" width="${SC.W}" height="${SC.ROAD_H}" fill="#5C82B0" opacity="0"/>
          <path d="M0 ${R + 0.5} H${SC.W}" stroke="#2E3848" stroke-width="1.5"/>
          <path id="road-dash" d="M-60 ${R + 17} H${SC.W + 60}" stroke="#55657F" stroke-width="2.5" stroke-dasharray="22 18"/>
          ${below}`;
      case 'path':
        return `
          <rect y="${R}" width="${SC.W}" height="${SC.ROAD_H}" fill="#3A3229"/>
          <rect id="wet" y="${R}" width="${SC.W}" height="${SC.ROAD_H}" fill="#5C82B0" opacity="0"/>
          <path d="M0 ${R + 0.5} H${SC.W} M0 ${R + SC.ROAD_H - 0.5} H${SC.W}" stroke="#4A4034" stroke-width="1.5"/>
          <path id="road-dash" d="M-60 ${R + 9} H${SC.W + 60} M-52 ${R + 22} H${SC.W + 60}" stroke="#5E5444" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 17"/>
          ${below}`;
      case 'pitch': {
        const stripes = Array.from({ length: 8 }, (_, i) => `<rect x="${i * 75}" y="${SC.HORIZON + 14}" width="75" height="${SC.H - SC.HORIZON - 14}" fill="${i % 2 ? '#1D4029' : '#183722'}"/>`).join('');
        return `
          <rect y="${SC.HORIZON}" width="${SC.W}" height="14" fill="#1F2733"/>
          <path d="M0 ${SC.HORIZON + 3} H${SC.W}" stroke="#3D8BFF" stroke-width="3" opacity="0.5"/>
          <g id="field">${stripes}</g>
          <path d="M0 ${SC.HORIZON + 22} H${SC.W}" stroke="#E8EDF4" stroke-width="2" opacity="0.7"/>`;
      }
      case 'garden': {
        const pickets = Array.from({ length: 31 }, (_, i) => `<path d="M${i * 20 + 4} ${SC.HORIZON - 26} l4 -5 l4 5 V${SC.HORIZON + 6} h-8 Z"/>`).join('');
        const planks = Array.from({ length: 6 }, (_, i) => `M0 ${R + 4 + i * 8} H${SC.W}`).join(' ');
        return `
          <g fill="#5A4636" opacity="0.95">${pickets}</g>
          <path d="M0 ${SC.HORIZON - 16} H${SC.W} M0 ${SC.HORIZON - 2} H${SC.W}" stroke="#4A3828" stroke-width="4"/>
          <rect y="${R}" width="${SC.W}" height="${SC.H - R}" fill="#4A3727"/>
          <path d="${planks}" stroke="#3A2B1E" stroke-width="1.4"/>
          <rect id="wet" y="${R}" width="${SC.W}" height="${SC.H - R}" fill="#5C82B0" opacity="0"/>`;
      }
      default:
        return '';
    }
  }

  svg() {
    const fig = this.figure;
    const water = this.env === 'water';
    const clouds = Array.from({ length: 6 }, (_, i) => `
      <g class="cloud" id="cloud${i}">
        <circle cx="-22" cy="4" r="14"/><circle cx="0" cy="-6" r="20"/><circle cx="24" cy="3" r="15"/>
        <rect x="-36" y="3" width="74" height="16" rx="8"/>
      </g>`).join('');
    const trees = [1, 0.8, 1.15, 0.9, 1.05].map((s, i) => `
      <g id="tree${i}">
        <g id="tree${i}-s" transform="scale(${s})">
          <rect x="-2.5" y="-30" width="5" height="30" rx="2" fill="#2E2620"/>
          <circle cx="0" cy="-42" r="16" fill="#1D4A37"/>
          <circle cx="-10" cy="-33" r="11" fill="#1A4232"/>
          <circle cx="10" cy="-34" r="12" fill="#22553F"/>
          <circle cx="3" cy="-48" r="8" fill="#2A6449" opacity="0.8"/>
          <path class="snowcap" d="M-15 -46 a16 16 0 0 1 30 -2 q-6 -3 -10 0 q-6 -4 -10 0 q-5 -2 -10 2 Z" fill="#EEF4FA" opacity="0"/>
        </g>
      </g>`).join('');
    const drops = Array.from({ length: SC.RAIN_POOL }, (_, i) => `<path class="drop" id="d${i}"/>`).join('');
    const flakes = Array.from({ length: SC.RAIN_POOL }, (_, i) => `<circle class="flake" id="s${i}" r="2"/>`).join('');
    const splashes = Array.from({ length: SC.SPLASH_POOL }, (_, i) => `<ellipse class="splash" id="p${i}" rx="0" ry="0"/>`).join('');
    const streaks = Array.from({ length: SC.STREAKS }, (_, i) => `<path class="streak" id="w${i}" d="M0 0 q22 -5 44 0 t44 0"/>`).join('');
    const puffs = Array.from({ length: 5 }, (_, i) => `<circle class="puff" id="b${i}" r="3"/>`).join('');
    const caps = Array.from({ length: 12 }, (_, i) => `<path class="cap" id="cp${i}" d="M-5 0 q5 -3.5 10 0"/>`).join('');

    const land = water ? `
      <rect id="sea" y="180" width="${SC.W}" height="${SC.H - 180}" fill="url(#seag)"/>
      <g id="waves">
        ${[0, 1, 2].map((i) => `<g id="wv${i}"><path id="wvf${i}"/><path id="wvc${i}" class="crest"/></g>`).join('')}
      </g>
      <g id="caps">${caps}</g>` : `
      <path id="hills-near" d="${hillPath(178, [[10, 2, 2.1], [6, 5, 0.2]])}" fill="#16261E"/>
      <rect y="${SC.HORIZON}" width="${SC.W}" height="${SC.H - SC.HORIZON}" fill="url(#grass)"/>
      <rect id="snow-ground" y="${SC.HORIZON}" width="${SC.W}" height="${SC.H - SC.HORIZON}" fill="url(#snowg)" opacity="0"/>
      <g id="trees">${trees}</g>
      ${this._ground()}`;

    const shadow = fig.shadow
      ? `<ellipse cx="${fig.anchor[0] + fig.shadow[0] * fig.scale}" cy="${fig.anchor[1] + 1}" rx="${fig.shadow[1] * fig.scale}" ry="4" fill="#000" opacity="0.3"/>`
      : '';

    return `
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop id="sky-top" offset="0" stop-color="#10223D"/>
          <stop id="sky-bot" offset="1" stop-color="#2C5486"/>
        </linearGradient>
        <radialGradient id="sunglow">
          <stop offset="0" stop-color="#FFC44D" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#FFC44D" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="frost" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stop-color="#BFE3FF" stop-opacity="0"/>
          <stop offset="1" stop-color="#BFE3FF" stop-opacity="0.55"/>
        </radialGradient>
        <linearGradient id="heatg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFB050" stop-opacity="0.05"/>
          <stop offset="1" stop-color="#FF7A1A" stop-opacity="0.55"/>
        </linearGradient>
        <linearGradient id="overcastg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1E252F" stop-opacity="1"/>
          <stop offset="0.55" stop-color="#2A333F" stop-opacity="0.85"/>
          <stop offset="1" stop-color="#2A333F" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="snowg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#E6EEF7"/><stop offset="1" stop-color="#AFC0D4"/>
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1A2D22"/><stop offset="1" stop-color="#111C16"/>
        </linearGradient>
        <linearGradient id="seag" x1="0" y1="0" x2="0" y2="1">
          <stop id="sea-top" offset="0" stop-color="#2B5F8C"/><stop id="sea-bot" offset="1" stop-color="#0B1B2C"/>
        </linearGradient>
      </defs>

      <rect width="${SC.W}" height="${SC.H}" fill="url(#sky)"/>
      <g id="sun" transform="translate(500 62)">
        <circle id="sun-glow" r="70" fill="url(#sunglow)"/>
        <g id="sun-rays" stroke="#FFC44D" stroke-width="3" stroke-linecap="round">
          ${Array.from({ length: 12 }, (_, i) => {
    const w = (i * Math.PI) / 6;
    return `<path d="M${(Math.cos(w) * 28).toFixed(1)} ${(Math.sin(w) * 28).toFixed(1)} L${(Math.cos(w) * 37).toFixed(1)} ${(Math.sin(w) * 37).toFixed(1)}"/>`;
  }).join('')}
        </g>
        <circle r="21" fill="#FFC44D"/>
        <circle r="21" fill="none" stroke="#FFE08A" stroke-width="2" opacity="0.6"/>
      </g>
      <rect id="overcast" width="${SC.W}" height="${SC.HORIZON}" fill="url(#overcastg)" opacity="0"/>
      <g id="clouds">${clouds}</g>
      <path id="hills-far" d="${hillPath(water ? 168 : 150, [[14, 1, 0.4], [9, 3, 1.3], [4, 7, 2]])}" fill="#1A2A3E"/>
      ${land}

      ${shadow}
      <g id="haze">${Array.from({ length: 6 }, (_, i) => `<path class="haze" id="hz${i}" d="M0 0 q3 -6 0 -12 t0 -12 t0 -12"/>`).join('')}</g>
      <g id="fig" transform="translate(${fig.anchor[0]} ${fig.anchor[1]}) scale(${fig.scale || 1})">${fig.build()}</g>
      <g id="puffs">${puffs}</g>
      <g id="fx">
        ${Array.from({ length: 6 }, (_, i) => `<path class="sweat" id="sw${i}" d="M0 -3.2 Q2.2 0 0 2.2 Q-2.2 0 0 -3.2 Z"/>`).join('')}
        <path class="shiver" id="shv" d="M-17 -6 q-3.5 6 0 12 M-22 -9 q-4.5 9 0 18 M17 -6 q3.5 6 0 12 M22 -9 q4.5 9 0 18"/>
        ${Array.from({ length: 7 }, (_, i) => `<path class="leaf" id="lf${i}" d="M-4 0 Q0 -4 4 0 Q0 4 -4 0 Z" fill="${['#7A9A3A', '#C9A227', '#A0632B'][i % 3]}"/>`).join('')}
      </g>

      <g id="splashes">${splashes}</g>
      <g id="drops">${drops}</g>
      <g id="flakes">${flakes}</g>
      <g id="streaks">${streaks}</g>
      <rect id="frost-o" width="${SC.W}" height="${SC.H}" fill="url(#frost)" opacity="0" pointer-events="none"/>
      <rect id="heat-o" width="${SC.W}" height="${SC.H}" fill="url(#heatg)" opacity="0" pointer-events="none"/>
      <rect id="shade" width="${SC.W}" height="${SC.H}" fill="#06090D" opacity="0" pointer-events="none"/>`;
  }

  /** Called once after svg() was inserted. */
  attach(byId) {
    this.$ = byId;
    const top = this.env === 'water' ? 182 : SC.HORIZON + 6;
    this.landTop = top;
    for (let i = 0; i < SC.RAIN_POOL; i += 1) {
      this.drops.push({ el: byId(`d${i}`), fl: byId(`s${i}`), x: rnd(-60, 680), y: rnd(-SC.H, SC.H), land: rnd(top, SC.H), r: rnd(1.4, 2.6), ph: rnd(0, 6) });
    }
    for (let i = 0; i < SC.SPLASH_POOL; i += 1) this.splashes.push({ el: byId(`p${i}`), age: 1 });
    for (let i = 0; i < SC.STREAKS; i += 1) this.streaks.push({ el: byId(`w${i}`), x: rnd(0, 800), y: rnd(30, 200), s: rnd(0.7, 1.3) });
    for (let i = 0; i < 5; i += 1) this.puffs.push({ el: byId(`b${i}`), age: i / 5 });
    this.sweat = Array.from({ length: 6 }, (_, i) => ({ el: byId(`sw${i}`), age: 1, x: 0, y: 0, vx: 0, vy: 0 }));
    this.haze = Array.from({ length: 6 }, (_, i) => ({ el: byId(`hz${i}`), age: i / 6, x: 60 + i * 95 }));
    this.leaves = Array.from({ length: 7 }, (_, i) => ({ el: byId(`lf${i}`), x: rnd(0, 900), y: rnd(60, 230), r: rnd(0, 360), s: rnd(0.8, 1.4) }));
    if (this.env !== 'water') {
      // Static places get their trees spread behind the action.
      const xs = this.env === 'pitch' ? [30, 120, 330, 420, 560] : this.env === 'garden' ? [40, 150, 450, 540, 640] : [40, 190, 330, 470, 610];
      xs.forEach((x, i) => this.trees.push({ el: byId(`tree${i}`), sway: byId(`tree${i}-s`), x, ph: rnd(0, 6), s: [1, 0.8, 1.15, 0.9, 1.05][i] }));
    } else {
      for (let i = 0; i < 12; i += 1) this.caps.push({ el: byId(`cp${i}`), row: i % 3, x: rnd(0, 620), age: rnd(0, 1) });
    }
    [[60, 52, 1], [210, 34, 0.8], [350, 70, 1.1], [470, 40, 0.9], [580, 84, 0.75], [700, 56, 1]].forEach(([x, y, s], i) => {
      this.clouds.push({ el: byId(`cloud${i}`), x, y, s });
    });
    this.setLook(this.look, 0);
  }

  /** New forecast: colours and shapes are set here, motion in step(). */
  setLook(look, pace, mood) {
    this.look = look;
    this.paceTarget = pace;
    this.mood = mood || {};
    const $ = this.$;
    if (!$) return;
    // When cold or heat is the problem, the scene shows it more clearly.
    const L = {
      ...look,
      cold: Math.max(look.cold, (this.mood.cold || 0) * 0.75),
      hot: Math.max(look.hot, this.mood.hot || 0),
    };
    // Clear day sky turns grey with clouds, warm at the horizon when hot,
    // pale blue when cold.
    let top = mix('#1C5A9E', '#2A323D', L.cloud);
    top = mix(top, '#3F6FA0', L.hot * 0.3 * (1 - L.cloud));
    let bot = mix('#7DB6E6', '#56616F', L.cloud);
    bot = mix(bot, '#F2B067', L.hot * 0.6 * (1 - L.cloud));
    top = mix(top, '#4F7AA6', L.cold * 0.35 * (1 - L.cloud));
    bot = mix(bot, '#C9DDF0', L.cold * 0.5);
    $('sky-top').setAttribute('stop-color', top);
    $('sky-bot').setAttribute('stop-color', bot);
    $('hills-far').setAttribute('fill', mix(bot, '#1B3048', 0.62));
    $('overcast').setAttribute('opacity', clamp((L.cloud - 0.35) * 1.4, 0, 0.95).toFixed(2));

    const snowy = L.snow && (L.rain > 0 || L.cold > 0.6);
    if (this.env === 'water') {
      const seaTop = mix(bot, '#164A73', 0.55);
      $('sea-top').setAttribute('stop-color', seaTop);
      $('sea-bot').setAttribute('stop-color', mix(seaTop, '#08131F', 0.8));
      const wind = clamp(L.wind || 0, 0, 60);
      [0, 1, 2].forEach((i) => {
        const amp = (0.8 + wind * 0.07) * (0.6 + i * 0.35);
        const base = 196 + i * 24;
        $(`wvf${i}`).setAttribute('d', wavePath(base, amp, 6 - i, i * 1.9, true));
        $(`wvf${i}`).setAttribute('fill', mix(seaTop, '#0A1828', 0.3 + i * 0.22));
        $(`wvc${i}`).setAttribute('d', wavePath(base, amp, 6 - i, i * 1.9, false));
        $(`wvc${i}`).style.opacity = (0.18 + wind * 0.008 + i * 0.05).toFixed(2);
      });
    } else {
      $('hills-near').setAttribute('fill', mix(bot, '#163322', 0.78));
      $('snow-ground').setAttribute('opacity', snowy ? '0.92' : '0');
      if ($('verge')) $('verge').setAttribute('fill', snowy ? '#C4D2E2' : '#121C16');
      this.root.querySelectorAll('.snowcap').forEach((e) => e.setAttribute('opacity', snowy ? '0.95' : '0'));
      if ($('wet')) $('wet').setAttribute('opacity', (L.rain * 0.28).toFixed(2));
    }

    $('sun').style.opacity = clamp(1 - L.cloud * 1.05, 0, 1).toFixed(2);
    const cloudFill = mix('#DDE4EE', '#3A4658', clamp(L.cloud * 1.1 + L.rain * 0.6, 0, 1));
    const visible = 2 + Math.round(L.cloud * 4);
    this.clouds.forEach((c, i) => {
      c.el.setAttribute('fill', cloudFill);
      c.el.style.opacity = i < visible ? (0.35 + L.cloud * 0.6).toFixed(2) : '0';
    });
    $('frost-o').setAttribute('opacity', (L.cold * 0.6).toFixed(2));
    $('heat-o').setAttribute('opacity', (L.hot * (this.mood.hot ? 0.45 : 0.2)).toFixed(2));
    $('shade').setAttribute('opacity', (L.rain * 0.3 + L.cloud * 0.08).toFixed(2));
    this.activeDrops = Math.round(L.rain * SC.RAIN_POOL);
    this.drops.forEach((d, i) => {
      const on = i < this.activeDrops;
      d.el.style.display = on && !L.snow ? '' : 'none';
      d.fl.style.display = on && L.snow ? '' : 'none';
    });
  }

  /** Single still frame at the final pace, for reduced motion. */
  still() {
    this.pace = this.paceTarget;
    this.step(0.016);
  }

  /** One animation frame. */
  step(dt) {
    const $ = this.$;
    if (!$) return;
    const L = this.look;
    this.t += dt;
    const t = this.t;
    this.pace += (this.paceTarget - this.pace) * Math.min(1, dt * 1.5);
    const v = this.figure.speed * this.pace;
    this.dist += v * dt;
    const scroll = this.env === 'road' || this.env === 'path' || this.env === 'water';
    const vw = scroll ? v : 0;
    this.world = (this.world || 0) + vw * dt;
    const w = this.world;
    const wind = clamp(L.wind || 0, 0, 80);

    this.figure.root = this.root;
    this.figure.update($, { dist: this.dist, t, dt, pace: this.pace, look: L, v: vw, mood: this.mood });
    this._moodFx(dt);

    // Parallax: far things move slowly, near things fast.
    $('hills-far').setAttribute('transform', `translate(${(-(w * 0.06) % 600).toFixed(1)} 0)`);
    if (this.env === 'water') {
      [0, 1, 2].forEach((i) => {
        const x = -((w * (0.35 + i * 0.3) + t * (5 + wind * 0.35) * (1 + i * 0.4)) % 600);
        $(`wv${i}`).setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
      });
      // White caps appear once the wind is strong enough.
      const capOn = clamp((wind - 18) / 25, 0, 1);
      this.caps.forEach((cp) => {
        cp.age += dt / 1.6;
        if (cp.age >= 1) { cp.age -= 1; cp.x = rnd(0, 620); }
        cp.x -= (vw * (0.35 + cp.row * 0.3) + (5 + wind * 0.35) * (1 + cp.row * 0.4)) * dt;
        cp.el.setAttribute('transform', `translate(${cp.x.toFixed(1)} ${196 + cp.row * 24 - 1})`);
        cp.el.style.opacity = (capOn * 0.8 * Math.sin(cp.age * Math.PI)).toFixed(2);
      });
    } else {
      $('hills-near').setAttribute('transform', `translate(${(-(w * 0.18) % 600).toFixed(1)} 0)`);
      if ($('road-dash')) $('road-dash').style.strokeDashoffset = (w % 40).toFixed(1);
      const lean = -wind * 0.18;
      this.trees.forEach((tr) => {
        const x = scroll ? wrap(tr.x - w * 0.55, -70, 680) : tr.x;
        const sway = Math.sin(t * (1.4 + wind * 0.03) + tr.ph) * (0.6 + wind * 0.12);
        tr.el.setAttribute('transform', `translate(${x.toFixed(1)} ${(this.env === 'road' || this.env === 'path' ? SC.ROAD_Y - 1 : SC.HORIZON + 4)})`);
        tr.sway.setAttribute('transform', `scale(${tr.s}) rotate(${(lean + sway).toFixed(2)})`);
      });
    }

    // Clouds drift with the wind, which comes from the right.
    this.clouds.forEach((c) => {
      c.x -= (3 + wind * 0.9) * dt + vw * 0.02 * dt;
      if (c.x < -90) c.x += 780;
      c.el.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y}) scale(${c.s})`);
    });

    // Sun rays turn slowly and grow with heat.
    const pulse = 1 + L.hot * 0.12 * Math.sin(t * 2.2);
    $('sun-rays').setAttribute('transform', `rotate(${(t * 8) % 360}) scale(${((1 + L.hot * 0.15) * pulse).toFixed(3)})`);
    $('sun-glow').setAttribute('r', (70 + L.hot * 40 + Math.sin(t * 1.3) * 4).toFixed(1));

    // Rain or snow. Wind drives the slant, forward motion adds to it.
    const vx = -(wind * 5 + vw * 0.35);
    if (this.activeDrops) {
      const vy = L.snow ? 48 : 560;
      for (let i = 0; i < this.activeDrops; i += 1) {
        const p = this.drops[i];
        p.y += vy * dt;
        p.x += (L.snow ? vx * 0.45 + Math.sin(t * 1.7 + p.ph) * 14 : vx) * dt;
        if (p.y >= p.land) {
          if (!L.snow && p.land > SC.ROAD_Y - 30) this._splash(p.x, p.land);
          p.y = rnd(-40, -5);
          p.x = rnd(-40, SC.W + Math.abs(vx) * 0.6 + 40);
          p.land = rnd(this.landTop, SC.H);
        }
        if (L.snow) {
          p.fl.setAttribute('cx', p.x.toFixed(1));
          p.fl.setAttribute('cy', p.y.toFixed(1));
          p.fl.setAttribute('r', p.r.toFixed(1));
        } else {
          const k = 0.026;
          p.el.setAttribute('d', `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${(p.x - vx * k).toFixed(1)} ${(p.y - vy * k).toFixed(1)}`);
        }
      }
    }
    this.splashes.forEach((s) => {
      if (s.age >= 1) return;
      s.age += dt / 0.35;
      const a = Math.min(1, s.age);
      s.el.setAttribute('rx', (1 + a * 6).toFixed(1));
      s.el.setAttribute('ry', (0.5 + a * 1.6).toFixed(1));
      s.el.style.opacity = ((1 - a) * 0.7).toFixed(2);
    });

    // Gust lines, only when there is noticeable wind.
    const gust = clamp((wind - 10) / 35, 0, 1);
    this.streaks.forEach((s) => {
      s.x -= (160 + wind * 9) * s.s * dt;
      if (s.x < -120) { s.x = SC.W + rnd(20, 260); s.y = rnd(30, 205); s.s = rnd(0.7, 1.3); }
      s.el.setAttribute('transform', `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${s.s.toFixed(2)} 1)`);
      s.el.style.opacity = (gust * 0.5).toFixed(2);
    });

    // Breath clouds when it is cold.
    const a = this.figure.anchor;
    const fs = this.figure.scale || 1;
    const m = this.figure.head ? [this.figure.head[0] + 10, this.figure.head[1] + 2] : this.figure.mouth;
    this.puffs.forEach((p) => {
      p.age += dt / 1.6;
      if (p.age >= 1) p.age -= 1;
      const k = p.age;
      const drift = k * (16 - Math.min(wind, 30) * 0.35) - k * k * vw * 0.25;
      p.el.setAttribute('cx', (a[0] + m[0] * fs + drift).toFixed(1));
      p.el.setAttribute('cy', (a[1] + m[1] * fs - k * 12).toFixed(1));
      p.el.setAttribute('r', (1.5 + k * 5.5).toFixed(1));
      p.el.style.opacity = (Math.max(L.cold, this.mood.cold || 0) * 0.6 * Math.sin(k * Math.PI)).toFixed(2);
    });
  }

  /** Shivering, sweat, heat haze and flying leaves, driven by the mood. */
  _moodFx(dt) {
    const $ = this.$;
    const mood = this.mood;
    const t = this.t;
    const a = this.figure.anchor;
    const fs = this.figure.scale || 1;
    const head = this.figure.head || this.figure.mouth;
    const hx = a[0] + head[0] * fs;
    const hy = a[1] + head[1] * fs;

    // Cold: the whole figure trembles, with little shiver marks.
    const cold = mood.cold || 0;
    const jitter = cold * Math.sin(t * 55) * (cold >= 1 ? 0.9 : 0.4);
    $('fig').setAttribute('transform', `translate(${(a[0] + jitter).toFixed(2)} ${a[1]}) scale(${fs})`);
    $('shv').setAttribute('transform', `translate(${hx.toFixed(1)} ${(hy + 24 * fs).toFixed(1)})`);
    $('shv').style.opacity = cold >= 1 ? (0.35 + 0.35 * Math.abs(Math.sin(t * 14))).toFixed(2) : '0';

    // Hot: sweat drops fly off the head, the air shimmers above the ground.
    const hot = mood.hot || 0;
    this.sweat.forEach((d) => {
      if (d.age >= 1) {
        if (hot > 0 && Math.random() < dt * 6 * hot) {
          d.age = 0;
          d.x = hx + rnd(-6, 2) * fs;
          d.y = hy - rnd(2, 6) * fs;
          d.vx = rnd(-30, -8);
          d.vy = rnd(-40, -10);
        } else { d.el.style.opacity = '0'; return; }
      }
      d.age += dt / 0.8;
      d.vy += 260 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.el.setAttribute('transform', `translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) scale(${(fs * 0.9).toFixed(2)})`);
      d.el.style.opacity = (0.9 * (1 - d.age)).toFixed(2);
    });
    this.haze.forEach((h) => {
      h.age += dt / 2.2;
      if (h.age >= 1) h.age -= 1;
      h.el.setAttribute('transform', `translate(${(h.x + Math.sin(t * 2 + h.x) * 3).toFixed(1)} ${(SC.ROAD_Y + 6 - h.age * 50).toFixed(1)})`);
      h.el.style.opacity = (hot * 0.5 * Math.sin(h.age * Math.PI)).toFixed(2);
    });

    // Wind: leaves tumble through the scene.
    const windy = Math.max(mood.wind || 0, clamp(((this.look.wind || 0) - 35) / 20, 0, 1));
    const ws = 120 + (this.look.wind || 0) * 6;
    this.leaves.forEach((l) => {
      l.x -= ws * l.s * dt;
      l.r += 420 * dt * l.s;
      if (l.x < -20) { l.x = SC.W + rnd(20, 300); l.y = rnd(60, 230); }
      const y = l.y + Math.sin(t * 3 + l.x * 0.02) * 12;
      l.el.setAttribute('transform', `translate(${l.x.toFixed(1)} ${y.toFixed(1)}) rotate(${(l.r % 360).toFixed(0)}) scale(${l.s.toFixed(2)})`);
      l.el.style.opacity = (windy * 0.95).toFixed(2);
    });
  }

  _splash(x, y) {
    const s = this.splashes.find((q) => q.age >= 1);
    if (!s) return;
    s.age = 0;
    s.el.setAttribute('cx', x.toFixed(1));
    s.el.setAttribute('cy', y.toFixed(1));
  }
}

/* ------------------------------------------------------------------ *
 *  Small icons for the value tiles
 * ------------------------------------------------------------------ */
const TILE_ICON = {
  rain: '<path d="M-7.5 1.5 a4.8 4.8 0 0 1 0.6 -9.5 a6.4 6.4 0 0 1 12.2 1.6 a4 4 0 0 1 0.7 7.9 Z M-4 5 l-1 3 M1 5 l-1 3 M6 5 l-1 3"/>',
  wind: '<path d="M-11 -4.5 H4 a3 3 0 1 0 -3 -3 M-11 1 H7.5 a3 3 0 1 1 -3 3 M-11 6.5 H0"/>',
  temp: '<path d="M-2.6 3.6 V-8.4 a2.6 2.6 0 0 1 5.2 0 V3.6 a4.8 4.8 0 1 1 -5.2 0 Z M0 -4 V5"/>',
};

/**
 * Why the weather is not right, per reason: 1 = unsuitable, 0.5 = borderline.
 * cold/hot from the daily minimum temperature, calm only for wind range
 * activities (sailing) when there is too little wind.
 */
function moodOf(res, c) {
  const { m, rating } = res;
  const sev = (r) => (r === 'bad' ? 1 : r === 'warn' ? 0.5 : 0);
  const mood = { cold: 0, hot: 0, wind: 0, rain: 0, calm: 0 };
  mood.rain = sev(rating.rain);
  if (rating.temp !== 'ok') {
    if (m.tempMin < c.temp_ideal_min) mood.cold = sev(rating.temp);
    else mood.hot = sev(rating.temp);
  }
  if (rating.wind !== 'ok') {
    if (c.wind_mode === 'range' && m.windAvg < c.wind_ideal_min) mood.calm = sev(rating.wind);
    else mood.wind = sev(rating.wind);
  }
  return mood;
}

/* ================================================================== *
 *  Card
 * ================================================================== */
class LutarymWeatherGoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._hourly = null;
    this._state = 'loading';
    this._timer = null;
    this._abort = null;
    this._raf = null;
    this._visible = true;
    this._built = false;
    this._scene = null;
  }

  /* -------------------- Home Assistant API -------------------- */

  setConfig(config) {
    if (!config) throw new Error('Invalid configuration');
    const activity = ACTIVITY_KEYS.includes(config.activity) ? config.activity : 'bike';
    const p = ACTIVITY_PRESETS[activity];
    const num = (key, fallback) => {
      const v = config[key];
      return v === '' || v == null || !isNum(Number(v)) ? fallback : Number(v);
    };

    const prev = this._config;
    this._config = {
      activity,
      lat: num('lat', 52.52),
      lon: num('lon', 13.405),
      title: config.title || null,
      wind_mode: p.windMode,
      rain_prob_ideal_max: num('rain_prob_ideal_max', p.rain_prob_ideal_max),
      rain_prob_tolerance: num('rain_prob_tolerance', p.rain_prob_tolerance),
      rain_amount_ideal_max: num('rain_amount_ideal_max', p.rain_amount_ideal_max),
      rain_amount_tolerance: num('rain_amount_tolerance', p.rain_amount_tolerance),
      wind_ideal_min: num('wind_ideal_min', p.wind_ideal_min ?? 0),
      wind_ideal_max: num('wind_ideal_max', p.wind_ideal_max),
      wind_tolerance: num('wind_tolerance', p.wind_tolerance),
      temp_ideal_min: num('temp_ideal_min', p.temp_ideal_min),
      temp_ideal_max: num('temp_ideal_max', p.temp_ideal_max),
      temp_tolerance: num('temp_tolerance', p.temp_tolerance),
    };

    if (prev && prev.activity !== activity) this._built = false;
    const moved = prev && (prev.lat !== this._config.lat || prev.lon !== this._config.lon);
    if (this.isConnected) {
      this._build();
      if (moved) this._fetch();
      else this._refresh();
    }
  }

  set hass(hass) {
    const langChanged = !this._hass || lutarymLang(this._hass) !== lutarymLang(hass);
    this._hass = hass;
    if (!this._built) this._build();
    else if (langChanged) this._refresh();
  }

  getCardSize() { return 6; }

  static getConfigElement() { return document.createElement(EDITOR_TAG); }

  static getStubConfig() { return { activity: 'bike', lat: 52.52, lon: 13.405 }; }

  connectedCallback() {
    this._build();
    if (!this._timer) this._timer = setInterval(() => this._fetch(), REFRESH_MS);
    if (this._config && !this._abort) this._fetch();
    if (!this._observer && window.IntersectionObserver) {
      // Pause the animation while the card is out of view.
      this._observer = new IntersectionObserver((entries) => {
        this._visible = entries.some((e) => e.isIntersecting);
        if (this._visible) this._startLoop();
      });
      this._observer.observe(this);
    }
    this._startLoop();
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    this._timer = null;
    if (this._abort) this._abort.abort();
    this._abort = null;
    if (this._observer) this._observer.disconnect();
    this._observer = null;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  /* -------------------- Data -------------------- */

  async _fetch() {
    if (!this._config) return;
    if (this._abort) this._abort.abort();
    const ctrl = new AbortController();
    this._abort = ctrl;
    const { lat, lon } = this._config;
    const url = 'https://api.open-meteo.com/v1/dwd-icon'
      + `?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`
      + '&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m'
      + '&forecast_days=3&timezone=auto';
    try {
      const resp = await fetch(url, { signal: ctrl.signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this._hourly = data.hourly ?? null;
      this._state = this._hourly ? 'ready' : 'error';
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(`[${CARD_TAG}] fetch error:`, e);
      if (!this._hourly) this._state = 'error';
    } finally {
      if (this._abort === ctrl) this._abort = null;
    }
    this._refresh();
  }

  /* -------------------- Layout -------------------- */

  _build() {
    if (this._built || !this._config) return;
    this._built = true;
    this._scene = new WeatherScene(this.shadowRoot, this._config.activity);

    const tile = (id) => `
      <div class="tile" id="tile-${id}">
        <div class="tile-head">
          <svg viewBox="-12 -12 24 24" class="tile-icon"><g>${TILE_ICON[id]}</g></svg>
          <span id="lbl-${id}"></span>
        </div>
        <div class="tile-val"><span class="pre" id="pre-${id}"></span><b id="num-${id}">–</b><span class="unit" id="unit-${id}"></span></div>
        <div class="tile-sub" id="sub-${id}"></div>
      </div>`;

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <ha-card>
        <div class="lwg">
          <div class="stage">
            <svg class="scene" viewBox="0 0 ${SC.W} ${SC.H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              ${this._scene.svg()}
            </svg>
            <div class="badge" id="badge">
              <span class="q" id="q"></span>
              <span class="verdict" id="verdict"></span>
            </div>
            <div class="when" id="when"></div>
          </div>
          <div class="tiles">${tile('rain')}${tile('wind')}${tile('temp')}</div>
          <div class="src" id="src"></div>
        </div>
      </ha-card>`;

    this._el = (id) => this.shadowRoot.getElementById(id);
    this._scene.attach(this._el);
    this._refresh();
    this._startLoop();
  }

  /** Writes everything that depends on config, language and data. */
  _refresh() {
    if (!this._built || !this._config) return;
    const $ = this._el;
    const hass = this._hass;
    const c = this._config;
    const info = activityInfo(hass, c.activity);
    const nf1 = numberFormat(hass, 1);
    const nf0 = numberFormat(hass, 0);
    const fmt1 = (v) => (isNum(v) ? nf1.format(v) : '–');

    $('q').textContent = c.title || info.question;
    $('lbl-rain').textContent = t(hass, 'rainLabel');
    $('lbl-wind').textContent = t(hass, 'windLabel');
    $('lbl-temp').textContent = t(hass, 'tempLabel');
    $('src').textContent = t(hass, 'source');

    const target = targetDate();
    const isTomorrow = isoDate(target) !== isoDate(new Date());
    $('when').textContent = `${isTomorrow ? t(hass, 'tomorrow') : t(hass, 'today')} · 06:00–18:00`;

    const hours = this._state === 'ready' ? dayHours(this._hourly, target) : null;
    const res = hours ? evaluate(hours, c) : null;

    if (!res) {
      $('verdict').textContent = this._state === 'loading' ? t(hass, 'loading') : t(hass, 'noData');
      $('badge').style.setProperty('--accent', COLOR.neutral);
      ['rain', 'wind', 'temp'].forEach((id) => this._tile(id, null, '', '–', '', ''));
      this._scene.setLook(weatherLook(null), 0, {});
      return;
    }

    const { m, rating, overall } = res;
    const labels = { go: t(hass, 'statusGo'), maybe: t(hass, 'statusMaybe'), nogo: t(hass, 'statusNogo') };
    $('verdict').textContent = labels[overall];
    $('badge').style.setProperty('--accent', COLOR[OVERALL_RATING[overall]]);

    this._tile('rain', rating.rain, t(hass, 'pre_max'), isNum(m.rainProb) ? nf0.format(m.rainProb) : '–', '%',
      `${t(hass, 'pre_max')} ${fmt1(m.rainAmount)} mm`);
    if (c.wind_mode === 'range') {
      this._tile('wind', rating.wind, t(hass, 'pre_avg'), fmt1(m.windAvg), 'km/h',
        `${t(hass, 'ideal')} ${nf0.format(c.wind_ideal_min)}–${nf0.format(c.wind_ideal_max)} km/h`);
    } else {
      this._tile('wind', rating.wind, t(hass, 'pre_max'), fmt1(m.windMax), 'km/h',
        `${t(hass, 'pre_min')} ${fmt1(m.windMin)} km/h`);
    }
    this._tile('temp', rating.temp, t(hass, 'pre_min'), fmt1(m.tempMin), '°C',
      `${t(hass, 'pre_max')} ${fmt1(m.tempMax)} °C`);

    this._scene.setLook(weatherLook(m), PACE[overall], moodOf(res, c));
    if (prefersReducedMotion()) this._scene.still();
  }

  _tile(id, rating, pre, num, unit, sub) {
    const $ = this._el;
    $(`tile-${id}`).style.setProperty('--accent', rating ? COLOR[rating] : COLOR.neutral);
    $(`pre-${id}`).textContent = pre ? `${pre} ` : '';
    $(`num-${id}`).textContent = num;
    $(`unit-${id}`).textContent = unit ? ` ${unit}` : '';
    $(`sub-${id}`).textContent = sub;
  }

  /* -------------------- Animation -------------------- */

  _startLoop() {
    if (this._raf || !this._built || !this.isConnected) return;
    if (prefersReducedMotion()) { this._scene.still(); return; }
    let last = performance.now();
    const tick = (now) => {
      if (!this.isConnected || this._visible === false) { this._raf = null; return; }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this._scene.step(dt);
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /* -------------------- Styles -------------------- */

  _css() {
    return `
      :host { display: block; }
      ha-card { overflow: hidden; }
      .lwg {
        background: linear-gradient(180deg, #131A24 0%, #0D131B 100%);
        color: #E8EDF4; padding: 10px;
        border-radius: var(--ha-card-border-radius, 12px);
        font-family: Roboto, "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      .stage {
        position: relative; border-radius: 10px; overflow: hidden;
        border: 1px solid #26303F; aspect-ratio: ${SC.W} / ${SC.H};
      }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      .drop { stroke: #9CC3F0; stroke-width: 1.4; stroke-linecap: round; opacity: 0.75; }
      .flake { fill: #F2F6FB; opacity: 0.9; }
      .splash { fill: none; stroke: #9CC3F0; stroke-width: 1; }
      .streak { fill: none; stroke: #DDE4EE; stroke-width: 1.6; stroke-linecap: round; }
      .puff { fill: #E8F2FF; }
      .foam { fill: #E8F2FF; opacity: 0; }
      .smoke { fill: #CBD5E1; opacity: 0; }
      .flame { fill: #FFB020; }
      .flame:nth-child(even) { fill: #FF7A1A; }
      .cap { fill: none; stroke: #F2F6FB; stroke-width: 1.6; stroke-linecap: round; opacity: 0; }
      .crest { fill: none; stroke: #BFD8F0; stroke-width: 1.4; }
      .sweat { fill: #9CC3F0; opacity: 0; }
      .shiver { fill: none; stroke: #BFE3FF; stroke-width: 1.6; stroke-linecap: round; opacity: 0; }
      .haze { fill: none; stroke: #FFE0B0; stroke-width: 2; stroke-linecap: round; opacity: 0; }
      .leaf { opacity: 0; }

      .badge {
        --accent: ${COLOR.neutral};
        position: absolute; left: 10px; top: 10px;
        display: flex; flex-direction: column; gap: 1px;
        padding: 7px 14px 8px; border-radius: 12px;
        background: rgba(11, 16, 23, 0.72);
        border: 1.5px solid var(--accent);
        box-shadow: 0 0 18px -4px var(--accent);
        backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        transition: border-color 700ms ease, box-shadow 700ms ease;
      }
      .q {
        font-size: 11px; font-weight: 600; letter-spacing: 0.07em;
        text-transform: uppercase; color: #C4CEDB;
      }
      .verdict {
        font-size: 19px; font-weight: 700; color: var(--accent);
        transition: color 700ms ease;
      }
      .when {
        position: absolute; right: 10px; top: 10px;
        padding: 4px 10px; border-radius: 10px;
        background: rgba(11, 16, 23, 0.6); color: #C4CEDB;
        font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em;
      }

      .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
      .tile {
        --accent: ${COLOR.neutral};
        position: relative; overflow: hidden;
        background: #0F151D; border: 1px solid #26303F; border-radius: 10px;
        padding: 8px 10px 9px;
      }
      .tile::before {
        content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
        background: var(--accent); transition: background 700ms ease;
      }
      .tile-head {
        display: flex; align-items: center; gap: 6px;
        font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
        color: var(--accent); transition: color 700ms ease;
      }
      .tile-icon {
        width: 16px; height: 16px; flex: none;
        fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
      }
      .tile-val { margin-top: 4px; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .tile-val b { font-size: 19px; font-weight: 700; color: #FFFFFF; }
      .tile-val .pre, .tile-val .unit { font-size: 11.5px; font-weight: 600; color: #9AA6B6; }
      .tile-sub { margin-top: 1px; font-size: 11.5px; color: #9AA6B6; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .src { margin-top: 8px; text-align: right; font-size: 10.5px; color: #6B7A90; }

      @media (max-width: 420px) {
        .tile-val b { font-size: 16px; }
        .verdict { font-size: 16px; }
      }
    `;
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, LutarymWeatherGoCard);

/* ================================================================== *
 *  Visual config editor
 * ================================================================== */
class LutarymWeatherGoCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    const langChanged = !this._hass || lutarymLang(this._hass) !== lutarymLang(hass);
    this._hass = hass;
    if (langChanged) this._render();
  }

  get _activity() {
    return ACTIVITY_KEYS.includes(this._config?.activity) ? this._config.activity : 'bike';
  }

  _fireChanged() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _onActivityChange(value) {
    // Reset the rating overrides so the new activity's presets apply.
    const next = { ...this._config };
    OVERRIDE_KEYS.forEach((k) => delete next[k]);
    next.activity = value;
    this._config = next;
    this._render();
    this._fireChanged();
  }

  _onChange(field, value, isNumber) {
    const next = { ...this._config };
    if (value === '' || value == null) delete next[field];
    else next[field] = isNumber ? Number(value) : value;
    this._config = next;
    this._fireChanged();
  }

  _row(label) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    const l = document.createElement('label');
    l.textContent = label;
    wrap.appendChild(l);
    return wrap;
  }

  _textRow(label, field, value, placeholder, hintText) {
    const wrap = this._row(label);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value ?? '';
    if (placeholder) input.placeholder = placeholder;
    input.addEventListener('change', (ev) => this._onChange(field, ev.target.value));
    wrap.appendChild(input);
    if (hintText) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = hintText;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  _numberRow(label, field, value, placeholder, step) {
    const wrap = this._row(label);
    const input = document.createElement('input');
    input.type = 'number';
    if (step) input.step = step;
    if (value != null) input.value = value;
    if (placeholder != null) input.placeholder = String(placeholder);
    input.addEventListener('change', (ev) => this._onChange(field, ev.target.value, true));
    wrap.appendChild(input);
    return wrap;
  }

  _selectRow(label, value, options) {
    const wrap = this._row(label);
    const select = document.createElement('select');
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === value) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', (ev) => this._onActivityChange(ev.target.value));
    wrap.appendChild(select);
    return wrap;
  }

  _pair(...rows) {
    const div = document.createElement('div');
    div.className = 'row-pair';
    rows.forEach((r) => div.appendChild(r));
    return div;
  }

  _section(text) {
    const div = document.createElement('div');
    div.className = 'section-label';
    div.textContent = text;
    return div;
  }

  _render() {
    if (!this._config) return;
    const cfg = this._config;
    const hass = this._hass;
    const activity = this._activity;
    const p = ACTIVITY_PRESETS[activity];
    const info = activityInfo(hass, activity);
    const v = (k) => cfg[k] ?? p[k];

    this.innerHTML = `
      <style>
        .form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
        .row { display: flex; flex-direction: column; gap: 4px; }
        .row label { font-size: 13px; font-weight: 500; color: var(--primary-text-color); }
        .row input[type="text"], .row input[type="number"], .row select {
          padding: 8px 10px; border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px; background: var(--card-background-color, #fff);
          color: var(--primary-text-color); font-size: 14px; box-sizing: border-box;
        }
        .row-pair { display: flex; gap: 16px; }
        .row-pair > .row { flex: 1; min-width: 0; }
        .section-label {
          font-size: 12px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--secondary-text-color);
          border-top: 1px solid var(--divider-color, #e0e0e0);
          padding-top: 12px; margin-top: 4px;
        }
        .hint { font-size: 11px; color: var(--secondary-text-color); }
      </style>
      <div class="form"></div>`;
    const form = this.querySelector('.form');

    form.appendChild(this._selectRow(
      t(hass, 'editorActivity'), activity,
      ACTIVITY_KEYS.map((k) => ({ value: k, label: `${ACTIVITY_PRESETS[k].emoji} ${activityInfo(hass, k).label}` })),
    ));
    form.appendChild(this._pair(
      this._numberRow(t(hass, 'editorLat'), 'lat', cfg.lat, 52.52, 'any'),
      this._numberRow(t(hass, 'editorLon'), 'lon', cfg.lon, 13.405, 'any'),
    ));
    form.appendChild(this._textRow(
      t(hass, 'editorTitle'), 'title', cfg.title, info.question,
      t(hass, 'editorTitleHint', { title: info.question }),
    ));

    form.appendChild(this._section(t(hass, 'sectionRain')));
    form.appendChild(this._pair(
      this._numberRow(t(hass, 'editorRainProbMax'), 'rain_prob_ideal_max', v('rain_prob_ideal_max'), p.rain_prob_ideal_max),
      this._numberRow(t(hass, 'editorRainProbTolerance'), 'rain_prob_tolerance', v('rain_prob_tolerance'), p.rain_prob_tolerance),
    ));
    form.appendChild(this._pair(
      this._numberRow(t(hass, 'editorRainAmountMax'), 'rain_amount_ideal_max', v('rain_amount_ideal_max'), p.rain_amount_ideal_max, '0.1'),
      this._numberRow(t(hass, 'editorRainAmountTolerance'), 'rain_amount_tolerance', v('rain_amount_tolerance'), p.rain_amount_tolerance, '0.1'),
    ));

    form.appendChild(this._section(t(hass, 'sectionWind')));
    if (p.windMode === 'range') {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = t(hass, 'windRangeHint');
      form.appendChild(hint);
      form.appendChild(this._pair(
        this._numberRow(t(hass, 'editorWindMinRange'), 'wind_ideal_min', v('wind_ideal_min'), p.wind_ideal_min),
        this._numberRow(t(hass, 'editorWindMaxRange'), 'wind_ideal_max', v('wind_ideal_max'), p.wind_ideal_max),
      ));
      form.appendChild(this._numberRow(t(hass, 'editorWindTolerance'), 'wind_tolerance', v('wind_tolerance'), p.wind_tolerance));
    } else {
      form.appendChild(this._pair(
        this._numberRow(t(hass, 'editorWindMax'), 'wind_ideal_max', v('wind_ideal_max'), p.wind_ideal_max),
        this._numberRow(t(hass, 'editorWindTolerance'), 'wind_tolerance', v('wind_tolerance'), p.wind_tolerance),
      ));
    }

    form.appendChild(this._section(t(hass, 'sectionTemp')));
    form.appendChild(this._pair(
      this._numberRow(t(hass, 'editorTempMin'), 'temp_ideal_min', v('temp_ideal_min'), p.temp_ideal_min),
      this._numberRow(t(hass, 'editorTempMax'), 'temp_ideal_max', v('temp_ideal_max'), p.temp_ideal_max),
    ));
    form.appendChild(this._numberRow(t(hass, 'editorTempTolerance'), 'temp_tolerance', v('temp_tolerance'), p.temp_tolerance));
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, LutarymWeatherGoCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: 'Weather Go by Lutarym',
    description: 'Shows whether the weather is suitable for an activity (cycling, running, walking, boating, sailing, football, grilling) today or tomorrow, based on the Open-Meteo/DWD forecast.',
  });
}
