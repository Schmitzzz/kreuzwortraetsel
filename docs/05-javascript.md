# 05 – JavaScript: die Logik

Vier Dateien im Ordner `js/`:

| Datei | Aufgabe | Zeilen |
|---|---|---|
| `speicher.js` | Spielstand im Browser speichern | ~90 |
| `tastatur.js` | Bildschirmtastatur bauen | ~65 |
| `spiel.js` | Ein Rätsel spielen (Klasse `Spiel`) | ~660 |
| `app.js` | Startpunkt, Seitenwechsel, Startseite, Dialoge | ~370 |

Wir gehen sie von klein nach groß durch. Vorher ein Kurzkurs für alle, die Python können.

---

## 0. JavaScript für Python-Leute

Vom Arduino kennst du die C-artige Schreibweise (`{ }`, `;`, `for (...)`). Browser-JavaScript ist näher an Python, als es aussieht.

| Python | JavaScript | Anmerkung |
|---|---|---|
| `x = 5` | `let x = 5;` | `let` = Variable, die sich ändern darf |
| (Konstante per Konvention) | `const x = 5;` | `const` = darf nicht neu zugewiesen werden. Standardwahl! |
| `def f(a, b=2):` | `function f(a, b = 2) { }` | |
| `lambda w: w * 2` | `(w) => w * 2` | **Pfeilfunktion** |
| `None` | `null` (und `undefined`) | `undefined` = "nie gesetzt" |
| `True` / `False` | `true` / `false` | |
| `and` / `or` / `not` | `&&` / `\|\|` / `!` | |
| `==` | `===` | Immer `===` benutzen! `==` wandelt Typen um (`"1" == 1` ist `true`) |
| `f"Hallo {name}"` | `` `Hallo ${name}` `` | **Template String** mit Backticks |
| `[1, 2, 3]` | `[1, 2, 3]` | Array statt Liste |
| `len(liste)` | `liste.length` | |
| `liste.append(x)` | `liste.push(x)` | |
| `{"a": 1}` (dict) | `{ a: 1 }` (Objekt) | Schlüssel ohne Anführungszeichen, Zugriff `obj.a` |
| `dict` mit beliebigen Schlüsseln | `new Map()` | `.get()`, `.set()`, `.has()` |
| `set()` | `new Set()` | `.add()`, `.has()`, `.delete()` |
| `for x in liste:` | `for (const x of liste) { }` | **of**, nicht in! |
| `for i in range(10):` | `for (let i = 0; i < 10; i++) { }` | |
| `[x*2 for x in l]` | `l.map((x) => x * 2)` | |
| `[x for x in l if x > 0]` | `l.filter((x) => x > 0)` | |
| `any(...)` / `all(...)` | `l.some(...)` / `l.every(...)` | |
| `a, b = b, a` | `[a, b] = [b, a]` | **Destructuring** |
| `class Spiel:` + `self` | `class Spiel { }` + `this` | `__init__` heißt `constructor` |
| `import x` | `import { f } from "./x.js";` | |
| `raise` / `try/except` | `throw` / `try/catch` | |

Drei Dinge gibt es so in Python nicht:

**Optional Chaining `?.`** – `spiel?.beende()` ruft `beende()` nur auf, wenn `spiel` nicht `null`/`undefined` ist. Sonst passiert einfach nichts. Erspart viele `if (spiel !== null)`.

**`async`/`await`** – Manche Dinge dauern (eine Datei laden). JavaScript wartet nicht darauf, sondern macht weiter und meldet sich später. Mit `await` schreibt man trotzdem Code, der sich liest wie "erst laden, dann weiter". Mehr dazu bei `app.js`.

**Das DOM** – Der Browser macht aus dem HTML einen Baum von Objekten, das **Document Object Model**. JavaScript kann diesen Baum lesen und verändern, und der Bildschirm aktualisiert sich sofort. Die wichtigsten Befehle:

```js
const el = document.getElementById("uhr");      // Element per id finden
document.querySelector(".logo");                 // erstes Element zu einem CSS-Selektor
document.querySelectorAll(".stufe");             // alle passenden Elemente
const neu = document.createElement("div");       // neues Element erzeugen
neu.className = "zelle buchstabe";               // Klassen setzen
neu.classList.add("aktiv");                      // eine Klasse hinzufügen
neu.classList.toggle("aktiv", bedingung);        // an, wenn bedingung wahr, sonst aus
neu.textContent = "A";                           // Text setzen (sicher, kein HTML)
neu.innerHTML = "<span>A</span>";                // HTML setzen (nur mit eigenem, festem Text!)
neu.dataset.r = 3;                               // wird zu data-r="3"
eltern.append(neu);                              // anhängen = sichtbar machen
el.hidden = true;                                // ausblenden
el.addEventListener("click", (e) => { ... });    // auf Klick reagieren
```

`textContent` vs. `innerHTML`: `innerHTML` interpretiert den Text als HTML. Kommt der Text von außen (Nutzereingabe), könnte jemand so Schadcode einschleusen. Deshalb benutzen wir für Hinweistexte immer `textContent` und `innerHTML` nur für feste SVG-Bilder aus unserem eigenen Code.

---

## 1. `speicher.js` – Spielstand speichern

Der Browser hat einen eingebauten Speicher pro Webseite: **localStorage**. Er speichert Text unter einem Namen und bleibt erhalten, wenn man den Browser schließt. Er ist an die Adresse gebunden. `localhost:8000` und deine GitHub-Pages-Adresse haben also getrennte Speicher, und andere Webseiten kommen nicht dran.

```js
const SCHLUESSEL = "schwedenraetsel-v1";
```

Unter diesem Namen liegt alles. Das `-v1` ist eine Versionsnummer: Ändert sich das Format eines Tages grundlegend, nimmt man `-v2` und die alten Daten stören nicht.

```js
function leererStand() {
  return {
    fortschritt: {},
    einstellungen: { autoPruefen: false, stufe: "leicht" },
    zuletzt: null,
  };
}
```

Wie die Daten aussehen, wenn noch nie gespielt wurde. Eine **Funktion**, die jedes Mal ein **neues** Objekt baut, statt einer Konstante. Sonst würden sich alle Benutzer dasselbe Objekt teilen und Änderungen würden durchschlagen (dieselbe Falle wie `[[None] * b] * h` in Python).

