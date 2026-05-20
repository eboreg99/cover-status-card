/**
 * cover-status-card
 * 
 * Eine Home Assistant Lovelace Custom Card für Cover-Entitäten (Jalousien, Rollos etc.)
 * Verwendbar als eigenständige Karte oder innerhalb einer picture-elements-card.
 *
 * Konfiguration (YAML):
 *
 *   type: custom:cover-status-card
 *   entity: cover.wohnzimmer_jalousie
 *   name: Wohnzimmer            # optional, überschreibt den Entity-Namen
 *   show_tilt: true             # optional, aktiviert Tilt-Anzeige wenn Position < 5%
 *
 * Als picture-elements-Element:
 *   type: custom:cover-status-card
 *   entity: cover.wohnzimmer_jalousie
 *   style:
 *     top: 10%
 *     left: 20%
 */

class CoverStatusCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("cover-status-card: 'entity' ist erforderlich.");
    }
    this._config = config;
  }

  // Wird von HA aufgerufen um die Kartengröße zu bestimmen
  getCardSize() {
    return 1;
  }

  _getStatusLabel(state) {
    const map = {
      open:     "Offen",
      closed:   "Geschlossen",
      opening:  "Öffnet…",
      closing:  "Schliesst…",
      stopped:  "Gestoppt",
      unknown:  "Unbekannt",
      unavailable: "Nicht verfügbar",
    };
    return map[state] ?? state;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const entityId  = this._config.entity;
    const stateObj  = this._hass.states[entityId];
    const showTilt  = this._config.show_tilt ?? false;

    // --- Zeile 1: Name ---
    const name = this._config.name
      ?? stateObj?.attributes?.friendly_name
      ?? entityId;

    // --- Hintergrundfarbe je nach Position und Tilt ---
    const _pos    = stateObj?.attributes?.current_position;
    const _tilt   = stateObj?.attributes?.current_tilt_position;
    const _posNum = (_pos  !== undefined && _pos  !== null) ? Number(_pos)  : null;
    const _tiltNum= (_tilt !== undefined && _tilt !== null) ? Number(_tilt) : null;

    let bgColor;
    if (_posNum === null) {
      bgColor = "pink";
    } else if (_posNum <= 5) {
      // Pos 0-5: Farbe hängt vom Tilt ab (nur wenn show_tilt aktiv und Tilt vorhanden)
      if (showTilt && _tiltNum !== null && _tiltNum > 5) {
        bgColor = "silver";
      } else {
        bgColor = "slategray";
      }
    } else if (_posNum >= 95) {
      bgColor = "gold";
    } else {
      bgColor = "orange";
    }

    // --- Zeile 2: Status + Position ---
    let line2 = "Unbekannt";

    if (stateObj) {
      const state    = stateObj.state;
      const pos      = stateObj.attributes?.current_position;   // 0–100 oder undefined
      const tilt     = stateObj.attributes?.current_tilt_position; // 0–100 oder undefined

      const posNum   = (pos !== undefined && pos !== null) ? Number(pos) : null;
      const tiltNum  = (tilt !== undefined && tilt !== null) ? Number(tilt) : null;

      // Tilt anzeigen, wenn: show_tilt=true UND Position < 5 %
      const useTilt  = showTilt && tiltNum !== null && posNum !== null && posNum < 5;

      if (useTilt) {
        // Tilt-Position anstelle des Status
        line2 = `Tilt ${tiltNum}\u202f%`;
      } else {
        // Status-Text
        line2 = this._getStatusLabel(state);

        // Position anhängen, wenn zwischen 5 % und 95 %
        if (posNum !== null && posNum >= 5 && posNum <= 95) {
          line2 += ` · ${posNum}\u202f%`;
        }
      }
    }

    // --- Breite: wenn style.width gesetzt, füllt .card den Host (wird von HA gesetzt) ---
    const configWidth  = this._config?.style?.width;
    const cardWidth    = configWidth ? "100%"      : "fit-content";
    const cardMinWidth = configWidth ? "unset"     : "120px";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
          font-size: var(--paper-font-body1_-_font-size, 14px);
        }

        .card {
          background: ${bgColor};
          border-radius: var(--ha-card-border-radius, 12px);
          padding: 6px 10px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0,0,0,.15));
          width: ${cardWidth};
          min-width: ${cardMinWidth};
          cursor: pointer;
          user-select: none;
          transition: opacity .15s;
        }
        .card:active { opacity: .75; }

        .name {
          font-weight: 400;
          font-size: .85em;
          color: #000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 1px;
          line-height: 1.2;
        }

        .status {
          font-weight: 700;
          font-size: .85em;
          color: #000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
      </style>

      <div class="card" title="${entityId}">
        <div class="name">${name}</div>
        <div class="status">${line2}</div>
      </div>
    `;

    // Klick öffnet den HA More-Info-Dialog
    this.shadowRoot.querySelector(".card")
      .addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId },
        }));
      });
  }
}

customElements.define("cover-status-card", CoverStatusCard);

// Damit HA die Karte im Karten-Picker findet
window.customCards = window.customCards ?? [];
window.customCards.push({
  type:        "cover-status-card",
  name:        "Cover Status Card",
  description: "Zeigt Status und Position einer Cover-Entität in zwei Zeilen.",
  preview:     false,
});
