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

/* ------------------------------------------------------------------ *
 *  Gait: walking and running from joint angle curves, as measured in
 *  human gait analysis. Phase 0 is heel strike of the near leg.
 *    hip   thigh angle from vertical, positive = forward
 *    knee  knee flexion, 0 = straight
 *    foot  sole angle, positive = toes down
 *  The hip height follows from the foot on the ground, so the body rises
 *  over the straight stance leg and dips when both feet touch. A planted
 *  foot never slides: the stride sets the step rate.
 * ------------------------------------------------------------------ */
const LEG = { thigh: 21.5, shin: 21.5, ankle: 3, heel: 3, toe: 8.5, torso: 24 };
const STAND_HIP = LEG.thigh + LEG.shin + LEG.ankle - 0.4;

/** Smooth periodic interpolation through [phase, value] keys. */
function curve(keys, p) {
  const q = ((p % 1) + 1) % 1;
  for (let i = 1; i < keys.length; i += 1) {
    if (q <= keys[i][0]) {
      const a = keys[i - 1];
      const b = keys[i];
      const f = (q - a[0]) / (b[0] - a[0] || 1);
      return a[1] + (b[1] - a[1]) * (0.5 - 0.5 * Math.cos(f * Math.PI));
    }
  }
  return keys[keys.length - 1][1];
}

const GAITS = {
  walk: {
    stance: 0.6,
    hip: [[0, 22], [0.5, -10], [0.62, -8], [0.88, 25], [1, 22]],
    knee: [[0, 3], [0.14, 16], [0.38, 3], [0.6, 38], [0.72, 62], [0.86, 28], [0.96, 2], [1, 3]],
    foot: [[0, -14], [0.08, 0], [0.42, 0], [0.6, 26], [0.7, 14], [0.86, -2], [0.96, -12], [1, -14]],
    bump: 0,
    lean: 3,
    hipMean: 7,
    arm: { swing: 17, elbow: 12, extra: 12 },
  },
  run: {
    stance: 0.36,
    hip: [[0, 30], [0.34, -14], [0.44, -16], [0.7, 30], [0.86, 40], [1, 30]],
    knee: [[0, 16], [0.12, 38], [0.32, 20], [0.45, 60], [0.62, 118], [0.78, 80], [0.92, 22], [1, 16]],
    foot: [[0, -6], [0.07, 0], [0.24, 4], [0.38, 34], [0.58, 42], [0.78, 10], [0.93, -8], [1, -6]],
    bump: 3.2,
    lean: 9,
    hipMean: 10,
    arm: { swing: 34, elbow: 88, extra: 14 },
  },
};

function rot(v, a) {
  const r = (a * Math.PI) / 180;
  return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)];
}

/** One leg relative to the hip at (0, 0); amp scales the motion. */
function legFK(g, p, amp) {
  const th = curve(g.hip, p) * amp;
  const kn = curve(g.knee, p) * (0.25 + 0.75 * amp);
  const ft = curve(g.foot, p) * amp;
  const t1 = (th * Math.PI) / 180;
  const t2 = ((th - kn) * Math.PI) / 180;
  const knee = [Math.sin(t1) * LEG.thigh, Math.cos(t1) * LEG.thigh];
  const ankle = [knee[0] + Math.sin(t2) * LEG.shin, knee[1] + Math.cos(t2) * LEG.shin];
  const h = rot([-LEG.heel, LEG.ankle], ft);
  const tt = rot([LEG.toe, LEG.ankle], ft);
  const heel = [ankle[0] + h[0], ankle[1] + h[1]];
  const toe = [ankle[0] + tt[0], ankle[1] + tt[1]];
  return { knee, ankle, foot: ft, low: Math.max(heel[1], toe[1]), heelX: heel[0] };
}

/** How far the body travels in one full cycle, from the planted foot. */
function strideOf(g, amp) {
  const a = legFK(g, 0, amp);
  const b = legFK(g, g.stance, amp);
  return Math.max(4, (a.ankle[0] - b.ankle[0]) / g.stance);
}

/**
 * Pose for a phase. Returns hip height above the ground and both legs,
 * relative to the hip. In flight (running) the hip follows an arc between
 * take off and landing.
 */
function gaitFrame(g, p, amp) {
  const L = [legFK(g, p, amp), legFK(g, p + 0.5, amp)];
  const inStance = (q) => (((q % 1) + 1) % 1) < g.stance;
  const stanceLow = [];
  if (inStance(p)) stanceLow.push(L[0].low);
  if (inStance(p + 0.5)) stanceLow.push(L[1].low);
  let hipH;
  if (stanceLow.length) {
    hipH = Math.max(...stanceLow);
  } else {
    // Flight: from toe off of one leg to the landing of the other.
    const qq = (((p % 0.5) + 0.5) % 0.5);
    const f = clamp((qq - g.stance) / (0.5 - g.stance), 0, 1);
    hipH = lerp(legFK(g, g.stance, amp).low, legFK(g, 0, amp).low, f) + Math.sin(f * Math.PI) * g.bump * amp;
  }
  return { hipH, legs: L };
}

/**
 * Builds a full person pose (in figure units, ground at y = 0) from a gait
 * phase. w blends between standing (0) and the gait (1).
 */
function gaitPose(g, p, amp, w, extraLean = 0) {
  const stand = { hipH: STAND_HIP, legs: null };
  const fr = gaitFrame(g, p, amp);
  const hipH = lerp(stand.hipH, fr.hipH, w);
  const hip = [0, -hipH];
  const P = { hip };
  const leg = (i, standX) => {
    const l = fr.legs[i];
    const sk = [standX * 0.4, LEG.thigh - 0.2];
    const sa = [standX, LEG.thigh + LEG.shin - 0.4];
    const knee = lerpPt(sk, l.knee, w);
    const ankle = lerpPt(sa, l.ankle, w);
    return { knee: [knee[0], knee[1] - hipH], ankle: [ankle[0], ankle[1] - hipH], foot: l.foot * w };
  };
  const a = leg(0, 3);
  const b = leg(1, -3);
  P.knee = a.knee; P.ankle = a.ankle; P.footAng = a.foot;
  P.knee2 = b.knee; P.ankle2 = b.ankle; P.footAng2 = b.foot;
  P.foot = [a.ankle[0], a.ankle[1] + LEG.ankle];
  P.foot2 = [b.ankle[0], b.ankle[1] + LEG.ankle];

  const lean = (g.lean * w + extraLean) * (Math.PI / 180);
  // Torso pivots a little over the stance leg.
  P.shoulder = [hip[0] + Math.sin(lean) * LEG.torso, hip[1] - Math.cos(lean) * LEG.torso];
  P.head = [P.shoulder[0] + Math.sin(lean) * 10 + 3.2, P.shoulder[1] - Math.cos(lean) * 10.5];

  // Arms swing against the legs; elbows bend more on the forward swing.
  const arm = (q) => {
    const fwd = (curve(g.hip, q + 0.5) - g.hipMean) / 30;   // swings with the opposite leg
    const ang = g.arm.swing * fwd * amp * w;
    const flex = lerp(10, g.arm.elbow, w) + Math.max(0, ang) * (g.arm.extra / 20);
    const e = [P.shoulder[0] + Math.sin((ang * Math.PI) / 180) * 14, P.shoulder[1] + Math.cos((ang * Math.PI) / 180) * 14];
    const fa = ((ang + flex) * Math.PI) / 180;
    return [e, [e[0] + Math.sin(fa) * 13, e[1] + Math.cos(fa) * 13]];
  };
  [P.elbow, P.hand] = arm(p);
  [P.elbow2, P.hand2] = arm(p + 0.5);
  return P;
}

/** Standing pose with straight legs. */
function standPose(lean = 0) {
  return gaitPose(GAITS.walk, 0, 0.0001, 0, lean);
}

/** Knee for a person whose foot stands at a given point (ground contact). */
function legTo(hip, foot) {
  return ik(hip, [foot[0], foot[1] - LEG.ankle], LEG.thigh, LEG.shin, 1);
}

/* ------------------------------------------------------------------ *
 *  People, seen from the side and facing right.
 *  Limbs are tapered shapes, not lines: thighs wider at the hip, calves
 *  narrowing to the ankle, hands and shoes, a face in profile with nose,
 *  eye, brow, ear and hair. Far limbs are a shade darker.
 * ------------------------------------------------------------------ */
const PERSON = {};

/** Tapered limb from a (radius ra) to b (radius rb), rounded at both ends. */
function capsule(a, b, ra, rb) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / L;
  const ny = dx / L;
  const p1 = [a[0] + nx * ra, a[1] + ny * ra];
  const p2 = [b[0] + nx * rb, b[1] + ny * rb];
  const p3 = [b[0] - nx * rb, b[1] - ny * rb];
  const p4 = [a[0] - nx * ra, a[1] - ny * ra];
  return `M${pt(p1)} L${pt(p2)} A${rb} ${rb} 0 0 0 ${pt(p3)} L${pt(p4)} A${ra} ${ra} 0 0 0 ${pt(p1)} Z`;
}

/** Body from hip to shoulder: straight back, chest and belly in front. */
function torsoPath(hip, sh, o) {
  const dx = sh[0] - hip[0];
  const dy = sh[1] - hip[1];
  const L = Math.hypot(dx, dy) || 0.001;
  const u = [dx / L, dy / L];
  const f = [-u[1], u[0]];          // front
  const at = (k, side, w) => [hip[0] + u[0] * L * k + f[0] * side * w, hip[1] + u[1] * L * k + f[1] * side * w];
  const wh = 6.6;
  const ws = 6.2;
  const belly = o.belly || 0;
  return `M${pt(at(0, -1, wh))}`
    + ` C${pt(at(0.35, -1, wh + 0.4))} ${pt(at(0.75, -1, ws + 1.2))} ${pt(at(1, -1, ws))}`
    + ` A${ws} ${ws} 0 0 1 ${pt(at(1, 1, ws))}`
    + ` C${pt(at(0.78, 1, ws + 2.2))} ${pt(at(0.4, 1, wh + 0.6 + belly))} ${pt(at(0, 1, wh))}`
    + ` A${wh} ${wh} 0 0 1 ${pt(at(0, -1, wh))} Z`;
}

/** Apron over chest and thighs. */
function apronPath(hip, sh) {
  const dx = sh[0] - hip[0];
  const dy = sh[1] - hip[1];
  const L = Math.hypot(dx, dy) || 0.001;
  const u = [dx / L, dy / L];
  const f = [-u[1], u[0]];
  const at = (k, w, down = 0) => [hip[0] + u[0] * L * k + f[0] * w - u[0] * down, hip[1] + u[1] * L * k + f[1] * w - u[1] * down];
  return `M${pt(at(0.82, 2))} L${pt(at(0.82, 7.4))} C${pt(at(0.5, 9.2))} ${pt(at(0.1, 8.8))} ${pt(at(0, 9, 12))}`
    + ` L${pt(at(0, 5.5, 22))} L${pt(at(0, -1.5, 21))} L${pt(at(0.3, 0.5))} Z`;
}

const SHOE = 'M-3 -4.5 C-3.2 -7 1.5 -7.2 2.6 -5.6 L8.6 -3.6 C10.2 -3 10.4 -0.4 8.8 0 L-2.6 0 C-3.8 0 -3.6 -2.4 -3 -4.5 Z';

/**
 * o: shirt, pants, shoes, skin parts, hair, hat, arm [upper, fore],
 *    longSleeves, longPants, apron, belly, extra (held item, drawn
 *    between body and near arm).
 */
