# 03 – HTML: das Gerüst

Datei: `index.html`. HTML beschreibt, **was** auf der Seite ist (Überschrift, Knopf, Liste), nicht wie es aussieht (das macht CSS) und nicht, was es tut (das macht JavaScript).

Die App hat nur **eine** HTML-Datei. Start- und Spielseite stehen beide darin, und JavaScript blendet jeweils eine aus. So eine App nennt man **Single Page Application** (SPA). Vorteil: Beim Wechsel muss nichts neu geladen werden, und offline ist es eine Datei weniger.

## Der Kopf (`<head>`)

Der Kopf enthält Informationen *über* die Seite. Davon ist nichts direkt sichtbar.

```html
<!doctype html>
<html lang="de">
```

- `<!doctype html>` sagt dem Browser: modernes HTML5. Ohne diese Zeile schaltet er in einen alten Kompatibilitätsmodus ("Quirks Mode").
- `lang="de"`: Die Seite ist deutsch. Wichtig für Screenreader (Aussprache) und für die automatische **Silbentrennung** im CSS (`hyphens: auto`), die wir in den Hinweisfeldern nutzen. Ohne `lang` wüsste der Browser nicht, nach welchen Regeln er trennen soll.

```html
<meta charset="utf-8">
```

Die Datei ist in UTF-8 kodiert. Ohne diese Zeile werden Umlaute je nach Browser falsch angezeigt.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Die wichtigste Zeile für Handys:

- `width=device-width`: Die Seite ist so breit wie das Gerät. Ohne das tut ein iPhone so, als wäre es 980 Pixel breit, und verkleinert alles.
- `initial-scale=1`: Kein Zoom beim Start.
- `viewport-fit=cover`: Die Seite darf bis in die Ecken des iPhone-Bildschirms (um die Notch und den Home-Balken herum). Damit nichts unter der Notch verschwindet, halten wir im CSS mit `env(safe-area-inset-top)` Abstand. Mehr dazu im CSS-Kapitel.

```html
<title>Schwedenrätsel</title>
<meta name="description" content="100 Schwedenrätsel ...">
```

Titel im Browser-Tab und eine Beschreibung für Suchmaschinen und Link-Vorschauen.

```html
<meta name="theme-color" content="#F5F7F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1417" media="(prefers-color-scheme: dark)">
```

Die Farbe der Browserleiste (in Safari und Chrome auf dem Handy). Zwei Varianten: eine für helles, eine für dunkles Design. Das `media`-Attribut wählt die passende.

```html
<link rel="manifest" href="manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Rätsel">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
```

Alles für "Als App auf dem Home-Bildschirm":

- Das **Manifest** beschreibt die App (Name, Icons, Farben) für Android und Chrome. Siehe Kapitel 06.
- Apple liest teilweise eigene `meta`-Tags. `apple-mobile-web-app-capable` sorgt dafür, dass die App vom Home-Bildschirm ohne Safari-Leisten startet. `apple-mobile-web-app-title` ist der Name unter dem Icon (kurz, sonst wird er abgeschnitten).
- `apple-touch-icon` ist das Icon auf dem iPhone-Home-Bildschirm (180 × 180 Pixel).
- `icon` ist das kleine Icon im Browser-Tab.

```html
<link rel="preload" href="fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/style.css">
```

- `preload` sagt dem Browser: "Diese Schrift brauchst du gleich, lade sie sofort." Sonst würde er sie erst entdecken, nachdem er das CSS gelesen hat, und der Text würde kurz in einer Ersatzschrift erscheinen und dann umspringen. `crossorigin` ist bei Schriften Pflicht, auch wenn sie vom selben Server kommen (eine Eigenheit der Spezifikation).
- `stylesheet` bindet das CSS ein.

```html
<script type="module" src="js/app.js"></script>
```

Bindet das JavaScript ein. `type="module"` hat drei Folgen:

1. Wir dürfen `import` und `export` benutzen, also Code auf mehrere Dateien verteilen (wie Python-Module).
2. Das Skript läuft automatisch erst, **wenn das HTML fertig gelesen ist** (`defer`-Verhalten). Deshalb darf es im `<head>` stehen und trotzdem auf alle Elemente zugreifen.
3. Module funktionieren nur über einen Webserver, nicht per Doppelklick auf die Datei. Deshalb `python -m http.server` (Kapitel 00).

## Die Startseite

```html
<main id="startseite" class="seite startseite">
```

- `<main>` markiert den Hauptinhalt. Screenreader können direkt dorthin springen.
- `id="startseite"`: eindeutiger Name, über den JavaScript das Element findet (`document.getElementById("startseite")`). Eine `id` darf es nur **einmal** pro Seite geben.
- `class="seite startseite"`: zwei Klassen, getrennt durch Leerzeichen. Klassen benutzt CSS zum Gestalten. Ein Element kann viele Klassen haben, und eine Klasse kann an vielen Elementen hängen.

