// ===========================================================================
// spiel.js – ein Rätsel spielen
//
// Die Klasse Spiel kümmert sich um genau ein Rätsel:
//   * Gitter zeichnen (HTML-Elemente erzeugen)
//   * merken, welches Feld und welches Wort gerade gewählt ist
//   * Eingaben annehmen, prüfen, speichern
//   * Hilfen (aufdecken, prüfen, auflösen)
//   * Uhr
// ===========================================================================

import { holeStand, speichereStand, loescheStand, einstellung } from "./speicher.js";

// Umlaute stehen im Rätsel als zwei Buchstaben (wie in der Zeitung).
const UMLAUTE = { "Ä": "AE", "Ö": "OE", "Ü": "UE", "ß": "SS" };

// Kleine Pfeil-Bilder für den Wortanfang. viewBox 0 0 10 10 = 10×10 Kästchen.
const PFEIL_BILDER = {
  // Hinweis links daneben, Wort läuft nach rechts
  rechts: '<svg viewBox="0 0 10 10"><path d="M0 2.6 4.2 5 0 7.4z" fill="currentColor"/></svg>',
  // Hinweis darüber, Wort läuft nach unten
  unten: '<svg viewBox="0 0 10 10"><path d="M2.6 0 5 4.2 7.4 0z" fill="currentColor"/></svg>',
  // Hinweis darüber, Wort läuft nach rechts (Knick)
  unten_rechts: '<svg viewBox="0 0 10 10"><path d="M2 0v5.2h3.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 3.2 8.2 5.2 5 7.2z" fill="currentColor"/></svg>',
  // Hinweis links daneben, Wort läuft nach unten (Knick)
  rechts_unten: '<svg viewBox="0 0 10 10"><path d="M0 2h5.2v3.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.2 5 5.2 8.2 7.2 5z" fill="currentColor"/></svg>',
};

// Pfeil in der großen Hinweisleiste
const RICHTUNGS_ZEICHEN = { waagerecht: "→", senkrecht: "↓" };

/** Macht aus Zeile und Spalte einen Text-Schlüssel, z. B. "3,5" – praktisch für Map und Set. */
function schluessel(r, c) {
  return `${r},${c}`;
}

