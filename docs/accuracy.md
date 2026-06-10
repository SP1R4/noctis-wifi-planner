# Accuracy: prediction vs. real-world survey

Predictive RF planning is only as honest as its error bars. This page
documents what Plexus's model does and does not capture, and a repeatable
method for validating predictions against measurements in a real building —
using nothing but the app's built-in survey import and a free WiFi analyzer.

> **Status:** methodology is final; the reference dataset is being collected.
> If you run the procedure below in your own building, a PR adding your
> results table (anonymised floor plan welcome) would be a great contribution.

## What the model computes

With a floor scale set (SCALE, metres per 100 px), predicted RSSI at a point
is:

```
RSSI = EIRP − PL(d) − Σ wall losses
PL(d) = 20·log₁₀(f_MHz) − 27.55 + 10·n·log₁₀(d_m)
```

- **EIRP** = per-AP Tx power + antenna gain − cable loss (defaults 20 dBm + 0 − 0).
- **f** = a representative carrier per band: 2 437 MHz (2.4 GHz), 5 500 MHz
  (5 GHz), 6 525 MHz (6 GHz).
- **n** = the propagation model's exponent: log-distance 2.2, ITU-R P.1238
  office 3.0, COST-231 multi-wall 2.0 (with walls accounted explicitly).
- **Wall losses** = per-material dB (drywall 3, wood 5, glass 6, brick 10,
  concrete 15, at 5 GHz) × a band factor (0.6 / 1.0 / 1.3 for 2.4 / 5 / 6 GHz)
  for every wall segment crossed on the straight line AP → sample point.

## Known sources of error

Be suspicious of any tool that doesn't list these:

- **No multipath / reflections.** Rays are straight lines; corridors and metal
  surfaces that duct or mirror signal are not modelled. Expect the model to
  *under*-predict down long corridors and *over*-predict behind large metal
  obstacles (racks, elevators, fridges).
- **Single representative frequency per band** — no per-channel variation.
- **Wall materials are your guess.** A "drywall" wall with a steel stud every
  40 cm is lossier than 3 dB. Calibrate materials, not just positions.
- **2D only.** Mount height and downtilt feed EIRP, but propagation is planar;
  floor-to-floor leakage uses a single uniform slab attenuation.
- **Client asymmetry.** Predictions are AP-side EIRP; a phone's measured RSSI
  also depends on its own antenna. Expect a constant offset of a few dB per
  device model.

## Validation procedure

1. **Plan first.** Load your floor plan, set SCALE accurately (use ⌖ Calibrate
   with a known distance — a door is ~0.9 m), trace the walls you can see,
   and place APs where they really are. Set each AP's real model and band.
2. **Walk the building** with any WiFi analyzer that logs RSSI (e.g. a phone
   app or `airport -s` / `nmcli dev wifi` scripted on a laptop). At each
   stop, note your position on the floor plan and the RSSI of *your* SSID.
   20–40 points spread across rooms and corridors is plenty; include a few
   worst-case spots (behind the server room, far corners).
3. **Build the CSV.** One row per stop:

   ```csv
   x,y,floor,ssid,bssid,rssi,channel
   0.32,0.41,Ground Floor,MyOffice,aa:bb:cc:dd:ee:ff,-58,36
   0.71,0.18,Ground Floor,MyOffice,,-66,
   ```

   `x`/`y` are fractional (0–1 across the floor-plan image) or raw pixels —
   both are auto-detected. Only `x`, `y`, `rssi` matter for validation.
4. **Import** via **↺ Survey CSV**. Each sample renders as a dot coloured by
   its measured RSSI; hover for `Measured / Predicted / Δ`. Dots with
   **|Δ| > 8 dB** get a warning ring — those are your model errors (or your
   wall-material guesses being wrong).
5. **Iterate.** Fix the biggest |Δ| first: usually a wrong material, a missing
   wall, or the wrong propagation model. In furnished offices ITU-R P.1238
   (n = 3.0) usually beats the free-space-like models; in open warehouses,
   log-distance does.

## Reporting results

When publishing a validation run, include at minimum:

| Metric | Value |
|---|---|
| Building / construction type | _e.g. 1990s office, drywall + concrete core_ |
| Sample count | _n_ |
| Mean error (bias) | _x.x dB_ |
| Mean absolute error | _x.x dB_ |
| 90th-percentile abs. error | _x.x dB_ |
| Propagation model used | _logd / itu-indoor / multi-wall_ |

For context: commercial predictive tools are typically considered usable at
**±5–8 dB mean absolute error** against a calibrated survey; anything tighter
than ±5 dB on an uncalibrated first pass is luck, not skill.
