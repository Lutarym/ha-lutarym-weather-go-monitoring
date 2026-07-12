# Weather Go by Lutarym

Lovelace Custom Card for Home Assistant — shows whether current weather
conditions are suitable for an outdoor activity today (or tomorrow,
after 18:00). Fetches an hourly forecast directly from Open-Meteo (DWD
model, no API key required) for the 06:00–18:00 window and rates rain
probability/amount, wind speed, and temperature against
activity-specific ideal ranges and tolerances. The card and its editor
are fully bilingual (German/English), following `hass.language`
automatically.

## Supported activities

| Activity | `activity` value | Wind rating |
|---|---|---|
| 🚲 Cycling | `bike` | less wind is better (maximum) |
| 🏃 Running | `running` | less wind is better (maximum) |
| 🚶 Walking | `walking` | less wind is better (maximum) |
| 🚤 Boating | `boating` | less wind is better (maximum) |
| ⛵ Sailing | `sailing` | **wind range** — some wind is desirable |
| ⚽ Football | `football` | less wind is better (maximum) |
| 🍖 Grilling | `bbq` | less wind is better (maximum) |

Each activity comes with its own sensible default thresholds for rain,
wind, and temperature (e.g. grilling wants it dry and warm; sailing
wants a wind range instead of a simple maximum). All thresholds can be
overridden individually in the editor or via YAML.

## Installation via HACS

1. HACS → Frontend → **⋮** → Custom repositories
2. Enter this repository's URL, category **Dashboard**
3. Install "Weather Go by Lutarym"
4. Reload Home Assistant (clear browser cache if needed)

## Manual installation

Copy `lutarym-weather-go-card.js` to `config/www/`:

```yaml
resources:
  - url: /local/lutarym-weather-go-card.js
    type: module
```

## Usage

Add via **Edit Dashboard → Add Card → "Weather Go by Lutarym"** — opens
the visual configuration form directly, including an activity dropdown.

```yaml
type: custom:lutarym-weather-go-card
activity: bike                    # bike | running | walking | boating | sailing | football | bbq
lat: 52.52                        # optional, default: 52.52 (Berlin, placeholder)
lon: 13.405                       # optional, default: 13.405 (Berlin, placeholder)
title: My Title                    # optional, overrides the activity's default question
rain_prob_ideal_max: 20            # optional, %  — overrides the activity preset
rain_prob_tolerance: 10            # optional, %
rain_amount_ideal_max: 0.5         # optional, mm
rain_amount_tolerance: 0.5         # optional, mm
wind_ideal_max: 20                 # optional, km/h — used when the activity's wind mode is "max"
wind_ideal_min: 10                 # optional, km/h — used when the activity's wind mode is "range" (sailing)
wind_tolerance: 5                  # optional, km/h
temp_ideal_min: 15                 # optional, °C
temp_ideal_max: 30                 # optional, °C
temp_tolerance: 2                  # optional, °C
```

**Important:** set `lat`/`lon` to your own location — the defaults are
just a generic placeholder (Berlin) and will give you Berlin's weather.

## How the rating works

For each criterion (rain, wind, temperature), the hourly forecast values
for the 06:00–18:00 window are checked against an ideal range and a
tolerance band:

- **OK (green)** — within the ideal range
- **Maybe (yellow)** — outside the ideal range but within the tolerance
- **Bad (red)** — outside both

The overall verdict is the worst of the three individual ratings. For
wind, activities with `windMode: "range"` (currently only sailing) are
rated against the average wind speed over the window instead of the
maximum, since a consistent moderate wind — not the absence of wind —
is what's desired.

## License

Private / personal use.