Das Komma nach dem letzten Eintrag (`zuletzt: null,`) ist erlaubt und üblich. Fügt man später eine Zeile an, ändert sich nur eine Zeile im Git-Vergleich.

```js
let daten = laden();
```

Läuft einmal, wenn die Datei zum ersten Mal importiert wird. Ab dann liegen die Daten im Arbeitsspeicher, und jedes Lesen ist sofort da.

```js
function laden() {
  try {
    const text = localStorage.getItem(SCHLUESSEL);
    if (!text) return leererStand();
    const gelesen = JSON.parse(text);
    const stand = leererStand();
    return {
      fortschritt: gelesen.fortschritt || stand.fortschritt,
      einstellungen: { ...stand.einstellungen, ...gelesen.einstellungen },
      zuletzt: gelesen.zuletzt || null,
    };
  } catch (fehler) {
    console.warn("Spielstand konnte nicht geladen werden:", fehler);
    return leererStand();
  }
}
```

- `getItem` liefert den gespeicherten Text oder `null`.
- `JSON.parse` macht aus Text wieder ein Objekt (wie `json.loads` in Python).
- `{ ...a, ...b }` ist der **Spread-Operator**: Alle Einträge aus `a` kopieren, dann alle aus `b` darüber. In Python: `{**a, **b}`. So bekommen alte Spielstände automatisch neue Einstellungen mit Standardwert, falls später eine dazukommt.
- `try/catch`: Im privaten Modus mancher Browser wirft `localStorage` einen Fehler. Oder jemand hat kaputte Daten. Dann läuft das Spiel trotzdem, nur ohne gespeicherten Stand. Lieber ein Spiel ohne Speichern als eine weiße Seite.

```js
function schreiben() {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
  } catch (fehler) { ... }
}
```

`JSON.stringify` ist das Gegenstück zu `JSON.parse` (wie `json.dumps`).

```js
export function holeStand(id) {
  return daten.fortschritt[id] || null;
}
export function speichereStand(id, stand) {
  daten.fortschritt[id] = stand;
  daten.zuletzt = id;
  schreiben();
}
```

`export` macht eine Funktion für andere Dateien verfügbar. Alles ohne `export` (wie `laden`, `schreiben`, `daten`) bleibt **privat** in dieser Datei. So kann niemand von außen versehentlich `daten` kaputtmachen. Die anderen Dateien benutzen nur die Funktionen. Das nennt man **Kapselung**.

Die übrigen Funktionen (`loescheStand`, `zuletztGespielt`, `einstellung`, `setzeEinstellung`, `allesLoeschen`) sind nach demselben Muster gebaut. `delete objekt[schluessel]` entfernt einen Eintrag (wie `del dict[key]`).

> **Ausprobieren:** Im Browser F12 drücken → Reiter "Application" (Chrome) → "Local Storage". Dort siehst du den Eintrag `schwedenraetsel-v1` und kannst ihn ansehen oder löschen.

---

## 2. `tastatur.js` – die Bildschirmtastatur

```js
const REIHEN = [
  ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
  ["RICHTUNG", "Y", "X", "C", "V", "B", "N", "M", "LOESCHEN"],
];
```

Die Tastatur als Daten: ein Array aus drei Reihen. Willst du eine andere Anordnung, änderst du nur diese Liste. Daten von Code trennen ist fast immer eine gute Idee.

```js
const SYMBOLE = {
  RICHTUNG: '<svg viewBox="0 0 24 24" aria-hidden="true">...</svg>',
  LOESCHEN: '<svg ...>...</svg>',
};
const BESCHRIFTUNG = {
  RICHTUNG: "Richtung wechseln",
  LOESCHEN: "Buchstaben löschen",
};
```

Bilder und Vorlese-Text für die zwei Sondertasten.

```js
export function baueTastatur(container, beiTaste) {
  container.innerHTML = "";
  for (const reihe of REIHEN) {
    const reiheElement = document.createElement("div");
    reiheElement.className = "tasten-reihe";
    for (const wert of reihe) {
      const taste = document.createElement("button");
      taste.type = "button";
      taste.className = "taste";
      taste.dataset.wert = wert;
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
```

- `beiTaste` ist eine **Funktion als Parameter** (ein "Callback"). Die Tastatur weiß nicht, was mit einem Tastendruck passieren soll. Sie ruft einfach `beiTaste("A")` auf, und wer die Tastatur gebaut hat, entscheidet. In `app.js` steht `baueTastatur($("tastatur"), (wert) => spiel?.eingabe(wert))`. So bleibt die Tastatur unabhängig vom Spiel. Man könnte sie für ein anderes Spiel wiederverwenden.
- `SYMBOLE[wert]` ist `undefined` für normale Buchstaben, also "falsch". Nur bei Sondertasten gibt es ein Symbol.

```js
  container.addEventListener("pointerdown", (ereignis) => {
    const taste = ereignis.target.closest(".taste");
    if (!taste) return;
    ereignis.preventDefault();
    beiTaste(taste.dataset.wert);
  });
}
```

Das ist **Event Delegation**, ein wichtiges Muster:

- Statt 31 einzelne Klick-Empfänger (einen pro Taste) gibt es **einen** am Container.
- Klicks "blubbern" im DOM nach oben: Ein Klick auf eine Taste ist auch ein Klick auf ihre Reihe und den Container. Deshalb hört der Container alles.
- `ereignis.target` ist das Element, das tatsächlich getroffen wurde. Bei Sondertasten kann das das SVG-Bild in der Taste sein. `.closest(".taste")` läuft von dort nach oben, bis es ein Element mit der Klasse `taste` findet (oder `null`, wenn man zwischen die Tasten getippt hat).
- `pointerdown` statt `click`: `click` feuert erst beim **Loslassen**. `pointerdown` feuert beim **Berühren**, das fühlt sich beim schnellen Tippen spürbar direkter an, wie eine echte Tastatur.
- `preventDefault()` verhindert das Standardverhalten: Der Knopf soll nicht den Fokus bekommen und nichts markieren.

---

## 3. `spiel.js` – ein Rätsel spielen

Die größte Datei. Sie enthält die Klasse `Spiel` und ein paar Hilfen davor.

