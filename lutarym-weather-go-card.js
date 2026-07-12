/**
 * lutarym-weather-go-card.js
 * Lovelace Custom Card for Home Assistant — "is the weather right for X?"
 *
 * Fetches an hourly weather forecast directly from Open-Meteo (DWD model,
 * no API key required) for the 06:00-18:00 window of today (or tomorrow,
 * after 18:00), and rates rain probability/amount, wind speed, and
 * temperature against activity-specific ideal ranges and tolerances.
 * Supports multiple activities (cycling, running, walking, boating,
 * sailing, football, grilling), each with its own sensible defaults —
 * e.g. sailing wants a wind range (some wind is good), while cycling
 * wants a wind maximum (less wind is better).
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
 *   title: My Title                    # optional, overrides the activity's default question
 *   rain_prob_ideal_max: 20            # optional, %  — overrides the activity preset
 *   rain_prob_tolerance: 10            # optional, %
 *   rain_amount_ideal_max: 0.5         # optional, mm
 *   rain_amount_tolerance: 0.5         # optional, mm
 *   wind_ideal_max: 20                 # optional, km/h — used when the activity's wind mode is "max"
 *   wind_ideal_min: 10                 # optional, km/h — used when the activity's wind mode is "range" (e.g. sailing)
 *   wind_tolerance: 5                  # optional, km/h
 *   temp_ideal_min: 15                 # optional, °C
 *   temp_ideal_max: 30                 # optional, °C
 *   temp_tolerance: 2                  # optional, °C
 */

// ── Simple i18n helper (falls back to English) ─────────────────────────

const I18N = {
  en: {
    loading: 'Loading…',
    noData: 'No data',
    hintSuffix: 'DWD via Open-Meteo',
    today: 'Today',
    tomorrow: 'Tomorrow',
    rainLabel: '🌧 Rain',
    windLabel: '💨 Wind',
    tempLabel: '🌡 Temperature',
    statusGo: "Yes, let's go!",
    statusMaybe: 'Maybe, take care',
    statusNogo: 'Better not',
    editorActivity: 'Activity',
    editorLat: 'Latitude',
    editorLon: 'Longitude',
    editorTitle: 'Title',
    editorTitleHint: 'Optional — default: {title}',
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
    idealRangeLabel: '{min}–{max} km/h ideal',
    avgLabel: 'avg. {value} km/h',
  },
  de: {
    loading: 'Wird geladen…',
    noData: 'Keine Daten',
    hintSuffix: 'DWD via Open-Meteo',
    today: 'Heute',
    tomorrow: 'Morgen',
    rainLabel: '🌧 Regen',
    windLabel: '💨 Wind',
    tempLabel: '🌡 Temperatur',
    statusGo: "Ja, los geht's!",
    statusMaybe: 'Bedingt möglich',
    statusNogo: 'Besser nicht',
    editorActivity: 'Aktivität',
    editorLat: 'Breitengrad',
    editorLon: 'Längengrad',
    editorTitle: 'Titel',
    editorTitleHint: 'Optional — Standard: {title}',
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
    idealRangeLabel: '{min}–{max} km/h ideal',
    avgLabel: 'ø {value} km/h',
  },
};

// Activity presets: label/question text per language, plus default rating
// thresholds (language-independent). windMode 'max' = less wind is better
// (cycling, running, walking, football, grilling, boating); windMode
// 'range' = some wind is desirable within an ideal band (sailing).
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
    bike:     { label: 'Radfahren', question: 'Fahrrad fahren?' },
    running:  { label: 'Laufen',    question: 'Laufen gehen?' },
    walking:  { label: 'Spazieren', question: 'Spazieren gehen?' },
    boating:  { label: 'Bootfahren', question: 'Boot fahren?' },
    sailing:  { label: 'Segeln',    question: 'Segeln gehen?' },
    football: { label: 'Fußball',   question: 'Fußball spielen?' },
    bbq:      { label: 'Grillen',   question: 'Grillen?' },
  },
};

