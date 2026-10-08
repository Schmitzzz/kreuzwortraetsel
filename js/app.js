// ===========================================================================
// app.js – Startpunkt der App
//
// Aufgaben:
//   * Rätsel aus data/puzzles.json laden
//   * zwischen Startseite und Spielseite umschalten ("Routing" über die URL)
//   * Startseite zeichnen (Liste der Rätsel mit Fortschritt)
//   * Knöpfe und Dialoge mit Funktionen verbinden
//   * Service Worker anmelden (für Offline-Betrieb)
// ===========================================================================

import { Spiel, formatiereZeit } from "./spiel.js";
import { baueTastatur } from "./tastatur.js";
import * as speicher from "./speicher.js";

// Kurzschreibweise: $("uhr") statt document.getElementById("uhr")
const $ = (id) => document.getElementById(id);

const STUFEN_NAMEN = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };

let alleRaetsel = [];          // alle Rätsel aus der JSON-Datei
const nachId = new Map();      // "leicht-01" -> Rätsel
let spiel = null;              // das gerade offene Spiel (oder null)

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function start() {
  // Logo-Animation nur einmal beim Start (nicht bei jeder Rückkehr zur Startseite)
  const logo = document.querySelector(".logo");
  logo.classList.add("animiert");
  setTimeout(() => logo.classList.remove("animiert"), 1500);

  registriereServiceWorker();
  verbindeKnoepfe();
  baueTastatur($("tastatur"), (wert) => spiel?.eingabe(wert));

  try {
    // fetch holt die Datei, await wartet, bis sie da ist.
    const antwort = await fetch("data/puzzles.json");
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    const daten = await antwort.json();
    alleRaetsel = daten.raetsel;
    for (const r of alleRaetsel) nachId.set(r.id, r);
  } catch (fehler) {
    console.error(fehler);
    $("stufen-info").textContent =
      "Die Rätsel konnten nicht geladen werden. Läuft die Seite über einen Webserver? (siehe docs/00-ueberblick.md)";
    return;
  }

  // Bei jeder Änderung der Adresse (#/spiel/… oder #/) die passende Seite zeigen.
  window.addEventListener("hashchange", zeigeAktuelleSeite);
  zeigeAktuelleSeite();
}

// ---------------------------------------------------------------------------
// Routing: Die Adresse bestimmt, was zu sehen ist.
//   index.html#/                -> Startseite
//   index.html#/spiel/mittel-04 -> Rätsel "mittel-04"
// Vorteil: Neu laden, Zurück-Taste und Lesezeichen funktionieren einfach.
// ---------------------------------------------------------------------------

function zeigeAktuelleSeite() {
  const [, seite, id] = location.hash.split("/");    // "#/spiel/x" -> ["#", "spiel", "x"]
  if (seite === "spiel" && nachId.has(id)) {
    oeffneSpiel(nachId.get(id));
  } else {
    zeigeStartseite();
  }
}

function oeffneSpiel(raetsel) {
  spiel?.beende();                 // ?. = nur aufrufen, wenn spiel nicht null ist
  $("startseite").hidden = true;
  $("spielseite").hidden = false;
  $("spiel-name").textContent = `${STUFEN_NAMEN[raetsel.schwierigkeit]}, Rätsel ${raetsel.nr}`;
  $("zoom").setAttribute("aria-pressed", "false");

  spiel = new Spiel(
    raetsel,
    {
      gitter: $("gitter"),
      gitterBereich: $("gitter-bereich"),
      hinweisAnzeige: $("hinweis-anzeige"),
      loesungswort: $("loesungswort"),
      uhr: $("uhr"),
    },
    zeigeGeschafft,
  );
  $("gitter-bereich").classList.remove("gross");
  // Erst messen, wenn die Seite sichtbar ist (requestAnimationFrame = beim nächsten Bild).
  requestAnimationFrame(() => spiel?.passeGroesseAn());
  // Und nochmal, sobald die Schrift fertig geladen ist (sie ist schmaler als die Ersatzschrift).
  document.fonts?.ready.then(() => spiel?.passeGroesseAn());
  speicher.setzeEinstellung("stufe", raetsel.schwierigkeit);
}