### 3.1 Konstanten und Helfer

```js
import { holeStand, speichereStand, loescheStand, einstellung } from "./speicher.js";
```

Holt vier Funktionen aus `speicher.js`. Der Pfad beginnt mit `./` (gleicher Ordner) und braucht im Browser die Endung `.js`.

```js
const UMLAUTE = { "Ä": "AE", "Ö": "OE", "Ü": "UE", "ß": "SS" };
```

Tippst du Ä, kommen zwei Buchstaben ins Gitter.

```js
const PFEIL_BILDER = {
  rechts: '<svg viewBox="0 0 10 10"><path d="M0 2.6 4.2 5 0 7.4z" fill="currentColor"/></svg>',
  ...
};
```

Die Pfeile als kleine SVG-Bilder auf 10 × 10 Einheiten. `M0 2.6 4.2 5 0 7.4z` heißt: gehe zu (0 | 2,6), Linie zu (4,2 | 5), Linie zu (0 | 7,4), `z` = Form schließen. Ein Dreieck, das nach rechts zeigt. Die Schlüssel heißen genau wie die Pfeil-Typen im JSON, so findet `PFEIL_BILDER[wort.pfeil]` direkt das richtige Bild.

```js
function schluessel(r, c) {
  return `${r},${c}`;
}
```

In Python kann ein Tupel `(3, 5)` Schlüssel eines Dicts sein. In JavaScript vergleichen `Map` und `Set` Arrays nach **Identität**, nicht nach Inhalt: `[3, 5]` und ein anderes `[3, 5]` sind zwei verschiedene Schlüssel. Deshalb machen wir aus Zeile und Spalte einen Text `"3,5"`. Texte werden nach Inhalt verglichen.

```js
export function formatiereZeit(sekunden) {
  const h = Math.floor(sekunden / 3600);
  const m = Math.floor((sekunden % 3600) / 60);
  const s = String(sekunden % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
```

- `Math.floor` rundet ab (wie `//` in Python).
- `%` ist der Rest (wie in Python).
- `padStart(2, "0")` füllt vorne mit Nullen auf: `"7"` → `"07"`.
- `bedingung ? a : b` ist JavaScripts bedingter Ausdruck (in Python `a if bedingung else b`).

### 3.2 Der Konstruktor

```js
export class Spiel {
  constructor(raetsel, elemente, beiEnde) {
    this.raetsel = raetsel;
    this.el = elemente;
    this.beiEnde = beiEnde;
    this.B = raetsel.breite;
    this.H = raetsel.hoehe;
    this.zoom = false;
```

- `raetsel`: ein Rätsel-Objekt aus `puzzles.json`.
- `elemente`: die HTML-Elemente, in die gezeichnet wird. Die Klasse sucht sich die nicht selbst zusammen, sondern bekommt sie übergeben. So weiß `spiel.js` nichts über IDs im HTML, und das HTML kann sich ändern, ohne dass man `spiel.js` anfassen muss.
- `beiEnde`: Callback, wenn das Rätsel fertig ist (zeigt den Gelöst-Dialog).

```js
    this.loesung = raetsel.gitter.map((zeile) => zeile.split(""));
```

Aus `["#TIEF#DI", ...]` wird `[["#","T","I","E","F","#","D","I"], ...]`. `.split("")` teilt einen Text in einzelne Zeichen, `.map` macht das für jede Zeile.

```js
    this.woerter = raetsel.hinweise.map((h, index) => {
      const felder = [];
      for (let i = 0; i < h.laenge; i++) {
        felder.push(h.richtung === "waagerecht" ? [h.sr, h.sc + i] : [h.sr + i, h.sc]);
      }
      return { ...h, index, felder };
    });
```

Für jeden Hinweis berechnen wir die Liste seiner Felder. `{ ...h, index, felder }` kopiert alle Eigenschaften des Hinweises und fügt zwei neue hinzu. `index` ohne Doppelpunkt ist eine Kurzschreibweise für `index: index`.

```js
    this.zuWort = new Map();
    for (const wort of this.woerter) {
      for (const [r, c] of wort.felder) {
        const k = schluessel(r, c);
        if (!this.zuWort.has(k)) this.zuWort.set(k, {});
        this.zuWort.get(k)[wort.richtung] = wort;
      }
    }
```

Ein **Rückwärts-Verzeichnis**: Zu jedem Feld merken wir uns, welches waagerechte und welches senkrechte Wort hindurchläuft. Etwa `"2,3" → { waagerecht: <ALLEE>, senkrecht: <EHE> }`. Das brauchen wir ständig ("welches Wort ist aktiv, wenn ich auf dieses Feld tippe?"), und so ist es ein schneller Nachschlag statt jedes Mal alle Wörter durchzusuchen. `for (const [r, c] of ...)` entpackt jedes `[r, c]`-Paar direkt.

```js
    this.loesungsNr = new Map();
    (raetsel.loesung?.felder || []).forEach(([r, c], i) => {
      this.loesungsNr.set(schluessel(r, c), i + 1);
    });
```

Welches Feld trägt welche Nummer fürs Lösungswort. `raetsel.loesung?.felder || []`: Gibt es keine Lösung, nimm eine leere Liste, dann läuft `forEach` einfach null Mal.

```js
    this.ladeStand();
    this.zeichne();
    this.waehleWort(this.ersteOffenesWort() || this.woerter[0]);
    this.starteUhr();
  }
```

Gespeicherten Stand laden, Gitter zeichnen, erstes Wort mit Lücken auswählen, Uhr starten.

### 3.3 Laden und Speichern

```js
  ladeStand() {
    const stand = holeStand(this.raetsel.id);
    this.eingaben = this.loesung.map((zeile) => zeile.map(() => ""));
```

`eingaben` hat dieselbe Form wie `loesung`, aber am Anfang überall `""`. Hier landet, was du tippst.

```js
    if (stand?.eingaben) {
      for (let r = 0; r < this.H; r++) {
        for (let c = 0; c < this.B; c++) {
          const zeichen = stand.eingaben[r * this.B + c];
          if (zeichen && /[A-Z]/.test(zeichen)) this.eingaben[r][c] = zeichen;
        }
      }
    }
```

