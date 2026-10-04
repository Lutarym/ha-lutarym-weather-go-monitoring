# Weather Go by Lutarym

Lovelace custom card for Home Assistant: is the weather right for your activity today?

Each activity has its own animated scene, and the expected weather plays in it:

| Activity | Scene |
|---|---|
| `bike` | Cyclist riding along a road, wheels and pedals turning |
| `running` | Runner on a path |
| `walking` | Walker on a path, with an umbrella when rain is expected |
| `boating` | Motorboat on the water with a foam trail |
| `sailing` | Sailboat heeling in the wind, sails filling |
| `football` | Player shooting at a goal |
| `bbq` | Grill with flames and smoke, lid shut when it is a no |

Weather in the scene follows the forecast for 06:00 to 18:00 (today, or tomorrow after 18:00):

- **Rain:** number of drops follows the amount, clouds follow the probability, splashes on the ground
- **Snow:** falls instead of rain at or below freezing, ground and trees turn white
- **Wind:** trees lean and sway, rain falls at an angle, clouds drift faster, gust lines, waves and white caps on the water
- **Temperature:** warm horizon and a larger sun when hot, breath clouds and frost when cold
- **Verdict:** the figure moves at full pace for "Yes", slower for "Maybe", and stops for "Better not"

When the weather is not suitable, the figure stops and reacts to the reason:

- **Too cold:** wraps its arms around itself, shivers, red cheeks, breath clouds, frost at the edges
- **Too hot:** wipes its forehead, sweat drops, heat shimmer, warm light
- **Too windy:** leans into the wind and shields its face, leaves fly past, the umbrella turns inside out, the mainsail is reefed
- **Too wet:** holds its hands over its head and ducks
- **Too little wind (sailing):** sails hang slack and flap

The cyclist gets off the saddle and puts a foot down. For "Maybe" the effects are lighter and the figure keeps moving.

Below the scene the card shows the verdict and the values for rain, wind and temperature.

Forecast: [Open-Meteo](https://open-meteo.com/) DWD ICON model, no API key required.
The animation pauses while the card is out of view and respects the system setting for reduced motion.

## Installation

1. Copy `lutarym-weather-go-card.js` to `/config/www/`
2. Settings > Dashboards > Resources > Add resource
   - URL: `/local/lutarym-weather-go-card.js`
   - Type: JavaScript Module
3. Clear your browser cache (Ctrl+F5)

## Configuration

```yaml
type: custom:lutarym-weather-go-card
activity: bike            # bike | running | walking | boating | sailing | football | bbq
lat: 52.52                # optional
lon: 13.405               # optional
title: My Title           # optional, replaces the activity's question
```

Optional thresholds, each overrides the activity preset:

| Key | Unit |
|---|---|
| `rain_prob_ideal_max`, `rain_prob_tolerance` | % |
| `rain_amount_ideal_max`, `rain_amount_tolerance` | mm |
| `wind_ideal_max`, `wind_tolerance` | km/h |
| `wind_ideal_min` | km/h, only for sailing (wind range) |
| `temp_ideal_min`, `temp_ideal_max`, `temp_tolerance` | °C |

All options are also available in the visual editor. Languages: German and English.
