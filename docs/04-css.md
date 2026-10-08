# 04 – CSS: das Aussehen

Datei: `css/style.css`. CSS ("Cascading Style Sheets") sagt, wie die HTML-Elemente aussehen und wo sie stehen.

## Das Design-Konzept

Bevor eine Zeile CSS entstand, gab es eine Idee: **die Optik eines Rätselhefts aus dem Zeitschriftenregal.**

| Element | Vorbild | Farbe |
|---|---|---|
| Hinweisfelder | Gedrucktes Cyan im Rätselheft | Hellblau `#CDE6F1` |
| Aktives Wort | Mit Textmarker angestrichen | Gelb `#FFF27A` |
| Aktives Feld | Dicker Textmarker | Kräftiges Gelb `#FFCF33` |
| Falscher Buchstabe | Rotstift-Korrektur | Rot plus Strich |
| Aufgedeckter Buchstabe | Mit Kuli nachgetragen | Blau |
| Lösungsfelder | Kreise mit Nummer | wie im Heft |

Dazu **eine** Schrift (Archivo), die stufenlos schmal oder breit sein kann. Schmal für die winzigen Hinweistexte, breit und fett für Überschriften. Ein Merkmal, das sich durchzieht, ist ruhiger als viele verschiedene Effekte.

## CSS-Grundbegriffe in 60 Sekunden

```css
.hinweis.aktiv {
  background: var(--marker-stark);
  color: #15191C;
}
```

- `.hinweis.aktiv` ist der **Selektor**: Er trifft Elemente, die die Klasse `hinweis` **und** die Klasse `aktiv` haben (ohne Leerzeichen dazwischen = beide am selben Element).
- `.a .b` (mit Leerzeichen) heißt: ein `.b` irgendwo **innerhalb** eines `.a`.
- `.a + .b`: ein `.b` direkt **nach** einem `.a` (Geschwister).
- `#id`: das Element mit dieser ID.
- `[aria-selected="true"]`: Elemente mit diesem Attribut-Wert.
- Zwischen `{ }` stehen **Eigenschaften** mit **Werten**.

"Cascading" heißt: Mehrere Regeln können dasselbe Element treffen. Gewinnen tut die **spezifischere** (z. B. zwei Klassen schlagen eine Klasse), bei Gleichstand die **spätere**.

---

## 1. Die Schrift

```css
@font-face {
  font-family: "Archivo";
  src: url("../fonts/archivo-latin.woff2") format("woff2");
  font-weight: 100 900;
  font-stretch: 62% 125%;
  font-display: swap;
}
```

- `@font-face` meldet eine eigene Schrift an. Danach kann man sie mit `font-family: "Archivo"` benutzen.
- `url("../fonts/…")`: Der Pfad ist relativ zur **CSS-Datei**, die in `css/` liegt. `..` heißt "einen Ordner hoch".
- `woff2` ist ein stark komprimiertes Schriftformat fürs Web.
- `font-weight: 100 900` und `font-stretch: 62% 125%`: Diese Schrift ist **variabel**. Statt einzelner Dateien für "fett", "normal", "schmal" enthält eine Datei alle Zwischenstufen. Wir können also `font-weight: 680` oder `font-stretch: 92%` schreiben.
- `font-display: swap`: Solange die Schrift lädt, Text in einer Ersatzschrift zeigen statt gar nicht.

Warum die Schrift selbst mitliefern statt von Google Fonts laden? Weil die App **offline** laufen soll. Eine externe Schrift wäre ohne Internet weg.

## 2. Variablen (Design-Tokens)

```css
:root {
  --papier: #F5F7F6;
  --feld: #FFFFFF;
  --tinte: #15191C;
  ...
  --rand: 16px;
  --linie: 2px;
  color-scheme: light dark;
}
```

- `:root` ist das oberste Element (`<html>`). Was hier definiert ist, gilt überall.
- `--name: wert` definiert eine **CSS-Variable** (offiziell "Custom Property"). Benutzt wird sie mit `var(--name)`.
- Vorteil: Alle Farben stehen an einer Stelle. Willst du ein anderes Gelb, änderst du eine Zeile.
- `color-scheme: light dark` sagt dem Browser, dass wir beide Modi können. Dann passen sich Checkboxen und Scrollbalken automatisch an.