/** Sekunden als "m:ss" bzw. "h:mm:ss". */
export function formatiereZeit(sekunden) {
  const h = Math.floor(sekunden / 3600);
  const m = Math.floor((sekunden % 3600) / 60);
  const s = String(sekunden % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export class Spiel {
  /**
   * @param raetsel     ein Rätsel aus puzzles.json
   * @param elemente    die HTML-Elemente, in die wir zeichnen (siehe app.js)
   * @param beiEnde     Funktion, die aufgerufen wird, wenn das Rätsel gelöst/aufgelöst ist
   */
  constructor(raetsel, elemente, beiEnde) {
    this.raetsel = raetsel;
    this.el = elemente;
    this.beiEnde = beiEnde;
    this.B = raetsel.breite;
    this.H = raetsel.hoehe;
    this.zoom = false;

    // Die Lösung als zweidimensionale Liste: loesung[zeile][spalte] = "A" oder "#"
    this.loesung = raetsel.gitter.map((zeile) => zeile.split(""));

    // Wörter vorbereiten: zu jedem Wort die Liste seiner Felder.
    this.woerter = raetsel.hinweise.map((h, index) => {
      const felder = [];
      for (let i = 0; i < h.laenge; i++) {
        felder.push(h.richtung === "waagerecht" ? [h.sr, h.sc + i] : [h.sr + i, h.sc]);
      }
      return { ...h, index, felder };
    });

    // Zu jedem Buchstabenfeld: welches Wort läuft waagerecht, welches senkrecht hindurch?
    this.zuWort = new Map();
    for (const wort of this.woerter) {
      for (const [r, c] of wort.felder) {
        const k = schluessel(r, c);
        if (!this.zuWort.has(k)) this.zuWort.set(k, {});
        this.zuWort.get(k)[wort.richtung] = wort;
      }
    }

    // Felder des Lösungsworts: "r,c" -> Nummer (1, 2, 3 …)
    this.loesungsNr = new Map();
    (raetsel.loesung?.felder || []).forEach(([r, c], i) => {
      this.loesungsNr.set(schluessel(r, c), i + 1);
    });

    this.ladeStand();
    this.zeichne();
    this.waehleWort(this.ersteOffenesWort() || this.woerter[0]);
    this.starteUhr();
  }

  // -------------------------------------------------------------------------
  // Spielstand laden und speichern
  // -------------------------------------------------------------------------

  ladeStand() {
    const stand = holeStand(this.raetsel.id);
    // eingaben[zeile][spalte] = "" (leer) oder ein Buchstabe
    this.eingaben = this.loesung.map((zeile) => zeile.map(() => ""));
    if (stand?.eingaben) {
      for (let r = 0; r < this.H; r++) {
        for (let c = 0; c < this.B; c++) {
          const zeichen = stand.eingaben[r * this.B + c];
          if (zeichen && /[A-Z]/.test(zeichen)) this.eingaben[r][c] = zeichen;
        }
      }
    }
    this.aufgedeckt = new Set(stand?.aufgedeckt || []);   // Felder, die per Hilfe kamen
    this.falsch = new Set();                               // rot markierte Felder
    this.zeit = stand?.zeit || 0;
    this.hilfen = stand?.hilfen || 0;
    this.geloest = stand?.geloest || false;
    this.aufgeloest = stand?.aufgeloest || false;
  }

  speichern() {
    // Eingaben als ein langer Text: Buchstabe, "." für leer, "#" für Hinweisfeld
    let text = "";
    let gefuellt = 0;
    let gesamt = 0;
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.B; c++) {
        if (this.loesung[r][c] === "#") {
          text += "#";
        } else {
          gesamt++;
          if (this.eingaben[r][c]) gefuellt++;
          text += this.eingaben[r][c] || ".";
        }
      }
    }
    speichereStand(this.raetsel.id, {
      eingaben: text,
      aufgedeckt: [...this.aufgedeckt],    // Set -> Liste, weil JSON keine Sets kennt
      zeit: this.zeit,
      hilfen: this.hilfen,
      geloest: this.geloest,
      aufgeloest: this.aufgeloest,
      fortschritt: gesamt ? gefuellt / gesamt : 0,
    });
  }

  // -------------------------------------------------------------------------
  // Zeichnen
  // -------------------------------------------------------------------------

  zeichne() {
    const gitter = this.el.gitter;
    gitter.innerHTML = "";
    gitter.style.setProperty("--breite", this.B);

    // Welche Hinweise stehen in welchem Hinweisfeld?
    const hinweiseProFeld = new Map();
    for (const wort of this.woerter) {
      const k = schluessel(wort.r, wort.c);
      if (!hinweiseProFeld.has(k)) hinweiseProFeld.set(k, []);
      hinweiseProFeld.get(k).push(wort);
    }

    this.zellen = [];          // zellen[r][c] = HTML-Element des Buchstabenfelds
    this.hinweisKnoepfe = [];  // hinweisKnoepfe[wortIndex] = Knopf im Hinweisfeld
    const fragment = document.createDocumentFragment();   // erst sammeln, dann einmal einfügen

    for (let r = 0; r < this.H; r++) {
      this.zellen.push([]);
      for (let c = 0; c < this.B; c++) {
        const zelle = document.createElement("div");
        zelle.dataset.r = r;
        zelle.dataset.c = c;

        if (this.loesung[r][c] === "#") {
          zelle.className = "zelle hinweisfeld";
          for (const wort of hinweiseProFeld.get(schluessel(r, c)) || []) {
            const knopf = document.createElement("button");
            knopf.type = "button";
            knopf.className = "hinweis";
            knopf.dataset.wort = wort.index;
            const text = document.createElement("span");
            text.className = "hinweis-text";
            text.textContent = wort.text;
            knopf.append(text);
            zelle.append(knopf);
            this.hinweisKnoepfe[wort.index] = knopf;
          }
          this.zellen[r].push(null);
        } else {
          zelle.className = "zelle buchstabe";
          zelle.setAttribute("role", "gridcell");
          const eingabe = document.createElement("span");
          eingabe.className = "eingabe";
          zelle.append(eingabe);

          const nr = this.loesungsNr.get(schluessel(r, c));
          if (nr) {
            zelle.classList.add("loesungsfeld");
            const nrElement = document.createElement("span");
            nrElement.className = "nr";
            nrElement.textContent = nr;
            zelle.append(nrElement);
          }
          this.zellen[r].push(zelle);
        }
        fragment.append(zelle);
      }
    }

    // Pfeile in die Startfelder der Wörter setzen.
    for (const wort of this.woerter) {
      const pfeil = document.createElement("span");
      pfeil.className = `pfeil pfeil-${wort.pfeil}`;
      pfeil.innerHTML = PFEIL_BILDER[wort.pfeil];
      this.zellen[wort.sr][wort.sc].append(pfeil);
    }

    gitter.append(fragment);
    this.zeichneLoesungswort();
  }

  zeichneLoesungswort() {
    const bereich = this.el.loesungswort;
    bereich.innerHTML = "";
    if (!this.raetsel.loesung) return;
    const label = document.createElement("span");
    label.className = "loesungswort-label";
    label.textContent = "Lösungswort";
    const felder = document.createElement("span");
    felder.className = "loesungswort-felder";
    this.lwFelder = this.raetsel.loesung.felder.map((_, i) => {
      const f = document.createElement("span");
      f.className = "lw-feld";
      f.innerHTML = `<span class="lw-buchstabe"></span><span class="nr">${i + 1}</span>`;
      felder.append(f);
      return f;
    });
    bereich.append(label, felder);
  }

  /** Größe der Felder an den verfügbaren Platz anpassen. */
  passeGroesseAn() {
    const bereich = this.el.gitterBereich;
    const stil = getComputedStyle(bereich);
    const breite = bereich.clientWidth - parseFloat(stil.paddingLeft) - parseFloat(stil.paddingRight);
    const hoehe = bereich.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom);
    // Pro Feld kommt 1px Linie dazu, plus 2px Rahmen außen.
    const passtBreite = Math.floor((breite - this.B - 3) / this.B);
    const passtHoehe = Math.floor((hoehe - this.H - 3) / this.H);
    // Am liebsten so breit wie möglich. Ist zu wenig Höhe da, lieber etwas
    // scrollen als winzige Felder: mindestens 36px (gut zu treffen).
    let zelle = Math.min(passtBreite, Math.max(passtHoehe, 36));
    zelle = Math.max(32, Math.min(zelle, 64));          // nie kleiner als 32, nie größer als 64
    if (this.zoom) zelle = Math.max(Math.round(zelle * 1.6), 58);
    this.el.gitter.style.setProperty("--zelle", `${zelle}px`);
    this.passeHinweistexteAn(zelle);
    this.zeigeAktivesFeld();
  }

  /** Schrift in jedem Hinweisfeld so groß wie möglich, aber so, dass der Text reinpasst. */
  passeHinweistexteAn(zelle) {
    const groesste = Math.max(8, zelle * 0.26);
    const kleinste = zelle >= 50 ? 8 : 6;
    for (const knopf of this.hinweisKnoepfe) {
      if (!knopf) continue;
      const text = knopf.firstChild;
      knopf.classList.remove("umbruch");
      // Passt der Text bei dieser Schriftgröße? Höhe UND Breite (lange Wörter) prüfen.
      const passt = (groesse) => {
        knopf.style.fontSize = `${groesse}px`;
        return text.offsetHeight <= knopf.clientHeight - 1 && text.scrollWidth <= text.clientWidth;
      };
      if (!passt(kleinste)) {
        // Selbst in kleinster Schrift zu lang -> Umbruch mitten im Wort erlauben
        // und oben ausrichten. Den ganzen Text zeigt dann die Hinweisleiste.
        knopf.classList.add("umbruch");
        passt(kleinste);
        continue;
      }
      // Binäre Suche: Mitte ausprobieren, dann in der passenden Hälfte weitersuchen.
      let unten = kleinste;          // passt sicher
      let oben = groesste;           // passt vielleicht nicht
      for (let schritt = 0; schritt < 6; schritt++) {
        const mitte = (unten + oben) / 2;
        if (passt(mitte)) unten = mitte;
        else oben = mitte;
      }
      knopf.style.fontSize = `${unten}px`;
    }
  }

  // -------------------------------------------------------------------------
  // Auswahl: welches Feld, welches Wort?
  // -------------------------------------------------------------------------

  /** Das Wort, in dem gerade geschrieben wird. */
  aktivesWort() {
    const { r, c, richtung } = this.auswahl;
    const woerter = this.zuWort.get(schluessel(r, c));
    return woerter[richtung] || woerter.waagerecht || woerter.senkrecht;
  }

  /** Antippen eines Buchstabenfelds. Zweimal tippen wechselt die Richtung. */
  tippeAufFeld(r, c) {
    const woerter = this.zuWort.get(schluessel(r, c));
    if (!woerter) return;
    if (this.auswahl && this.auswahl.r === r && this.auswahl.c === c) {
      this.wechsleRichtung();
      return;
    }
    let richtung = this.auswahl?.richtung || "waagerecht";
    if (!woerter[richtung]) richtung = richtung === "waagerecht" ? "senkrecht" : "waagerecht";
    this.auswahl = { r, c, richtung };
    this.aktualisiere();
  }

  /** Ein Wort auswählen (z. B. beim Antippen seines Hinweises). */
  waehleWort(wort) {
    if (!wort) return;
    const leer = wort.felder.find(([r, c]) => !this.eingaben[r][c]);
    const [r, c] = leer || wort.felder[0];
    this.auswahl = { r, c, richtung: wort.richtung };
    this.aktualisiere();
  }

  wechsleRichtung() {
    const woerter = this.zuWort.get(schluessel(this.auswahl.r, this.auswahl.c));
    const andere = this.auswahl.richtung === "waagerecht" ? "senkrecht" : "waagerecht";
    if (woerter[andere]) {
      this.auswahl.richtung = andere;
      this.aktualisiere();
    }
  }

  hatLuecken(wort) {
    return wort.felder.some(([r, c]) => !this.eingaben[r][c]);
  }

  ersteOffenesWort() {
    return this.woerter.find((w) => this.hatLuecken(w));
  }

  /** Zum nächsten (schritt = 1) oder vorherigen (schritt = -1) Wort springen. */
  springeZuWort(schritt, nurOffene = false) {
    const anzahl = this.woerter.length;
    const start = this.aktivesWort().index;
    for (let k = 1; k <= anzahl; k++) {
      // % anzahl sorgt dafür, dass wir nach dem letzten Wort wieder beim ersten landen
      const index = (((start + schritt * k) % anzahl) + anzahl) % anzahl;
      const wort = this.woerter[index];
      if (!nurOffene || this.hatLuecken(wort)) {
        this.waehleWort(wort);
        return;
      }
    }
  }

  /** Mit den Pfeiltasten über das Gitter laufen (Hinweisfelder werden übersprungen). */
  bewege(dr, dc) {
    let r = this.auswahl.r + dr;
    let c = this.auswahl.c + dc;
    while (r >= 0 && r < this.H && c >= 0 && c < this.B) {
      if (this.loesung[r][c] !== "#") {
        const woerter = this.zuWort.get(schluessel(r, c));
        let richtung = dc !== 0 ? "waagerecht" : "senkrecht";
        if (!woerter[richtung]) richtung = this.auswahl.richtung;
        if (!woerter[richtung]) richtung = woerter.waagerecht ? "waagerecht" : "senkrecht";
        this.auswahl = { r, c, richtung };
        this.aktualisiere();
        return;
      }
      r += dr;
      c += dc;
    }
  }

  // -------------------------------------------------------------------------
  // Eingabe
  // -------------------------------------------------------------------------

  /** Wird von Bildschirmtastatur und PC-Tastatur aufgerufen. */
  eingabe(wert) {
    if (this.geloest || this.aufgeloest) return;      // fertige Rätsel nicht mehr ändern
    if (wert === "LOESCHEN") return this.loesche();
    if (wert === "RICHTUNG") return this.wechsleRichtung();
    const buchstaben = UMLAUTE[wert] || wert;         // "Ä" -> "AE"
    for (const b of buchstaben) this.setzeBuchstabe(b);
    this.nachAenderung();
  }

  setzeBuchstabe(buchstabe) {
    const wort = this.aktivesWort();
    const { r, c } = this.auswahl;
    const k = schluessel(r, c);
    const warLeer = !this.eingaben[r][c];
    if (!this.aufgedeckt.has(k)) {                    // aufgedeckte Felder sind fest
      this.eingaben[r][c] = buchstabe;
      this.falsch.delete(k);
    }

    // Wohin geht der Cursor als Nächstes?
    const i = wort.felder.findIndex(([fr, fc]) => fr === r && fc === c);
    const istLeer = ([fr, fc]) => !this.eingaben[fr][fc];
    const danach = wort.felder.slice(i + 1).find(istLeer);   // nächstes leeres Feld dahinter
    const irgendwo = wort.felder.find(istLeer);               // irgendein leeres Feld im Wort

    if (danach) {
      [this.auswahl.r, this.auswahl.c] = danach;
    } else if (irgendwo) {
      [this.auswahl.r, this.auswahl.c] = irgendwo;
    } else if (warLeer) {
      // Wir haben gerade das letzte Feld des Worts gefüllt -> ab zum nächsten offenen Wort.
      if (this.ersteOffenesWort()) this.springeZuWort(1, true);
    } else if (i + 1 < wort.felder.length) {
      // Wort war schon voll (Überschreiben) -> einfach ein Feld weiter.
      [this.auswahl.r, this.auswahl.c] = wort.felder[i + 1];
    }
  }

  loesche() {
    const wort = this.aktivesWort();
    const { r, c } = this.auswahl;
    const k = schluessel(r, c);
    if (this.eingaben[r][c] && !this.aufgedeckt.has(k)) {
      this.eingaben[r][c] = "";                        // Feld hat Inhalt -> leeren
      this.falsch.delete(k);
    } else {
      // Feld ist leer -> ein Feld zurück und dort löschen
      const i = wort.felder.findIndex(([fr, fc]) => fr === r && fc === c);
      if (i > 0) {
        const [vr, vc] = wort.felder[i - 1];
        this.auswahl.r = vr;
        this.auswahl.c = vc;
        if (!this.aufgedeckt.has(schluessel(vr, vc))) {
          this.eingaben[vr][vc] = "";
          this.falsch.delete(schluessel(vr, vc));
        }
      }
    }
    this.nachAenderung();
  }

  /** PC-Tastatur. Gibt true zurück, wenn wir die Taste benutzt haben. */
  tasteGedrueckt(ereignis) {
    if (ereignis.metaKey || ereignis.ctrlKey || ereignis.altKey) return false;
    const taste = ereignis.key;
    if (/^[a-zA-ZäöüÄÖÜß]$/.test(taste)) {
      this.eingabe(taste.toUpperCase());     // "ß".toUpperCase() ergibt übrigens "SS"
    } else if (taste === "Backspace" || taste === "Delete") {
      this.eingabe("LOESCHEN");
    } else if (taste === " ") {
      this.wechsleRichtung();
    } else if (taste === "Tab") {
      this.springeZuWort(ereignis.shiftKey ? -1 : 1);
    } else if (taste === "Enter") {
      this.springeZuWort(1, true);
    } else if (taste === "ArrowLeft") {
      this.bewege(0, -1);
    } else if (taste === "ArrowRight") {
      this.bewege(0, 1);
    } else if (taste === "ArrowUp") {
      this.bewege(-1, 0);
    } else if (taste === "ArrowDown") {
      this.bewege(1, 0);
    } else {
      return false;
    }
    ereignis.preventDefault();               // z. B. kein Scrollen bei Leertaste
    return true;
  }

  nachAenderung() {
    this.aktualisiere();
    this.speichern();
    if (!this.geloest && !this.aufgeloest && this.istGeloest()) {
      this.geloest = true;
      this.beende(false);
      this.speichern();
      this.beiEnde(this);
    }
  }

  istGeloest() {
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.B; c++) {
        if (this.loesung[r][c] !== "#" && this.eingaben[r][c] !== this.loesung[r][c]) return false;
      }
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Anzeige aktualisieren
  // -------------------------------------------------------------------------

  aktualisiere() {
    const wort = this.aktivesWort();
    const imWort = new Set(wort.felder.map(([r, c]) => schluessel(r, c)));
    const autoPruefen = einstellung("autoPruefen");

    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.B; c++) {
        const zelle = this.zellen[r][c];
        if (!zelle) continue;                           // Hinweisfeld
        const k = schluessel(r, c);
        const buchstabe = this.eingaben[r][c];
        const istFalsch = buchstabe && buchstabe !== this.loesung[r][c]
          && (this.falsch.has(k) || autoPruefen);
        zelle.firstChild.textContent = buchstabe;
        // classList.toggle(name, bedingung): Klasse an, wenn true, sonst aus
        zelle.classList.toggle("im-wort", imWort.has(k));
        zelle.classList.toggle("aktiv", r === this.auswahl.r && c === this.auswahl.c);
        zelle.classList.toggle("falsch", Boolean(istFalsch));
        zelle.classList.toggle("aufgedeckt", this.aufgedeckt.has(k));
      }
    }

    this.hinweisKnoepfe.forEach((knopf, index) => {
      if (knopf) knopf.classList.toggle("aktiv", index === wort.index);
    });

    // Große Hinweisleiste
    const anzeige = this.el.hinweisAnzeige;
    anzeige.innerHTML = "";
    const pfeil = document.createElement("span");
    pfeil.className = "richtungs-pfeil";
    pfeil.textContent = RICHTUNGS_ZEICHEN[wort.richtung];
    pfeil.setAttribute("aria-label", wort.richtung);
    const laenge = document.createElement("span");
    laenge.className = "laenge";
    laenge.textContent = ` (${wort.laenge})`;
    anzeige.append(pfeil, wort.text, laenge);

    // Lösungswort-Kästchen
    if (this.lwFelder) {
      this.raetsel.loesung.felder.forEach(([r, c], i) => {
        this.lwFelder[i].firstChild.textContent = this.eingaben[r][c];
      });
    }

    this.zeigeAktivesFeld();
  }

  /** Dafür sorgen, dass das aktive Feld sichtbar ist, falls das Gitter scrollt. */
  zeigeAktivesFeld() {
    if (!this.auswahl || !this.zellen) return;
    const zelle = this.zellen[this.auswahl.r][this.auswahl.c];
    zelle?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  schalteZoom() {
    this.zoom = !this.zoom;
    this.el.gitterBereich.classList.toggle("gross", this.zoom);
    this.passeGroesseAn();
    return this.zoom;
  }

  // -------------------------------------------------------------------------
  // Hilfen
  // -------------------------------------------------------------------------

  deckeFelderAuf(felder) {
    let neu = 0;
    for (const [r, c] of felder) {
      const k = schluessel(r, c);
      if (this.eingaben[r][c] !== this.loesung[r][c]) {
        this.eingaben[r][c] = this.loesung[r][c];
        this.aufgedeckt.add(k);
        this.falsch.delete(k);
        neu++;
      }
    }
    return neu;
  }

  deckeBuchstabenAuf() {
    if (this.geloest || this.aufgeloest) return;
    if (this.deckeFelderAuf([[this.auswahl.r, this.auswahl.c]])) this.hilfen++;
    this.nachAenderung();
  }

  deckeWortAuf() {
    if (this.geloest || this.aufgeloest) return;
    if (this.deckeFelderAuf(this.aktivesWort().felder)) this.hilfen++;
    this.nachAenderung();
  }

  /** Markiert alle falschen Buchstaben rot. Gibt die Anzahl zurück. */
  zeigeFehler() {
    let anzahl = 0;
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.B; c++) {
        const b = this.eingaben[r][c];
        if (b && this.loesung[r][c] !== "#" && b !== this.loesung[r][c]) {
          this.falsch.add(schluessel(r, c));
          anzahl++;
        }
      }
    }
    this.hilfen++;
    this.nachAenderung();
    return anzahl;
  }

  loeseAlles() {
    const alle = [];
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.B; c++) {
        if (this.loesung[r][c] !== "#") alle.push([r, c]);
      }
    }
    this.deckeFelderAuf(alle);
    this.aufgeloest = true;
    this.beende(false);
    this.aktualisiere();
    this.speichern();
    this.beiEnde(this);
  }

  neuStarten() {
    loescheStand(this.raetsel.id);
    this.ladeStand();
    this.aktualisiere();
    this.waehleWort(this.woerter[0]);
    this.speichern();
    this.starteUhr();
  }

  // -------------------------------------------------------------------------
  // Uhr
  // -------------------------------------------------------------------------

  starteUhr() {
    this.stoppeUhr();
    this.zeigeZeit();
    if (this.geloest || this.aufgeloest) return;
    this.uhr = setInterval(() => {
      if (document.hidden) return;            // App im Hintergrund -> Zeit läuft nicht
      this.zeit++;
      this.zeigeZeit();
      if (this.zeit % 10 === 0) this.speichern();
    }, 1000);
  }

  stoppeUhr() {
    clearInterval(this.uhr);
    this.uhr = null;
  }

  zeigeZeit() {
    this.el.uhr.textContent = formatiereZeit(this.zeit);
  }

  /** Aufräumen, wenn das Spiel verlassen wird. */
  beende(speichern = true) {
    this.stoppeUhr();
    if (speichern) this.speichern();
  }
}