### Das Logo

```html
<h1 class="logo" aria-label="Schwedenrätsel">
  <span class="logo-zeile" aria-hidden="true">
    <span class="logo-hinweis">Rätsel mit Pfeilen</span>
    <span class="logo-feld">S</span><span class="logo-feld">C</span>...
  </span>
  <span class="logo-zeile logo-zeile-2" aria-hidden="true">
    <span class="logo-leer"></span>
    <span class="logo-feld">R</span>...
  </span>
</h1>
```

Das Logo ist selbst ein kleines Schwedenrätsel: ein blaues Hinweisfeld mit Pfeil und dahinter die Buchstaben in Kästchen.

- `<h1>` ist die Hauptüberschrift.
- Ein Problem: Ein Screenreader würde "Rätsel mit Pfeilen S C H W E D E N R Ä T S E L" vorlesen, Buchstabe für Buchstabe. Deshalb:
  - `aria-label="Schwedenrätsel"` gibt der Überschrift einen sauberen Namen zum Vorlesen,
  - `aria-hidden="true"` versteckt die einzelnen Kästchen vor dem Screenreader.

  **ARIA** (Accessible Rich Internet Applications) sind Attribute, die Hilfstechnik wie Screenreadern zusätzliche Informationen geben.
- `<span>` ist ein neutrales Element ohne eigene Bedeutung, nur zum Gestalten.
- Die `<span>` stehen ohne Leerzeichen dazwischen in einer Zeile: `</span><span>`. Absicht, sonst entstünden kleine Lücken zwischen den Kästchen (Leerzeichen im HTML werden als Leerzeichen dargestellt).

### Weiterspielen

```html
<button id="weiterspielen" class="weiterspielen" type="button" hidden>
  <span class="weiterspielen-titel">Weiterspielen</span>
  <span id="weiterspielen-name" class="weiterspielen-name"></span>
</button>
```

- `<button>` ist ein echter Knopf: per Tastatur erreichbar (Tab), mit Enter/Leertaste auslösbar, für Screenreader als Knopf erkennbar. Einen klickbaren `<div>` sollte man nie statt eines Knopfs nehmen.
- `type="button"`: Ohne diese Angabe wäre ein Knopf innerhalb eines Formulars ein "Absenden"-Knopf. Hier gibt es kein Formular, aber es ist eine gute Gewohnheit.
- `hidden`: versteckt. JavaScript entfernt das Attribut, wenn es ein angefangenes Rätsel gibt.
- Der `span` mit dem Namen ist leer. JavaScript füllt ihn mit z. B. "Mittel, Rätsel 4".

### Auswahl der Schwierigkeit

```html
<section class="auswahl" aria-label="Rätsel auswählen">
  <div class="stufen" role="tablist" aria-label="Schwierigkeitsgrad">
    <button class="stufe" role="tab" type="button" data-stufe="leicht">Leicht</button>
    ...
  </div>
  <p id="stufen-info" class="stufen-info"></p>
  <div id="raetsel-liste" class="raetsel-liste" role="list"></div>
</section>
```

- `<section>` gruppiert zusammengehörigen Inhalt.
- `role="tablist"` und `role="tab"` sagen dem Screenreader: Das sind Reiter. Welcher aktiv ist, steht in `aria-selected="true"`, das setzt JavaScript. Das CSS benutzt dasselbe Attribut zum Einfärben, so bleiben Optik und Bedeutung immer synchron.
- `data-stufe="leicht"` ist ein **data-Attribut**: selbst erfundene Daten am Element. In JavaScript liest man es mit `knopf.dataset.stufe`. Alles, was mit `data-` beginnt, ist dafür frei.
- Die Rätselliste ist leer. JavaScript erzeugt die 35 (bzw. 30) Kästchen.

### Fußbereich

```html
<footer class="start-fuss">
  <p id="install-tipp" class="install-tipp" hidden>...</p>
  <label class="schalter">
    <input type="checkbox" id="auto-pruefen">
    <span>Falsche Buchstaben sofort rot markieren</span>
  </label>
  <button id="zuruecksetzen" class="text-knopf" type="button">Gesamten Fortschritt löschen</button>
</footer>
```

- Ein `<label>`, das ein `<input>` umschließt, verbindet beide: Ein Tipp auf den Text schaltet auch die Checkbox. Auf dem Handy ist das viel angenehmer, als das kleine Kästchen zu treffen.

## Die Spielseite

```html
<main id="spielseite" class="seite spielseite" hidden>
```

Startet versteckt.

### Kopfzeile

