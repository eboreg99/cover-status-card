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
 *   show_tilt: true             # optional, aktiviert Tilt-Anzeige wenn Position < 3%
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

    // --- Hintergrundfarbe je nach Position ---
    const _pos    = stateObj?.attributes?.current_position;
    const _posNum = (_pos !== undefined && _pos !== null) ? Number(_pos) : null;
    const bgColor =
      _posNum === null ? "pink"      :
      _posNum <= 3     ? "slategray" :
      _posNum >= 97    ? "gold"      :
                         "orange";

    // --- Zeile 2: Status + Position ---
    let line2 = "Unbekannt";

    if (stateObj) {
      const state    = stateObj.state;
      const pos      = stateObj.attributes?.current_position;   // 0–100 oder undefined
      const tilt     = stateObj.attributes?.current_tilt_position; // 0–100 oder undefined

      const posNum   = (pos !== undefined && pos !== null) ? Number(pos) : null;
      const tiltNum  = (tilt !== undefined && tilt !== null) ? Number(tilt) : null;

      // Tilt anzeigen, wenn: show_tilt=true UND Position < 3 %
      const useTilt  = showTilt && tiltNum !== null && posNum !== null && posNum < 3;

      if (useTilt) {
        // Tilt-Position anstelle des Status
        line2 = `Lamellen ${tiltNum}\u202f%`;
      } else {
        // Status-Text
        line2 = this._getStatusLabel(state);

        // Position anhängen, wenn zwischen 3 % und 97 %
        if (posNum !== null && posNum >= 3 && posNum <= 97) {
          line2 += ` · ${posNum}\u202f%`;
        }
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
          font-size: var(--paper-font-body1_-_font-size, 14px);
        }

        .card {
          background: ${bgColor};
          border-radius: var(--ha-card-border-radius, 12px);
          padding: 10px 14px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0,0,0,.15));
          min-width: 120px;
          cursor: pointer;
          user-select: none;
          transition: opacity .15s;
        }
        .card:active { opacity: .75; }

        .name {
          font-weight: 400;
          color: #000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .status {
          font-weight: 700;
          font-size: .85em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status { color: #000; }
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