function zeigeStartseite() {
  if (spiel) {
    spiel.beende();
    spiel = null;
  }
  $("spielseite").hidden = true;
  $("startseite").hidden = false;
  zeichneStartseite();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Startseite
// ---------------------------------------------------------------------------

function zeichneStartseite() {
  const stufe = speicher.einstellung("stufe") || "leicht";

  // Reiter markieren
  for (const knopf of document.querySelectorAll(".stufe")) {
    knopf.setAttribute("aria-selected", String(knopf.dataset.stufe === stufe));
  }

  // Liste der Rätsel dieser Stufe
  const liste = $("raetsel-liste");
  liste.innerHTML = "";
  const raetsel = alleRaetsel.filter((r) => r.schwierigkeit === stufe);
  let geloest = 0;

  for (const r of raetsel) {
    const stand = speicher.holeStand(r.id);
    const kaestchen = document.createElement("a");
    kaestchen.className = "kaestchen";
    kaestchen.href = `#/spiel/${r.id}`;
    kaestchen.setAttribute("role", "listitem");

    let status = "";
    let beschreibung = `Rätsel ${r.nr}`;
    if (stand?.geloest) {
      geloest++;
      kaestchen.classList.add("geloest");
      status = formatiereZeit(stand.zeit);
      beschreibung += `, gelöst in ${status}`;
    } else if (stand?.aufgeloest) {
      kaestchen.classList.add("aufgeloest");
      status = "aufgelöst";
      beschreibung += ", aufgelöst";
    } else if (stand?.fortschritt > 0) {
      const prozent = Math.round(stand.fortschritt * 100);
      status = `${prozent} %`;
      beschreibung += `, ${prozent} Prozent ausgefüllt`;
      const fuellung = document.createElement("span");
      fuellung.className = "kaestchen-fuellung";
      fuellung.style.height = `${prozent}%`;
      kaestchen.append(fuellung);
    }
    kaestchen.setAttribute("aria-label", beschreibung);
    kaestchen.insertAdjacentHTML("beforeend",
      `<span class="kaestchen-nr">${r.nr}</span><span class="kaestchen-status">${status}</span>`);
    liste.append(kaestchen);
  }

  $("stufen-info").textContent = `${geloest} von ${raetsel.length} gelöst`;

  // "Weiterspielen" nur zeigen, wenn das letzte Rätsel noch nicht fertig ist.
  const letztesId = speicher.zuletztGespielt();
  const letzter = letztesId && speicher.holeStand(letztesId);
  const knopf = $("weiterspielen");
  if (letzter && !letzter.geloest && !letzter.aufgeloest && nachId.has(letztesId)) {
    const r = nachId.get(letztesId);
    $("weiterspielen-name").textContent = `${STUFEN_NAMEN[r.schwierigkeit]}, Rätsel ${r.nr}`;
    knopf.dataset.id = letztesId;
    knopf.hidden = false;
  } else {
    knopf.hidden = true;
  }

  $("auto-pruefen").checked = Boolean(speicher.einstellung("autoPruefen"));
  $("install-tipp").hidden = !istIphoneImBrowser();
}

/** Läuft die Seite auf iPhone/iPad in Safari, aber noch nicht als Home-Bildschirm-App? */
function istIphoneImBrowser() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);   // iPad gibt sich als Mac aus
  const alsApp = window.navigator.standalone === true
    || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !alsApp;
}

// ---------------------------------------------------------------------------
// Dialoge
// ---------------------------------------------------------------------------

/** Fragt nach Bestätigung. Gibt ein Promise zurück, das true oder false liefert. */
function frage(titel, text, jaText) {
  return new Promise((fertig) => {
    const dialog = $("frage-dialog");
    $("frage-titel").textContent = titel;
    $("frage-text").textContent = text;
    $("frage-ja").textContent = jaText;
    $("frage-ja").onclick = () => { dialog.close(); fertig(true); };
    $("frage-nein").onclick = () => { dialog.close(); fertig(false); };
    dialog.oncancel = () => fertig(false);             // Escape-Taste
    dialog.showModal();
  });
}

function zeigeGeschafft(fertigesSpiel) {
  const dialog = $("geschafft-dialog");
  const zeit = formatiereZeit(fertigesSpiel.zeit);
  if (fertigesSpiel.aufgeloest) {
    $("geschafft-titel").textContent = "Aufgelöst";
    $("geschafft-text").textContent = "Alle Buchstaben sind jetzt eingetragen. Das nächste schaffst du allein.";
  } else {
    const hilfen = fertigesSpiel.hilfen;
    $("geschafft-titel").textContent = "Gelöst!";
    $("geschafft-text").textContent = hilfen === 0
      ? `Zeit: ${zeit}, ganz ohne Hilfe.`
      : `Zeit: ${zeit}, mit ${hilfen} ${hilfen === 1 ? "Hilfe" : "Hilfen"}.`;
  }
  // Lösungswort groß zeigen
  const bereich = $("geschafft-loesung");
  bereich.innerHTML = "";
  const loesung = fertigesSpiel.raetsel.loesung;
  if (loesung) {
    for (const buchstabe of loesung.wort) {
      const f = document.createElement("span");
      f.className = "lw-feld";
      f.textContent = buchstabe;
      bereich.append(f);
    }
  }
  // Kurz warten, damit man den letzten Buchstaben noch sieht.
  setTimeout(() => dialog.showModal(), 350);
}

