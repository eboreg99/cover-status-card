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
 *   colors:
 *     unknown:  "#ffc0cb"       # pink   – Position unbekannt
 *     closed:   "slategray"     # Position 0–5 %
 *     tilt:     "silver"        # Position 0–5 %, Tilt >= 5 % (nur wenn show_tilt)
 *     partial:  "orange"        # Position 6–94 %
 *     open:     "gold"          # Position 95–100 %
 *
 * Als picture-elements-Element:
 *   type: custom:cover-status-card
 *   entity: cover.wohnzimmer_jalousie
 *   style:
 *     top: 10%
 *     left: 20%
 */

// Standardfarben – werden verwendet wenn der User keine eigenen definiert
const DEFAULTS = {
  unknown: "#ffc0cb",   // pink
  closed:  "slategray",
  tilt:    "silver",
  partial: "orange",
  open:    "gold",
};

// ---------------------------------------------------------------------------
// Haupt-Karte
// ---------------------------------------------------------------------------
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
    if (this._hass) this._render();
  }

  static getConfigElement() {
    return document.createElement("cover-status-card-editor");
  }

  static getStubConfig() {
    return { entity: "", name: "", show_tilt: false };
  }

  getCardSize() {
    return 1;
  }

  _getStatusLabel(state) {
    const map = {
      open:        "Offen",
      closed:      "Geschlossen",
      opening:     "Öffnet…",
      closing:     "Schliesst…",
      stopped:     "Gestoppt",
      unknown:     "Unbekannt",
      unavailable: "Nicht verfügbar",
    };
    return map[state] ?? state;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const entityId = this._config.entity;
    const stateObj = this._hass.states[entityId];
    const showTilt = this._config.show_tilt ?? false;
    const colors   = { ...DEFAULTS, ...(this._config.colors ?? {}) };

    // --- Zeile 1: Name ---
    const name = this._config.name
      ?? stateObj?.attributes?.friendly_name
      ?? entityId;

    // --- Hintergrundfarbe je nach Position und Tilt ---
    const _pos    = stateObj?.attributes?.current_position;
    const _tilt   = stateObj?.attributes?.current_tilt_position;
    const _posNum = (_pos  != null) ? Number(_pos)  : null;
    const _tiltNum= (_tilt != null) ? Number(_tilt) : null;

    let bgColor;
    if (_posNum === null) {
      bgColor = colors.unknown;
    } else if (_posNum <= 5) {
      if (showTilt && _tiltNum !== null && _tiltNum >= 5) {
        bgColor = colors.tilt;
      } else {
        bgColor = colors.closed;
      }
    } else if (_posNum >= 95) {
      bgColor = colors.open;
    } else {
      bgColor = colors.partial;
    }

    // --- Zeile 2: Status + Position ---
    let line2 = "Unbekannt";

    if (stateObj) {
      const state   = stateObj.state;
      const posNum  = (_pos  != null) ? Number(_pos)  : null;
      const tiltNum = (_tilt != null) ? Number(_tilt) : null;
      const useTilt = showTilt && tiltNum !== null && posNum !== null && posNum < 5;

      if (useTilt) {
        line2 = `Tilt ${tiltNum}\u202f%`;
      } else {
        line2 = this._getStatusLabel(state);
        if (posNum !== null && posNum >= 5 && posNum <= 95) {
          line2 += ` · ${posNum}\u202f%`;
        }
      }
    }

    // --- Breite ---
    const configWidth  = this._config?.style?.width;
    const cardWidth    = configWidth ? "100%"  : "fit-content";
    const cardMinWidth = configWidth ? "unset" : "120px";

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
          border-radius: var(--ha-card-border-radius, 5px);
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

    this.shadowRoot.querySelector(".card").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      }));
    });
  }
}

customElements.define("cover-status-card", CoverStatusCard);