Farbwerte: `#15191C` ist Hexadezimal für Rot-Grün-Blau (15, 19, 1C, je 00 bis FF). `rgba(21, 25, 28, 0.28)` ist dasselbe dezimal, plus Deckkraft (0 = durchsichtig, 1 = deckend).

### Dunkelmodus

```css
@media (prefers-color-scheme: dark) {
  :root {
    --papier: #0F1417;
    --feld: #182126;
    --tinte: #E8EEF0;
    ...
  }
}
```

- `@media (...)` ist eine **Media Query**: Die Regeln darin gelten nur, wenn die Bedingung zutrifft. Hier: Das Gerät steht auf "Dunkel".
- Weil das ganze Stylesheet nur Variablen benutzt, reicht es, die **Variablen** umzudefinieren. Kein einziger Selektor muss doppelt geschrieben werden. Das ist der eigentliche Grund für Variablen.

## 3. Grundlagen

```css
*, *::before, *::after { box-sizing: border-box; }
```

- `*` trifft alle Elemente, `::before`/`::after` sind deren Pseudo-Elemente (siehe unten).
- `box-sizing: border-box`: Wenn ein Element `width: 100px` hat, sind Rahmen und Innenabstand **inklusive**. Standard wäre, dass sie dazukommen (100px + Rahmen + Abstand). Mit `border-box` rechnet es sich viel einfacher. Diese Zeile steht in fast jedem modernen Stylesheet.

```css
html { -webkit-text-size-adjust: 100%; }
```

Verhindert, dass Safari auf dem iPhone beim Drehen die Schrift eigenmächtig vergrößert. Das Präfix `-webkit-` kennzeichnet eine Eigenschaft, die (zunächst) nur WebKit-Browser wie Safari verstehen.

```css
body {
  margin: 0;
  background: var(--papier);
  color: var(--tinte);
  font-family: "Archivo", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 1rem;
  line-height: 1.45;
  -webkit-tap-highlight-color: transparent;
}
```

- `margin: 0` entfernt den Standardrand des Browsers.
- `font-family` ist eine Liste: erst Archivo, falls nicht verfügbar die Systemschrift, zuletzt irgendeine serifenlose.
- `1rem` ist die Grundschriftgröße des Browsers (meist 16px). `rem` heißt "root em". Nutzt man `rem`, skaliert alles mit, wenn jemand im Browser größere Schrift eingestellt hat.
- `line-height: 1.45`: Zeilenhöhe als Vielfaches der Schriftgröße, ohne Einheit.
- Die letzte Zeile entfernt den grauen Kasten, den iOS beim Antippen von Links und Knöpfen zeigt. Wir zeigen stattdessen eigenes Feedback.

```css
button {
  font: inherit;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;
}
```

- Knöpfe haben von Haus aus eine eigene Schrift. `inherit` heißt "übernimm vom Elternelement".
- `cursor: pointer` zeigt am PC die Hand.
- `touch-action: manipulation` schaltet auf Touchgeräten das Zoomen per Doppeltipp ab. Sonst würde zweimal schnell auf dieselbe Taste tippen die Seite vergrößern.

```css
:focus-visible {
  outline: 3px solid var(--blau);
  outline-offset: 2px;
}
```

Wer mit der Tastatur (Tab) navigiert, sieht einen blauen Rahmen um das aktive Element. `:focus-visible` (statt `:focus`) zeigt ihn nur bei Tastaturbedienung, nicht bei jedem Mausklick.

```css
[hidden] { display: none !important; }
```

Das HTML-Attribut `hidden` versteckt Elemente, aber eine CSS-Regel wie `display: flex` könnte es überstimmen. `!important` sorgt dafür, dass `hidden` immer gewinnt. `!important` sollte man sparsam benutzen, hier ist es genau richtig.

---

## 4. Startseite

```css
.startseite {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(env(safe-area-inset-top) + 28px) var(--rand) calc(env(safe-area-inset-bottom) + 32px);
}
```