```html
<header class="spiel-kopf">
  <button id="zurueck" class="icon-knopf" type="button" aria-label="Zur Übersicht">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
  </button>
  <h2 id="spiel-name" class="spiel-name"></h2>
  <span id="uhr" class="uhr" aria-label="Spielzeit">0:00</span>
  <button id="zoom" ... aria-pressed="false">...</button>
  <button id="hilfe-knopf" ...>...</button>
</header>
```

- Die Symbole sind **SVG**: Vektorgrafik direkt im HTML. Sie bleiben in jeder Größe scharf und übernehmen über CSS (`stroke: currentColor`) die Textfarbe, also auch im Dunkelmodus.
- `viewBox="0 0 24 24"` legt ein Koordinatensystem von 24 × 24 fest. Der `path` zeichnet darin: `M15 5` heißt "gehe zu Punkt (15, 5)", `l-7 7` "zeichne eine Linie 7 nach links und 7 nach unten", `7 7` "dann 7 nach rechts und 7 nach unten". Ergebnis: ein `<`-Pfeil.
- Weil ein Knopf nur mit Symbol für Screenreader stumm wäre, bekommt er ein `aria-label`.
- `aria-pressed="false"` macht den Zoom-Knopf zu einem Umschalter. JavaScript setzt ihn auf `"true"`, und CSS färbt ihn dann gelb.

### Hinweisleiste

```html
<div class="hinweis-leiste">
  <button id="vorheriges-wort" ...>...</button>
  <p id="hinweis-anzeige" class="hinweis-anzeige" aria-live="polite"></p>
  <button id="naechstes-wort" ...>...</button>
</div>
```

`aria-live="polite"`: Ändert sich der Inhalt, liest ein Screenreader ihn vor, sobald er gerade nichts anderes sagt. So hört man beim Wechsel des Worts den neuen Hinweis.

### Gitter, Lösungswort, Tastatur

```html
<div id="gitter-bereich" class="gitter-bereich">
  <div id="gitter" class="gitter" role="grid" aria-label="Rätselgitter"></div>
</div>
<div id="loesungswort" class="loesungswort" aria-label="Lösungswort"></div>
<p class="tastatur-tipp">Einfach lostippen. ...</p>
<div id="tastatur" class="tastatur" aria-label="Bildschirmtastatur"></div>
```

Alles leer, alles wird von JavaScript gefüllt. Der äußere `gitter-bereich` ist der Rahmen, der scrollen kann, das innere `gitter` ist das eigentliche Rätsel. Die Trennung braucht man fürs Zentrieren und Scrollen (siehe CSS).

`tastatur-tipp` und `tastatur` sind beide da. CSS zeigt am PC den Tipp und auf dem Handy die Tastatur.

## Die Dialoge

```html
<dialog id="hilfe-dialog" class="blatt">
  <h2 class="blatt-titel">Hilfe</h2>
  <div class="blatt-knoepfe">
    <button type="button" data-aktion="buchstabe">Diesen Buchstaben aufdecken</button>
    ...
    <button type="button" data-aktion="neustart" class="gefahr">Rätsel leeren und neu starten</button>
  </div>
  <button type="button" data-aktion="schliessen" class="blatt-schliessen">Zurück zum Rätsel</button>
</dialog>
```

`<dialog>` ist ein eingebautes HTML-Element für Fenster über der Seite. JavaScript öffnet es mit `dialog.showModal()`. Was man dadurch geschenkt bekommt:

- Der Hintergrund wird abgedunkelt (`::backdrop` im CSS).
- Der Rest der Seite ist gesperrt, Tab springt nur innerhalb des Dialogs.
- Die Escape-Taste schließt ihn.
- Der erste Knopf bekommt automatisch den Fokus.

Früher musste man das alles selbst programmieren. Jeder Knopf trägt in `data-aktion` den Namen seiner Aktion. So reicht in JavaScript **ein** Klick-Empfänger für den ganzen Dialog, der nachschaut, welche Aktion gemeint ist.

Es gibt drei Dialoge:

- `hilfe-dialog`: das Hilfe-Menü,
- `geschafft-dialog`: "Gelöst!" mit Zeit und Lösungswort,
- `frage-dialog`: eine Sicherheitsabfrage ("Wirklich alles löschen?"). Ihr Text wird jedes Mal von JavaScript gesetzt. Wir nehmen das statt `window.confirm()`, weil das eingebaute `confirm` hässlich ist, sich nicht gestalten lässt und auf dem iPhone die URL der Seite anzeigt.

## Warum so wenig HTML?

Das ganze Spielfeld, die Rätselliste und die Tastatur werden von JavaScript erzeugt. Das HTML enthält nur die festen Teile. Faustregel: **Was immer gleich ist, steht im HTML. Was von Daten abhängt (welches Rätsel, wie viele Kästchen), baut JavaScript.**
