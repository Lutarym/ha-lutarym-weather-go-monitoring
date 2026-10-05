# Weather Go by Lutarym

Lovelace custom card for Home Assistant: is the weather right for your activity today?

Each activity has its own animated scene, and the expected weather plays in it:

| Activity | Scene |
|---|---|
| `bike` | A ride with changing scenes: cruising, a sprint out of the saddle, a climb, a fast tucked descent, a stop for a drink from the bottle and an easy restart; the road follows the hills |
| `running` | Runner on a path, with a natural running stride and flight phase |
| `walking` | Walker on a path with a natural gait, with an umbrella when rain is expected |
| `boating` | Motorboat on the water with a foam trail |
| `sailing` | Sailboat heeling in the wind, sails filling |
| `football` | Player shooting at a goal |
| `bbq` | A full grilling round: the cook takes the lid off, lays steaks on the grate, turns them, serves them and puts the lid back on; flames flare up, the steaks brown and get grill marks |

Weather in the scene follows the forecast for 06:00 to 18:00 (today, or tomorrow after 18:00):

- **Rain:** number of drops follows the amount, clouds follow the probability, splashes on the ground
- **Snow:** falls instead of rain at or below freezing, ground and trees turn white
- **Wind:** trees lean and sway, rain falls at an angle, clouds drift faster, gust lines, waves and white caps on the water
- **Temperature:** warm horizon and a larger sun when hot, breath clouds and frost when cold
- **Verdict:** the figure moves at full pace for "Yes", slower for "Maybe", and stops for "Better not"

When the weather is not suitable, the figure stops and reacts to the reason:

- **Too cold:** shoulders drawn up, rubs its upper arms, the upper body shivers finely, steps from foot to foot, breath clouds in rhythm, frost at the edges; the cyclist blows into his hands
- **Too hot:** wipes its forehead, fans some air, a drop of sweat runs down now and then, heat shimmer, warm light
- **Too windy:** leans into the gusts with a wide stance and shields its eyes, leaves fly past, the umbrella turns inside out, the mainsail is reefed
- **Too wet:** ducks, holds its hands over its head and steps on the spot
- **Too little wind (sailing):** sails hang slack and flap

The cyclist also has a little comedy for each reason: in a storm his helmet blows away and then he flies off with his bike, pushing it back in against the wind; in rain a car drives through the puddle and soaks him, so he shakes himself dry; in the cold an icicle grows on his nose until he sneezes it off; in the heat a puddle of sweat grows and he pours his bottle over his head. In good weather a bird rides along on his helmet for a while, and after the drink he pulls a wheelie.

Reactions fade in and out smoothly. The cyclist gets off the saddle and puts a foot down. For "Maybe" the effects are lighter and the figure keeps moving.

The verdict and the values for rain, wind and temperature are shown inside the scene.

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
height: 220               # optional, card height in px (100 to 800)
```

Optional thresholds, each overrides the activity preset:

| Key | Unit |
|---|---|
| `rain_prob_ideal_max`, `rain_prob_tolerance` | % |
| `rain_amount_ideal_max`, `rain_amount_tolerance` | mm |
| `wind_ideal_max`, `wind_tolerance` | km/h |
| `wind_ideal_min` | km/h, only for sailing (wind range) |
| `temp_ideal_min`, `temp_ideal_max`, `temp_tolerance` | °C |

## Size

The card is the animated scene itself; verdict, day and the values for rain, wind and temperature are shown inside it. In the sections view it takes half the width and 4 rows by default (6 of 12 columns, 248 px high). Width (3 to 12 columns) and height (2 rows or more) can be changed in the dashboard; the scene fills the card. Its scale follows the height, and a narrower card shows a cut-out around the figure instead of shrinking the picture. Without rows (for example in the masonry view) the card is 230 px high.

You can also set a fixed height in the card's visual editor under **Display**, or in YAML:

```yaml
height: 220   # px, 100 to 800; leave out for automatic
``` Hover a value to see all details (minimum and maximum).

## Demo mode

Switch on **Demo mode** in the visual editor (or `demo: true`) to see every scene without waiting for the weather. The card then cycles through sample weather: sunny, showers, storm, heavy rain, frost, snow and heat (plus calm for sailing). No forecast is loaded while demo mode is on. The top right shows the current sample weather and a thin bar counts down to the next change.

```yaml
demo: true
demo_interval: 20   # seconds between weather changes, 5 to 600
```

The storm comedy of the cyclist takes about 17 seconds; use an interval of 18 seconds or more to see it in full.

All options are also available in the visual editor. Languages: German and English.