- `max-width: 640px` + `margin: 0 auto`: höchstens 640px breit und mittig. `auto` links und rechts verteilt den Platz gleichmäßig.
- `padding` mit vier Werten? Nein, drei: oben, links/rechts, unten.
- `env(safe-area-inset-top)` ist der Platz, den die iPhone-Notch oben braucht (bzw. der Home-Balken unten). Auf Geräten ohne Notch ist es 0. Weil wir im HTML `viewport-fit=cover` gesetzt haben, müssen wir diesen Abstand selbst einplanen.
- `calc(...)` rechnet mit gemischten Einheiten.

### Das Logo

```css
.logo {
  --lz: min(10vw, 52px);
  margin: 0 0 18px;
  font-size: calc(var(--lz) * 0.6);
  font-weight: 800;
  line-height: 1;
}
```

- Eine Variable, die nur hier gilt: `--lz` = Größe eines Logo-Kästchens.
- `10vw` = 10 % der Fensterbreite ("viewport width"). `min(10vw, 52px)` nimmt den kleineren Wert: Auf dem Handy wächst das Logo mit der Breite, am PC wird es höchstens 52px.
- Die Schriftgröße hängt an der Kästchengröße. So passt alles immer zusammen.

```css
.logo-zeile { display: flex; }
.logo-zeile-2 { margin-top: calc(var(--linie) * -1); }
```

`display: flex` stellt die Kinder **nebeneinander** in eine Reihe (Flexbox, siehe Kasten weiter unten). Der negative Abstand schiebt Zeile 2 um 2px nach oben, damit sich die Rahmenlinien überlappen statt doppelt dick zu werden. Derselbe Trick mit `margin-left` bei den Kästchen nebeneinander.

```css
.logo-feld,
.logo-hinweis {
  display: grid;
  place-items: center;
  border: var(--linie) solid var(--tinte);
  background: var(--feld);
}
```

`display: grid; place-items: center` ist die kürzeste Art, einen Inhalt horizontal **und** vertikal zu zentrieren.

```css
.logo-hinweis::after {
  content: "";
  position: absolute;
  right: -7px;
  top: 50%;
  translate: 0 -50%;
  border: 5px solid transparent;
  border-left: 6px solid var(--tinte);
  z-index: 1;
}
```

Das ist der kleine Pfeil am Hinweisfeld, und er ist ein schöner Trick:

- `::after` erzeugt ein **Pseudo-Element**: ein unsichtbares Extra-Element am Ende des Inhalts, das nur im CSS existiert. `content: ""` ist Pflicht, damit es erscheint.
- `position: absolute` löst es aus dem normalen Fluss. `right`, `top` positionieren es relativ zum nächsten Vorfahren mit `position: relative` (hier `.logo-hinweis`).
- `top: 50%` + `translate: 0 -50%` zentriert vertikal: erst die Oberkante in die Mitte, dann um die halbe eigene Höhe hoch.
- **Das Dreieck aus Rahmen:** Ein Element ohne Größe, aber mit dickem Rahmen, zeichnet vier dreieckige Rahmenstücke, die sich in der Mitte treffen. Macht man drei davon durchsichtig, bleibt ein Dreieck übrig. Hier ist nur der linke Rahmen farbig → ein Dreieck, das nach rechts zeigt.

### Die Logo-Animation

```css
.logo.animiert .logo-feld {
  animation: eintippen 0.35s both;
}
.logo.animiert .logo-zeile .logo-feld:nth-child(2)  { animation-delay: 0.05s; }
...
@keyframes eintippen {
  from { color: transparent; background: var(--marker-stark); }
  60%  { background: var(--marker); }
  to   { color: var(--tinte); background: var(--feld); }
}
```

- `@keyframes` beschreibt eine Animation in Stationen: am Anfang (`from`), bei 60 %, am Ende (`to`). Der Browser rechnet die Zwischenschritte aus.
- `animation: eintippen 0.35s both`: Name, Dauer, und `both` heißt "vor dem Start wie `from` aussehen, nach dem Ende wie `to` bleiben".
- `:nth-child(2)` trifft das zweite Kind seines Elternelements. Jedes Kästchen startet etwas später, so "tippen" sich die Buchstaben nacheinander ein.
- Die Klasse `animiert` setzt `app.js` nur beim ersten Laden. So läuft die Animation einmal, nicht bei jeder Rückkehr zur Startseite. Bewusst gibt es auf der ganzen Seite nur **diese eine** Animation beim Laden.