Gespeichert sind die Eingaben als **ein langer Text** (Zeile für Zeile hintereinander). Feld `(r, c)` steht an Position `r * Breite + c`. Das ist die Standardformel, um ein 2D-Gitter in einer 1D-Liste abzulegen. `/[A-Z]/` ist ein **regulärer Ausdruck** ("ein Zeichen von A bis Z"), `.test` prüft, ob er passt. So werden `.` (leer) und `#` übersprungen.

```js
    this.aufgedeckt = new Set(stand?.aufgedeckt || []);
    this.falsch = new Set();
    this.zeit = stand?.zeit || 0;
    this.hilfen = stand?.hilfen || 0;
    this.geloest = stand?.geloest || false;
    this.aufgeloest = stand?.aufgeloest || false;
  }
```

Der Rest des Spielstands, jeweils mit Standardwert, falls es noch keinen Stand gibt.

`speichern()` macht das Umgekehrte: Es baut den langen Text, zählt nebenbei, wie viele Felder gefüllt sind (für die gelbe Füllung auf der Startseite), und übergibt alles an `speichereStand`. `[...this.aufgedeckt]` macht aus einem Set eine Liste, weil JSON keine Sets kennt.

### 3.4 Zeichnen

```js
  zeichne() {
    const gitter = this.el.gitter;
    gitter.innerHTML = "";
    gitter.style.setProperty("--breite", this.B);
```

Altes Gitter leeren und die CSS-Variable `--breite` setzen. Das CSS macht daraus die Spaltenanzahl.

```js
    const hinweiseProFeld = new Map();
    for (const wort of this.woerter) {
      const k = schluessel(wort.r, wort.c);
      if (!hinweiseProFeld.has(k)) hinweiseProFeld.set(k, []);
      hinweiseProFeld.get(k).push(wort);
    }
```

Welche Hinweise gehören in welches Hinweisfeld? Weil der Generator die Hinweise schon sortiert hat (erst `rechts`, dann `unten`), stehen sie in der richtigen Reihenfolge.

```js
    this.zellen = [];
    this.hinweisKnoepfe = [];
    const fragment = document.createDocumentFragment();
```

Ein **DocumentFragment** ist ein unsichtbarer Behälter. Wir bauen alle ~100 Felder dort hinein und fügen sie am Ende **auf einmal** ins Gitter ein. Würden wir jedes Feld einzeln einfügen, müsste der Browser bis zu 100-mal das Layout neu berechnen.

```js
    for (let r = 0; r < this.H; r++) {
      this.zellen.push([]);
      for (let c = 0; c < this.B; c++) {
        const zelle = document.createElement("div");
        zelle.dataset.r = r;
        zelle.dataset.c = c;
```

Jedes Feld merkt sich seine Position in `data-r` und `data-c`. Beim Antippen liest `app.js` sie wieder aus.

```js
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
```

Ein Hinweisfeld bekommt pro Hinweis einen Knopf. Jeder Knopf kennt in `data-wort` die Nummer seines Worts. In `zellen` steht für Hinweisfelder `null`, weil dort nie ein Buchstabe hinkommt.

```js
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
```

Ein Buchstabenfeld enthält einen leeren `span` für den getippten Buchstaben (immer das **erste** Kind, darauf verlässt sich `aktualisiere()` später mit `zelle.firstChild`), und bei Lösungsfeldern die kleine Nummer.

```js
    for (const wort of this.woerter) {
      const pfeil = document.createElement("span");
      pfeil.className = `pfeil pfeil-${wort.pfeil}`;
      pfeil.innerHTML = PFEIL_BILDER[wort.pfeil];
      this.zellen[wort.sr][wort.sc].append(pfeil);
    }
    gitter.append(fragment);
    this.zeichneLoesungswort();
  }
```

In jedes erste Feld eines Worts kommt ein Pfeil. Dann alles auf einmal ins Gitter. `zeichneLoesungswort()` baut die Kästchen unter dem Gitter nach demselben Muster.

### 3.5 Passende Größe

```js
  passeGroesseAn() {
    const bereich = this.el.gitterBereich;
    const stil = getComputedStyle(bereich);
    const breite = bereich.clientWidth - parseFloat(stil.paddingLeft) - parseFloat(stil.paddingRight);
    const hoehe = bereich.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom);
```

- `clientWidth`/`clientHeight`: innere Größe eines Elements in Pixeln (inklusive Innenabstand).
- `getComputedStyle` liefert die tatsächlich wirksamen CSS-Werte, als Text wie `"16px"`. `parseFloat("16px")` liest die Zahl vorne heraus: `16`.

```js
    const passtBreite = Math.floor((breite - this.B - 3) / this.B);
    const passtHoehe = Math.floor((hoehe - this.H - 3) / this.H);
    let zelle = Math.min(passtBreite, Math.max(passtHoehe, 36));
    zelle = Math.max(32, Math.min(zelle, 64));
    if (this.zoom) zelle = Math.max(Math.round(zelle * 1.6), 58);
    this.el.gitter.style.setProperty("--zelle", `${zelle}px`);
    this.passeHinweistexteAn(zelle);
    this.zeigeAktivesFeld();
  }
```

Die Rechnung: Pro Feld kommt 1 Pixel Linie dazu, plus ein paar Pixel Rahmen. Wie groß darf ein Feld sein, damit alles in die Breite passt? Und in die Höhe?

Die Abwägung steckt in der dritten Zeile: Am liebsten so breit wie möglich (große Felder sind leichter zu treffen und zu lesen). Reicht die Höhe nicht, nehmen wir lieber etwas Scrollen in Kauf als winzige Felder. Mindestens 36px. Danach wird auf 32 bis 64px begrenzt. Im Zoom-Modus 1,6-mal so groß.

Die Größe kommt als CSS-Variable ins Gitter. CSS rechnet daraus Spaltenbreite, Buchstabengröße und Pfeilgröße.

### 3.6 Hinweistexte einpassen (binäre Suche)

```js
  passeHinweistexteAn(zelle) {
    const groesste = Math.max(8, zelle * 0.26);
    const kleinste = zelle >= 50 ? 8 : 6;
    for (const knopf of this.hinweisKnoepfe) {
      if (!knopf) continue;
      const text = knopf.firstChild;
      knopf.classList.remove("umbruch");
      const passt = (groesse) => {
        knopf.style.fontSize = `${groesse}px`;
        return text.offsetHeight <= knopf.clientHeight - 1 && text.scrollWidth <= text.clientWidth;
      };
```

