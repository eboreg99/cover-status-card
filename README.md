# Cover Status Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub release](https://img.shields.io/github/v/release/eboreg99/cover-status-card)](https://github.com/eboreg99/cover-status-card/releases)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

Eine minimalistische Lovelace Custom Card für Home Assistant, die den Status einer Cover-Entität (Jalousie, Rollo, Markise etc.) kompakt in zwei Zeilen anzeigt.

- **Zeile 1** – Name der Entität oder ein benutzerdefinierter Text
- **Zeile 2** – Zustand als Text, ergänzt um die aktuelle Position (wenn zwischen 1 % und 99 %)
- **Tilt-Modus** – Bei aktiviertem `show_tilt` und Position < 3 % wird statt des Zustands die Lamellenstellung angezeigt

Verwendbar als **eigenständige Karte** oder als Element innerhalb einer **picture-elements-card**.

---

## Voraussetzungen

- Home Assistant mit aktiviertem Lovelace-Frontend
- Eine oder mehrere `cover`-Entitäten (z. B. Velux, Somfy, KNX, Z-Wave …)

---

## Installation

### Via HACS (empfohlen)

1. HACS öffnen → **Frontend** → **⋮** → **Benutzerdefiniertes Repository hinzufügen**
2. URL: `https://github.com/eboreg99/cover-status-card`  
   Kategorie: **Lovelace**
3. Karte suchen und **Installieren**
4. Home Assistant neu laden (F5)

### Manuell

1. [`cover-status-card.js`](cover-status-card.js) herunterladen
2. Datei nach `/config/www/cover-status-card.js` kopieren
3. Lovelace-Ressource eintragen:

```yaml
# configuration.yaml
lovelace:
  resources:
    - url: /local/cover-status-card.js
      type: module
```

Alternativ unter **Einstellungen → Dashboards → ⋮ → Ressourcen** hinzufügen.

---

## Konfiguration

### Optionen

| Option      | Typ     | Pflicht | Standard               | Beschreibung                                              |
|-------------|---------|---------|------------------------|-----------------------------------------------------------|
| `type`      | string  | ✅      | –                      | `custom:cover-status-card`                                |
| `entity`    | string  | ✅      | –                      | Entity-ID der Cover-Entität                               |
| `name`      | string  | ❌      | `friendly_name`        | Überschreibt den angezeigten Namen (Zeile 1)              |
| `show_tilt` | boolean | ❌      | `false`                | Zeigt die Lamellenstellung wenn Position < 3 %            |

### Anzeigelogik (Zeile 2)

| Situation | Anzeige |
|---|---|
| Position = 0 % oder 100 % | Nur Zustandstext (`Offen`, `Geschlossen` …) |
| Position 1 %–99 % | Zustandstext · Position `%` |
| `show_tilt: true` und Position < 3 % | `Lamellen XX %` |

---

## Beispiele

### Eigenständige Karte

```yaml
type: custom:cover-status-card
entity: cover.wohnzimmer_jalousie
```

Mit allen Optionen:

```yaml
type: custom:cover-status-card
entity: cover.wohnzimmer_jalousie
name: Wohnzimmer
show_tilt: true
```

### Innerhalb einer picture-elements-card

```yaml
type: picture-elements
image: /local/grundriss_og.png
elements:
  - type: custom:cover-status-card
    entity: cover.schlafzimmer_rollo
    name: Schlafzimmer
    show_tilt: true
    style:
      top: 25%
      left: 60%
      transform: translate(-50%, -50%)

  - type: custom:cover-status-card
    entity: cover.bad_rollo
    name: Bad
    style:
      top: 70%
      left: 30%
      transform: translate(-50%, -50%)
```

---

## Zustandsfarben

Die Karte orientiert sich an den HA-CSS-Variablen und passt sich automatisch ans aktive Theme an:

| Zustand | Farbe |
|---|---|
| `open` | `--success-color` (grün) |
| `closed` | `--disabled-text-color` (grau) |
| `opening` / `closing` | `--warning-color` (orange) |
| `unknown` / `unavailable` | `--error-color` (rot) |

---

## Interaktion

Ein Klick auf die Karte öffnet den **More-Info-Dialog** der konfigurierten Entität.

---

## Lizenz

[GPL-3.0](LICENSE)