function personSvg(p, o) {
  PERSON[p] = o;
  const far = (c) => mix(c, '#0B1017', 0.32);
  const path = (id, fill) => `<path id="${p}${id}" fill="${fill}"/>`;
  const upper = o.shirt;
  const lower = o.longSleeves ? o.shirt : SKIN;
  const shin = o.longPants ? o.pants : (o.leg || SKIN);
  const hair = o.hair || '#4A3426';
  const hat = o.hat || `<path d="M-7.6 1 C-8.4 -6 -4 -9.8 1 -9.4 C5.6 -9.1 8 -6.4 7.7 -3.4 C5 -5.6 1.6 -5.4 -1.2 -4.4 C-2.6 -2.2 -3.4 1 -4.2 3.4 C-6 3.6 -7.4 2.8 -7.6 1 Z" fill="${hair}"/>`;
  return `
    <g id="${p}far">
      ${path('ua2', far(upper))}${path('la2', far(lower))}<circle id="${p}hd2" r="2.5" fill="${SKIN_FAR}"/>
      ${path('th2', far(o.pants))}${path('sh2', far(shin))}<path id="${p}fo2" d="${SHOE}" fill="${far(o.shoes)}"/>
    </g>
    ${o.mid || ''}
    ${path('torso', o.shirt)}
    <path id="${p}hl" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="2.2" stroke-linecap="round"/>
    ${o.apron ? path('apron', o.apron) : ''}
    ${path('neck', SKIN)}
    <g id="${p}head">
      <ellipse cx="-0.3" cy="-0.6" rx="7.4" ry="7.9" fill="${SKIN}"/>
      <ellipse cx="3.6" cy="4.6" rx="4.4" ry="2.8" fill="${SKIN}"/>
      <path d="M6.6 -2 L9.4 1.6 L6.4 2.6 Z" fill="${SKIN}"/>
      <ellipse cx="-1.4" cy="0.6" rx="1.6" ry="2.3" fill="${SKIN_FAR}"/>
      <ellipse cx="4.6" cy="-1.2" rx="0.85" ry="1.1" fill="#0B1017"/>
      <path d="M3.1 -3.6 L6.3 -3.2" stroke="${hair}" stroke-width="1" stroke-linecap="round"/>
      <path id="${p}mouth" d="M5 4.6 Q6.2 4.9 7.2 4.3" stroke="#8A4A3A" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <circle class="cheek" cx="3.4" cy="2.4" r="2.2" fill="#FF5F52" opacity="0"/>
      ${hat}
    </g>
    ${path('th', o.pants)}${path('sh', shin)}<path id="${p}fo" d="${SHOE}" fill="${o.shoes}"/>
    ${o.extra || ''}
    ${path('ua', upper)}${path('la', lower)}<circle id="${p}hd" r="2.6" fill="${SKIN}"/>`;
}

/** Writes a pose computed by the figure into the person's shapes. */
function setPerson(el, p, P) {
  const o = PERSON[p] || {};
  el(`${p}torso`).setAttribute('d', torsoPath(P.hip, P.shoulder, o));
  el(`${p}hl`).setAttribute('d', `M${pt(lerpPt(P.hip, P.shoulder, 0.25))} L${pt(lerpPt(P.hip, P.shoulder, 0.85))}`);
  el(`${p}hl`).setAttribute('transform', 'translate(-3.5 0)');
  if (o.apron) el(`${p}apron`).setAttribute('d', apronPath(P.hip, P.shoulder));
  el(`${p}neck`).setAttribute('d', capsule(lerpPt(P.shoulder, P.head, 0.1), lerpPt(P.shoulder, P.head, 0.75), 2.7, 2.5));
  el(`${p}head`).setAttribute('transform', `translate(${pt(P.head)}) rotate(${(P.headTilt || 0).toFixed(1)})`);

  const leg = (sfx, foot, knee, ankleIn, angIn) => {
    const ankle = ankleIn || [foot[0], foot[1] - 3];
    el(`${p}th${sfx}`).setAttribute('d', capsule(P.hip, knee, 5.6, 4));
    el(`${p}sh${sfx}`).setAttribute('d', capsule(knee, ankle, 3.9, 2.4));
    // Shoe: flat on the ground, heel rises behind the body, toe points
    // down while the foot swings.
    let ang = angIn;
    if (ang === undefined) {
      const lift = -foot[1];
      ang = 0;
      if (lift > 0.6) ang = clamp(deg(Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0])) - 90, -30, 55) * 0.6 + lift * 1.6;
    }
    el(`${p}fo${sfx}`).setAttribute('transform', `translate(${pt(ankle)}) rotate(${ang.toFixed(1)}) translate(0 3)`);
  };
  leg('2', P.foot2, P.knee2, P.ankle2, P.footAng2);
  leg('', P.foot, P.knee, P.ankle, P.footAng);

  const arm = (sfx, elbow, hand) => {
    el(`${p}ua${sfx}`).setAttribute('d', capsule(P.shoulder, elbow, 3.4, 2.7));
    el(`${p}la${sfx}`).setAttribute('d', capsule(elbow, hand, 2.7, 2.1));
    el(`${p}hd${sfx}`).setAttribute('cx', hand[0].toFixed(1));
    el(`${p}hd${sfx}`).setAttribute('cy', hand[1].toFixed(1));
  };
  arm('2', P.elbow2, P.hand2);
  arm('', P.elbow, P.hand);
}


/* ------------------------------------------------------------------ *
 *  Reactions to unsuitable weather.
 *  mood = { cold, hot, wind, rain, calm }, each 0 (fine), 0.5 (borderline)
 *  or 1 (unsuitable). Poses are used at 1 while the figure stands, and
 *  blend in and out smoothly. Only the body moves, never the bike or boat.
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

/** Slow, irregular motion in about -1..1, used for gusts and sway. */
function wobble(t, seed = 0) {
  return (Math.sin(t * 1.3 + seed) + 0.6 * Math.sin(t * 2.7 + seed * 1.9) + 0.35 * Math.sin(t * 4.9 + seed * 0.6)) / 1.95;
}

/** Fine, uneven shivering in about -1..1. */
function tremor(t, seed = 0) {
  return 0.55 * Math.sin(t * 47 + seed) + 0.3 * Math.sin(t * 61 + seed * 2.3) + 0.15 * Math.sin(t * 83 + seed * 0.4);
}

/** Leans the upper body around the hip (positive = forward, into the wind). */
function leanPose(P, degrees) {
  ['shoulder', 'head', 'elbow', 'hand', 'elbow2', 'hand2'].forEach((k) => {
    if (P[k]) P[k] = rotAround(P[k], P.hip, degrees);
  });
}

/** Fades a reaction in and out over about half a second. */
function moodBlend(fig, c, active) {
  const reason = active ? moodReason(c.mood) : null;
  if (reason) fig.moodLast = reason;
  fig.moodW = lerp(fig.moodW || 0, reason ? 1 : 0, Math.min(1, c.dt * 2.2));
  if (fig.moodW < 0.01 && !reason) fig.moodLast = null;
  return { reason: fig.moodLast || null, w: ease(clamp(fig.moodW, 0, 1)) };
}

/**
 * Pose for a reason, built from a copy of the normal pose.
 *   o.arm            [upper arm, forearm] lengths, elbows follow by IK
 *   o.keepNear/Far   that arm holds something (umbrella, handlebar)
 *   o.standing       the feet may step on the spot
 *   o.handsToMouth   blow into the hands instead of rubbing the arms
 *   o.umbrella       the near hand holds an umbrella
 */
function reactionPose(P0, reason, t, o) {
  const P = { ...P0 };
  const [ua, fa] = o.arm;
  const setNear = (hand, side) => {
    if (o.keepNear) return;
    P.hand = hand;
    P.elbow = ik(P.shoulder, hand, ua, fa, side);
  };
  const setFar = (hand, side) => {
    if (o.keepFar) return;
    P.hand2 = hand;
    P.elbow2 = ik(P.shoulder, hand, ua, fa, side);
  };
  const step = (amp, rate) => {
    if (!o.standing) return;
    P.foot = [P.foot[0], P.foot[1] - Math.max(0, Math.sin(t * rate)) * amp];
    P.foot2 = [P.foot2[0], P.foot2[1] - Math.max(0, -Math.sin(t * rate)) * amp];
  };
  P.lean = 0;
  P.headTilt = P0.headTilt || 0;

  if (reason === 'cold') {
    // Shoulders drawn up, head sunk in, the upper body shivers finely.
    const tr = tremor(t) * 0.45;
    const tr2 = tremor(t, 2) * 0.4;
    P.lean = 4;
    P.shoulder = [P.shoulder[0] + tr, P.shoulder[1] - 1.2 + tr2];
    P.head = [P.head[0] - 0.4 + tr * 0.6, P.head[1] + 1.8 + tr2 * 0.6];
    P.headTilt = 9;
    const sh = P.shoulder;
    const hd = P.head;
    if (o.handsToMouth) {
      // Rubs the hands in front of the mouth and breathes into them.
      const rub = Math.sin(t * 13) * 0.9;
      setNear([hd[0] + 7.5 + rub, hd[1] + 5.5], -1);
      setFar([hd[0] + 6.2 - rub, hd[1] + 6.5], -1);
    } else {
      // Arms crossed, rubbing the upper arms, stepping from foot to foot.
      const rub = Math.sin(t * 5.6) * 2.6;
      setNear([sh[0] - 2.5 + tr, sh[1] + 6 + rub], 1);
      setFar([sh[0] + 3.5 + tr2, sh[1] + 7 - rub], 1);
      step(1.8, 4.2);
    }
  } else if (reason === 'rain') {
    // Head down, shoulders up, hands held over the head like a roof.
    P.head = [P.head[0] + 1, P.head[1] + 2.2];
    P.headTilt = 14;
    const sh = P.shoulder;
    const hd = P.head;
    if (o.umbrella) {
      setFar([sh[0] + 4, sh[1] + 9], 1);
    } else {
      P.lean = 6;
      setNear([hd[0] + 3, hd[1] - 7.5], -1);
      setFar([hd[0] - 4, hd[1] - 8], 1);
    }
    step(2.2, 7);
  } else if (reason === 'wind') {
    // Leans into the gusts, shields the eyes, wide stance.
    const g = 0.5 + 0.5 * wobble(t * 1.1, 1);
    P.lean = 5 + 7 * g;
    P.headTilt = 11;
    const sh = P.shoulder;
    const hd = P.head;
    setNear([hd[0] + 8.5, hd[1] - 0.5 + wobble(t * 3, 4) * 0.8], -1);
    setFar([sh[0] - 10 - 4 * g, sh[1] + 21], 1);
    if (o.standing) {
      P.foot = [P.foot[0] + 5, P.foot[1]];
      P.foot2 = [P.foot2[0] - 6, P.foot2[1]];
    }
  } else if (reason === 'hot') {
    // Heavy breathing, wipes the forehead once, then fans some air.
    const breathe = Math.sin(t * 2.4) * 0.6;
    P.lean = 2;
    P.shoulder = [P.shoulder[0], P.shoulder[1] + 1 + breathe];
    P.head = [P.head[0], P.head[1] + 1.2 + breathe];
    P.headTilt = 6;
    const sh = P.shoulder;
    const hd = P.head;
    const tau = t % 5;
    const fan = tau > 2.2 ? Math.sin((tau - 2.2) * 12) * 3.2 : 0;
    const hand = keyed([
      [0, [hd[0] + 11, hd[1] + 7]],
      [0.7, [hd[0] + 8, hd[1] - 4]],
      [1.5, [hd[0] - 2.5, hd[1] - 5]],
      [2.2, [hd[0] + 11, hd[1] + 6]],
      [5, [hd[0] + 11, hd[1] + 7]],
    ], tau, lerpPt);
    setNear([hand[0], hand[1] + fan], -1);
    setFar([sh[0] + 1.5, sh[1] + 25], -1);
  }
  if (P.lean) leanPose(P, P.lean);
  return P;
}

/** Mixes the reaction pose R into the normal pose P by weight w. */
function blendPose(P, R, w, legs) {
  ['shoulder', 'head', 'elbow', 'hand', 'elbow2', 'hand2', 'foot', 'foot2'].forEach((k) => {
    if (R[k] && P[k]) P[k] = lerpPt(P[k], R[k], w);
  });
  P.headTilt = lerp(P.headTilt || 0, R.headTilt || 0, w);
  if (legs) {
    const ank = (f) => [f[0], f[1] - LEG.ankle];
    P.ankle = P.ankle ? lerpPt(P.ankle, ank(R.foot), w) : ank(P.foot);
    P.ankle2 = P.ankle2 ? lerpPt(P.ankle2, ank(R.foot2), w) : ank(P.foot2);
    P.footAng = lerp(P.footAng || 0, 0, w);
    P.footAng2 = lerp(P.footAng2 || 0, 0, w);
    P.knee = ik(P.hip, P.ankle, LEG.thigh, LEG.shin, 1);
    P.knee2 = ik(P.hip, P.ankle2, LEG.thigh, LEG.shin, 1);
  }
}

/** Reaction for a standing person (runner, walker, player, cook). */
function personMood(fig, P, c, o) {
  const { reason, w } = moodBlend(fig, c, c.pace < 0.3);
  fig.moodShown = w;
  if (!reason || w <= 0.001) return;
  blendPose(P, reactionPose(P, reason, c.t, o), w, o.legs);
}