Für jeden Hinweis suchen wir die **größte** Schrift, bei der der Text noch ins Feld passt. "Passt" heißt: Die Höhe des Texts (`offsetHeight`) ist nicht größer als der Knopf, und kein Wort ragt seitlich heraus (`scrollWidth` wäre dann größer als `clientWidth`).

`passt` ist eine **Funktion in der Funktion**. Sie "sieht" `knopf` und `text` aus der Umgebung, obwohl die nicht übergeben werden. Das nennt man **Closure**.

```js
      if (!passt(kleinste)) {
        knopf.classList.add("umbruch");
        passt(kleinste);
        continue;
      }
      let unten = kleinste;
      let oben = groesste;
      for (let schritt = 0; schritt < 6; schritt++) {
        const mitte = (unten + oben) / 2;
        if (passt(mitte)) unten = mitte;
        else oben = mitte;
      }
      knopf.style.fontSize = `${unten}px`;
    }
  }
```

Passt es nicht mal in kleinster Schrift: Umbruch mitten im Wort erlauben (CSS-Klasse `umbruch`) und fertig.

Sonst **binäre Suche**, wie beim Zahlenraten ("ist es größer oder kleiner als 50?"):

- `unten` passt sicher, `oben` vielleicht nicht.
- Probiere die Mitte. Passt sie, ist sie das neue `unten`, sonst das neue `oben`.
- Nach jedem Schritt ist der Bereich halb so groß. Nach 6 Schritten ist er auf 1/64 geschrumpft, bei Größen zwischen 6 und 12px also auf etwa 0,1px genau.

Ausprobieren in 0,5er-Schritten von oben bräuchte bis zu 12 Versuche, binär sind es immer 6. Bei 50 Hinweisen spart das hunderte Layout-Berechnungen.

### 3.7 Auswahl

Die Auswahl ist ein kleines Objekt: `this.auswahl = { r, c, richtung }`. Daraus folgt alles andere.

```js
  aktivesWort() {
    const { r, c, richtung } = this.auswahl;
    const woerter = this.zuWort.get(schluessel(r, c));
    return woerter[richtung] || woerter.waagerecht || woerter.senkrecht;
  }
```

`const { r, c, richtung } = this.auswahl` ist **Objekt-Destructuring**: drei Variablen aus drei Eigenschaften. Läuft durch das Feld kein Wort in der gewünschten Richtung, nimm das andere.

```js
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
```

Das Verhalten, das man von Kreuzworträtsel-Apps kennt: Tippst du ein anderes Feld an, bleibt die Richtung möglichst erhalten. Tippst du nochmal auf dasselbe Feld, wechselt die Richtung.

```js
  waehleWort(wort) {
    if (!wort) return;
    const leer = wort.felder.find(([r, c]) => !this.eingaben[r][c]);
    const [r, c] = leer || wort.felder[0];
    this.auswahl = { r, c, richtung: wort.richtung };
    this.aktualisiere();
  }
```

Beim Antippen eines Hinweises springt der Cursor ins **erste leere** Feld des Worts, ist es voll, ins erste. `find` liefert das erste Element, für das die Funktion `true` ergibt, sonst `undefined`.

```js
  springeZuWort(schritt, nurOffene = false) {
    const anzahl = this.woerter.length;
    const start = this.aktivesWort().index;
    for (let k = 1; k <= anzahl; k++) {
      const index = (((start + schritt * k) % anzahl) + anzahl) % anzahl;
      const wort = this.woerter[index];
      if (!nurOffene || this.hatLuecken(wort)) {
        this.waehleWort(wort);
        return;
      }
    }
  }
```

Für die Pfeil-Knöpfe in der Hinweisleiste und die Tab-Taste. Die Formel `((x % n) + n) % n` ist ein Trick: In JavaScript ist `-1 % 10` gleich `-1` (in Python wäre es `9`). Mit `+ n` und nochmal `% n` landet man immer im Bereich 0 bis n−1. So springt "vorheriges Wort" vom ersten zum letzten.

`bewege(dr, dc)` lässt die Pfeiltasten über das Gitter laufen und überspringt dabei Hinweisfelder.

### 3.8 Eingabe

```js
  eingabe(wert) {
    if (this.geloest || this.aufgeloest) return;
    if (wert === "LOESCHEN") return this.loesche();
    if (wert === "RICHTUNG") return this.wechsleRichtung();
    const buchstaben = UMLAUTE[wert] || wert;
    for (const b of buchstaben) this.setzeBuchstabe(b);
    this.nachAenderung();
  }
```

Der eine Eingang für alles, was getippt wird, von Bildschirm- und PC-Tastatur. `for (const b of "AE")` läuft über die einzelnen Zeichen eines Texts.

```js
  setzeBuchstabe(buchstabe) {
    const wort = this.aktivesWort();
    const { r, c } = this.auswahl;
    const k = schluessel(r, c);
    const warLeer = !this.eingaben[r][c];
    if (!this.aufgedeckt.has(k)) {
      this.eingaben[r][c] = buchstabe;
      this.falsch.delete(k);
    }
```

Buchstabe eintragen, außer das Feld wurde per Hilfe aufgedeckt (die sind fest). Eine rote Markierung verschwindet, sobald man das Feld ändert.

```js
    const i = wort.felder.findIndex(([fr, fc]) => fr === r && fc === c);
    const istLeer = ([fr, fc]) => !this.eingaben[fr][fc];
    const danach = wort.felder.slice(i + 1).find(istLeer);
    const irgendwo = wort.felder.find(istLeer);

    if (danach) {
      [this.auswahl.r, this.auswahl.c] = danach;
    } else if (irgendwo) {
      [this.auswahl.r, this.auswahl.c] = irgendwo;
    } else if (warLeer) {
      if (this.ersteOffenesWort()) this.springeZuWort(1, true);
    } else if (i + 1 < wort.felder.length) {
      [this.auswahl.r, this.auswahl.c] = wort.felder[i + 1];
    }
  }
```