/** Das nächste noch nicht gelöste Rätsel derselben Stufe. */
function naechstesRaetsel(aktuell) {
  const gleicheStufe = alleRaetsel.filter((r) => r.schwierigkeit === aktuell.schwierigkeit);
  const start = gleicheStufe.indexOf(aktuell);
  for (let k = 1; k <= gleicheStufe.length; k++) {
    const r = gleicheStufe[(start + k) % gleicheStufe.length];
    const stand = speicher.holeStand(r.id);
    if (!stand?.geloest && !stand?.aufgeloest) return r;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Knöpfe verbinden
// ---------------------------------------------------------------------------

function verbindeKnoepfe() {
  // Startseite
  for (const knopf of document.querySelectorAll(".stufe")) {
    knopf.addEventListener("click", () => {
      speicher.setzeEinstellung("stufe", knopf.dataset.stufe);
      zeichneStartseite();
    });
  }
  $("weiterspielen").addEventListener("click", () => {
    location.hash = `#/spiel/${$("weiterspielen").dataset.id}`;
  });
  $("auto-pruefen").addEventListener("change", (e) => {
    speicher.setzeEinstellung("autoPruefen", e.target.checked);
  });
  $("zuruecksetzen").addEventListener("click", async () => {
    const ja = await frage("Alles löschen?",
      "Alle Spielstände und Zeiten werden gelöscht. Das lässt sich nicht rückgängig machen.",
      "Ja, alles löschen");
    if (ja) {
      speicher.allesLoeschen();
      zeichneStartseite();
    }
  });

  // Spielseite
  $("zurueck").addEventListener("click", () => { location.hash = "#/"; });
  $("vorheriges-wort").addEventListener("click", () => spiel?.springeZuWort(-1));
  $("naechstes-wort").addEventListener("click", () => spiel?.springeZuWort(1));
  $("zoom").addEventListener("click", () => {
    if (!spiel) return;
    $("zoom").setAttribute("aria-pressed", String(spiel.schalteZoom()));
  });

  // Klicks ins Gitter: ein Empfänger für alle Felder ("Event Delegation")
  $("gitter").addEventListener("click", (ereignis) => {
    if (!spiel) return;
    const hinweis = ereignis.target.closest(".hinweis");
    if (hinweis) {
      spiel.waehleWort(spiel.woerter[Number(hinweis.dataset.wort)]);
      return;
    }
    const zelle = ereignis.target.closest(".buchstabe");
    if (zelle) spiel.tippeAufFeld(Number(zelle.dataset.r), Number(zelle.dataset.c));
  });

  // PC-Tastatur
  document.addEventListener("keydown", (ereignis) => {
    if (!spiel || document.querySelector("dialog[open]")) return;
    spiel.tasteGedrueckt(ereignis);
  });

  // Hilfe-Dialog
  const hilfe = $("hilfe-dialog");
  $("hilfe-knopf").addEventListener("click", () => hilfe.showModal());
  hilfe.addEventListener("click", async (ereignis) => {
    if (ereignis.target === hilfe) { hilfe.close(); return; }   // Klick neben das Blatt
    const aktion = ereignis.target.closest("button")?.dataset.aktion;
    if (!aktion || !spiel) return;
    hilfe.close();
    if (aktion === "buchstabe") spiel.deckeBuchstabenAuf();
    if (aktion === "wort") spiel.deckeWortAuf();
    if (aktion === "pruefen") spiel.zeigeFehler();
    if (aktion === "aufloesen") {
      const ja = await frage("Rätsel auflösen?",
        "Alle Buchstaben werden eingetragen. Das Rätsel zählt dann nicht als gelöst.",
        "Ja, auflösen");
      if (ja) spiel.loeseAlles();
    }
    if (aktion === "neustart") {
      const ja = await frage("Neu starten?",
        "Alle Eingaben und die Zeit für dieses Rätsel werden gelöscht.",
        "Ja, neu starten");
      if (ja) spiel.neuStarten();
    }
  });

  // Geschafft-Dialog
  $("naechstes-raetsel").addEventListener("click", () => {
    $("geschafft-dialog").close();
    const naechstes = spiel && naechstesRaetsel(spiel.raetsel);
    location.hash = naechstes ? `#/spiel/${naechstes.id}` : "#/";
  });
  $("zur-uebersicht").addEventListener("click", () => {
    $("geschafft-dialog").close();
    location.hash = "#/";
  });

  // Fenstergröße ändert sich (Handy drehen, Fenster ziehen) -> Gitter neu anpassen
  let geplant = false;
  window.addEventListener("resize", () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => {
      geplant = false;
      spiel?.passeGroesseAn();
    });
  });

  // App wird verlassen oder in den Hintergrund geschickt -> sicherheitshalber speichern
  window.addEventListener("pagehide", () => spiel?.speichern());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) spiel?.speichern();
  });
}

// ---------------------------------------------------------------------------
// Service Worker: macht die App offline-fähig (siehe sw.js)
// ---------------------------------------------------------------------------

function registriereServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").catch((fehler) => {
    console.warn("Service Worker konnte nicht starten:", fehler);
  });
}

start();