### Weiterspielen-Knopf

Sieht aus wie ein großes Hinweisfeld mit Pfeil. Technik wie beim Logo: `::after` mit Rahmen-Dreieck. `currentColor` heißt "die aktuelle Textfarbe", so passt der Pfeil automatisch zum Text.

### Schwierigkeits-Reiter

```css
.stufe + .stufe { border-left: var(--linie) solid var(--tinte); }
.stufe[aria-selected="true"] { background: var(--marker); }
```

- `.stufe + .stufe` trifft jeden Reiter, vor dem ein anderer Reiter steht, also den zweiten und dritten. Die bekommen eine Trennlinie links. Der erste nicht, weil da der Außenrahmen ist.
- Der aktive Reiter wird über das **ARIA-Attribut** gefärbt, das JavaScript ohnehin für Screenreader setzt. Eine Quelle der Wahrheit statt einer extra CSS-Klasse.

### Die Rätselliste als Gitter

```css
.raetsel-liste {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 1px;
  padding: 1px;
}
.kaestchen {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--feld);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 0 0 1px var(--tinte);
}
```

- **CSS Grid** ordnet Kinder in Zeilen und Spalten an (siehe Kasten).
- `repeat(auto-fill, minmax(60px, 1fr))`: "So viele Spalten wie reinpassen, jede mindestens 60px breit, der Rest wird gleichmäßig verteilt (`1fr` = ein Anteil)". Auf dem Handy werden es 5 Spalten, am PC 9. Ganz ohne Media Query.
- `aspect-ratio: 1` macht die Kästchen quadratisch.
- `text-decoration: none` entfernt den Unterstrich, `color: inherit` die blaue Linkfarbe (die Kästchen sind `<a>`-Links).
- **Linien-Trick:** `box-shadow: 0 0 0 1px` ist ein Schatten ohne Versatz und ohne Unschärfe, der 1px nach außen ragt: optisch ein Rahmen. Zwischen zwei Kästchen ist 1px Lücke (`gap`), und die Schatten beider Kästchen überlagern sich genau darin zu **einer** 1px-Linie. Mit echten Rahmen wären es 2px. Und leere Plätze in der letzten Reihe bleiben einfach Papierfarbe.

```css
.kaestchen-fuellung {
  position: absolute;
  inset: auto 0 0 0;
  background: var(--marker);
}
```

Der gelbe Fortschrittsbalken. `inset` ist die Kurzform für `top right bottom left`. `auto 0 0 0` klebt ihn unten, links und rechts fest, die Höhe setzt JavaScript in Prozent (`style.height = "37%"`). So "füllt" sich das Kästchen von unten mit Textmarker.

---

## 5. Spielseite

```css
.spielseite {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  padding-top: env(safe-area-inset-top);
}
```

Die Spielseite ist genau einen Bildschirm hoch, und die Teile stapeln sich senkrecht (`flex-direction: column`): Kopf, Hinweisleiste, Gitter, Lösungswort, Tastatur.

- **`100vh` vs. `100dvh`:** `vh` ist 1 % der Fensterhöhe. Auf dem iPhone ist das aber die Höhe *ohne* die Safari-Leisten, also zu viel, und die Tastatur rutscht unter den Rand. `dvh` ("dynamic viewport height") ist die **tatsächlich sichtbare** Höhe. Die erste Zeile ist ein Fallback für alte Browser, die `dvh` nicht kennen: Sie ignorieren die zweite Zeile und behalten die erste.
- `overflow: hidden`: Die Seite selbst scrollt nie. Scrollen darf nur das Gitter (falls es zu groß ist).

> ### Kasten: Flexbox vs. Grid
> **Flexbox** (`display: flex`) ist für **eine Richtung**: eine Reihe oder eine Spalte. Kinder können wachsen (`flex: 1`) und schrumpfen. Gut für Leisten, Tastenreihen, Stapel.
>
> **Grid** (`display: grid`) ist für **zwei Richtungen**: Zeilen *und* Spalten gleichzeitig. Gut für das Rätselgitter und die Rätselliste.

