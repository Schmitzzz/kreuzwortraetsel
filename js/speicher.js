// ===========================================================================
// speicher.js – Fortschritt und Einstellungen im Browser speichern
//
// Wir nutzen localStorage: ein kleiner Schlüssel-Wert-Speicher im Browser.
// Er hält nur Text, deshalb wandeln wir unsere Daten mit JSON in Text um.
// Alles bleibt auf diesem Gerät, nichts geht ins Internet.
// ===========================================================================

const SCHLUESSEL = "schwedenraetsel-v1";   // unter diesem Namen liegt alles

// Wie die Daten aussehen, wenn noch nie gespielt wurde.
function leererStand() {
  return {
    fortschritt: {},                     // Rätsel-ID -> Spielstand
    einstellungen: { autoPruefen: false, stufe: "leicht" },
    zuletzt: null,                       // ID des zuletzt gespielten Rätsels
  };
}

// Beim Laden der Datei einmal alles einlesen.
let daten = laden();

function laden() {
  try {
    const text = localStorage.getItem(SCHLUESSEL);
    if (!text) return leererStand();
    const gelesen = JSON.parse(text);
    // Fehlende Teile (z. B. nach einem Update) mit Standardwerten auffüllen.
    const stand = leererStand();
    return {
      fortschritt: gelesen.fortschritt || stand.fortschritt,
      einstellungen: { ...stand.einstellungen, ...gelesen.einstellungen },
      zuletzt: gelesen.zuletzt || null,
    };
  } catch (fehler) {
    // Privater Modus oder kaputte Daten: Spiel läuft trotzdem, nur ohne Speichern.
    console.warn("Spielstand konnte nicht geladen werden:", fehler);
    return leererStand();
  }
}

function schreiben() {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
  } catch (fehler) {
    console.warn("Spielstand konnte nicht gespeichert werden:", fehler);
  }
}

// --- Spielstände ----------------------------------------------------------

/** Spielstand eines Rätsels oder null, wenn es noch nie geöffnet wurde. */
export function holeStand(id) {
  return daten.fortschritt[id] || null;
}

/** Spielstand speichern. `stand` ist ein Objekt (siehe spiel.js -> speichern). */
export function speichereStand(id, stand) {
  daten.fortschritt[id] = stand;
  daten.zuletzt = id;
  schreiben();
}

/** Spielstand eines Rätsels löschen (Rätsel neu starten). */
export function loescheStand(id) {
  delete daten.fortschritt[id];
  schreiben();
}

/** ID des zuletzt gespielten Rätsels. */
export function zuletztGespielt() {
  return daten.zuletzt;
}

// --- Einstellungen --------------------------------------------------------

export function einstellung(name) {
  return daten.einstellungen[name];
}

export function setzeEinstellung(name, wert) {
  daten.einstellungen[name] = wert;
  schreiben();
}

// --- Alles zurücksetzen ---------------------------------------------------

export function allesLoeschen() {
  const behalten = daten.einstellungen;     // Einstellungen bleiben erhalten
  daten = leererStand();
  daten.einstellungen = behalten;
  schreiben();
}
