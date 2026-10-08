# 08 – Übungen zum Weiterbauen

Am meisten lernst du, wenn du selbst etwas änderst. Die Übungen sind nach Schwierigkeit sortiert. Zu jeder steht, wo du anfangen musst, und ein Tipp. Lösungen gibt es absichtlich nicht. Wenn du festhängst, frag mich, dann gehen wir es zusammen durch.

Vor jeder Übung: lokalen Server starten (`python -m http.server 8000`) und im Browser F12 öffnen, damit du Fehler sofort siehst.

---

## Aufwärmen (nur Daten und CSS)

### 1. Eigene Wörter
Schreib 20 Wörter aus deinem Leben in die Wortliste: Orte rund um Mannheim, Begriffe aus Home Assistant, dem 3D-Druck, Gaming. Erzeuge die Rätsel neu und such deine Wörter.

- **Wo:** `generator/woerter/*.txt`
- **Tipp:** Kurze Wörter (3–5 Buchstaben) landen viel öfter in Rätseln als lange.

### 2. Andere Farbe für den Textmarker
Mach den Textmarker grün statt gelb, für helles und dunkles Design.

- **Wo:** `css/style.css`, ganz oben bei `:root` und in `@media (prefers-color-scheme: dark)`
- **Tipp:** Du musst nur zwei Variablen pro Modus ändern. Wenn du dafür mehr als vier Zeilen anfassen musst, machst du es zu kompliziert.

### 3. Größere Buchstaben im Gitter
Die Buchstaben sind 56 % so hoch wie ein Feld. Probier 65 %.

- **Wo:** `.eingabe` in `style.css`
- **Tipp:** `calc(var(--zelle) * 0.56)`

---

## Leicht (kleine JavaScript-Änderungen)

### 4. "Zufälliges Rätsel"-Knopf
Ein Knopf auf der Startseite, der ein zufälliges, noch nicht gelöstes Rätsel der gewählten Stufe öffnet.

- **Wo:** `index.html` (Knopf einfügen), `app.js` (in `verbindeKnoepfe`)
- **Tipp:** `Math.floor(Math.random() * liste.length)` liefert einen zufälligen Index. Zum Öffnen reicht `location.hash = "#/spiel/" + id`.

### 5. Bestzeit pro Stufe
Zeig unter den Reitern nicht nur "12 von 35 gelöst", sondern auch die schnellste Zeit dieser Stufe.

- **Wo:** `zeichneStartseite()` in `app.js`
- **Tipp:** In der Schleife über die Rätsel kennst du für jedes gelöste Rätsel `stand.zeit`. Merk dir das Minimum. `formatiereZeit` gibt es schon.

### 6. Fehler sofort markieren als Standard für "Leicht"
Bei leichten Rätseln sollen Fehler immer sofort rot sein, unabhängig von der Einstellung.

- **Wo:** `aktualisiere()` in `spiel.js`
- **Tipp:** `this.raetsel.schwierigkeit` kennst du dort.

---

## Mittel

### 7. Neue Hilfe: "Lösungswort-Buchstabe aufdecken"
Eine Hilfe, die den nächsten noch fehlenden Buchstaben des Lösungsworts aufdeckt.

- **Wo:** Knopf im `hilfe-dialog` in `index.html`, neue Methode in `spiel.js`, Aufruf im Hilfe-Klick in `app.js`
- **Tipp:** `this.raetsel.loesung.felder` ist die Liste der Felder. `deckeFelderAuf([[r, c]])` gibt es schon.

### 8. Mehrere Hinweise pro Wort
Ein Wort soll in verschiedenen Rätseln verschiedene Hinweise bekommen können, damit sich ER, ES, NE nicht so oft gleich lesen.

- **Wo:** Wortlisten-Format, `lade_woerter` und `hinweistext` in `generator.py`
- **Tipp:** Erlaube mehrere leichte Hinweise, getrennt durch `;`, zum Beispiel `ER | 1 | Fürwort (männlich); Er und sie: ... | Männliches Fürwort`. In `lade_woerter` mit `.split(";")` eine Liste daraus machen, in `hinweistext` mit `rng.choice(...)` einen auswählen (dafür muss `rng` als Parameter mit).

### 9. Neue Stufe "Profi"
Eine vierte Stufe mit 11 × 15 Feldern und nur Level-2- und Level-3-Wörtern.

- **Wo:** `SCHWIERIGKEITEN` in `generator.py`, `STUFEN_NAMEN` in `app.js`, ein vierter Reiter in `index.html`
- **Tipp:** Für "nur Level 2 und 3" braucht der Pool eine zusätzliche Bedingung `e["level"] >= 2`. Rechne damit, dass der Generator dafür deutlich länger braucht, weil weniger Wörter zur Auswahl stehen.

### 10. Dunkelmodus zum Umschalten
Ein Schalter auf der Startseite: Automatisch / Hell / Dunkel.

- **Wo:** `style.css`, `app.js`, `speicher.js`
- **Tipp:** Statt nur `@media (prefers-color-scheme: dark)` eine zweite Regel `:root[data-design="dunkel"] { ... }` mit denselben Variablen. JavaScript setzt dann `document.documentElement.dataset.design = "dunkel"`.

---

## Schwer

### 11. Tests für den Generator
Schreib automatische Tests mit `pytest` für `hinweisfeld_fuer`, `finde_woerter` und `pruefe_raetsel`.

- **Wo:** neue Datei `generator/test_generator.py`
- **Tipp:** `pip install pytest`, dann:
  ```python
  import generator as g

  def test_wort_am_oberen_rand():
      assert g.hinweisfeld_fuer({"sr": 0, "sc": 3, "richtung": "senkrecht"}) == (0, 2, "rechts_unten")
  ```
  Ausführen mit `python -m pytest` im Ordner `generator`. Gute Tests prüfen besonders die Ränder und Sonderfälle.

### 12. Tagesrätsel
Auf der Startseite oben ein "Rätsel des Tages", das jeden Tag ein anderes ist, aber für denselben Tag immer dasselbe.

- **Wo:** `app.js`
- **Tipp:** Aus dem Datum eine Zahl machen: `Math.floor(Date.now() / 86400000)` sind die Tage seit 1970. Modulo Anzahl der Rätsel ergibt einen Index.

### 13. Weniger Zweier-Wörter
Im Schnitt hat ein schweres Rätsel 15 Wörter mit nur 2 Buchstaben. Bring das unter 10, ohne dass der Generator viel langsamer wird.

- **Wo:** `reihenfolge` in `MusterBauer` und `bewerte` in `generator.py`
- **Tipp:** Ein Zweier-Wort entsteht in der Schablone, wenn ein Lauf nach genau 2 Feldern endet. Probier, wie sich `p *= 0.4` bei `links == 1` auf die Statistik auswirkt. Miss vorher und nachher (Anzahl Zweier und Laufzeit), und ändere immer nur eine Sache auf einmal.

### 14. Schneller füllen
`WortFueller._suche` berechnet bei jedem Schritt die Kandidaten für **alle** offenen Lücken neu. Dabei ändern sich durch ein neues Wort nur die Lücken, die es kreuzt.

- **Wo:** `WortFueller` in `generator.py`
- **Tipp:** Merk dir die Kandidatenlisten pro Lücke und rechne nach dem Einsetzen eines Worts nur die kreuzenden Lücken neu. Beim Zurücknehmen musst du die alten Listen wiederherstellen. Miss mit `time.time()`, ob es sich lohnt.