### Kopfzeile

```css
.spiel-name {
  flex: 1;
  ...
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- `flex: 1`: Der Titel nimmt allen Platz, den die Knöpfe übrig lassen.
- Die letzten drei Zeilen sind das Standardrezept für "zu langen Text mit … abschneiden": nicht umbrechen, Überstand verstecken, Auslassungspunkte zeigen.

```css
.uhr {
  min-width: 3.2em;
  font-variant-numeric: tabular-nums;
  ...
}
```

`tabular-nums` macht alle Ziffern gleich breit. Sonst würde die Uhr hin- und herwackeln, weil eine 1 schmaler ist als eine 0.

```css
.icon-knopf {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  ...
}
```

44 × 44 Pixel ist Apples empfohlene Mindestgröße für alles, was man mit dem Finger treffen soll.

```css
.icon-knopf svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
```

Die SVG-Symbole werden nicht gefüllt, sondern als 2px-Linie mit runden Enden gezeichnet, in der aktuellen Textfarbe.

### Gitter-Bereich und Gitter

```css
.gitter-bereich {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: auto;
  padding: 12px var(--rand);
  overscroll-behavior: contain;
}
.gitter {
  --zelle: 40px;
  margin: auto;
  display: grid;
  grid-template-columns: repeat(var(--breite), var(--zelle));
  grid-auto-rows: var(--zelle);
  gap: 1px;
  padding: 1px;
  background: var(--tinte);
  outline: 1px solid var(--tinte);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
```

Hier stecken die meisten Tricks der ganzen Datei:

1. **`flex: 1 1 auto`** heißt: wachsen ja, schrumpfen ja, Startgröße nach Inhalt. Der Gitter-Bereich bekommt also allen Platz, den Kopf, Leiste, Lösungswort und Tastatur übrig lassen.
2. **`min-height: 0`** ist eine berüchtigte Falle: Flex-Kinder schrumpfen standardmäßig nie kleiner als ihr Inhalt. Ohne diese Zeile würde ein großes Gitter die Tastatur aus dem Bildschirm schieben, statt zu scrollen.
3. **Zentrieren mit `margin: auto`** statt `place-items: center`: Wird das Gitter größer als der Bereich (Zoom), würde `center` es nach beiden Seiten überstehen lassen, und den linken/oberen Teil könnte man nicht mehr erreichen. `margin: auto` zentriert nur, solange Platz ist.
4. **Spalten aus Variablen:** `--breite` (Anzahl Spalten) und `--zelle` (Feldgröße in px) setzt JavaScript passend zum Rätsel und Bildschirm. CSS-Variablen lassen sich nämlich auch per JavaScript ändern: `gitter.style.setProperty("--zelle", "44px")`.
5. **Gitterlinien aus Lücken:** Das Gitter hat eine dunkle Hintergrundfarbe, jedes Feld eine helle. Zwischen den Feldern ist 1px Lücke (`gap`), durch die der dunkle Hintergrund durchscheint. Ergebnis: perfekte 1px-Linien, ohne einen einzigen Rahmen. `padding: 1px` + `outline` machen den Außenrahmen etwas dicker.
6. **`overscroll-behavior: contain`**: Wenn man im Gitter ans Ende scrollt, soll nicht die ganze Seite mitwippen.
7. Die letzten drei Zeilen verhindern, dass langes Drücken auf dem iPhone Text markiert oder ein Menü öffnet.

### Felder

```css
.zelle { position: relative; background: var(--feld); }
.buchstabe { display: grid; place-items: center; cursor: pointer; }
.eingabe {
  font-size: calc(var(--zelle) * 0.56);
  font-weight: 680;
  line-height: 1;
}
```

`position: relative` macht jedes Feld zum Bezugspunkt für die absolut positionierten Pfeile und Nummern darin. Die Buchstabengröße ist 56 % der Feldgröße, wächst also mit dem Gitter mit.

```css
.buchstabe.im-wort { background: var(--marker); }
.buchstabe.aktiv { background: var(--marker-stark); }
.buchstabe.falsch .eingabe { color: var(--rot); }
.buchstabe.aufgedeckt .eingabe { color: var(--blau); }
```

Die Zustände eines Feldes sind einfach **Klassen**, die JavaScript an- und abschaltet. CSS entscheidet, wie sie aussehen. So bleibt die Logik in JavaScript und die Optik in CSS.

`.aktiv` steht im Stylesheet nach `.im-wort`. Beide haben gleiche Spezifität (zwei Klassen), also gewinnt die spätere: Das aktive Feld ist kräftiger gelb als der Rest des Worts.

```css
.buchstabe.falsch::before {
  content: "";
  position: absolute;
  inset: 18%;
  background: linear-gradient(to top right, transparent 46%, var(--rot) 47%, var(--rot) 53%, transparent 54%);
  opacity: 0.55;
}
```

Der Rotstift-Strich: Ein **Farbverlauf**, der fast überall durchsichtig ist und nur in einem schmalen Band in der Mitte (47 % bis 53 %) rot. Weil er diagonal läuft (`to top right`), entsteht ein schräger Strich. Ein Bild ohne Bilddatei.

```css
.buchstabe.loesungsfeld::after {
  content: "";
  position: absolute;
  inset: 7%;
  border: 1px solid var(--leise);
  border-radius: 50%;
  opacity: 0.7;
  pointer-events: none;
}
```

Der Kreis für Lösungswort-Felder: ein Rahmen mit `border-radius: 50%` (wird rund). `pointer-events: none` lässt Klicks durch den Kreis hindurch auf das Feld fallen.

### Pfeile

```css
.pfeil {
  position: absolute;
  width: calc(var(--zelle) * 0.3);
  height: calc(var(--zelle) * 0.3);
  ...
}
.pfeil-rechts        { left: 0; top: 50%; translate: 0 -50%; }
.pfeil-unten         { top: 0; left: 50%; translate: -50% 0; }
.pfeil-unten_rechts  { top: 0; left: 0; }
.pfeil-rechts_unten  { top: 0; left: 0; }
```

Die Pfeile sitzen, wie im echten Rätselheft, im **ersten Feld des Worts**, an der Kante, von der der Hinweis kommt. Die Klassennamen entsprechen genau den Pfeil-Namen aus dem Generator (`pfeil-` + Name), so kann JavaScript sie direkt zusammensetzen.

### Hinweisfelder

```css
.hinweisfeld {
  display: flex;
  flex-direction: column;
  background: var(--hinweis);
}
.hinweis {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1px 2px;
  ...
  font-size: 9px;
  font-weight: 560;
  font-stretch: 62%;
  line-height: 1;
  text-align: center;
  overflow: hidden;
  -webkit-hyphens: auto;
  hyphens: auto;
}
.hinweis + .hinweis { border-top: 1px solid var(--tinte); }
```

- Ein Hinweisfeld stapelt seine 1–2 Hinweis-Knöpfe senkrecht.
- `flex: 1 1 0` (Startgröße 0!) teilt den Platz **genau** gleichmäßig, egal wie viel Text drin steht. Mit `auto` würde ein langer Text mehr Platz bekommen.
- `font-stretch: 62%`: die schmalste Stufe der Schrift. Dadurch passen etwa 40 % mehr Buchstaben in eine Zeile.
- `hyphens: auto`: Der Browser trennt lange Wörter an Silbengrenzen ("Hülsen-gemüse"). Das klappt nur dank `lang="de"` im HTML. Safari auf dem iPhone kann das sehr gut.
- `font-size: 9px` ist nur der Startwert. JavaScript setzt für jeden Hinweis eine eigene Größe direkt am Element (`knopf.style.fontSize`). Solche Inline-Stile schlagen Regeln aus dem Stylesheet. Die Größe wird so gewählt, dass der Text gerade noch reinpasst (Funktion `passeHinweistexteAn`, Kapitel 05).

```css
.hinweis.umbruch { align-items: flex-start; }
.hinweis.umbruch .hinweis-text { overflow-wrap: anywhere; }
```

Notfall: Passt ein Text selbst in kleinster Schrift nicht, darf er mitten im Wort umbrechen und wird oben ausgerichtet. Der volle Text steht ja in der großen Hinweisleiste.

### Bildschirmtastatur

```css
.tastatur {
  display: grid;
  gap: 7px;
  padding: 8px 4px calc(env(safe-area-inset-bottom) + 8px);
  ...
}
.tasten-reihe { display: flex; gap: 5px; }
.taste { flex: 1 1 0; height: 46px; ... }
.taste.breit { flex-grow: 1.6; }
```

Jede Reihe ist eine Flexbox, alle Tasten teilen sich die Breite gleich (`flex: 1 1 0`). Sondertasten (`.breit`) bekommen das 1,6-Fache. Unten kommt der Platz für den iPhone-Home-Balken dazu (`safe-area-inset-bottom`).

### Media Queries für verschiedene Geräte

```css
@media (max-height: 720px) {
  .hinweis-leiste { min-height: 54px; }
  .taste { height: 42px; }
  ...
}
```

Auf niedrigen Bildschirmen (z. B. iPhone in Safari mit eingeblendeter Adressleiste) wird alles etwas kompakter, damit mehr Platz fürs Gitter bleibt.

```css
@media (hover: hover) and (pointer: fine) {
  .tastatur { display: none; }
  .tastatur-tipp { display: block; }
}
```

Diese Media Query fragt nicht nach der Bildschirmgröße, sondern nach dem **Eingabegerät**: `hover: hover` (man kann über Dinge fahren, ohne zu klicken) und `pointer: fine` (zeigt genau, also Maus). Das trifft auf PCs zu, nicht auf Handys und Tablets. Am PC braucht man keine Bildschirmtastatur. Das ist zuverlässiger als "Bildschirm breiter als X", weil auch ein großes Tablet keine Maus hat.

---

## 6. Dialoge als Blatt von unten

```css
.blatt {
  width: min(100%, 520px);
  max-width: 100%;
  margin: auto auto 0;
  ...
}
.blatt[open] { animation: hochschieben 0.22s ease-out; }
.blatt::backdrop { background: rgba(15, 20, 23, 0.45); }
```

- `margin: auto auto 0`: oben auto, links/rechts auto, unten 0. So klebt der Dialog unten am Rand und ist waagerecht zentriert. Wie ein "Bottom Sheet" in iOS-Apps, gut mit dem Daumen erreichbar.
- `[open]` ist das Attribut, das der Browser beim Öffnen setzt. Dann läuft eine kurze Animation (das Blatt gleitet hoch). Diese Bewegung zeigt, *was* sich geändert hat, und ist deshalb sinnvoll.
- `::backdrop` ist die abgedunkelte Fläche hinter einem modalen Dialog.

## 7. Weniger Bewegung

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0s !important;
    transition: none !important;
  }
}
```

Manche Menschen bekommen von Animationen Schwindel und stellen in den Systemeinstellungen "Bewegung reduzieren" ein (iPhone: Einstellungen → Bedienungshilfen → Bewegung). Dann schalten wir alle Animationen praktisch ab. Kostet vier Zeilen, gehört zum guten Ton.

---

## Spickzettel: Einheiten und Funktionen

| Schreibweise | Bedeutung |
|---|---|
| `px` | Pixel (genauer: "CSS-Pixel", auf dem iPhone 3 echte Pixel) |
| `rem` | Vielfaches der Grundschrift (meist 16px) |
| `em` | Vielfaches der aktuellen Schriftgröße |
| `%` | Prozent vom Elternelement |
| `vw` / `vh` | 1 % der Fensterbreite / -höhe |
| `dvh` | 1 % der tatsächlich sichtbaren Höhe (mobil wichtig) |
| `fr` | Anteil am freien Platz (nur in Grid) |
| `calc(a + b)` | Rechnen mit gemischten Einheiten |
| `min(a, b)` / `max(a, b)` | kleinerer / größerer Wert |
| `var(--x, standard)` | Variable lesen, mit Ersatzwert |
| `env(safe-area-inset-top)` | Platz für iPhone-Notch und Home-Balken |