Die Frage "wohin danach?" klingt simpel, macht aber den Unterschied, ob sich Tippen gut anfühlt:

1. Gibt es **hinter** diesem Feld im Wort noch ein leeres → dahin (bereits ausgefüllte Felder werden übersprungen).
2. Sonst irgendein leeres Feld **im Wort** (falls man vorne eins ausgelassen hat).
3. Ist das Wort jetzt voll **und** das Feld war vorher leer, haben wir das Wort gerade fertiggemacht → weiter zum nächsten Wort mit Lücken.
4. War das Wort schon voll (man überschreibt gerade etwas) → einfach ein Feld weiter. Würde man in diesem Fall springen, könnte man ein volles Wort nie korrigieren, ohne nach jedem Buchstaben wegzuspringen.

`[this.auswahl.r, this.auswahl.c] = danach` ist Destructuring in bestehende Variablen. `slice(i + 1)` ist wie `liste[i+1:]` in Python.

`loesche()` arbeitet nach dem Prinzip jeder Tastatur: Steht im Feld etwas, wird es gelöscht. Ist es leer, geht es ein Feld zurück und löscht dort.

```js
  tasteGedrueckt(ereignis) {
    if (ereignis.metaKey || ereignis.ctrlKey || ereignis.altKey) return false;
    const taste = ereignis.key;
    if (/^[a-zA-ZäöüÄÖÜß]$/.test(taste)) {
      this.eingabe(taste.toUpperCase());
    } else if (taste === "Backspace" || taste === "Delete") {
    ...
    } else {
      return false;
    }
    ereignis.preventDefault();
    return true;
  }
```

Für die PC-Tastatur. Mit Strg/Alt/Cmd gedrückte Tasten lassen wir in Ruhe (Strg+R zum Neuladen soll weiter gehen). `ereignis.key` ist der Name der Taste, z. B. `"a"`, `"Backspace"`, `"ArrowLeft"`, `" "` (Leertaste). Der reguläre Ausdruck `^[...]$` heißt: genau **ein** Zeichen aus dieser Liste (`^` = Anfang, `$` = Ende). Ein netter Nebeneffekt: `"ß".toUpperCase()` ergibt in JavaScript `"SS"`, genau was wir brauchen. `preventDefault()` verhindert z. B., dass die Leertaste die Seite scrollt.

### 3.9 Nach jeder Änderung

```js
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
```

Anzeigen, speichern, prüfen ob gelöst. Gespeichert wird **nach jeder Eingabe**. Das klingt viel, aber `localStorage` ist schnell und der Text ist klein. Dafür kann man die App jederzeit wegwischen, ohne etwas zu verlieren.

```js
  aktualisiere() {
    const wort = this.aktivesWort();
    const imWort = new Set(wort.felder.map(([r, c]) => schluessel(r, c)));
    const autoPruefen = einstellung("autoPruefen");
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.B; c++) {
        const zelle = this.zellen[r][c];
        if (!zelle) continue;
        const k = schluessel(r, c);
        const buchstabe = this.eingaben[r][c];
        const istFalsch = buchstabe && buchstabe !== this.loesung[r][c]
          && (this.falsch.has(k) || autoPruefen);
        zelle.firstChild.textContent = buchstabe;
        zelle.classList.toggle("im-wort", imWort.has(k));
        zelle.classList.toggle("aktiv", r === this.auswahl.r && c === this.auswahl.c);
        zelle.classList.toggle("falsch", Boolean(istFalsch));
        zelle.classList.toggle("aufgedeckt", this.aufgedeckt.has(k));
      }
    }
```

**Das wichtigste Muster der ganzen App:** Der Zustand (`eingaben`, `auswahl`, `falsch`, `aufgedeckt`) ist die einzige Wahrheit. `aktualisiere()` bringt die Anzeige komplett mit diesem Zustand in Einklang. Alle anderen Methoden ändern nur den Zustand und rufen dann `aktualisiere()` auf. Keine Methode färbt selbst ein Feld ein.

Warum? Wenn fünf verschiedene Stellen im Code jeweils "ein bisschen" Anzeige ändern, vergisst irgendwann eine etwas, und die Anzeige stimmt nicht mehr mit den Daten überein. Wenn nur eine Stelle anzeigt, kann das nicht passieren. Große Frameworks wie React sind im Kern genau um diese Idee gebaut.

`classList.toggle(name, bedingung)` schaltet eine Klasse an oder aus, je nach Bedingung. `Boolean(x)` macht aus beliebigen Werten `true`/`false` (aus `""` wird `false`).

Danach werden noch der aktive Hinweis markiert, die große Hinweisleiste neu geschrieben und die Lösungswort-Kästchen gefüllt.

```js
  zeigeAktivesFeld() {
    if (!this.auswahl || !this.zellen) return;
    const zelle = this.zellen[this.auswahl.r][this.auswahl.c];
    zelle?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
```

Ist das Gitter größer als der Bildschirm, scrollt `scrollIntoView` das aktive Feld ins Bild. `"nearest"` heißt: nur so weit wie nötig. Ist es schon sichtbar, passiert nichts.

### 3.10 Hilfen

```js
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
```

Eine gemeinsame Funktion für "Buchstabe", "Wort" und "alles aufdecken". Sie gibt zurück, wie viele Felder sich wirklich geändert haben. So zählt `deckeWortAuf()` nur dann eine Hilfe, wenn auch etwas aufgedeckt wurde. Felder, die schon richtig waren, werden nicht als "aufgedeckt" (blau) markiert. Du sollst sehen, was du selbst wusstest.

`zeigeFehler()` markiert alle falschen Buchstaben (rot), `loeseAlles()` deckt alles auf und beendet das Rätsel als "aufgelöst" (zählt nicht als gelöst), `neuStarten()` löscht den Stand und fängt von vorn an.

### 3.11 Die Uhr

```js
  starteUhr() {
    this.stoppeUhr();
    this.zeigeZeit();
    if (this.geloest || this.aufgeloest) return;
    this.uhr = setInterval(() => {
      if (document.hidden) return;
      this.zeit++;
      this.zeigeZeit();
      if (this.zeit % 10 === 0) this.speichern();
    }, 1000);
  }
  stoppeUhr() {
    clearInterval(this.uhr);
    this.uhr = null;
  }
```