/** Red cheeks when cold or hot. */
function cheeks(root, c) {
  const m = c.mood || {};
  const v = Math.max(m.hot || 0, (m.cold || 0) * 0.7);
  root.querySelectorAll('.cheek').forEach((e) => e.setAttribute('opacity', (v * 0.6).toFixed(2)));
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
  /* ---------------- Cycling ----------------
   * A ride with changing scenes, about 45 seconds at full pace:
   * cruising (a bird lands on the helmet), a sprint out of the saddle
   * (the bird flies off), a climb, a fast tucked descent, a stop for a
   * drink, a wheelie and an easy ride on.
   * When the weather says no, a little comedy plays instead:
   *   storm  the helmet blows away, then rider and bike fly off; he
   *          pushes the bike back in against the wind
   *   rain   a car drives through the puddle and soaks him; he shakes
   *          himself dry like a dog
   *   cold   an icicle grows on his nose until he sneezes it off
   *   heat   a puddle of sweat grows; he pours his bottle over his head
   */
  bike: {
    env: 'road',
    anchor: [250, 211],
    scale: 1.3,
    speed: 150,
    mouth: [37, -70],
    shadow: [6, 60],
    PS: 1.25,
    PLAN: [
      { len: 650, mode: 'seat', v: 1.0, bird: true },
      { len: 520, mode: 'stand', v: 1.6 },
      { len: 320, mode: 'seat', v: 1.05 },
      { len: 820, mode: 'climb', v: 0.5, rise: 62 },
      { len: 200, mode: 'seat', v: 0.75 },
      { len: 820, mode: 'coast', v: 1.85, rise: -62 },
      { len: 380, mode: 'seat', v: 0.95 },
      { len: 0, mode: 'pause', v: 0 },
      { len: 260, mode: 'seat', v: 0.8 },
      { len: 330, mode: 'seat', v: 0.9, wheelie: true },
      { len: 300, mode: 'seat', v: 0.85 },
    ],
    PAUSE: 8.4,
    GAG: { wind: 17, rain: 11, cold: 10, hot: 11 },

    build() {
      const PS = this.PS;
      const bottle = (id) => `
        <g id="${id}">
          <rect x="-3.2" y="-7" width="6.4" height="15" rx="2.2" fill="#22E07A"/>
          <rect x="-3.2" y="-3" width="6.4" height="4" fill="#E8EDF4" opacity="0.85"/>
          <rect x="-2" y="-10" width="4" height="3.4" rx="1" fill="#0B1017"/>
        </g>`;
      const helmet = `<path d="M-8.2 -0.6 C-8.8 -8 -3 -11.6 2 -11 C7 -10.4 9.6 -7.2 9 -3.6 L11.4 -3 L8.6 -2 C3 -3.4 -3 -2.2 -8.2 -0.6 Z" fill="#FFC107"/>
        <path d="M-5 -6 L-1 -9.6 M0 -5.4 L3.4 -9.6 M4.2 -5 L6.6 -8.2" stroke="#B88A00" stroke-width="0.9" stroke-linecap="round"/>`;
      const bike = `
        <path id="f-crank2" stroke="#7E8CA0" stroke-width="3" stroke-linecap="round"/>
        <circle id="f-ped2" r="2" fill="#55657F"/>
        ${wheelSvg('f-spk-r', -30)}
        ${wheelSvg('f-spk-f', 38)}
        <path d="M-30 0 L0 4 L-8 -34 Z M-8 -34 L30 -31 M0 4 L33 -22 M30 -31 L33 -22 L38 0"
          fill="none" stroke="#FF7A1A" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
        <path id="frost-frame" d="M-30 0 L0 4 L-8 -34 Z M-8 -34 L30 -31 M0 4 L33 -22" fill="none" stroke="#E6F4FF" stroke-width="1.6" stroke-dasharray="2 3" opacity="0"/>
        <path d="M-30 0 L0 4" stroke="#55657F" stroke-width="1.4" transform="translate(0 2.5)"/>
        <path d="M-8 -34 L-9 -39 M30 -31 L32 -38 H37" fill="none" stroke="#A9B8C9" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M37 -38 q6.5 0 5.5 6.5 q-0.8 4 -4.6 3.6" fill="none" stroke="#C3D0E0" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M-17 -40.5 H-3" stroke="#0B1017" stroke-width="4" stroke-linecap="round"/>
        <path d="M10 -4 L20 -12 M12 -1 L22 -9" stroke="#55657F" stroke-width="1.2"/>
        <g transform="translate(16 -8) rotate(52)">${bottle('bottle-c')}</g>
        <circle cx="0" cy="4" r="6" fill="none" stroke="#7E8CA0" stroke-width="2"/>
        <path id="f-crank" stroke="#C3D0E0" stroke-width="3" stroke-linecap="round"/>
        <circle id="f-ped" r="2.2" fill="#A9B8C9"/>`;
      const drops = Array.from({ length: 70 }, (_, i) => `<circle class="wdrop" id="wd${i}" r="1.3"/>`).join('');
      const shards = Array.from({ length: 5 }, (_, i) => `<path class="shard" id="sh${i}" d="M0 -2 L1.4 1 L-1.2 1.4 Z"/>`).join('');
      return `
        <ellipse id="puddle" cx="14" cy="21.5" rx="0" ry="3" fill="#7FA6D6" opacity="0.8"/>
        <g id="b-fly">
          <g id="b-shake">
            <g transform="scale(${PS})">
              ${personSvg('b-', {
    shirt: '#3D8BFF', pants: DARK, shoes: '#E8EDF4', hair: '#3A2A20',
    hat: `<path d="M-7.6 1 C-8.4 -6 -4 -9.8 1 -9.4 C5.6 -9.1 8 -6.4 7.7 -3.4 C5 -5.6 1.6 -5.4 -1.2 -4.4 C-2.6 -2.2 -3.4 1 -4.2 3.4 C-6 3.6 -7.4 2.8 -7.6 1 Z" fill="#3A2A20"/>
      <g id="b-helmet">${helmet}</g>
      <path d="M3 -1.8 H8.6" stroke="#0B1017" stroke-width="2" stroke-linecap="round"/>
      <path id="b-icicle" d="M7.8 2 L10.4 2 L9.1 14.5 Z" fill="#DFF3FF" stroke="#A9D4F5" stroke-width="0.4" opacity="0"/>`,
    mid: `<g transform="scale(${(1 / PS).toFixed(4)})">${bike}</g>`,
    extra: `<g transform="scale(${(1 / PS).toFixed(4)})">${bottle('bottle-h')}</g>`,
  })}
            </g>
          </g>
        </g>
        <g id="helmet-fly" opacity="0"><g transform="scale(${PS})">${helmet}</g></g>
        <path id="icicle-fly" d="M-1.3 0 L1.3 0 L0 12.5 Z" fill="#DFF3FF" opacity="0"/>
        <g id="shards">${shards}</g>
        <g id="bird" opacity="0">
          <ellipse cx="0" cy="0" rx="5" ry="3.4" fill="#4A3426"/>
          <circle cx="4.4" cy="-2.4" r="2.4" fill="#4A3426"/>
          <path d="M6.6 -2.6 L9 -1.8 L6.6 -1.2 Z" fill="#FFB020"/>
          <circle cx="5" cy="-3" r="0.6" fill="#F2F6FB"/>
          <path d="M-4.6 -0.6 L-9 -2.6 L-8.4 1 Z" fill="#3A2A20"/>
          <ellipse cx="1" cy="1.2" rx="3" ry="1.8" fill="#D9774A"/>
          <path id="bird-w" d="M-2 -1 L2 -1 L-1 -8 Z" fill="#6B4A36"/>
          <path id="bird-legs" d="M-1 3 V5.6 M1.6 3 V5.6" stroke="#FFB020" stroke-width="0.7"/>
        </g>
        <g id="car" transform="translate(900 0)">
          <path d="M-46 14 V4 Q-44 -2 -34 -3 L-20 -16 Q-16 -19 -8 -19 H18 Q26 -19 32 -12 L40 -4 Q48 -3 48 4 V14 Z" fill="#2A62B8"/>
          <path d="M-17 -13 L-10 -16.5 H2 V-5 H-24 Z M5 -16.5 H17 Q22 -16.5 27 -10 L31 -5 H5 Z" fill="#9CC3F0" opacity="0.8"/>
          <path d="M-46 6 H48" stroke="#1C4A8A" stroke-width="1.4"/>
          <rect x="43" y="-1" width="5" height="3" rx="1" fill="#FFE08A"/>
          <g transform="translate(-28 14)"><circle r="8.5" fill="#0B1017"/><circle r="4" fill="#7E8CA0"/></g>
          <g transform="translate(30 14)"><circle r="8.5" fill="#0B1017"/><circle r="4" fill="#7E8CA0"/></g>
        </g>
        <path id="wave" fill="#9CC3F0" opacity="0"/>
        <g id="wdrops">${drops}</g>
        <g id="sneeze" opacity="0">
          <path d="M0 0 C-2 -16 6 -24 24 -24 C44 -24 52 -16 50 -6 C48 4 34 6 22 4 L12 10 L14 2 C6 0 1 -2 0 0 Z" fill="#F2F6FB"/>
          <text id="sneeze-t" x="25" y="-6" text-anchor="middle" font-size="10" font-weight="700" fill="#0B1017"
            font-family="Roboto, system-ui, sans-serif" style="paint-order: normal; stroke: none;">Hatschi!</text>
        </g>`;
    },

    init() {
      let s = 0;
      let e = 0;
      this.segs = this.PLAN.map((g) => {
        const o = { ...g, s0: s, e0: e };
        s += g.len;
        e += g.rise || 0;
        o.s1 = s;
        return o;
      });
      this.L = s;
      this.pausePos = this.segs.find((g) => g.mode === 'pause').s0;
      this.s = 0;
      this.vel = 0;
      this.pauseT = -1;
      this.pauseDone = false;
      this.crank = 0;
      this.wheel = 0;
      this.stopW = 1;
      this.W = { seat: 1, stand: 0, climb: 0, coast: 0 };
      this.gag = null;
      this.gagT = 0;
      this.wheelie = 0;
      this.puddle = 0;
      this.drops = null;
    },

    _seg(s) {
      const q = wrap(s, 0, this.L);
      return this.segs.find((g) => q >= g.s0 && q < g.s1) || this.segs[this.segs.length - 1];
    },

    /** Height of the road at a plan position, smooth over each slope. */
    terrain(s) {
      const q = wrap(s, 0, this.L);
      const g = this._seg(q);
      if (!g.rise) return g.e0;
      return g.e0 + g.rise * ease(clamp((q - g.s0) / g.len, 0, 1));
    },

    /** Speed for this frame, with braking into the stop. */
    plan(dt, pace) {
      if (this.pauseT >= 0) {
        this.pauseT += dt;
        if (this.pauseT >= this.PAUSE || pace < 0.02) { this.pauseT = -1; this.pauseDone = true; }
        this.vel = 0;
        return 0;
      }
      const g = this._seg(this.s);
      let vt = g.v * this.speed * pace;
      if (g.mode === 'climb' && (this.s - g.s0) / g.len > 0.62) vt *= 0.9;
      if (!this.pauseDone && pace > 0.02) {
        const dp = this.pausePos - this.s;
        if (dp >= 0 && dp < 450) {
          vt = Math.min(vt, Math.sqrt(2 * 75 * dp));
          if (dp < 1.5) { this.s = this.pausePos; this.vel = 0; this.pauseT = 0; return 0; }
        }
      }
      const acc = vt > this.vel ? 55 : 120;
      this.vel += clamp(vt - this.vel, -acc * dt, acc * dt);
      this.s += this.vel * dt;
      if (this.s >= this.L) { this.s -= this.L; this.pauseDone = false; }
      return this.vel;
    },

    update(el, c) {
      const PS = this.PS;
      const vB = this.vel / this.scale;
      const pausing = this.pauseT >= 0;
      const g = this._seg(this.s);
      const f = g.len ? (wrap(this.s, 0, this.L) - g.s0) / g.len : 0;
      let mode = g.mode === 'pause' ? 'seat' : g.mode;
      if (mode === 'climb' && f > 0.62) mode = 'stand';
      if (mode === 'coast' && f > 0.88) mode = 'seat';

      // Comedy runs while he stands still because the weather says no.
      const standing = this.vel < 10 && !pausing;
      const reasonNow = standing ? moodReason(c.mood) : null;
      if (reasonNow && this.GAG[reasonNow]) {
        if (this.gag !== reasonNow) { this.gag = reasonNow; this.gagT = 0; }
        this.gagT += c.dt;
        if (this.gagT >= this.GAG[reasonNow]) this.gagT -= this.GAG[reasonNow];
      } else {
        this.gag = null;
        this.gagT = 0;
      }
      const gag = this.gag;
      const gt = this.gagT;

      // Wheels and cranks. Coasting holds the pedals level.
      this.wheel += (vB * c.dt) / 21;
      const cad = { seat: 0.55, climb: 0.9, stand: 0.62, coast: 0 }[mode];
      if (mode === 'coast' || pausing || vB < 3) {
        const target = Math.round(this.crank / Math.PI) * Math.PI;
        this.crank += (target - this.crank) * Math.min(1, c.dt * 2.5);
      } else {
        this.crank += ((vB * c.dt) / 21) * cad;
      }

      Object.keys(this.W).forEach((k) => {
        this.W[k] = lerp(this.W[k], k === mode ? 1 : 0, Math.min(1, c.dt * 2.2));
      });
      let stopT = standing ? 1 : 0;
      const pt8 = this.pauseT;
      if (pausing) stopT = pt8 < 1 ? ease(pt8) : pt8 > this.PAUSE - 1.3 ? 1 - ease((pt8 - (this.PAUSE - 1.3)) / 1.3) : 1;
      this.stopW = pausing ? stopT : lerp(this.stopW, stopT, Math.min(1, c.dt * 3));
      let sw = this.stopW;
      // Storm: feet leave the road when the gust lifts him.
      if (gag === 'wind' && gt > 4.6 && gt < 9.5) sw = Math.max(0, 1 - (gt - 4.6) / 0.5);

      const POSE = {
        seat: { hip: [-9, -43], ang: 52, hand: [39, -37], tilt: -16 },
        climb: { hip: [-8, -43.5], ang: 36, hand: [30, -36], tilt: -6 },
        stand: { hip: [3, -52], ang: 48, hand: [40, -38], tilt: -12 },
        coast: { hip: [-12, -42], ang: 70, hand: [41, -30.5], tilt: -36 },
        stop: { hip: [3, -37], ang: 12, hand: [39, -37], tilt: 0 },
      };
      const sum = Object.values(this.W).reduce((a, b) => a + b, 0) || 1;
      const mixP = (key) => {
        let x = 0;
        let y = 0;
        Object.keys(this.W).forEach((k) => {
          const v = POSE[k][key];
          const wgt = this.W[k] / sum;
          if (Array.isArray(v)) { x += v[0] * wgt; y += v[1] * wgt; } else x += v * wgt;
        });
        return Array.isArray(POSE.seat[key]) ? [x, y] : x;
      };
      let hip = mixP('hip');
      let ang = mixP('ang');
      let hand = mixP('hand');
      let tilt = mixP('tilt');
      const st = this.W.stand;
      hip = [hip[0] + Math.sin(this.crank * 2) * 1.4 * st, hip[1] - Math.abs(Math.sin(this.crank)) * 2.4 * st + Math.sin(this.crank * 2) * 0.5 * (1 - st) * Math.min(1, vB / 20)];

      // Wheelie: leans back, front wheel up, a little wobble.
      const wheelieOn = g.wheelie && !standing ? 1 : 0;
      this.wheelie = lerp(this.wheelie, wheelieOn * (1 - Math.max(0, (f - 0.8) / 0.2)), Math.min(1, c.dt * 2.2));
      hip = [hip[0] - 5 * this.wheelie, hip[1] - 1 * this.wheelie];
      ang -= 22 * this.wheelie;
      tilt -= 4 * this.wheelie;

      hip = lerpPt(hip, POSE.stop.hip, sw);
      ang = lerp(ang, POSE.stop.ang, sw);
      tilt = lerp(tilt, POSE.stop.tilt, sw);
      const a = (ang * Math.PI) / 180;
      let shoulder = [hip[0] + Math.sin(a) * 30, hip[1] - Math.cos(a) * 30];
      const na = a * 0.55;
      let head = [shoulder[0] + Math.sin(na) * 12.5 + 3.5, shoulder[1] - Math.cos(na) * 12.5];

      // Pedals and feet.
      const bb = [0, 4];
      const footOn = (cr) => {
        const pedal = polar(bb, 9, cr);
        const fa = 14 + 12 * Math.sin(cr);
        const off = rot([6.9, 3.75], fa);
        return { pedal, ankle: [pedal[0] - off[0], pedal[1] - off[1]], fa };
      };
      const near = footOn(this.crank);
      const far = footOn(this.crank + Math.PI);
      const ground = [16, 21 - 3.75];
      const lift = Math.sin(sw * Math.PI) * 6;
      let ankleN = [lerp(near.ankle[0], ground[0], sw), lerp(near.ankle[1], ground[1], sw) - lift];
      let faN = lerp(near.fa, 0, sw);
      let ankleF = far.ankle;
      let faF = far.fa;

      let handN = hand;
      let handF = [hand[0] - 3, hand[1] - 1];
      let headTilt = tilt;
      let bottleIn = false;
      let bottleRot = 52;
      let mouthO = false;
      let fly = null;          // [x, y, rotation] of the whole bike
      let walkBeside = null;   // he pushes the bike back in
      let helmetOn = true;
      let helmetFly = null;    // [x, y, rot] in bike units
      let shakeX = 0;

      // ----- drink during the pause -----
      if (pausing) {
        const mo = rot([6.2 * PS, 4.6 * PS], -24);
        const mouth = [head[0] + mo[0], head[1] + mo[1]];
        const cap = rot([0, -10], -112);
        const atMouth = [mouth[0] - cap[0], mouth[1] - cap[1]];
        const CAGE = [16, -8];
        handN = keyed([
          [0, hand], [1.0, hand], [1.8, CAGE], [2.6, atMouth],
          [4.8, atMouth], [5.5, [atMouth[0] + 3, atMouth[1] + 14]], [6.3, CAGE], [7.0, hand], [this.PAUSE, hand],
        ], pt8, lerpPt);
        bottleIn = pt8 >= 1.8 && pt8 < 6.3;
        bottleRot = keyed([[1.8, 52], [2.4, 0], [2.8, -112], [4.8, -112], [5.3, 10], [6.3, 52]], pt8, lerp);
        if (pt8 > 2.6 && pt8 < 4.8) headTilt = -24 + Math.sin(pt8 * 7) * 1.5;
        else if (pt8 > 4.8 && pt8 < 5.6) headTilt = lerp(-24, 0, (pt8 - 4.8) / 0.8);
      }

      // ----- storm: helmet first, then the rider flies away -----
      if (gag === 'wind') {
        const gust = 0.5 + 0.5 * wobble(c.t * 1.1, 1);
        if (gt < 2.6) {
          headTilt = 8;
        }
        if (gt >= 2.6 && gt < 4.6) {
          // Looks after his helmet, reaches back for it.
          const k = ease(clamp((gt - 2.6) / 0.5, 0, 1));
          headTilt = lerp(8, -18, k);
          handN = lerpPt(hand, [head[0] - 22, head[1] - 6], k * 0.9);
          mouthO = true;
        }
        if (gt >= 2.6 && gt < 4.8) {
          const k = (gt - 2.6) / 2.2;
          helmetFly = [head[0] - k * k * 330, head[1] - 12 - Math.sin(k * Math.PI) * 26 - k * 30, -k * 720];
        }
        if (gt >= 2.6) helmetOn = false;
        if (gt >= 4.0 && gt < 4.6) fly = [-(gt - 4.0) * 12, 0, 0];   // rolls back
        if (gt >= 4.6 && gt < 5.3) {
          const k = ease((gt - 4.6) / 0.7);
          fly = [-7.2 - k * 6, -k * 4, -k * 16];                       // front wheel lifts
          mouthO = true;
        }
        if (gt >= 5.3 && gt < 7.4) {
          const k = (gt - 5.3) / 2.1;
          // Rises fast first, then tumbles away with the wind.
          fly = [-13 - k * k * 400, -4 - 270 * (1 - (1 - k) * (1 - k)) + Math.sin(k * 9) * 5, -16 - k * k * 460];
          mouthO = true;
          // Arms and legs flail.
          handN = [shoulder[0] + 4 + Math.sin(c.t * 14) * 6, shoulder[1] - 24 + Math.cos(c.t * 13) * 4];
          handF = [shoulder[0] - 10 + Math.cos(c.t * 15) * 6, shoulder[1] - 22 + Math.sin(c.t * 12) * 4];
        }
        if (gt >= 7.4 && gt < 9.4) fly = [-900, 0, 0];               // gone
        if (gt >= 9.4 && gt < 15.2) {
          // Pushes the bike back in, bent into the wind, helmet on the bars.
          const k = clamp((gt - 9.4) / 5.2, 0, 1);
          fly = [lerp(-330, 0, k), 0, 0];
          walkBeside = { lean: 14 + 6 * gust, moving: k < 1 };
          helmetFly = [40, -27 + Math.sin(c.t * 4) * 1.5, 18 + Math.sin(c.t * 5) * 14];
        }
        if (gt >= 15.2) {
          // Back on the bike, helmet back on.
          const k = ease(clamp((gt - 15.2) / 1.2, 0, 1));
          helmetOn = k > 0.75;
          helmetFly = k < 0.75 ? lerpPt([40, -27], [head[0], head[1] - 10], k / 0.75).concat([lerp(18, 0, k)]) : null;
          handN = lerpPt([40, -27], [head[0] + 2, head[1] - 6], Math.sin(Math.min(1, k) * Math.PI));
        }
      }

      // ----- rain: a car drives through the puddle -----
      let soaked = 0;
      if (gag === 'rain') {
        const carX = lerp(520, -520, clamp((gt - 2.6) / 1.4, 0, 1));
        el('car').setAttribute('transform', `translate(${carX.toFixed(1)} 0) scale(1.55)`);
        el('puddle').setAttribute('rx', '24');
        if (gt >= 3.2 && !this.splashed) { this.splashed = true; this._splash(); }
        if (gt < 3.0) this.splashed = false;
        soaked = gt > 3.3 ? 1 : 0;
        if (gt > 3.3 && gt < 5.0) {
          // Frozen in shock, arms out, mouth open.
          const k = ease(clamp((gt - 3.3) / 0.3, 0, 1));
          handN = lerpPt(hand, [shoulder[0] + 18, shoulder[1] + 6], k);
          handF = lerpPt(handF, [shoulder[0] - 14, shoulder[1] + 8], k);
          mouthO = true;
          headTilt = -6;
        }
        if (gt >= 5.0 && gt < 7.0) {
          // Shakes himself like a dog.
          const k = Math.sin(((gt - 5.0) / 2.0) * Math.PI);
          shakeX = Math.sin(c.t * 38) * 2.2 * k;
          headTilt = Math.sin(c.t * 38) * 14 * k;
          handN = [shoulder[0] + 16, shoulder[1] + 10 + Math.sin(c.t * 38) * 4];
          handF = [shoulder[0] - 12, shoulder[1] + 12 - Math.sin(c.t * 38) * 4];
          if (Math.random() < c.dt * 30) this._drip([head[0] + rnd(-12, 12), head[1] + rnd(-6, 30)], true);
        }
      } else {
        el('car').setAttribute('transform', 'translate(900 0)');
        if (gag !== 'hot') el('puddle').setAttribute('rx', '0');
      }

      // ----- cold: icicle on the nose, then a sneeze -----
      let icicle = 0;
      if (gag === 'cold') {
        icicle = clamp(gt / 6, 0, 1);
        if (gt >= 6.0 && gt < 7.6) {
          icicle = 0;
          const k = gt - 6.0;
          headTilt = k < 0.12 ? -14 : k < 0.35 ? lerp(22, 10, (k - 0.12) / 0.23) : lerp(10, 0, clamp((k - 0.35) / 1.2, 0, 1));
          if (k < 0.12) mouthO = true;
          if (!this.sneezed && k > 0.12) { this.sneezed = true; this.ice = { x: head[0] + 11, y: head[1] + 3, vx: 120, vy: -40, r: 0, broke: false }; }
        }
        if (gt < 6.0) this.sneezed = false;
      }
      el('b-icicle').setAttribute('opacity', icicle > 0.02 ? '0.95' : '0');
      el('b-icicle').setAttribute('transform', `translate(9 2.2) scale(${(0.4 + 0.6 * icicle).toFixed(2)} ${icicle.toFixed(2)}) translate(-9 -2.2)`);
      el('frost-frame').setAttribute('opacity', gag === 'cold' ? '0.8' : '0');
      this._iceStep(el, c, gag === 'cold');
      el('sneeze').setAttribute('opacity', gag === 'cold' && gt > 6.1 && gt < 7.5 ? '1' : '0');
      el('sneeze').setAttribute('transform', `translate(${(head[0] + 16).toFixed(1)} ${(head[1] - 14).toFixed(1)})`);
      el('sneeze-t').textContent = c.lang === 'de' ? 'Hatschi!' : 'Achoo!';

      // ----- heat: sweat puddle, then water over the head -----
      if (gag === 'hot') {
        this.puddle = Math.min(30, this.puddle + c.dt * 3.2);
        el('puddle').setAttribute('rx', this.puddle.toFixed(1));
        const CAGE = [16, -8];
        const above = [head[0] + 4, head[1] - 20];
        if (gt >= 3.6 && gt < 8.6) {
          handN = keyed([[3.6, hand], [4.3, CAGE], [5.1, above], [7.1, above], [7.9, CAGE], [8.6, hand]], gt, lerpPt);
          bottleIn = gt >= 4.3 && gt < 7.9;
          bottleRot = keyed([[4.3, 52], [5.0, 0], [5.4, 165], [6.9, 165], [7.3, 10], [7.9, 52]], gt, lerp);
          if (gt > 5.4 && gt < 6.9) {
            headTilt = -10;
            for (let i = 0; i < 2; i += 1) if (Math.random() < c.dt * 40) this._pour(above);
          }
          if (gt > 6.9 && gt < 7.6) headTilt = Math.sin(c.t * 30) * 10;
        }
      } else {
        this.puddle = Math.max(0, this.puddle - c.dt * 10);
      }

      // ----- good weather: a bird rides along on the helmet -----
      this._bird(el, c, g, f, head, standing || gag !== null);

      // ----- body -----
      shoulder = [shoulder[0] + shakeX, shoulder[1]];
      head = [head[0] + shakeX * 1.4, head[1]];
      let hipD = hip;
      let kneeN;
      let kneeF;
      if (walkBeside) {
        // Standing next to the bike on the near side, walking.
        const gw = GAITS.walk;
        const vP = walkBeside.moving ? 64 / this.scale / PS : 0;
        this.walkPh = (this.walkPh || 0) + (vP * c.dt) / strideOf(gw, 0.75);
        const W = gaitPose(gw, this.walkPh, 0.75, walkBeside.moving ? 1 : 0, walkBeside.lean);
        const off = [13, 21 / PS];
        const m = (q) => [q[0] * PS + off[0] * PS, q[1] * PS + off[1] * PS];
        hipD = m(W.hip);
        shoulder = m(W.shoulder);
        head = m(W.head);
        ankleN = m(W.ankle); faN = W.footAng;
        ankleF = m(W.ankle2); faF = W.footAng2;
        kneeN = m(W.knee);
        kneeF = m(W.knee2);
        handN = [40, -36];
        handF = [36, -37];
        headTilt = 14;
        this.wheel += (64 / this.scale) * c.dt / 21 * (walkBeside.moving ? 1 : 0);
      } else {
        kneeN = ik(hipD, ankleN, LEG.thigh * PS, LEG.shin * PS, 1);
        kneeF = ik(hipD, ankleF, LEG.thigh * PS, LEG.shin * PS, 1);
      }
      el('f-spk-r').setAttribute('transform', `rotate(${deg(this.wheel).toFixed(1)})`);
      el('f-spk-f').setAttribute('transform', `rotate(${deg(this.wheel).toFixed(1)})`);
      line(el, 'f-crank', bb, near.pedal);
      line(el, 'f-crank2', bb, far.pedal);
      el('f-ped').setAttribute('cx', near.pedal[0].toFixed(1));
      el('f-ped').setAttribute('cy', near.pedal[1].toFixed(1));
      el('f-ped2').setAttribute('cx', far.pedal[0].toFixed(1));
      el('f-ped2').setAttribute('cy', far.pedal[1].toFixed(1));

      el('bottle-c').style.opacity = bottleIn ? '0' : '1';
      el('bottle-h').style.opacity = bottleIn ? '1' : '0';
      el('bottle-h').setAttribute('transform', `translate(${pt(handN)}) rotate(${bottleRot.toFixed(1)})`);

      const elbowN = ik(shoulder, handN, 14 * PS, 13 * PS, -1);
      const elbowF = ik(shoulder, handF, 14 * PS, 13 * PS, -1);
      const u = (q) => [q[0] / PS, q[1] / PS];
      const P = {
        hip: u(hipD), shoulder: u(shoulder), head: u(head), headTilt,
        knee: u(kneeN), ankle: u(ankleN), footAng: faN, foot: u([ankleN[0], ankleN[1] + 3.75]),
        knee2: u(kneeF), ankle2: u(ankleF), footAng2: faF, foot2: u([ankleF[0], ankleF[1] + 3.75]),
        elbow: u(elbowN), hand: u(handN), elbow2: u(elbowF), hand2: u(handF),
      };
      // Gentle reactions for borderline weather and before the comedy starts.
      const calm = !gag || (gag === 'wind' && gt < 2.6) || (gag === 'cold' && gt < 6) || (gag === 'hot' && gt < 3.6) || (gag === 'rain' && gt < 3.3) || (gag === 'rain' && gt >= 7);
      const { reason, w } = moodBlend(this, c, standing && calm);
      if (reason && w > 0.001) {
        const hold = reason === 'wind';
        const R = reactionPose({ ...P, foot: [0, 0], foot2: [0, 0] }, reason, c.t, {
          arm: [14, 13], handsToMouth: true, keepNear: hold, keepFar: hold || reason === 'hot',
        });
        ['elbow', 'hand', 'elbow2', 'hand2', 'shoulder', 'head'].forEach((k) => {
          const q = R.lean ? rotAround(R[k], P.hip, -R.lean) : R[k];
          P[k] = lerpPt(P[k], q, w);
        });
        P.headTilt = lerp(P.headTilt, R.headTilt, w);
      }
      setPerson(el, 'b-', P);
      cheeks(this.root, c);
      el('b-helmet').setAttribute('opacity', helmetOn ? '1' : '0');
      el('helmet-fly').setAttribute('opacity', helmetFly ? '1' : '0');
      if (helmetFly) {
        // On the handlebar it travels with the bike.
        const hx = helmetFly[0] + (walkBeside && fly ? fly[0] : 0);
        el('helmet-fly').setAttribute('transform', `translate(${hx.toFixed(1)} ${helmetFly[1].toFixed(1)}) rotate(${(helmetFly[2] || 0).toFixed(0)})`);
      }
      const mouth = el('b-mouth');
      mouth.setAttribute('d', mouthO ? 'M5.4 3.4 a1.4 1.8 0 1 0 0.01 0 Z' : 'M5 4.6 Q6.2 4.9 7.2 4.3');
      mouth.setAttribute('fill', mouthO ? '#5A2A20' : 'none');
      // Wet jersey after the soaking.
      this.wet = lerp(this.wet || 0, soaked, Math.min(1, c.dt * (soaked ? 6 : 0.25)));
      el('b-torso').setAttribute('fill', mix('#3D8BFF', '#1F4C8F', this.wet));
      if (this.wet > 0.2 && Math.random() < c.dt * 8 * this.wet) this._drip([rnd(-8, 16), rnd(-60, -30)], false);
      this._dropsStep(el, c);

      // Whole bike: wheelie, being blown away, pushed back in.
      const wh = this.wheelie * (14 + Math.sin(c.t * 3.1) * 2.5);
      const fx = fly || [0, 0, 0];
      el('b-fly').setAttribute('transform', `translate(${fx[0].toFixed(1)} ${fx[1].toFixed(1)}) rotate(${(fx[2] - wh).toFixed(1)} -30 21)`);
      if (el('fig-sh')) el('fig-sh').style.opacity = fly && (fx[1] < -2 || fx[0] < -20) ? '0' : '';
      this.head = [head[0] + fx[0], head[1] + fx[1]];
    },

    /** Big splash from the car's wheel: a sheet of water and many drops. */
    _splash() {
      for (let i = 0; i < 58; i += 1) {
        const d = this.drops && this.drops.find((q) => q.age >= 1);
        if (!d) break;
        d.age = 0; d.x = rnd(0, 34); d.y = 18; d.vx = rnd(-150, 10); d.vy = rnd(-300, -130); d.life = rnd(0.8, 1.3); d.r = rnd(1.2, 2.8);
      }
      this.waveT = 0;
    },

    _drip(p, fling) {
      const d = this.drops && this.drops.find((q) => q.age >= 1);
      if (!d) return;
      d.age = 0; d.x = p[0]; d.y = p[1];
      d.vx = fling ? rnd(-90, 90) : rnd(-4, 4); d.vy = fling ? rnd(-60, 0) : 0; d.life = 0.8; d.r = rnd(0.8, 1.4);
    },

    _pour(from) {
      const d = this.drops && this.drops.find((q) => q.age >= 1);
      if (!d) return;
      d.age = 0; d.x = from[0] + 2.6 + rnd(-1.5, 1.5); d.y = from[1] + 10; d.vx = rnd(-12, 8); d.vy = rnd(10, 40); d.life = 0.9; d.r = rnd(0.9, 1.6);
    },

    _dropsStep(el, c) {
      if (!this.drops) {
        this.drops = Array.from({ length: 70 }, (_, i) => ({ el: el(`wd${i}`), age: 1 }));
      }
      this.drops.forEach((d) => {
        if (d.age >= 1) { d.el.style.opacity = '0'; return; }
        d.age += c.dt / d.life;
        d.vy += 420 * c.dt;
        d.x += d.vx * c.dt;
        d.y += d.vy * c.dt;
        if (d.y > 21) { d.y = 21; d.vy = 0; d.vx *= 0.3; }
        d.el.setAttribute('cx', d.x.toFixed(1));
        d.el.setAttribute('cy', d.y.toFixed(1));
        d.el.setAttribute('r', d.r.toFixed(1));
        d.el.style.opacity = (0.85 * (1 - d.age)).toFixed(2);
      });
      const wv = el('wave');
      if (this.waveT !== undefined && this.waveT < 1) {
        this.waveT += c.dt / 0.75;
        const k = this.waveT;
        const h = Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5) * 115 * (1 - k * 0.5);
        wv.setAttribute('d', `M40 21 C${(36 - k * 10).toFixed(1)} ${(21 - h * 0.9).toFixed(1)} ${(4 - k * 40).toFixed(1)} ${(21 - h * 1.1).toFixed(1)} ${(-30 - k * 50).toFixed(1)} ${(21 - h * 0.55).toFixed(1)} C${(-14 - k * 30).toFixed(1)} ${(21 - h * 0.75).toFixed(1)} ${(8 - k * 10).toFixed(1)} ${(21 - h * 0.6).toFixed(1)} 4 21 Z`);
        wv.setAttribute('opacity', (0.6 * (1 - k)).toFixed(2));
      } else {
        wv.setAttribute('opacity', '0');
      }
    },

    /** Flying icicle after the sneeze; it breaks on the road. */
    _iceStep(el, c, on) {
      const fly = el('icicle-fly');
      if (!this.ice || !on) {
        fly.setAttribute('opacity', '0');
        if (!on) this.ice = null;
      } else if (!this.ice.broke) {
        const k = this.ice;
        k.vy += 420 * c.dt;
        k.x += k.vx * c.dt;
        k.y += k.vy * c.dt;
        k.r += 600 * c.dt;
        fly.setAttribute('opacity', '1');
        fly.setAttribute('transform', `translate(${k.x.toFixed(1)} ${k.y.toFixed(1)}) rotate(${k.r.toFixed(0)}) scale(${this.PS})`);
        if (k.y >= 20) {
          k.broke = true;
          k.shards = Array.from({ length: 5 }, (_, i) => ({ x: k.x, y: 20, vx: rnd(-50, 60), vy: rnd(-90, -30), r: rnd(0, 360), i }));
          k.t = 0;
        }
      } else {
        fly.setAttribute('opacity', '0');
      }
      for (let i = 0; i < 5; i += 1) {
        const s = this.ice && this.ice.shards && this.ice.shards[i];
        const sh = el(`sh${i}`);
        if (!s || this.ice.t > 1.4) { sh.setAttribute('opacity', '0'); continue; }
        s.vy += 380 * c.dt;
        s.x += s.vx * c.dt;
        s.y = Math.min(21, s.y + s.vy * c.dt);
        if (s.y >= 21) { s.vx *= 0.85; s.vy = 0; }
        s.r += s.vx * 3 * c.dt;
        sh.setAttribute('opacity', (1 - this.ice.t / 1.4).toFixed(2));
        sh.setAttribute('transform', `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.r.toFixed(0)}) scale(1.4)`);
      }
      if (this.ice && this.ice.broke) this.ice.t += c.dt;
    },

    /** Bird: flies in, rides on the helmet, flies off when he sprints. */
    _bird(el, c, g, f, head, off) {
      const bird = el('bird');
      const top = [head[0] - 1, head[1] - 15];
      let p = null;
      let flap = true;
      let flip = false;
      if (!off && g.bird) {
        if (f < 0.3) {
          const k = ease(f / 0.3);
          p = [lerp(top[0] + 260, top[0], k), lerp(top[1] - 120, top[1], k) - Math.sin(k * Math.PI) * 20];
        } else {
          p = top;
          flap = false;
        }
      } else if (!off && this._seg(this.s).mode === 'stand' && this.s - this.segs[1].s0 < 260) {
        const k = (this.s - this.segs[1].s0) / 260;
        p = [top[0] - k * 160, top[1] - k * 130];
        flip = true;
      }
      if (!p) { bird.setAttribute('opacity', '0'); return; }
      bird.setAttribute('opacity', '1');
      const hop = flap ? 0 : Math.max(0, Math.sin(c.t * 2.3)) > 0.97 ? -2 : 0;
      bird.setAttribute('transform', `translate(${p[0].toFixed(1)} ${(p[1] + hop).toFixed(1)}) scale(${flip ? -1.2 : 1.2} 1.2)`);
      el('bird-w').setAttribute('transform', flap ? `scale(1 ${Math.sin(c.t * 28).toFixed(2)})` : 'rotate(70) scale(0.6 0.5)');
      el('bird-legs').setAttribute('opacity', flap ? '0' : '1');
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
      // Step rate follows the ground speed, so the planted foot never slides.
      const g = GAITS.run;
      const v = c.v / this.scale;
      const amp = clamp(0.55 + v / 160, 0.6, 1.1);
      this.ph = (this.ph || 0) + (v * c.dt) / strideOf(g, amp);
      const P = gaitPose(g, this.ph, amp, clamp(v / 25, 0, 1));
      personMood(this, P, c, { arm: [14, 13], legs: true, standing: true });
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
    speed: 65,
    mouth: [11, -79],
    shadow: [0, 20],
    build() {
      return personSvg('w-', {
        shirt: '#00B3AF', shirtFar: '#007F7C', pants: '#2A3445', pantsFar: '#1C2430', shoes: '#4A3426',
        leg: '#2A3445', legFar: '#1C2430', extra: UMBRELLA,
      });
    },
    update(el, c) {
      const g = GAITS.walk;
      const v = c.v / this.scale;
      const amp = clamp(0.6 + v / 120, 0.6, 1.05);
      this.ph = (this.ph || 0) + (v * c.dt) / strideOf(g, amp);
      const P = gaitPose(g, this.ph, amp, clamp(v / 15, 0, 1));
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
      personMood(this, P, c, { arm: [14, 13], legs: true, standing: true, keepNear: umbrella, umbrella });
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
      const hip = [0, -STAND_HIP];
      const shoulder = [lean + 2, -STAND_HIP - 24];
      const P = { hip, shoulder, head: [lean + 5, -STAND_HIP - 34.5], foot: kick, foot2: plant };
      P.knee = legTo(hip, P.foot);
      P.knee2 = legTo(hip, P.foot2);
      const sw = still ? 0 : keyed([[0, 0], [0.55, 0.9], [0.75, -0.7], [1.2, 0]], tau, lerp);
      P.elbow = polar(shoulder, 14, Math.PI / 2 - sw);
      P.hand = polar(P.elbow, 13, Math.PI / 2 - sw - 0.5);
      P.elbow2 = polar(shoulder, 14, Math.PI / 2 + sw * 0.8);
      P.hand2 = polar(P.elbow2, 13, Math.PI / 2 + sw * 0.8 - 0.5);
      personMood(this, P, c, { arm: [14, 13], legs: true, standing: true });
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

  /* ---------------- Grilling ----------------
   * A whole grilling round, about 37 seconds at full pace:
   * take the lid off and put it on the table, lay three steaks on the
   * grate one by one, let them sizzle, turn them, serve them back onto
   * the plate and put the lid back on. Flames flare up when meat meets
   * the grate or is turned, the steaks brown and get grill marks.
   */
  bbq: {
    env: 'garden',
    anchor: [292, 236],
    scale: 1.3,
    speed: 1,
    mouth: [-6, -78],
    shadow: [6, 52],
    build() {
      const bars = Array.from({ length: 12 }, (_, i) => `M${9 + i * 3} -56 V-43`).join(' ');
      const flames = Array.from({ length: 8 }, (_, i) => `<path class="flame" id="fl${i}" d="M0 0 C-3 -3 -2.5 -7 0 -11 C2.5 -7 3 -3 0 0 Z"/>`).join('');
      const embers = Array.from({ length: 9 }, (_, i) => `<circle id="em${i}" cx="${(11 + i * 3.6).toFixed(1)}" cy="${(-46.5 + (i % 3) - 1).toFixed(1)}" r="${(1.2 + (i % 2) * 0.6).toFixed(1)}" fill="#FF7A1A"/>`).join('');
      const smoke = Array.from({ length: 14 }, (_, i) => `<circle class="smoke" id="sm${i}" r="4"/>`).join('');
      const sparks = Array.from({ length: 8 }, (_, i) => `<circle class="spark" id="sp${i}" r="0.8"/>`).join('');
      const steak = (i) => `
        <g id="st${i}">
          <g id="st${i}-f">
            <path id="st${i}-b" d="M-7 -1 C-7.4 -4.4 -2 -5 2 -4.6 C6.2 -4.2 8.4 -2.4 7.4 0.6 C6.4 3.4 0.4 3.8 -3 3.3 C-6.2 2.9 -6.8 1.6 -7 -1 Z" fill="#C2403A"/>
            <path d="M-6.2 -1.6 C-5.6 -3.6 -1 -4 2 -3.8" stroke="#F3D3C4" stroke-width="1.1" fill="none" stroke-linecap="round" id="st${i}-fat"/>
            <path id="st${i}-m" d="M-4 2.4 L-1.4 -3.6 M-0.6 2.8 L2 -3.6 M2.8 2.6 L5.2 -2.6" stroke="#2A140C" stroke-width="1.2" stroke-linecap="round" opacity="0"/>
          </g>
          <path d="M-7.2 -0.4 C-7 2.6 -3 4 0 4 C4 4 7 2.8 7.4 0.8 L7.4 2.2 C6.6 4.4 2.6 5.2 -0.4 5.2 C-4 5.2 -7.2 3.6 -7.2 1.2 Z" fill="#8E2E28" id="st${i}-edge"/>
        </g>`;
      return `
        <defs>
          <clipPath id="grate-clip"><ellipse cx="26" cy="-49" rx="18" ry="4.6"/></clipPath>
          <clipPath id="fire-clip"><rect x="7" y="-90" width="38" height="43"/></clipPath>
          <radialGradient id="coal-g"><stop offset="0" stop-color="#FFB020"/><stop offset="0.6" stop-color="#C2410C"/><stop offset="1" stop-color="#2A1408"/></radialGradient>
          <linearGradient id="bowl-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#2E3848"/><stop offset="0.45" stop-color="#3A4658"/><stop offset="1" stop-color="#1F2733"/>
          </linearGradient>
        </defs>
        <!-- side table with the plate -->
        <path d="M-86 -46 H-28 M-83 -46 L-84 0 M-31 -46 L-30 0 M-84 -22 H-30" stroke="#6B5240" stroke-width="2.6" stroke-linecap="round"/>
        <rect x="-88" y="-48.5" width="62" height="3" rx="1.2" fill="#8A6A50"/>
        <ellipse cx="-36" cy="-49" rx="9" ry="2.4" fill="#F2F6FB"/>
        <ellipse cx="-36" cy="-49.3" rx="6" ry="1.4" fill="#DDE4EE"/>

        <!-- grill: legs, ash pan, bowl -->
        <path d="M13 -36 L4 0 M39 -36 L48 0 M26 -31 V0" stroke="#2A3445" stroke-width="2.6" stroke-linecap="round"/>
        <ellipse cx="26" cy="-14" rx="13" ry="2.4" fill="none" stroke="#3A4658" stroke-width="1.6"/>
        <circle cx="48" cy="-1" r="3.2" fill="#0B1017"/>
        <path d="M6 -48 A20 18 0 0 0 46 -48 Z" fill="url(#bowl-g)"/>
        <path d="M9 -42 A18 13 0 0 0 20 -33" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="2" fill="none" stroke-linecap="round"/>
        <ellipse cx="26" cy="-48" rx="20" ry="5.6" fill="#141A22"/>
        <ellipse id="coals" cx="26" cy="-46.6" rx="17" ry="3.8" fill="url(#coal-g)" opacity="0.4"/>
        <g id="embers">${embers}</g>
        <g clip-path="url(#grate-clip)"><path d="${bars}" stroke="#7E8CA0" stroke-width="0.9"/></g>
        <ellipse cx="26" cy="-49" rx="18" ry="4.6" fill="none" stroke="#7E8CA0" stroke-width="1"/>
        <ellipse cx="26" cy="-48" rx="20" ry="5.6" fill="none" stroke="#55657F" stroke-width="1.6"/>
        <g clip-path="url(#fire-clip)"><g id="flames">${flames}</g></g>
        ${steak(0)}${steak(1)}${steak(2)}
        <g id="sparks">${sparks}</g>
        <g id="smokes">${smoke}</g>

        <!-- cook -->
        <g id="cook">
          ${personSvg('c-', {
    shirt: '#E8EDF4', pants: '#2A3445', shoes: '#0B1017', longSleeves: true, longPants: true,
    apron: '#FF7A1A', belly: 1.6, hair: '#5A4030',
    hat: '<path d="M-6.8 -5.6 V-10.5 C-9.6 -11.5 -9.2 -16.6 -5.4 -16 C-4.6 -19.6 1 -20 2.4 -16.6 C6 -17.8 8.2 -13 5.6 -10.5 V-5.6 Z" fill="#F2F6FB"/><path d="M-6.8 -6.2 H5.6" stroke="#C3D0E0" stroke-width="1.6"/>',
    extra: '<g id="tongs"><path id="tg1" stroke="#C3D0E0" stroke-width="1.5" stroke-linecap="round" fill="none"/><path id="tg2" stroke="#A9B8C9" stroke-width="1.5" stroke-linecap="round" fill="none"/></g>',
  })}
        </g>

        <!-- lid, drawn last: it is carried in front -->
        <g id="lid">
          <path d="M-20 0 A20 15 0 0 1 20 0 Z" fill="#2A3445"/>
          <path d="M-15 -6 A17 12 0 0 1 2 -14" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M-20.5 0 H20.5" stroke="#55657F" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M-4 -14.6 V-17.6 M4 -14.6 V-17.6" stroke="#7E8CA0" stroke-width="1.4"/>
          <path d="M-5.5 -18 H5.5" stroke="#4A3828" stroke-width="3" stroke-linecap="round"/>
          <path id="vent-smoke-anchor" d="M8 -12 h3" stroke="#7E8CA0" stroke-width="1.4"/>
        </g>`;
    },

    init() {
      const COOK_X = -14;
      const STACK = [[-36, -50.2], [-36, -52.6], [-36, -55]];
      const SPOT = [[16, -50.2], [26, -50.8], [36, -50.2]];
      const LID_CLOSED = [26, -48];
      const LID_TABLE = [-64, -48.5];
      const HANDLE = -18;
      // Tongs reach 10 forward and 8 down from the hand.
      const tipHand = (tip, face) => [tip[0] - 10 * face, tip[1] - 8];
      const K = [];
      let now = 0;
      let x = COOK_X;
      const key = (dt, hnd, face, mode) => { now += dt; K.push({ t: now, hand: hnd, face, mode, x }); };
      const tip = (dt, p, face) => key(dt, tipHand(p, face), face, 'tip');
      const hand = (dt, p, face) => key(dt, p, face, 'hand');
      const stepTo = (nx) => { x = nx; };
      const up = (p, d) => [p[0], p[1] - d];
      const E = {};

      tip(0, [12, -42], 1);
      tip(0.8, [12, -42], 1);
      // Lid off, onto the table.
      hand(1.0, up(LID_CLOSED, -HANDLE), 1);
      hand(0.3, up(LID_CLOSED, -HANDLE), 1); E.lidOff = now;
      hand(0.9, [22, -84], 1);
      hand(0.7, [-12, -78], -1);
      stepTo(-30);
      hand(1.0, up(LID_TABLE, -HANDLE), -1); E.lidDown = now;
      stepTo(COOK_X);
      hand(0.7, [-30, -62], -1);
      // Three steaks from the plate onto the grate (top of the stack first).
      E.grab = []; E.place = [];
      [2, 1, 0].forEach((s, i) => {
        tip(0.6, up(STACK[s], 3), -1);
        tip(0.25, STACK[s], -1); E.grab[i] = now; E.stack = E.stack || []; E.stack[i] = s;
        tip(0.45, up(STACK[s], 12), -1);
        tip(0.55, [-6, -56], 1);
        tip(0.7, up(SPOT[i], 4), 1);
        tip(0.3, SPOT[i], 1); E.place[i] = now;
        tip(0.35, up(SPOT[i], 8), 1);
        if (i < 2) tip(0.45, [-22, -56], -1);
      });
      // Sizzle.
      tip(0.6, [14, -42], 1);
      tip(2.2, [14, -42], 1);
      // Turn each steak.
      E.flip0 = []; E.flip1 = [];
      [0, 1, 2].forEach((i) => {
        tip(0.4, up(SPOT[i], 2), 1);
        tip(0.15, SPOT[i], 1); E.flip0[i] = now;
        tip(0.35, up(SPOT[i], 10), 1);
        tip(0.3, up(SPOT[i], 4), 1);
        tip(0.2, SPOT[i], 1); E.flip1[i] = now;
        tip(0.25, up(SPOT[i], 6), 1);
      });
      tip(0.5, [14, -42], 1);
      tip(2.2, [14, -42], 1);
      // Serve onto the plate.
      E.serve0 = []; E.serve1 = [];
      [0, 1, 2].forEach((i) => {
        tip(0.4, up(SPOT[i], 2), 1);
        tip(0.15, SPOT[i], 1); E.serve0[i] = now;
        tip(0.4, up(SPOT[i], 12), 1);
        tip(0.55, [-24, -58], -1);
        tip(0.45, up(STACK[i], 3), -1);
        tip(0.2, STACK[i], -1); E.serve1[i] = now;
        tip(0.3, up(STACK[i], 9), -1);
        if (i < 2) tip(0.5, [-4, -56], 1);
      });
      // Lid back on.
      stepTo(-30);
      hand(0.8, up(LID_TABLE, -HANDLE), -1);
      hand(0.25, up(LID_TABLE, -HANDLE), -1); E.lidUp = now;
      hand(0.6, [-58, -80], -1);
      stepTo(COOK_X);
      hand(0.9, [0, -82], 1);
      hand(0.8, up(LID_CLOSED, -HANDLE + 3), 1);
      hand(0.3, up(LID_CLOSED, -HANDLE), 1); E.lidOn = now;
      tip(0.6, [12, -42], 1);
      tip(1.6, [12, -42], 1);

      this.S = { COOK_X, STACK, SPOT, LID_CLOSED, LID_TABLE, HANDLE, K, E, T: now };
      this.smoke = null;
    },

    /** Hand position, facing and tool mode at loop time tau. */
    _key(tau) {
      const K = this.S.K;
      let i = 1;
      while (i < K.length - 1 && K[i].t < tau) i += 1;
      const a = K[i - 1];
      const b = K[i];
      const f = b.t > a.t ? ease(clamp((tau - a.t) / (b.t - a.t), 0, 1)) : 1;
      const raw = b.t > a.t ? clamp((tau - a.t) / (b.t - a.t), 0, 1) : 1;
      return {
        hand: lerpPt(a.hand, b.hand, f), face: lerp(a.face, b.face, f), mode: f < 0.5 ? a.mode : b.mode,
        x: lerp(a.x, b.x, f), stepping: a.x !== b.x ? raw : -1,
      };
    },

    update(el, c) {
      const S = this.S;
      const E = S.E;
      const t = c.t;
      const active = c.pace > 0.02;
      // Story time runs with the pace; it rests at the start when it is a no.
      this.tau = active ? (c.dist % S.T) : 0;
      const tau = this.tau;
      const k = active ? this._key(tau) : { hand: [-2, -50], face: 1, mode: 'tip', x: S.COOK_X, stepping: -1 };

      // ----- cook -----
      const face = k.face;
      const vis = face >= 0 ? Math.max(0.6, face) : Math.min(-0.6, face);
      const sign = face >= 0 ? 1 : -1;
      el('cook').setAttribute('transform', `translate(${k.x.toFixed(2)} 0) scale(${vis.toFixed(3)} 1)`);
      const local = (w) => [(w[0] - k.x) / vis, w[1]];
      const handL = local(k.hand);
      const hip = [0, -STAND_HIP];
      const reach = handL[0];
      const lean = clamp((reach - 15) * 0.95, -4, 26) + Math.sin(t * 1.1) * 0.8;
      const P = {
        hip,
        shoulder: rotAround([2, -STAND_HIP - 24], hip, lean),
        head: rotAround([5.5, -STAND_HIP - 35.5], hip, lean),
        foot: [6 + Math.max(0, lean - 12) * 0.3, 0],
        foot2: [-5, 0],
      };
      if (k.stepping >= 0) {
        // Lead foot first, then the other one follows.
        const s1 = Math.sin(clamp(k.stepping * 2, 0, 1) * Math.PI);
        const s2 = Math.sin(clamp(k.stepping * 2 - 1, 0, 1) * Math.PI);
        P.foot = [P.foot[0] + s1 * 4, -s1 * 4];
        P.foot2 = [P.foot2[0] + s2 * 3, -s2 * 3.5];
        P.hip = [0, -STAND_HIP - (s1 + s2) * 0.8];
      }
      P.knee = legTo(P.hip, P.foot);
      P.knee2 = legTo(P.hip, P.foot2);
      const look = Math.atan2(handL[1] + 8 - P.head[1], handL[0] - P.head[0]);
      P.headTilt = clamp(deg(look) * 0.55, -14, 26);
      P.hand = handL;
      P.elbow = ik(P.shoulder, P.hand, 16, 15, -1);
      // Free hand: on the hip while working, steadies the lid when carrying it.
      if (k.mode === 'hand' && active) {
        P.hand2 = [handL[0] - 9, handL[1] + 6];
      } else {
        P.hand2 = rotAround([-3, -STAND_HIP - 1], hip, lean * 0.5);
      }
      P.elbow2 = ik(P.shoulder, P.hand2, 16, 15, active && k.mode === 'hand' ? -1 : 1);
      personMood(this, P, c, { arm: [16, 15], legs: true, standing: true });
      setPerson(el, 'c-', P);
      cheeks(this.root, c);
      this.head = [k.x + P.head[0] * vis, P.head[1]];

      // Tongs: closed while holding meat, slightly open otherwise.
      const tipW = k.mode === 'tip' || !active ? [k.hand[0] + 10 * face, k.hand[1] + 8] : [k.hand[0] + 2 * face, k.hand[1] + 12];
      const tipL = local(tipW);
      const holding = this._holding;
      const jaw = holding ? 0.4 : 1.6;
      const dir = Math.atan2(tipL[1] - P.hand[1], tipL[0] - P.hand[0]);
      const nrm = [-Math.sin(dir), Math.cos(dir)];
      el('tg1').setAttribute('d', `M${pt(P.hand)} L${pt([tipL[0] + nrm[0] * jaw, tipL[1] + nrm[1] * jaw])}`);
      el('tg2').setAttribute('d', `M${pt(P.hand)} L${pt([tipL[0] - nrm[0] * jaw, tipL[1] - nrm[1] * jaw])}`);
      if ((this.moodShown || 0) > 0.3) { el('tg1').setAttribute('d', ''); el('tg2').setAttribute('d', ''); }

      // ----- lid -----
      const inWindow = (a, b) => active && tau >= a && tau < b;
      let lidPos = S.LID_CLOSED;
      let lidRot = 0;
      if (inWindow(E.lidOff, E.lidDown) || inWindow(E.lidUp, E.lidOn)) {
        lidPos = [k.hand[0], k.hand[1] - S.HANDLE];
        lidRot = Math.sin(clamp((tau - E.lidOff) / 2, 0, 1) * Math.PI) * -6 * sign;
      } else if (inWindow(E.lidDown, E.lidUp)) {
        lidPos = S.LID_TABLE;
      }
      el('lid').setAttribute('transform', `translate(${pt(lidPos)}) rotate(${lidRot.toFixed(1)} 0 -18)`);
      const lidOpen = active && tau > E.lidOff + 0.4 && tau < E.lidOn - 0.2 ? 1 : 0;
      this.lidOpen = lerp(this.lidOpen || 0, lidOpen, Math.min(1, c.dt * 3));

      // ----- steaks -----
      this._holding = false;
      let onGrill = 0;
      let flare = 0;
      const since = (te) => (active && tau >= te ? Math.exp(-(tau - te) * 2.2) : 0);
      for (let i = 0; i < 3; i += 1) {
        const s = E.stack[i];
        let pos = S.STACK[s];
        let flip = 1;
        let rot = 0;
        let top = 'raw';
        let state = 'plate';
        if (active) {
          if (tau >= E.grab[i] && tau < E.place[i]) state = 'tongs';
          else if (tau >= E.place[i] && tau < E.flip0[i]) state = 'grill';
          else if (tau >= E.flip0[i] && tau < E.flip1[i]) state = 'flip';
          else if (tau >= E.flip1[i] && tau < E.serve0[i]) state = 'grill2';
          else if (tau >= E.serve0[i] && tau < E.serve1[i]) state = 'served';
          else if (tau >= E.serve1[i]) state = 'done';
        }
        const tipNow = tipW;
        if (state === 'tongs' || state === 'served') { pos = tipNow; rot = -12 * sign; this._holding = true; }
        if (state === 'grill' || state === 'grill2') { pos = S.SPOT[i]; onGrill += 1; }
        if (state === 'flip') {
          const f = (tau - E.flip0[i]) / (E.flip1[i] - E.flip0[i]);
          pos = tipNow;
          flip = Math.cos(f * Math.PI);
          this._holding = true;
          top = f < 0.5 ? 'raw' : 'cooked';
        }
        if (state === 'grill2' || state === 'served' || state === 'done') top = 'cooked';
        if (state === 'done') pos = S.STACK[i];
        // Browning: the side on the grate cooks, it is shown after turning.
        const cookA = active ? clamp((tau - E.place[i]) / Math.max(0.1, E.flip0[i] - E.place[i]), 0, 1) : 0;
        const warm = active ? clamp((tau - E.place[i]) / 8, 0, 1) : 0;
        const color = top === 'cooked' ? mix('#C2403A', '#6E3420', 0.35 + 0.65 * cookA) : mix('#C2403A', '#A84A3E', warm * 0.5);
        el(`st${i}-b`).setAttribute('fill', color);
        el(`st${i}-m`).setAttribute('opacity', top === 'cooked' ? (0.85 * cookA).toFixed(2) : '0');
        el(`st${i}-fat`).setAttribute('stroke', top === 'cooked' ? '#E8B07A' : '#F3D3C4');
        el(`st${i}-edge`).setAttribute('fill', mix('#8E2E28', '#5A2A18', warm));
        el(`st${i}`).setAttribute('transform', `translate(${pt(pos)}) rotate(${rot.toFixed(1)}) scale(1 ${(0.55 * Math.max(0.12, Math.abs(flip))).toFixed(3)})`);
        el(`st${i}-f`).setAttribute('transform', flip < 0 ? 'scale(1 -1)' : '');
        flare += since(E.place[i]) + since(E.flip1[i]) * 0.8;
      }

      // ----- fire, smoke and sparks -----
      const open = this.lidOpen;
      const heat = active ? 1 : 0;
      el('coals').setAttribute('opacity', (heat * (0.55 + 0.15 * Math.sin(t * 3.1) + 0.2 * open)).toFixed(2));
      for (let i = 0; i < 9; i += 1) {
        el(`em${i}`).setAttribute('opacity', (heat * (0.35 + 0.65 * Math.abs(Math.sin(t * (1.3 + i * 0.37) + i)))).toFixed(2));
      }
      for (let i = 0; i < 8; i += 1) {
        const x = 11 + i * 4.3;
        const lick = 0.45 + 0.55 * Math.abs(Math.sin(t * (6.3 + i * 0.9) + i * 2.1));
        const h = heat * open * (0.35 + 0.25 * lick + flare * 0.9 * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 9)));
        const sway = Math.sin(t * 4 + i) * 6 - clamp(c.look.wind, 0, 50) * 0.3;
        el(`fl${i}`).setAttribute('transform', `translate(${x.toFixed(1)} -46.5) rotate(${sway.toFixed(1)}) scale(${(0.7 + 0.3 * lick).toFixed(2)} ${h.toFixed(2)})`);
      }
      if (!this.smoke) {
        this.smoke = Array.from({ length: 14 }, (_, i) => ({ el: el(`sm${i}`), age: 1, x: 0, y: 0, r: 3 }));
        this.sparks = Array.from({ length: 8 }, (_, i) => ({ el: el(`sp${i}`), age: 1, x: 0, y: 0, vx: 0, vy: 0 }));
        this.smokeT = 0;
      }
      // Smoke: a little from the coals, more with meat on the grate, a
      // thick puff on every sizzle; through the vent when the lid is on.
      const rate = heat * (open * (0.6 + onGrill * 0.9 + flare * 4) + (1 - open) * 0.5);
      this.smokeT -= c.dt * rate;
      if (this.smokeT <= 0 && rate > 0) {
        const p = this.smoke.find((q) => q.age >= 1);
        if (p) {
          p.age = 0;
          p.x = open > 0.5 ? rnd(12, 40) : 36;
          p.y = open > 0.5 ? -52 : -62;
          p.r = rnd(2.2, 3.6);
          p.dark = onGrill > 0 ? 1 : 0;
        }
        this.smokeT = 0.35;
      }
      const wind = clamp(c.look.wind, 0, 60);
      this.smoke.forEach((p) => {
        if (p.age >= 1) { p.el.style.opacity = '0'; return; }
        p.age += c.dt / 3;
        const a = p.age;
        p.x += (-(4 + wind * 0.9) * a + Math.sin(a * 7 + p.r) * 4) * c.dt;
        p.y -= (16 - wind * 0.18) * c.dt;
        p.el.setAttribute('cx', p.x.toFixed(1));
        p.el.setAttribute('cy', p.y.toFixed(1));
        p.el.setAttribute('r', (p.r + a * 8).toFixed(1));
        p.el.style.opacity = ((0.24 + p.dark * 0.08) * Math.sin(Math.min(1, a * 1.3) * Math.PI) * (1 - a * 0.4)).toFixed(2);
      });
      // Fat drips into the fire and throws sparks while meat sizzles.
      this.sparks.forEach((s) => {
        if (s.age >= 1) {
          if (open > 0.5 && (onGrill > 0 || flare > 0.2) && Math.random() < c.dt * (1.2 + flare * 8)) {
            s.age = 0; s.x = rnd(12, 40); s.y = -50; s.vx = rnd(-12, 12); s.vy = rnd(-45, -20);
          } else { s.el.style.opacity = '0'; return; }
        }
        s.age += c.dt / 0.7;
        s.vy += 60 * c.dt;
        s.x += s.vx * c.dt;
        s.y += s.vy * c.dt;
        s.el.setAttribute('cx', s.x.toFixed(1));
        s.el.setAttribute('cy', s.y.toFixed(1));
        s.el.style.opacity = (1 - s.age).toFixed(2);
      });
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
        if (this.figure.terrain) {
          const posts = Array.from({ length: 3 }, (_, i) => `<g id="post${i}"><rect x="-1.6" y="-22" width="3.2" height="22" rx="1" fill="#E8EDF4"/><rect x="-1.6" y="-19" width="3.2" height="4" fill="#FF5F52"/></g>`).join('');
          return `
          <path id="land" fill="url(#grass)"/>
          <g id="posts">${posts}</g>
          <path id="road-b" fill="#1F2733"/>
          <path id="wet" fill="#5C82B0" opacity="0"/>
          <path id="road-edge" fill="none" stroke="#2E3848" stroke-width="1.5"/>
          <path id="road-dash" fill="none" stroke="#55657F" stroke-width="2.5" stroke-dasharray="22 18"/>
          <path id="verge" fill="#121C16"/>`;
        }
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
    const puffs = Array.from({ length: 9 }, (_, i) => `<circle class="puff" id="b${i}" r="3"/>`).join('');
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
      ? `<ellipse id="fig-sh" cx="${fig.anchor[0] + fig.shadow[0] * fig.scale}" cy="${fig.anchor[1] + 1}" rx="${fig.shadow[1] * fig.scale}" ry="4" fill="#000" opacity="0.3"/>`
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
    for (let i = 0; i < 9; i += 1) this.puffs.push({ el: byId(`b${i}`), age: 1, x: 0, y: 0, vx: 0, vy: 0 });
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
    const v = this.figure.plan ? this.figure.plan(dt, this.pace) : this.figure.speed * this.pace;
    this.dist += v * dt;
    const scroll = this.env === 'road' || this.env === 'path' || this.env === 'water';
    const vw = scroll ? v : 0;
    this.world = (this.world || 0) + vw * dt;
    const w = this.world;
    const wind = clamp(L.wind || 0, 0, 80);

    this.figure.root = this.root;
    this.figure.update($, { dist: this.dist, t, dt, pace: this.pace, look: L, v: vw, mood: this.mood, lang: this.lang || 'en' });
    const cam = this._terrain(w);
    this._moodFx(dt);

    // Parallax: far things move slowly, near things fast.
    $('hills-far').setAttribute('transform', `translate(${(-(w * 0.06) % 600).toFixed(1)} ${(cam * 0.15).toFixed(1)})`);
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
      $('hills-near').setAttribute('transform', `translate(${(-(w * 0.18) % 600).toFixed(1)} ${(cam * 0.3).toFixed(1)})`);
      if ($('road-dash')) $('road-dash').style.strokeDashoffset = (w % 40).toFixed(1);
      const lean = -wind * 0.18;
      this.trees.forEach((tr) => {
        const x = scroll ? wrap(tr.x - w * 0.55, -70, 680) : tr.x;
        const sway = Math.sin(t * (1.4 + wind * 0.03) + tr.ph) * (0.6 + wind * 0.12);
        tr.el.setAttribute('transform', `translate(${x.toFixed(1)} ${((this.env === 'road' || this.env === 'path' ? SC.ROAD_Y - 1 : SC.HORIZON + 4) + cam * 0.45).toFixed(1)})`);
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

    // Breath: when it is cold every exhale leaves a small cloud that
    // leaves the mouth, slows down, rises, grows and fades.
    const coldness = Math.max(L.cold, this.mood.cold || 0);
    const a = this.figure.anchor;
    const fs = this.figure.scale || 1;
    const head = this.figure.head;
    const mouth = head ? [head[0] + 8.5, head[1] + 2.5] : this.figure.mouth;
    const breath = (t % 3.2) / 3.2;
    this.breathT = (this.breathT || 0) - dt;
    if (coldness > 0.05 && breath < 0.3 && this.breathT <= 0) {
      const p = this.puffs.find((q) => q.age >= 1);
      if (p) {
        p.age = 0;
        p.x = a[0] + mouth[0] * fs;
        p.y = a[1] + (this.fy || 0) + mouth[1] * fs;
        p.vx = 24 * fs;
        p.vy = -2;
      }
      this.breathT = 0.12;
    }
    this.puffs.forEach((p) => {
      if (p.age >= 1) { p.el.style.opacity = '0'; return; }
      p.age += dt / 1.9;
      p.vx *= Math.exp(-dt * 2.4);
      p.x += (p.vx - wind * 0.3 - vw * 0.6) * dt;
      p.y += (p.vy - 4) * dt;
      const k = p.age;
      p.el.setAttribute('cx', p.x.toFixed(1));
      p.el.setAttribute('cy', p.y.toFixed(1));
      p.el.setAttribute('r', ((1.2 + k * 5.5) * fs * 0.8).toFixed(1));
      const fade = k < 0.12 ? k / 0.12 : (1 - k) / 0.88;
      p.el.style.opacity = (coldness * 0.5 * fade).toFixed(2);
    });
  }

  /**
   * Road over hills: the road, the ground below it, roadside posts and the
   * figure follow the height profile of the figure's plan. The camera
   * follows part of the height. Returns that camera offset.
   */
  _terrain(w) {
    const fig = this.figure;
    this.fy = 0;
    if (!fig.terrain || !this.$('road-b')) return 0;
    const $ = this.$;
    const ax = fig.anchor[0];
    const e = (x) => fig.terrain(fig.s + (x - ax));
    const cam = e(ax) * 0.6;
    const top = (x) => SC.ROAD_Y - (e(x) - cam);
    const xs = [];
    for (let x = -20; x <= SC.W + 20; x += 10) xs.push(x);
    const tops = xs.map(top);
    const edge = xs.map((x, i) => `${x} ${tops[i].toFixed(1)}`).join(' L');
    const back = xs.slice().reverse().map((x, i) => `${x} ${(tops[xs.length - 1 - i] + SC.ROAD_H).toFixed(1)}`).join(' L');
    const band = `M${edge} L${back} Z`;
    $('road-b').setAttribute('d', band);
    $('wet').setAttribute('d', band);
    $('road-edge').setAttribute('d', `M${edge}`);
    $('road-dash').setAttribute('d', `M${xs.map((x, i) => `${x} ${(tops[i] + 17).toFixed(1)}`).join(' L')}`);
    $('land').setAttribute('d', `M${xs.map((x, i) => `${x} ${(tops[i] - 6).toFixed(1)}`).join(' L')} L${SC.W + 20} ${SC.H} L-20 ${SC.H} Z`);
    $('verge').setAttribute('d', `M${back.split(' L').reverse().join(' L')} L${SC.W + 20} ${SC.H} L-20 ${SC.H} Z`);
    for (let i = 0; i < 3; i += 1) {
      const x = wrap(120 + i * 240 - w, -30, 690);
      $(`post${i}`).setAttribute('transform', `translate(${x.toFixed(1)} ${(top(x) + 2).toFixed(1)})`);
    }
    // The figure stands on the road and tilts with the slope.
    const dy = -(e(ax) - cam);
    const slope = -deg(Math.atan2(e(ax + 6) - e(ax - 6), 12));
    $('fig').setAttribute('transform', `translate(${ax} ${(fig.anchor[1] + dy).toFixed(1)}) rotate(${slope.toFixed(2)}) scale(${fig.scale || 1})`);
    if ($('fig-sh')) $('fig-sh').setAttribute('transform', `translate(0 ${dy.toFixed(1)})`);
    this.fy = dy;
    return cam;
  }

  /** Sweat, heat haze and flying leaves, driven by the mood. */
  _moodFx(dt) {
    const $ = this.$;
    const mood = this.mood;
    const t = this.t;
    const a = this.figure.anchor;
    const fs = this.figure.scale || 1;
    const head = this.figure.head || this.figure.mouth;
    const hx = a[0] + head[0] * fs;
    const hy = a[1] + (this.fy || 0) + head[1] * fs;

    // Hot: now and then a drop of sweat runs down the face and drips off.
    const hot = mood.hot || 0;
    this.sweatT = (this.sweatT ?? 0.6) - dt;
    if (hot > 0 && this.sweatT <= 0) {
      const d = this.sweat.find((q) => q.age >= 1);
      if (d) { d.age = 0; d.ox = rnd(-3.5, 1.5); d.slide = 0; d.vy = 0; }
      this.sweatT = (hot >= 1 ? 1.1 : 2.8) * rnd(0.7, 1.3);
    }
    this.sweat.forEach((d) => {
      if (d.age >= 1) { d.el.style.opacity = '0'; return; }
      d.age += dt / 1.6;
      if (d.age < 0.55) {
        d.slide += 7 * dt;
        d.x = hx + d.ox * fs;
        d.y = hy + (-3 + d.slide) * fs;
      } else {
        d.vy += 320 * dt;
        d.y += d.vy * dt;
      }
      const fade = d.age < 0.55 ? Math.min(1, d.age / 0.1) : 1 - (d.age - 0.55) / 0.45;
      d.el.setAttribute('transform', `translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) scale(${(fs * 0.7).toFixed(2)})`);
      d.el.style.opacity = (0.85 * fade).toFixed(2);
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

    this._scene.lang = lutarymLang(hass);
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
      .puff { fill: #E8F2FF; opacity: 0; }
      .foam { fill: #E8F2FF; opacity: 0; }
      .smoke { fill: #CBD5E1; opacity: 0; }
      .flame { fill: #FFB020; opacity: 0.92; }
      .spark { fill: #FFC44D; opacity: 0; }
      .wdrop { fill: #9CC3F0; opacity: 0; }
      .shard { fill: #DFF3FF; opacity: 0; }
      .flame:nth-child(even) { fill: #FF7A1A; }
      .cap { fill: none; stroke: #F2F6FB; stroke-width: 1.6; stroke-linecap: round; opacity: 0; }
      .crest { fill: none; stroke: #BFD8F0; stroke-width: 1.4; }
      .sweat { fill: #9CC3F0; opacity: 0; }
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
