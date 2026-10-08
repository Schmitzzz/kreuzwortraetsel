// ===========================================================================
// tastatur.js – die Bildschirmtastatur fürs Handy
//
// Warum eine eigene Tastatur? Die iPhone-Tastatur würde das halbe Gitter
// verdecken, ständig auf- und zuklappen und Autokorrektur machen.
// Unsere ist immer da, kennt nur Buchstaben und ist auf Deutsch (QWERTZ).
// ===========================================================================

// Jede innere Liste ist eine Tastenreihe.
// "RICHTUNG" und "LOESCHEN" sind Sondertasten.
const REIHEN = [
  ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
  ["RICHTUNG", "Y", "X", "C", "V", "B", "N", "M", "LOESCHEN"],
];

// Kleine Bilder (SVG) für die Sondertasten
const SYMBOLE = {
  RICHTUNG: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M4 17l3 3 3-3M13 7h7M17 4l3 3-3 3"/></svg>',
  LOESCHEN: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z"/><path d="M12 9l5 6M17 9l-5 6"/></svg>',
};

const BESCHRIFTUNG = {
  RICHTUNG: "Richtung wechseln",
  LOESCHEN: "Buchstaben löschen",
};

/**
 * Baut die Tastatur in `container` und ruft bei jedem Tastendruck
 * `beiTaste(wert)` auf – zum Beispiel beiTaste("A") oder beiTaste("LOESCHEN").
 */
export function baueTastatur(container, beiTaste) {
  container.innerHTML = "";                      // vorherigen Inhalt entfernen

  for (const reihe of REIHEN) {
    const reiheElement = document.createElement("div");
    reiheElement.className = "tasten-reihe";

    for (const wert of reihe) {
      const taste = document.createElement("button");
      taste.type = "button";
      taste.className = "taste";
      taste.dataset.wert = wert;                 // wird zu data-wert="A" im HTML

      if (SYMBOLE[wert]) {
        taste.innerHTML = SYMBOLE[wert];
        taste.classList.add("breit");
        taste.setAttribute("aria-label", BESCHRIFTUNG[wert]);
      } else {
        taste.textContent = wert;
      }
      reiheElement.append(taste);
    }
    container.append(reiheElement);
  }

  // Ein einziger Klick-Empfänger für alle Tasten ("Event Delegation").
  // pointerdown statt click: reagiert sofort beim Berühren, nicht erst beim Loslassen.
  container.addEventListener("pointerdown", (ereignis) => {
    const taste = ereignis.target.closest(".taste");
    if (!taste) return;
    ereignis.preventDefault();                   // kein Fokus-Wechsel, kein Text markieren
    beiTaste(taste.dataset.wert);
  });
}