- `setInterval(funktion, 1000)` ruft die Funktion jede Sekunde auf und liefert eine Nummer zurück, mit der man das später per `clearInterval` wieder stoppt.
- `document.hidden` ist `true`, wenn die App im Hintergrund ist (anderer Tab, Handy gesperrt). Dann zählt die Zeit nicht weiter. Fair ist fair.
- Alle 10 Sekunden wird gespeichert, damit die Zeit nicht verloren geht.
- Ganz am Anfang `stoppeUhr()`: Falls versehentlich zweimal gestartet wird, laufen sonst zwei Uhren und die Zeit zählt doppelt.

Warum zählen wir Sekunden hoch, statt die Startzeit zu speichern? Weil die Spielzeit über mehrere Sitzungen geht (heute 5 Minuten, morgen weiter). Ein einfacher Zähler, der mitgespeichert wird, ist dafür am einfachsten.

---

## 4. `app.js` – der Dirigent

### 4.1 Start

```js
import { Spiel, formatiereZeit } from "./spiel.js";
import { baueTastatur } from "./tastatur.js";
import * as speicher from "./speicher.js";

const $ = (id) => document.getElementById(id);
```

- `import * as speicher` holt **alle** Exporte unter einem Namen: `speicher.holeStand(...)`. Wie `import speicher` in Python.
- `$` ist ein gültiger Funktionsname in JavaScript. Die Kurzschreibweise `$("uhr")` ist eine alte Tradition (von der Bibliothek jQuery).

```js
let alleRaetsel = [];
const nachId = new Map();
let spiel = null;
```

Zustand der App: alle Rätsel, ein Verzeichnis ID → Rätsel, und das gerade laufende Spiel.

```js
async function start() {
  const logo = document.querySelector(".logo");
  logo.classList.add("animiert");
  setTimeout(() => logo.classList.remove("animiert"), 1500);

  registriereServiceWorker();
  verbindeKnoepfe();
  baueTastatur($("tastatur"), (wert) => spiel?.eingabe(wert));
```

`setTimeout(f, 1500)` ruft `f` **einmal** nach 1,5 Sekunden auf (im Gegensatz zu `setInterval`).

```js
  try {
    const antwort = await fetch("data/puzzles.json");
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    const daten = await antwort.json();
    alleRaetsel = daten.raetsel;
    for (const r of alleRaetsel) nachId.set(r.id, r);
  } catch (fehler) {
    ...
    return;
  }
```

**`async`/`await` erklärt:** `fetch` holt eine Datei übers Netz. Das kann dauern. JavaScript im Browser hat aber nur **einen** Faden (Thread): Würde es stur warten, wäre die ganze Seite eingefroren. Deshalb gibt `fetch` sofort ein **Promise** zurück, ein Versprechen "das Ergebnis kommt später". `await` heißt: "Pausiere *diese Funktion*, bis das Versprechen erfüllt ist, und mach in der Zwischenzeit anderes." Das geht nur in Funktionen, die mit `async` markiert sind.

Zwei `await`: Erst kommen die Kopfdaten der Antwort (Statuscode), dann muss noch der Inhalt gelesen und als JSON geparst werden (`antwort.json()` ist auch ein Promise).

`antwort.ok` ist `true` bei Statuscode 200–299. Bei 404 (Datei nicht gefunden) werfen wir selbst einen Fehler, damit wir im `catch` landen und eine verständliche Meldung zeigen.

```js
  window.addEventListener("hashchange", zeigeAktuelleSeite);
  zeigeAktuelleSeite();
}
```

### 4.2 Routing über die Adresse

```js
function zeigeAktuelleSeite() {
  const [, seite, id] = location.hash.split("/");
  if (seite === "spiel" && nachId.has(id)) {
    oeffneSpiel(nachId.get(id));
  } else {
    zeigeStartseite();
  }
}
```

Der Teil einer Adresse nach `#` heißt **Hash**. Ändert er sich, lädt der Browser die Seite **nicht** neu, sondern feuert nur das Ereignis `hashchange`. Das nutzen wir als Navigation:

- `…/index.html#/` → Startseite
- `…/index.html#/spiel/mittel-04` → Rätsel mittel-04

`"#/spiel/mittel-04".split("/")` ergibt `["#", "spiel", "mittel-04"]`. `const [, seite, id] = ...` überspringt mit dem leeren Platz vor dem ersten Komma das erste Element.

Vorteile gegenüber "einfach Elemente ein- und ausblenden":

- Neu laden bleibt im selben Rätsel.
- Die Zurück-Geste des Browsers bringt dich zur Übersicht.
- Ein Rätsel lässt sich als Link verschicken.

Um ein Rätsel zu öffnen, setzt der Code einfach `location.hash = "#/spiel/" + id`. Den Rest erledigt `hashchange`. Die Rätsel-Kästchen auf der Startseite sind sogar ganz normale Links (`<a href="#/spiel/leicht-01">`), da braucht es überhaupt kein JavaScript zum Klicken.

### 4.3 Spiel öffnen

```js
function oeffneSpiel(raetsel) {
  spiel?.beende();
  $("startseite").hidden = true;
  $("spielseite").hidden = false;
  $("spiel-name").textContent = `${STUFEN_NAMEN[raetsel.schwierigkeit]}, Rätsel ${raetsel.nr}`;
  ...
  spiel = new Spiel(raetsel, { gitter: $("gitter"), ... }, zeigeGeschafft);
  ...
  requestAnimationFrame(() => spiel?.passeGroesseAn());
  document.fonts?.ready.then(() => spiel?.passeGroesseAn());
  speicher.setzeEinstellung("stufe", raetsel.schwierigkeit);
}
```