// ---------------------------------------------------------------------------
// Visueller Editor
// ---------------------------------------------------------------------------
class CoverStatusCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }

  set hass(hass) {
    this._hass = hass;
    const picker = this.shadowRoot.querySelector("ha-entity-picker");
    if (picker) picker.hass = hass;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _fire(config) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      detail: { config },
    }));
  }

  // Farbe für ein bestimmtes Feld aus Config lesen, Fallback auf Default
  _colorVal(key) {
    return this._config.colors?.[key] ?? DEFAULTS[key];
  }

  // Hex-Farbe normalisieren (CSS-Namen → Hex für input[type=color])
  // input[type=color] benötigt zwingend einen #rrggbb-Wert
  _toHex(color) {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = color;
    // canvas normalisiert den Wert automatisch
    return ctx.fillStyle; // gibt immer #rrggbb zurück
  }

  _render() {
    const cfg = this._config;

    const colorFields = [
      { key: "unknown", label: "Unbekannt",        hint: "Position nicht verfügbar" },
      { key: "closed",  label: "Geschlossen",       hint: "Position 0–5 %" },
      { key: "tilt",    label: "Tilt (Lamellen)",   hint: "Position 0–5 %, Tilt ≥ 5 % (show_tilt)" },
      { key: "partial", label: "Halb offen",        hint: "Position 6–94 %" },
      { key: "open",    label: "Offen",             hint: "Position 95–100 %" },
    ];

    const colorRows = colorFields.map(({ key, label, hint }) => {
      const hex = this._toHex(this._colorVal(key));
      return `
        <div class="color-row" data-key="${key}">
          <div class="color-info">
            <span class="color-label">${label}</span>
            <span class="hint">${hint}</span>
          </div>
          <div class="color-controls">
            <div class="color-swatch" style="background:${hex}"></div>
            <input
              class="color-picker"
              type="color"
              data-key="${key}"
              value="${hex}"
              title="${label}"
            />
            <input
              class="color-text"
              type="text"
              data-key="${key}"
              value="${this._colorVal(key)}"
              placeholder="${DEFAULTS[key]}"
              spellcheck="false"
            />
            <button class="color-reset" data-key="${key}" title="Zurücksetzen">↺</button>
          </div>
        </div>
      `;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Vorschau */
        .section-label {
          font-size: .75em;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: var(--secondary-text-color);
          margin-bottom: 6px;
        }
        .preview-wrap {
          background: var(--secondary-background-color, #f0f0f0);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 56px;
        }

        /* Felder */
        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .field label {
          font-size: .8em;
          font-weight: 600;
          color: var(--primary-text-color);
        }
        ha-entity-picker { width: 100%; }
        input[type="text"]:not(.color-text) {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          outline: none;
          transition: border-color .15s;
        }
        input[type="text"]:not(.color-text):focus {
          border-color: var(--primary-color, #03a9f4);
        }

        /* Toggle */
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
        }
        .toggle-row label {
          font-size: .9em;
          color: var(--primary-text-color);
        }
        .hint {
          font-size: .75em;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }

        /* Farbkonfiguration */
        .color-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 5px 0;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        .color-row:last-child { border-bottom: none; }
        .color-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .color-label {
          font-size: .85em;
          color: var(--primary-text-color);
        }
        .color-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid rgba(0,0,0,.2);
          flex-shrink: 0;
          pointer-events: none;
        }
        input[type="color"].color-picker {
          width: 32px;
          height: 32px;
          padding: 2px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          background: none;
          cursor: pointer;
          flex-shrink: 0;
        }
        input[type="color"].color-picker::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"].color-picker::-webkit-color-swatch { border: none; border-radius: 2px; }
        .color-text {
          width: 90px;
          padding: 5px 7px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          font-size: .8em;
          font-family: monospace;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          outline: none;
          transition: border-color .15s;
        }
        .color-text:focus { border-color: var(--primary-color, #03a9f4); }
        .color-reset {
          background: none;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          font-size: 14px;
          color: var(--secondary-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: color .15s;
        }
        .color-reset:hover { color: var(--primary-color, #03a9f4); }
      </style>

      <div class="editor">

        <!-- Vorschau -->
        <div>
          <div class="section-label">Vorschau</div>
          <div class="preview-wrap">
            <cover-status-card id="preview"></cover-status-card>
          </div>
        </div>

        <!-- Entity -->
        <div class="field">
          <label>Entität *</label>
          <ha-entity-picker
            id="entity-picker"
            allow-custom-entity
            domain-filter="cover"
            .value="${cfg.entity ?? ""}"
          ></ha-entity-picker>
        </div>

        <!-- Name -->
        <div class="field">
          <label>Name (optional)</label>
          <input
            id="name-input"
            type="text"
            placeholder="Leer = Entity-Name"
            value="${cfg.name ?? ""}"
          />
          <div class="hint">Überschreibt den angezeigten Namen in Zeile 1.</div>
        </div>

        <!-- show_tilt Toggle -->
        <div class="toggle-row">
          <div>
            <label>Tilt-Anzeige aktivieren</label>
            <div class="hint">Zeigt Lamellenstellung wenn Position &lt; 5 %</div>
          </div>
          <ha-switch id="tilt-switch" ${cfg.show_tilt ? "checked" : ""}></ha-switch>
        </div>

        <!-- Farben -->
        <div>
          <div class="section-label">Farben</div>
          <div id="color-fields">
            ${colorRows}
          </div>
        </div>

      </div>
    `;

    // --- Picker & Basis-Felder ---
    const picker   = this.shadowRoot.querySelector("#entity-picker");
    const nameInput = this.shadowRoot.querySelector("#name-input");
    const tiltSwitch = this.shadowRoot.querySelector("#tilt-switch");

    if (this._hass) picker.hass = this._hass;

    picker.addEventListener("value-changed", (e) => {
      this._config = { ...this._config, entity: e.detail.value };
      this._fire(this._config);
      this._updatePreview();
    });

    nameInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const newCfg = { ...this._config };
      if (val) newCfg.name = val; else delete newCfg.name;
      this._config = newCfg;
      this._fire(this._config);
      this._updatePreview();
    });

    tiltSwitch.addEventListener("change", (e) => {
      this._config = { ...this._config, show_tilt: e.target.checked };
      this._fire(this._config);
      this._updatePreview();
    });

    // --- Farb-Events ---
    this.shadowRoot.querySelectorAll(".color-picker").forEach((input) => {
      input.addEventListener("input", (e) => {
        this._setColor(e.target.dataset.key, e.target.value);
      });
    });

    this.shadowRoot.querySelectorAll(".color-text").forEach((input) => {
      input.addEventListener("change", (e) => {
        const val = e.target.value.trim();
        if (val) this._setColor(e.target.dataset.key, val);
      });
    });

    this.shadowRoot.querySelectorAll(".color-reset").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = e.target.dataset.key;
        const newColors = { ...(this._config.colors ?? {}) };
        delete newColors[key];
        if (Object.keys(newColors).length === 0) {
          const newCfg = { ...this._config };
          delete newCfg.colors;
          this._config = newCfg;
        } else {
          this._config = { ...this._config, colors: newColors };
        }
        this._fire(this._config);
        // Felder neu rendern ohne komplettes Re-Render
        this._refreshColorRow(key);
        this._updatePreview();
      });
    });

    this._initPreview();
  }

  _setColor(key, value) {
    const newColors = { ...(this._config.colors ?? {}), [key]: value };
    this._config = { ...this._config, colors: newColors };
    this._fire(this._config);
    this._refreshColorRow(key);
    this._updatePreview();
  }

  // Swatch und Text-Input aktualisieren ohne Komplett-Re-Render
  _refreshColorRow(key) {
    const color  = this._colorVal(key);
    const hex    = this._toHex(color);
    const swatch = this.shadowRoot.querySelector(`.color-row[data-key="${key}"] .color-swatch`);
    const picker = this.shadowRoot.querySelector(`.color-picker[data-key="${key}"]`);
    const text   = this.shadowRoot.querySelector(`.color-text[data-key="${key}"]`);
    if (swatch) swatch.style.background = hex;
    if (picker) picker.value = hex;
    if (text)   text.value   = color;
  }

  _initPreview() {
    const preview = this.shadowRoot.querySelector("#preview");
    if (!preview) return;
    try {
      if (this._config.entity) preview.setConfig(this._config);
      if (this._hass) preview.hass = this._hass;
    } catch (_) {}
  }

  _updatePreview() {
    const preview = this.shadowRoot.querySelector("#preview");
    if (!preview) return;
    try {
      if (this._config.entity) {
        preview.setConfig(this._config);
        if (this._hass) preview.hass = this._hass;
      }
    } catch (_) {}
  }
}

customElements.define("cover-status-card-editor", CoverStatusCardEditor);

// ---------------------------------------------------------------------------
// HACS / Karten-Picker Registrierung
// ---------------------------------------------------------------------------
window.customCards = window.customCards ?? [];
window.customCards.push({
  type:        "cover-status-card",
  name:        "Cover Status Card",
  description: "Zeigt Status und Position einer Cover-Entität in zwei Zeilen.",
  preview:     true,
});