const ACTIVITY_PRESETS = {
  bike: {
    icon: '🚲', windMode: 'max',
    rain_prob_ideal_max: 20, rain_prob_tolerance: 10,
    rain_amount_ideal_max: 0.5, rain_amount_tolerance: 0.5,
    wind_ideal_max: 20, wind_tolerance: 5,
    temp_ideal_min: 15, temp_ideal_max: 30, temp_tolerance: 2,
  },
  running: {
    icon: '🏃', windMode: 'max',
    rain_prob_ideal_max: 30, rain_prob_tolerance: 15,
    rain_amount_ideal_max: 0.5, rain_amount_tolerance: 1,
    wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 5, temp_ideal_max: 25, temp_tolerance: 5,
  },
  walking: {
    icon: '🚶', windMode: 'max',
    rain_prob_ideal_max: 30, rain_prob_tolerance: 20,
    rain_amount_ideal_max: 0.3, rain_amount_tolerance: 0.7,
    wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 0, temp_ideal_max: 28, temp_tolerance: 5,
  },
  boating: {
    icon: '🚤', windMode: 'max',
    rain_prob_ideal_max: 20, rain_prob_tolerance: 15,
    rain_amount_ideal_max: 0.3, rain_amount_tolerance: 0.5,
    wind_ideal_max: 20, wind_tolerance: 10,
    temp_ideal_min: 15, temp_ideal_max: 32, temp_tolerance: 3,
  },
  sailing: {
    icon: '⛵', windMode: 'range',
    rain_prob_ideal_max: 20, rain_prob_tolerance: 15,
    rain_amount_ideal_max: 0.3, rain_amount_tolerance: 0.5,
    wind_ideal_min: 10, wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 10, temp_ideal_max: 28, temp_tolerance: 5,
  },
  football: {
    icon: '⚽', windMode: 'max',
    rain_prob_ideal_max: 30, rain_prob_tolerance: 20,
    rain_amount_ideal_max: 1, rain_amount_tolerance: 1,
    wind_ideal_max: 30, wind_tolerance: 10,
    temp_ideal_min: 5, temp_ideal_max: 28, temp_tolerance: 3,
  },
  bbq: {
    icon: '🍖', windMode: 'max',
    rain_prob_ideal_max: 10, rain_prob_tolerance: 10,
    rain_amount_ideal_max: 0.1, rain_amount_tolerance: 0.3,
    wind_ideal_max: 25, wind_tolerance: 10,
    temp_ideal_min: 18, temp_ideal_max: 32, temp_tolerance: 3,
  },
};

const ACTIVITY_KEYS = Object.keys(ACTIVITY_PRESETS);

function lutarymLang(hass) {
  const raw = (hass && hass.language) || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  return raw.toLowerCase().startsWith('de') ? 'de' : 'en';
}

function t(hass, key, vars) {
  const dict = I18N[lutarymLang(hass)] || I18N.en;
  let str = dict[key] ?? I18N.en[key] ?? key;
  if (vars) Object.keys(vars).forEach(k => { str = str.replace(`{${k}}`, vars[k]); });
  return str;
}

function activityInfo(hass, activity) {
  const dict = ACTIVITY_I18N[lutarymLang(hass)] || ACTIVITY_I18N.en;
  return dict[activity] ?? ACTIVITY_I18N.en[activity];
}

// ── Main card ────────────────────────────────────────────────────────────

class LutarymWeatherGoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._initialized = false;
    this._hourly = null;
    this._fetchInterval = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._render();
      this._fetchForecast();
      this._fetchInterval = setInterval(() => this._fetchForecast(), 30 * 60 * 1000);
    }
  }

  setConfig(config) {
    const activity = ACTIVITY_KEYS.includes(config.activity) ? config.activity : 'bike';
    const preset = ACTIVITY_PRESETS[activity];

    this._config = {
      activity,
      lat: config.lat ?? 52.52,
      lon: config.lon ?? 13.405,
      title: config.title ?? null, // null = use the activity's default question
      rain_prob_ideal_max: config.rain_prob_ideal_max ?? preset.rain_prob_ideal_max,
      rain_prob_tolerance: config.rain_prob_tolerance ?? preset.rain_prob_tolerance,
      rain_amount_ideal_max: config.rain_amount_ideal_max ?? preset.rain_amount_ideal_max,
      rain_amount_tolerance: config.rain_amount_tolerance ?? preset.rain_amount_tolerance,
      wind_mode: preset.windMode,
      wind_ideal_min: config.wind_ideal_min ?? preset.wind_ideal_min ?? null,
      wind_ideal_max: config.wind_ideal_max ?? preset.wind_ideal_max,
      wind_tolerance: config.wind_tolerance ?? preset.wind_tolerance,
      temp_ideal_min: config.temp_ideal_min ?? preset.temp_ideal_min,
      temp_ideal_max: config.temp_ideal_max ?? preset.temp_ideal_max,
      temp_tolerance: config.temp_tolerance ?? preset.temp_tolerance,
    };
    this._preset = preset;
    if (this.shadowRoot.getElementById('status')) {
      this._renderStaticLabels();
      this._updateDisplay();
    }
  }

  getCardSize() { return 3; }

  static getConfigElement() {
    return document.createElement('lutarym-weather-go-card-editor');
  }

  static getStubConfig() {
    return { activity: 'bike', lat: 52.52, lon: 13.405 };
  }

  async _fetchForecast() {
    const url = `https://api.open-meteo.com/v1/dwd-icon?latitude=${this._config.lat}&longitude=${this._config.lon}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&forecast_days=3&timezone=Europe%2FBerlin`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      this._hourly = data.hourly ?? null;
    } catch (e) {
      console.error('[lutarym-weather-go-card] fetch error:', e);
      this._hourly = null;
    }
    this._updateDisplay();
  }

  _getTargetDate() {
    const now = new Date();
    if (now.getHours() >= 18) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  _getDayHours() {
    if (!this._hourly) return null;
    const target = this._getTargetDate();
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const result = [];
    this._hourly.time.forEach((time, i) => {
      if (!time.startsWith(dateStr)) return;
      const hour = parseInt(time.split('T')[1]);
      if (hour < 6 || hour > 18) return;
      result.push({
        temperature: this._hourly.temperature_2m[i],
        precipitation_probability: this._hourly.precipitation_probability[i],
        precipitation: this._hourly.precipitation[i],
        wind_speed: this._hourly.wind_speed_10m[i],
      });
    });
    return result.length > 0 ? result : null;
  }

  // For values that have an upper bound (rain, wind in "max" mode)
  _rateMax(value, idealMax, toleranceMax) {
    if (value <= idealMax) return 'ok';
    if (value <= toleranceMax) return 'warn';
    return 'bad';
  }

  // For values that have an ideal range (temperature, wind in "range" mode)
  _rateRange(value, idealMin, idealMax, toleranceMin, toleranceMax) {
    if (value >= idealMin && value <= idealMax) return 'ok';
    if (value >= toleranceMin && value <= toleranceMax) return 'warn';
    return 'bad';
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 16px; }
        .main {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1.5px solid transparent;
        }
        .main-icon { font-size: 36px; line-height: 1; flex-shrink: 0; }
        .main-label { font-size: 16px; color: var(--secondary-text-color); margin: 0 0 3px; }
        .main-status { font-size: 20px; font-weight: 500; margin: 0; }
        .main-status.go { color: #1D9E75; }
        .main-status.maybe { color: #E6A817; }
        .main-status.nogo { color: #E24B4A; }
        .main-status.loading { color: var(--secondary-text-color); }
        .main.go { background: rgba(29,158,117,0.08); border-color: #1D9E75; }
        .main.maybe { background: rgba(230,168,23,0.08); border-color: #E6A817; }
        .main.nogo { background: rgba(226,75,74,0.08); border-color: #E24B4A; }
        .criteria { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 10px; }
        .crit {
          background: var(--secondary-background-color);
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
        .crit-label { font-size: 15px; color: var(--secondary-text-color); }
        .crit-label.ok { color: #1D9E75; }
        .crit-label.warn { color: #E6A817; }
        .crit-label.bad { color: #E24B4A; }
        .crit-vals { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .crit-val { font-size: 15px; font-weight: 500; }
        .crit-val.ok { color: #1D9E75; }
        .crit-val.warn { color: #E6A817; }
        .crit-val.bad { color: #E24B4A; }
        .crit-val.unknown { color: var(--secondary-text-color); }
        .crit-sub { font-size: 15px; color: var(--secondary-text-color); }
        .hint { font-size: 11px; color: var(--secondary-text-color); text-align: right; }
      </style>
      <ha-card>
        <div class="main" id="main">
          <div class="main-icon" id="icon">🚲</div>
          <div>
            <p class="main-label" id="main-label"></p>
            <p class="main-status loading" id="status"></p>
          </div>
        </div>
        <div class="criteria">
          <div class="crit">
            <span class="crit-label" id="label-rain"></span>
            <div class="crit-vals">
              <span class="crit-val unknown" id="rain-prob">...</span>
              <span class="crit-sub" id="rain-mm">...</span>
            </div>
          </div>
          <div class="crit">
            <span class="crit-label" id="label-wind"></span>
            <div class="crit-vals">
              <span class="crit-sub" id="wind-min">...</span>
              <span class="crit-val unknown" id="wind-max">...</span>
            </div>
          </div>
          <div class="crit">
            <span class="crit-label" id="label-temp"></span>
            <div class="crit-vals">
              <span class="crit-val unknown" id="temp-min">...</span>
              <span class="crit-sub" id="temp-max">...</span>
            </div>
          </div>
        </div>
        <div class="hint" id="hint"></div>
      </ha-card>
    `;
    this._renderStaticLabels();
  }

  // Text that only depends on config/language, not on fetched weather data
  _renderStaticLabels() {
    if (!this._config) return;
    const hass = this._hass;
    const info = activityInfo(hass, this._config.activity);

    this.shadowRoot.getElementById('icon').textContent = this._preset.icon;
    this.shadowRoot.getElementById('main-label').textContent = this._config.title || info.question;
    this.shadowRoot.getElementById('status').textContent = t(hass, 'loading');
    this.shadowRoot.getElementById('label-rain').textContent = t(hass, 'rainLabel');
    this.shadowRoot.getElementById('label-wind').textContent = t(hass, 'windLabel');
    this.shadowRoot.getElementById('label-temp').textContent = t(hass, 'tempLabel');
  }

  _updateDisplay() {
    if (!this.shadowRoot.getElementById('status') || !this._config) return;
    const hass = this._hass;
    const c = this._config;

    const hours = this._getDayHours();
    const mainEl = this.shadowRoot.getElementById('main');
    const iconEl = this.shadowRoot.getElementById('icon');
    const statusEl = this.shadowRoot.getElementById('status');
    const rainProbEl = this.shadowRoot.getElementById('rain-prob');
    const rainMmEl = this.shadowRoot.getElementById('rain-mm');
    const windMinEl = this.shadowRoot.getElementById('wind-min');
    const windMaxEl = this.shadowRoot.getElementById('wind-max');
    const tempMinEl = this.shadowRoot.getElementById('temp-min');
    const tempMaxEl = this.shadowRoot.getElementById('temp-max');
    const hintEl = this.shadowRoot.getElementById('hint');

    if (!hours) {
      statusEl.textContent = t(hass, 'noData');
      statusEl.className = 'main-status loading';
      hintEl.textContent = t(hass, 'hintSuffix');
      return;
    }

    const maxRainProb = Math.max(...hours.map(h => h.precipitation_probability ?? 0));
    const maxPrecip = Math.max(...hours.map(h => h.precipitation ?? 0));
    const minWind = Math.min(...hours.map(h => h.wind_speed ?? 99));
    const maxWind = Math.max(...hours.map(h => h.wind_speed ?? 0));
    const avgWind = hours.reduce((a, h) => a + (h.wind_speed ?? 0), 0) / hours.length;
    const minTemp = Math.min(...hours.map(h => h.temperature ?? 99));
    const maxTemp = Math.max(...hours.map(h => h.temperature ?? -99));

    const rainProbTolMax = c.rain_prob_ideal_max + c.rain_prob_tolerance;
    const rainAmountTolMax = c.rain_amount_ideal_max + c.rain_amount_tolerance;
    const tempTolMin = c.temp_ideal_min - c.temp_tolerance;
    const tempTolMax = c.temp_ideal_max + c.temp_tolerance;

    const probRating = this._rateMax(maxRainProb, c.rain_prob_ideal_max, rainProbTolMax);
    const precipRating = this._rateMax(maxPrecip, c.rain_amount_ideal_max, rainAmountTolMax);
    const tempRating = this._rateRange(minTemp, c.temp_ideal_min, c.temp_ideal_max, tempTolMin, tempTolMax);

    // Wind: "max" mode (less wind better) or "range" mode (some wind desired, e.g. sailing)
    let windRating;
    if (c.wind_mode === 'range') {
      const windTolMin = c.wind_ideal_min - c.wind_tolerance;
      const windTolMax = c.wind_ideal_max + c.wind_tolerance;
      windRating = this._rateRange(avgWind, c.wind_ideal_min, c.wind_ideal_max, windTolMin, windTolMax);
      windMinEl.textContent = t(hass, 'idealRangeLabel', { min: c.wind_ideal_min, max: c.wind_ideal_max });
      windMinEl.className = 'crit-sub';
      windMaxEl.textContent = t(hass, 'avgLabel', { value: avgWind.toFixed(1) });
      windMaxEl.className = 'crit-val ' + windRating;
    } else {
      const windTolMax = c.wind_ideal_max + c.wind_tolerance;
      windRating = this._rateMax(maxWind, c.wind_ideal_max, windTolMax);
      windMinEl.textContent = `min. ${minWind.toFixed(1)} km/h`;
      windMinEl.className = 'crit-val ' + this._rateMax(minWind, c.wind_ideal_max, windTolMax);
      windMaxEl.textContent = `max. ${maxWind.toFixed(1)} km/h`;
      windMaxEl.className = 'crit-val ' + windRating;
    }

    const rainRatingFinal = (() => {
      if (probRating === 'ok' || precipRating === 'ok') return 'ok';
      if (probRating === 'bad' && precipRating === 'bad') return 'bad';
      return 'warn';
    })();

    const ratings = [rainRatingFinal, windRating, tempRating];
    let overall;
    if (ratings.includes('bad')) overall = 'nogo';
    else if (ratings.includes('warn')) overall = 'maybe';
    else overall = 'go';

    const labels = { go: t(hass, 'statusGo'), maybe: t(hass, 'statusMaybe'), nogo: t(hass, 'statusNogo') };
    const icons = { go: this._preset.icon, maybe: '🤔', nogo: '🚫' };

    mainEl.className = 'main ' + overall;
    iconEl.textContent = icons[overall];
    statusEl.textContent = labels[overall];
    statusEl.className = 'main-status ' + overall;

    rainProbEl.textContent = `max. ${Math.round(maxRainProb)} %`;
    rainProbEl.className = 'crit-val ' + rainRatingFinal;
    rainMmEl.textContent = `max. ${maxPrecip.toFixed(1)} mm`;
    rainMmEl.className = 'crit-val ' + precipRating;
    this.shadowRoot.getElementById('label-rain').className = 'crit-label ' + rainRatingFinal;

    this.shadowRoot.getElementById('label-wind').className = 'crit-label ' + windRating;

    tempMinEl.textContent = `min. ${minTemp.toFixed(1)} °C`;
    tempMinEl.className = 'crit-val ' + tempRating;
    tempMaxEl.textContent = `max. ${maxTemp.toFixed(1)} °C`;
    tempMaxEl.className = 'crit-val ' + this._rateRange(maxTemp, c.temp_ideal_min, c.temp_ideal_max, tempTolMin, tempTolMax);
    this.shadowRoot.getElementById('label-temp').className = 'crit-label ' + tempRating;

    const isTomorrow = this._getTargetDate().getDate() !== new Date().getDate();
    hintEl.textContent = `${isTomorrow ? t(hass, 'tomorrow') : t(hass, 'today')} 06:00–18:00 · ${t(hass, 'hintSuffix')}`;
  }

  disconnectedCallback() {
    if (this._fetchInterval) clearInterval(this._fetchInterval);
  }
}

customElements.define('lutarym-weather-go-card', LutarymWeatherGoCard);

// ── Visual config editor ────────────────────────────────────────────────

class LutarymWeatherGoCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
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
    // lat/lon/title and any HA-managed keys (e.g. "type") are preserved.
    const preserved = { ...this._config };
    delete preserved.rain_prob_ideal_max;
    delete preserved.rain_prob_tolerance;
    delete preserved.rain_amount_ideal_max;
    delete preserved.rain_amount_tolerance;
    delete preserved.wind_ideal_min;
    delete preserved.wind_ideal_max;
    delete preserved.wind_tolerance;
    delete preserved.temp_ideal_min;
    delete preserved.temp_ideal_max;
    delete preserved.temp_tolerance;
    preserved.activity = value;

    this._config = preserved;
    this._render();
    this._fireChanged();
  }

  _onChange(field, value, isNumber) {
    if (value === '' || value == null) {
      delete this._config[field];
    } else {
      this._config[field] = isNumber ? Number(value) : value;
    }
    this._fireChanged();
  }

  _textRow(label, field, value, placeholder, hintText) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    wrap.innerHTML = `<label>${label}</label>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value ?? '';
    if (placeholder) input.placeholder = placeholder;
    input.addEventListener('change', ev => this._onChange(field, ev.target.value));
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
    const wrap = document.createElement('div');
    wrap.className = 'row';
    wrap.innerHTML = `<label>${label}</label>`;
    const input = document.createElement('input');
    input.type = 'number';
    if (step) input.step = step;
    if (value != null) input.value = value;
    if (placeholder != null) input.placeholder = String(placeholder);
    input.addEventListener('change', ev => this._onChange(field, ev.target.value, true));
    wrap.appendChild(input);
    return wrap;
  }

  _selectRow(label, field, value, options) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    wrap.innerHTML = `<label>${label}</label>`;
    const select = document.createElement('select');
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === value) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', ev => {
      if (field === 'activity') {
        this._onActivityChange(ev.target.value);
      } else {
        this._onChange(field, ev.target.value);
      }
    });
    wrap.appendChild(select);
    return wrap;
  }

  _render() {
    if (!this._config) return;
    const cfg = this._config;
    const hass = this._hass;
    const activity = this._activity;
    const preset = ACTIVITY_PRESETS[activity];
    const info = activityInfo(hass, activity);

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
      <div class="form"></div>
    `;
    const form = this.querySelector('.form');

    form.appendChild(this._selectRow(
      t(hass, 'editorActivity'), 'activity', activity,
      ACTIVITY_KEYS.map(k => ({ value: k, label: `${ACTIVITY_PRESETS[k].icon} ${activityInfo(hass, k).label}` })),
    ));

    const locPair = document.createElement('div');
    locPair.className = 'row-pair';
    locPair.appendChild(this._numberRow(t(hass, 'editorLat'), 'lat', cfg.lat, 52.52, 'any'));
    locPair.appendChild(this._numberRow(t(hass, 'editorLon'), 'lon', cfg.lon, 13.405, 'any'));
    form.appendChild(locPair);

    form.appendChild(this._textRow(
      t(hass, 'editorTitle'), 'title', cfg.title,
      info.question,
      t(hass, 'editorTitleHint', { title: info.question }),
    ));

    const rainLabel = document.createElement('div');
    rainLabel.className = 'section-label';
    rainLabel.textContent = t(hass, 'sectionRain');
    form.appendChild(rainLabel);

    const rainPair1 = document.createElement('div');
    rainPair1.className = 'row-pair';
    rainPair1.appendChild(this._numberRow(t(hass, 'editorRainProbMax'), 'rain_prob_ideal_max', cfg.rain_prob_ideal_max ?? preset.rain_prob_ideal_max, preset.rain_prob_ideal_max));
    rainPair1.appendChild(this._numberRow(t(hass, 'editorRainProbTolerance'), 'rain_prob_tolerance', cfg.rain_prob_tolerance ?? preset.rain_prob_tolerance, preset.rain_prob_tolerance));
    form.appendChild(rainPair1);

    const rainPair2 = document.createElement('div');
    rainPair2.className = 'row-pair';
    rainPair2.appendChild(this._numberRow(t(hass, 'editorRainAmountMax'), 'rain_amount_ideal_max', cfg.rain_amount_ideal_max ?? preset.rain_amount_ideal_max, preset.rain_amount_ideal_max, '0.1'));
    rainPair2.appendChild(this._numberRow(t(hass, 'editorRainAmountTolerance'), 'rain_amount_tolerance', cfg.rain_amount_tolerance ?? preset.rain_amount_tolerance, preset.rain_amount_tolerance, '0.1'));
    form.appendChild(rainPair2);

    const windLabel = document.createElement('div');
    windLabel.className = 'section-label';
    windLabel.textContent = t(hass, 'sectionWind');
    form.appendChild(windLabel);

    if (preset.windMode === 'range') {
      const windHint = document.createElement('div');
      windHint.className = 'hint';
      windHint.textContent = t(hass, 'windRangeHint');
      form.appendChild(windHint);

      const windPair = document.createElement('div');
      windPair.className = 'row-pair';
      windPair.appendChild(this._numberRow(t(hass, 'editorWindMinRange'), 'wind_ideal_min', cfg.wind_ideal_min ?? preset.wind_ideal_min, preset.wind_ideal_min));
      windPair.appendChild(this._numberRow(t(hass, 'editorWindMaxRange'), 'wind_ideal_max', cfg.wind_ideal_max ?? preset.wind_ideal_max, preset.wind_ideal_max));
      form.appendChild(windPair);
      form.appendChild(this._numberRow(t(hass, 'editorWindTolerance'), 'wind_tolerance', cfg.wind_tolerance ?? preset.wind_tolerance, preset.wind_tolerance));
    } else {
      const windPair = document.createElement('div');
      windPair.className = 'row-pair';
      windPair.appendChild(this._numberRow(t(hass, 'editorWindMax'), 'wind_ideal_max', cfg.wind_ideal_max ?? preset.wind_ideal_max, preset.wind_ideal_max));
      windPair.appendChild(this._numberRow(t(hass, 'editorWindTolerance'), 'wind_tolerance', cfg.wind_tolerance ?? preset.wind_tolerance, preset.wind_tolerance));
      form.appendChild(windPair);
    }

    const tempLabel = document.createElement('div');
    tempLabel.className = 'section-label';
    tempLabel.textContent = t(hass, 'sectionTemp');
    form.appendChild(tempLabel);

    const tempPair = document.createElement('div');
    tempPair.className = 'row-pair';
    tempPair.appendChild(this._numberRow(t(hass, 'editorTempMin'), 'temp_ideal_min', cfg.temp_ideal_min ?? preset.temp_ideal_min, preset.temp_ideal_min));
    tempPair.appendChild(this._numberRow(t(hass, 'editorTempMax'), 'temp_ideal_max', cfg.temp_ideal_max ?? preset.temp_ideal_max, preset.temp_ideal_max));
    form.appendChild(tempPair);

    form.appendChild(this._numberRow(t(hass, 'editorTempTolerance'), 'temp_tolerance', cfg.temp_tolerance ?? preset.temp_tolerance, preset.temp_tolerance));
  }
}

customElements.define('lutarym-weather-go-card-editor', LutarymWeatherGoCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'lutarym-weather-go-card',
  name: 'Weather Go by Lutarym',
  description: 'Shows whether current weather conditions are suitable for an activity (cycling, running, walking, boating, sailing, football, grilling) today or tomorrow, based on Open-Meteo/DWD forecast.',
});