- Ein laufendes Spiel wird erst sauber beendet (Uhr stoppen, speichern).
- `new Spiel(...)` erzeugt das Spielobjekt. Der dritte Parameter ist die Funktion `zeigeGeschafft`, ohne Klammern! Wir übergeben die Funktion selbst, nicht ihr Ergebnis. Aufgerufen wird sie später von `Spiel`, wenn das Rätsel gelöst ist.
- **`requestAnimationFrame`**: Die Spielseite wurde gerade erst eingeblendet. Der Browser hat ihr Layout aber noch nicht berechnet, Messungen wie `clientWidth` wären 0. `requestAnimationFrame` führt die Funktion kurz vor dem nächsten Bild aus, dann ist das Layout fertig.
- **`document.fonts.ready`**: Ein Promise, das erfüllt wird, wenn alle Schriften geladen sind. Die Ersatzschrift ist breiter als Archivo, also wird nach dem Laden nochmal eingepasst. `.then(f)` ist die ältere Schreibweise für "wenn das Promise erfüllt ist, rufe f auf" (statt `await`).

### 4.4 Startseite zeichnen

`zeichneStartseite()` baut für die gewählte Stufe die Kästchen. Interessant ist, wie aus dem Spielstand das Aussehen wird:

```js
    if (stand?.geloest) {
      geloest++;
      kaestchen.classList.add("geloest");
      status = formatiereZeit(stand.zeit);
      ...
    } else if (stand?.aufgeloest) {
      ...
    } else if (stand?.fortschritt > 0) {
      const prozent = Math.round(stand.fortschritt * 100);
      ...
      fuellung.style.height = `${prozent}%`;
      kaestchen.append(fuellung);
    }
```

Gelöst → schwarz mit Zeit. Aufgelöst → blau. Angefangen → gelbe Füllung von unten in Prozent. Neu → leer.

```js
    kaestchen.insertAdjacentHTML("beforeend",
      `<span class="kaestchen-nr">${r.nr}</span><span class="kaestchen-status">${status}</span>`);
```

`insertAdjacentHTML("beforeend", html)` hängt HTML ans Ende an, ohne vorhandenen Inhalt (die Füllung) zu überschreiben. Unbedenklich, weil nur unsere eigenen Zahlen und Zeiten drinstehen.

```js
function istIphoneImBrowser() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const alsApp = window.navigator.standalone === true
    || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !alsApp;
}
```

Zeigt den Tipp "Zum Home-Bildschirm" nur, wenn es Sinn ergibt. Kurios: iPads geben sich seit iPadOS 13 als Mac aus. Man erkennt sie daran, dass dieser "Mac" einen Touchscreen hat. `navigator.standalone` ist Apples Eigenheit und ist `true`, wenn die Seite vom Home-Bildschirm gestartet wurde.

### 4.5 Ein Dialog, der auf eine Antwort wartet

```js
function frage(titel, text, jaText) {
  return new Promise((fertig) => {
    const dialog = $("frage-dialog");
    $("frage-titel").textContent = titel;
    $("frage-text").textContent = text;
    $("frage-ja").textContent = jaText;
    $("frage-ja").onclick = () => { dialog.close(); fertig(true); };
    $("frage-nein").onclick = () => { dialog.close(); fertig(false); };
    dialog.oncancel = () => fertig(false);
    dialog.showModal();
  });
}
```

Hier **bauen wir selbst ein Promise**. `new Promise((fertig) => { ... })` bekommt eine Funktion, die sofort läuft und den Dialog öffnet. `fertig` ist eine Funktion, die wir aufrufen, wenn das Ergebnis feststeht: Klick auf "Ja" → `fertig(true)`.

Benutzt wird das so:

```js
const ja = await frage("Alles löschen?", "...", "Ja, alles löschen");
if (ja) { ... }
```

Der Code liest sich wie ein simples `confirm()`, wartet aber in Wahrheit auf einen Klick, ohne die Seite zu blockieren. Das ist die Stärke von Promises.

`onclick = ...` statt `addEventListener`: Bei jeder Frage wird der Empfänger **ersetzt**. Mit `addEventListener` würden sich bei jeder Frage neue Empfänger anhäufen, und ein Klick würde alte Fragen mit beantworten.

### 4.6 Alles verbinden

`verbindeKnoepfe()` hängt an jeden Knopf seine Aktion. Zwei Stellen sind interessant:

```js
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
```

Wieder Event Delegation: **ein** Empfänger für alle Felder aller Rätsel. Er bleibt bestehen, auch wenn das Gitter für ein anderes Rätsel neu gezeichnet wird. `dataset`-Werte sind immer Text, deshalb `Number(...)`.

```js
  let geplant = false;
  window.addEventListener("resize", () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => {
      geplant = false;
      spiel?.passeGroesseAn();
    });
  });
```

Beim Ziehen eines Fensters feuert `resize` dutzende Male pro Sekunde. Die Variable `geplant` sorgt dafür, dass wir höchstens einmal pro Bild neu messen. Das nennt man **Drosseln** (throttling).

```js
  window.addEventListener("pagehide", () => spiel?.speichern());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) spiel?.speichern();
  });
```

Wird die App geschlossen oder in den Hintergrund geschickt: sicherheitshalber speichern. Auf dem iPhone ist `visibilitychange` das zuverlässigste Signal, dass die App gleich eingefroren werden könnte.

### 4.7 Service Worker anmelden

```js
function registriereServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").catch((fehler) => {
    console.warn("Service Worker konnte nicht starten:", fehler);
  });
}
start();
```

Meldet `sw.js` an (Kapitel 06). `"serviceWorker" in navigator` prüft, ob der Browser das überhaupt kann. Ganz unten startet `start()` die App.

---

## 5. Fehler finden: die Entwicklerwerkzeuge

Im Browser **F12** drücken (oder Rechtsklick → Untersuchen):

| Reiter | Wofür |
|---|---|
| **Console** | Fehlermeldungen in Rot. Hier kannst du auch JavaScript direkt eintippen, z. B. `document.querySelectorAll(".hinweis").length` |
| **Elements** | Das DOM live ansehen. Klick ein Feld an und sieh, welche Klassen es gerade hat (`im-wort`, `aktiv` …) |
| **Sources** | Code ansehen, **Haltepunkte** setzen (auf eine Zeilennummer klicken). Beim nächsten Durchlauf hält das Programm dort an, und du kannst alle Variablen ansehen |
| **Application** | localStorage, Service Worker, Cache |
| Handy-Symbol oben links | Simuliert ein iPhone-Display am PC |

Ein `console.log("auswahl", this.auswahl)` an einer beliebigen Stelle im Code ist der schnellste Weg, um zu sehen, was passiert. Wie `print()` in Python.
