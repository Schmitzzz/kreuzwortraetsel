# 02 – Der Generator (Python)

Datei: `generator/generator.py`. Das ist das Herz des Projekts. Hier lernst du:

- wie ein Schwedenrätsel aufgebaut ist (die Regeln),
- wie man so ein Rätsel automatisch baut (Backtracking, Suche mit Heuristik),
- und eine Menge Python-Techniken, die über die Grundlagen hinausgehen.

Am Ende des Kapitels steht ein [Python-Spickzettel](#python-spickzettel) mit allen verwendeten Sprachmitteln.

---

## 1. Die Regeln eines Schwedenrätsels

So sieht ein kleines Schwedenrätsel im Code aus. `#` ist ein Hinweisfeld, Buchstaben sind Buchstabenfelder:

```
# T I E F
# A # H E
A L L E E
```

Die Regeln, die der Generator einhalten muss:

1. **Jede Folge von 2+ Buchstaben ist ein Wort** und muss in der Wortliste stehen. Waagerecht wird von links nach rechts gelesen, senkrecht von oben nach unten. Im Beispiel: `TIEF` (Zeile 0), `HE` (Zeile 1), `ALLEE` (Zeile 2), `TAL` (Spalte 1), `EHE` (Spalte 3), `FEE` (Spalte 4). Das `I` in Spalte 2 steht senkrecht allein, das ist erlaubt, weil es waagerecht zu `TIEF` gehört.
2. **Jeder Buchstabe gehört zu mindestens einem Wort.** Ein einzelner Buchstabe, der weder links/rechts noch oben/unten einen Nachbar-Buchstaben hat, wäre unlösbar.
3. **Jedes Wort hat genau einen Hinweis.** Der steht im Hinweisfeld direkt *vor* dem Wort: links davon bei waagerechten Wörtern, darüber bei senkrechten.
4. **Am Rand gibt es kein Feld davor.** `TAL` beginnt in Zeile 0, darüber ist nichts. Dann steht der Hinweis im Hinweisfeld links daneben, und ein **Knick-Pfeil** zeigt "erst nach rechts, dann nach unten". Genauso bei waagerechten Wörtern am linken Rand: Hinweis darüber, Pfeil "erst nach unten, dann nach rechts" (`ALLEE`).
5. **Ein Hinweisfeld fasst höchstens 2 Hinweise** (oben und unten geteilt) und **darf nicht leer sein**.
6. **Kein Wort doppelt** im selben Rätsel.

Daraus ergeben sich vier Pfeil-Typen, gesehen vom Hinweisfeld aus:

| Name im Code | Wort beginnt … | läuft nach … | Symbol | Wo? |
|---|---|---|---|---|
| `rechts` | rechts daneben | rechts | → | überall |
| `unten` | darunter | unten | ↓ | überall |
| `unten_rechts` | darunter | rechts | ↳ | nur Spalte 0 |
| `rechts_unten` | rechts daneben | unten | ↴ | nur Zeile 0 |

Im Beispiel oben hat das Feld oben links (`#` in Zeile 0, Spalte 0) zwei Hinweise: `rechts` für TIEF und `rechts_unten` für TAL. Das `#` in Zeile 1, Spalte 0 hat nur einen: `unten_rechts` für ALLEE. Das `#` in Zeile 1, Spalte 2 erklärt `HE` (rechts daneben, "Ausruf: ..., du da!"). Nach unten geht von dort kein Wort ab, weil darunter nur noch ein einziges Feld ist.

Schon in diesem 5×3-Gitter muss man genau hinschauen, ob alle Regeln stimmen. Genau das erledigt der Generator automatisch.

---

## 2. Warum das Bauen schwierig ist

Ein mittleres Rätsel hat 9 × 11 = 99 Felder. Jedes Feld ist entweder Hinweisfeld oder einer von 26 Buchstaben. Das sind 27⁹⁹ Möglichkeiten, eine Zahl mit 142 Stellen. Alles durchprobieren ist unmöglich.

Die Lösung heißt **Backtracking** ("Zurückverfolgen"). Das Prinzip kennst du vom Sudoku-Lösen von Hand oder vom Weg durch ein Labyrinth:

1. Triff eine Entscheidung (Zahl eintragen, links abbiegen).
2. Prüfe sofort, ob eine Regel verletzt ist.
3. Wenn ja: Entscheidung zurücknehmen, nächste Möglichkeit probieren.
4. Wenn keine Möglichkeit mehr übrig ist: einen Schritt **zurück** und dort die nächste Möglichkeit probieren.

Der Trick ist Schritt 2: Je früher man eine Sackgasse erkennt, desto weniger Arbeit. Man spricht vom **Beschneiden** des Suchbaums.

### Die Geschichte dieses Generators (lehrreich!)

Der erste Versuch hat Feld für Feld gleichzeitig entschieden: Hinweisfeld oder welcher Buchstabe? Das klang logisch, hat aber nicht funktioniert. Bei "Mittel" und "Schwer" fand er in Minuten **kein einziges** Rätsel. Die Diagnose: Die Suche blieb immer in Zeile 2 stecken. Eine schlechte Entscheidung in Zeile 0 (etwa fünf Hinweisfelder nebeneinander) fiel erst in Zeile 2 auf. Bis dahin hatte die Suche aber tausende Kombinationen in Zeile 1 und 2 durchprobiert, die alle hoffnungslos waren.

Die Lösung war, das Problem in **zwei Phasen** zu zerlegen:

1. **Schablone bauen** (`MusterBauer`): Nur entscheiden, wo Hinweisfelder sind. Pro Feld gibt es nur 2 Möglichkeiten, und alle Regeln lassen sich lokal prüfen. Das geht in Millisekunden.
2. **Wörter einsetzen** (`WortFueller`): Jetzt stehen die Lücken fest ("hier ein 5-Buchstaben-Wort waagerecht"). Das ist das klassische Kreuzworträtsel-Füllproblem, und dafür gibt es eine sehr wirksame Strategie: **immer zuerst die Lücke füllen, für die es am wenigsten passende Wörter gibt**.

Ergebnis: von 0 Rätseln in Minuten auf etwa 3 Sekunden pro Rätsel. Die Lehre daraus gilt weit über Rätsel hinaus: **Wenn eine Suche hängt, zerleg das Problem in Teile mit kleinerem Suchraum, und entscheide das Schwierigste zuerst.**

---

## 3. Der Code von oben nach unten

### 3.1 Der Kopf: Docstring und Imports

```python
"""
Schwedenrätsel-Generator
========================
...
"""
```

Ein Text in dreifachen Anführungszeichen ganz oben in einer Datei heißt **Docstring**. Python speichert ihn als Beschreibung des Moduls. `help(generator)` würde ihn anzeigen.

```python
import argparse      # Kommandozeilen-Optionen wie --seed 7
import collections   # Counter und defaultdict (praktische Dict-Varianten)
import json          # Daten als JSON-Text speichern
import pathlib       # Dateipfade bequem und betriebssystemunabhängig
import random        # Zufallszahlen
import time          # Zeit messen, Datum
```

Alles aus der Standardbibliothek, du musst nichts mit `pip` installieren.

### 3.2 Einstellungen

```python
ORDNER = pathlib.Path(__file__).resolve().parent
WORT_ORDNER = ORDNER / "woerter"
AUSGABE = ORDNER.parent / "data" / "puzzles.json"
```

- `__file__` ist der Pfad dieser Python-Datei.
- `pathlib.Path(...)` macht daraus ein Pfad-Objekt.
- `.resolve()` macht den Pfad absolut (z. B. `C:\Users\…\generator\generator.py`).
- `.parent` ist der Ordner, in dem die Datei liegt.
- Der `/`-Operator hängt Pfadteile aneinander. `ORDNER / "woerter"` ergibt `…\generator\woerter`. Das funktioniert unter Windows, Mac und Linux gleich, auch wenn Windows eigentlich `\` benutzt.

Vorteil: Egal aus welchem Ordner du `python generator.py` aufrufst, die Pfade stimmen immer.

Großgeschriebene Namen sind in Python die Konvention für **Konstanten**: Werte, die sich während des Programms nicht ändern.

```python
HINWEIS = "#"
LUECKE = "."
```

Zwei Zeichen, die im Gitter etwas bedeuten. In der Schablone (Phase 1) steht `.` für "hier kommt irgendein Buchstabe hin". Im fertigen Gitter stehen dort echte Buchstaben.

```python
SCHWIERIGKEITEN = {
    "leicht": {"breite": 8, "hoehe": 9, "anzahl": 35, "max_level": 1,
               "max_lauf": 6, "loesung_laenge": 5, "max_wiederholung": 2},
    ...
}
```

Ein **verschachteltes Dictionary**: Zu jedem Schwierigkeitsgrad gehört ein Dict mit Einstellungen. So stehen alle Stellschrauben an einer Stelle. Willst du größere Rätsel, änderst du nur hier `breite` und `hoehe`.

`max_lauf` begrenzt die Wortlänge. Bei "Schwer" sind es 7, weil es nur wenige längere Wörter in der Liste gibt. Bei 8 wurde der Generator deutlich langsamer.

```python
PFEILE = ("rechts", "unten", "unten_rechts", "rechts_unten")
```

Ein **Tupel**: wie eine Liste, aber unveränderlich. Gut für feste Aufzählungen.

### 3.3 Wortliste laden: `lade_woerter`

```python
def lade_woerter(ordner=WORT_ORDNER):
    woerter = {}
    for datei in sorted(ordner.glob("*.txt")):
```

- `ordner=WORT_ORDNER` ist ein **Standardwert**. Ruft man `lade_woerter()` ohne Argument auf, nimmt Python den Wortordner.
- `ordner.glob("*.txt")` findet alle Dateien, die auf `.txt` enden. `*` heißt "beliebige Zeichen".
- `sorted(...)` sortiert sie alphabetisch, damit die Reihenfolge immer gleich ist (wichtig für reproduzierbare Ergebnisse).

```python
        text = datei.read_text(encoding="utf-8")
        for nummer, zeile in enumerate(text.splitlines(), start=1):
```

- `read_text` liest die ganze Datei als String. `encoding="utf-8"` ist wichtig für Umlaute in den Hinweisen. Unter Windows wäre der Standard sonst eine andere Kodierung, und aus "Gegenteil von „hoch“" würde Zeichensalat.
- `splitlines()` teilt den Text in eine Liste von Zeilen.
- `enumerate(..., start=1)` liefert bei jedem Durchlauf ein Paar `(Nummer, Element)`, beginnend bei 1. So haben wir die Zeilennummer für Fehlermeldungen.

```python
            zeile = zeile.strip()
            if not zeile or zeile.startswith("#"):
                continue
```

- `strip()` entfernt Leerzeichen und Zeilenumbrüche am Anfang und Ende.
- `not zeile` ist `True`, wenn die Zeile leer ist (leere Strings gelten als "falsch").
- `continue` springt direkt zum nächsten Schleifendurchlauf.

```python
            teile = [t.strip() for t in zeile.split("|")]
```

Eine **List Comprehension**: eine kompakte Schreibweise für "baue eine Liste, indem du für jedes Element etwas tust". Ausgeschrieben wäre das:

```python
teile = []
for t in zeile.split("|"):
    teile.append(t.strip())
```

```python
            if len(teile) != 4:
                raise ValueError(f"{datei.name}:{nummer}: erwartet 4 Spalten, gefunden {len(teile)}")
            wort, level, leicht, schwer = teile
```

- `raise ValueError(...)` bricht das Programm mit einer Fehlermeldung ab. Besser früh und deutlich scheitern als später mit kaputten Daten weiterrechnen.
- `f"..."` ist ein **f-String**: Ausdrücke in `{}` werden direkt eingesetzt.
- `wort, level, leicht, schwer = teile` ist **Entpacken**: Die vier Listenelemente landen in vier Variablen.

```python
            if not (wort.isascii() and wort.isalpha() and wort.isupper()):
                raise ValueError(...)
```

Drei String-Methoden prüfen: nur ASCII-Zeichen (also kein Ä), nur Buchstaben, alles groß. Zusammen heißt das: nur A–Z.

```python
            if wort in woerter:
                raise ValueError(...)
            woerter[wort] = {
                "wort": wort,
                "level": int(level),
                "leicht": leicht,
                "schwer": schwer or leicht,
            }
    return woerter
```

- `wort in woerter` prüft bei einem Dict, ob der **Schlüssel** existiert. Das ist sehr schnell, egal wie groß das Dict ist.
- `int(level)` macht aus dem Text `"1"` die Zahl `1`.
- `schwer or leicht`: Der `or`-Operator gibt den ersten "wahren" Wert zurück. Ist `schwer` ein leerer String (falsch), kommt `leicht` raus. Ein häufiger Python-Trick für Standardwerte.

Ergebnis ist ein Dict wie:

```python
{"HUND": {"wort": "HUND", "level": 1, "leicht": "Bester Freund", "schwer": "Bello"}, ...}
```

### 3.4 Gemeinsame Hilfsfunktionen

#### `feld(gitter, r, c)`

```python
def feld(gitter, r, c):
    if 0 <= r < len(gitter) and 0 <= c < len(gitter[0]):
        return gitter[r][c]
    return HINWEIS
```

Das Gitter ist eine **Liste von Listen**: `gitter[r]` ist Zeile `r`, `gitter[r][c]` das Feld in Spalte `c`. `r` steht für row (Zeile), `c` für column (Spalte).

- `0 <= r < len(gitter)` ist eine **verkettete Vergleichskette**, die Python erlaubt: "r ist mindestens 0 und kleiner als die Anzahl der Zeilen".
- Liegt das Feld außerhalb, geben wir `HINWEIS` zurück. Das ist ein bewusster Trick: Für die Regeln verhält sich der Rand genau wie ein Hinweisfeld (dort kann kein Wort weitergehen). So brauchen alle anderen Funktionen keine Sonderfälle für den Rand.

#### `slot_status(gitter, r, c, pfeil)`

Beantwortet die Frage: "Beginnt beim Hinweisfeld (r, c) in Richtung `pfeil` ein Wort?"

```python
    if pfeil == "rechts":
        a, b = (r, c + 1), (r, c + 2)
    elif pfeil == "unten":
        a, b = (r + 1, c), (r + 2, c)
    elif pfeil == "unten_rechts":
        if c != 0:
            return False
        a, b = (r + 1, 0), (r + 1, 1)
    else:
        if r != 0:
            return False
        a, b = (0, c + 1), (1, c + 1)
```

Ein Wort hat mindestens 2 Buchstaben. Es reicht also, die **ersten beiden Felder** `a` und `b` des möglichen Worts anzuschauen. Bei `rechts` sind das die zwei Felder rechts daneben. Bei `unten_rechts` ist es das Feld darunter und dessen rechter Nachbar. Knick-Pfeile gibt es nur am Rand, deshalb sofort `False`, wenn wir nicht am Rand sind.

```python
    fa, fb = feld(gitter, *a), feld(gitter, *b)
```

`*a` **entpackt** das Tupel `a`. Aus `feld(gitter, *(3, 5))` wird `feld(gitter, 3, 5)`.

```python
    if fa == HINWEIS or fb == HINWEIS:
        return False
    if fa is None or fb is None:
        return None
    return True
```

Drei mögliche Antworten:

- `False`: Eins der Felder ist ein Hinweisfeld (oder Rand) → hier beginnt sicher kein Wort.
- `None`: Eins der Felder ist noch nicht entschieden (in Phase 1 steht dort noch `None`) → wissen wir noch nicht.
- `True`: Beide sind Buchstaben → hier beginnt ein Wort.

Diese **Drei-Wert-Logik** (ja/nein/weiß-noch-nicht) ist zentral: Sie erlaubt, Regeln schon zu prüfen, während das Gitter noch halb leer ist. `is None` statt `== None` ist die empfohlene Python-Schreibweise für den Vergleich mit `None`.

#### `finde_woerter(gitter)`

Geht das ganze Gitter durch und sammelt alle Wörter mit Startfeld, Richtung und Feldern. Wird von beiden Phasen gebraucht: In Phase 1 sind die "Wörter" noch Lücken wie `"....."`, am Ende echte Wörter.

```python
    H, B = len(gitter), len(gitter[0])
    ergebnis = []
    for r in range(H):
        for c in range(B):
            if gitter[r][c] == HINWEIS:
                continue
```

Doppelte Schleife über alle Felder. Hinweisfelder überspringen.

```python
            if c == 0 or gitter[r][c - 1] == HINWEIS:
                ende = c
                while ende < B and gitter[r][ende] != HINWEIS:
                    ende += 1
```

Ein waagerechtes Wort **beginnt** dort, wo links kein Buchstabe steht: entweder linker Rand (`c == 0`) oder Hinweisfeld links. Dann läuft `ende` nach rechts, bis ein Hinweisfeld oder der Rand kommt. Danach zeigt `ende` auf das erste Feld *hinter* dem Wort.

```python
                if ende - c >= 2:
                    felder = [(r, k) for k in range(c, ende)]
                    ergebnis.append({"sr": r, "sc": c, "richtung": "waagerecht",
                                     "felder": felder,
                                     "wort": "".join(gitter[r][k] for k in range(c, ende))})
```

- `ende - c` ist die Länge. Nur ab 2 ist es ein Wort.
- `sr`, `sc` = start row, start column.
- `"".join(...)` klebt die Buchstaben zu einem String zusammen. In der Klammer steht ein **Generator-Ausdruck**, wie eine List Comprehension, nur ohne eckige Klammern (spart Speicher, weil keine Zwischenliste entsteht).

Der senkrechte Teil funktioniert genauso, nur mit `r` und `c` vertauscht.

#### `hinweisfeld_fuer(wort)`

```python
    r, c = wort["sr"], wort["sc"]
    if wort["richtung"] == "waagerecht":
        if c > 0:
            return r, c - 1, "rechts"
        return r - 1, 0, "unten_rechts"
    if r > 0:
        return r - 1, c, "unten"
    return 0, c - 1, "rechts_unten"
```

Setzt Regel 3 und 4 direkt um. Ein waagerechtes Wort, das nicht am linken Rand beginnt, hat seinen Hinweis links daneben. Am linken Rand: im Feld darüber mit Knick. Für senkrechte Wörter entsprechend.

`return r, c - 1, "rechts"` gibt ein **Tupel** mit drei Werten zurück. Der Aufrufer kann es direkt entpacken: `hr, hc, pfeil = hinweisfeld_fuer(w)`.

---

### 3.5 Phase 1: `MusterBauer` – die Schablone

Eine **Klasse** bündelt Daten (Attribute wie `self.gitter`) und Funktionen, die mit diesen Daten arbeiten (Methoden). `self` ist das Objekt selbst. Von Python kennst du das vielleicht noch nicht viel, deshalb ausführlich:

```python
class MusterBauer:
    def __init__(self, breite, hoehe, max_lauf, rng, p_hinweis=0.3):
        self.B = breite
        self.H = hoehe
        self.max_lauf = max_lauf
        self.rng = rng
        self.p_hinweis = p_hinweis
        self.gitter = [[None] * breite for _ in range(hoehe)]
        self.schritte = 0
```

- `__init__` ist der **Konstruktor**. Er läuft automatisch, wenn man `MusterBauer(8, 9, 6, rng)` schreibt.
- `self.B = breite` speichert den Wert im Objekt, damit andere Methoden ihn später benutzen können.
- `[[None] * breite for _ in range(hoehe)]` baut `hoehe` Zeilen mit je `breite` mal `None`. `_` ist der übliche Name für eine Schleifenvariable, die man nicht braucht.

> **Falle:** `[[None] * breite] * hoehe` sähe kürzer aus, ist aber falsch! Dann wären alle Zeilen **dasselbe** Listenobjekt, und eine Änderung in Zeile 0 stünde plötzlich in allen Zeilen. Die Comprehension erzeugt für jede Zeile eine neue Liste.

- `rng` ist ein eigener Zufallsgenerator (`random.Random`), den `main()` mit einer festen Startzahl (Seed) erzeugt. Gleicher Seed = gleiche Zufallszahlen = gleiche Rätsel. Das macht das Programm **reproduzierbar**, was beim Fehlersuchen Gold wert ist.
- `p_hinweis=0.3`: Grundwahrscheinlichkeit, dass ein Feld ein Hinweisfeld wird. Ergibt am Ende etwa 28 % Hinweisfelder, wie in echten Rätselheften.

#### Kleine Helfer

```python
    def ist_luecke(self, r, c):
        return feld(self.gitter, r, c) == LUECKE

    def lauf_links(self, r, c):
        n = 0
        while c - 1 - n >= 0 and self.gitter[r][c - 1 - n] == LUECKE:
            n += 1
        return n
```

`lauf_links` zählt, wie viele Buchstabenfelder direkt links von `(r, c)` hintereinander stehen. Damit weiß man, wie lang das aktuelle waagerechte Wort schon ist. `lauf_oben` macht dasselbe nach oben.

#### Regel: Hinweisfeld muss 1–2 Wörter erklären

```python
    def hinweisfeld_ok(self, r, c):
        if feld(self.gitter, r, c) != HINWEIS or not (0 <= r < self.H and 0 <= c < self.B):
            return True
        status = [slot_status(self.gitter, r, c, p) for p in PFEILE]
        if status.count(True) > 2:
            return False
        if all(s is False for s in status):
            return False
        return True
```

- Ist `(r, c)` gar kein Hinweisfeld (oder außerhalb), gibt es nichts zu prüfen → `True`.
- `status` ist eine Liste mit vier Werten (`True`/`False`/`None`), einer pro Pfeil-Typ.
- `status.count(True) > 2`: Mehr als zwei Wörter passen nicht in ein Feld → Regel verletzt.
- `all(s is False for s in status)`: Alle vier sind **sicher** `False` → leeres Hinweisfeld → verletzt. Steht irgendwo noch `None`, ist `all(...)` falsch, und wir warten ab. So prüfen wir nur, was schon entscheidbar ist.

#### Regel: kein isolierter Buchstabe

```python
    def isoliert(self, r, c):
        if not self.ist_luecke(r, c):
            return False
        nachbarn = [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]
        if any(feld(self.gitter, *n) is None for n in nachbarn):
            return False
        return not any(self.ist_luecke(*n) for n in nachbarn)
```

Ein Buchstabe ist isoliert, wenn keiner seiner vier Nachbarn ein Buchstabe ist. Solange ein Nachbar noch `None` ist, können wir das nicht wissen → `False` ("nicht isoliert, zumindest noch nicht").

`any(...)` ist `True`, sobald ein Element wahr ist. `all(...)` ist `True`, wenn alle wahr sind. Beide hören auf zu suchen, sobald das Ergebnis feststeht.

#### Alle Regeln nach einem neuen Feld prüfen

```python
    def regeln_ok(self, r, c):
        if self.gitter[r][c] == LUECKE:
            if self.lauf_links(r, c) + 1 > self.max_lauf:
                return False
            if self.lauf_oben(r, c) + 1 > self.max_lauf:
                return False
```

Wurde gerade ein Buchstabenfeld gesetzt: Ist das Wort dadurch zu lang geworden? `+ 1` zählt das neue Feld mit.

```python
            if c == 1 and self.ist_luecke(r, 0) and feld(self.gitter, r - 1, 0) != HINWEIS:
                return False
            if r == 1 and self.ist_luecke(0, c) and feld(self.gitter, 0, c - 1) != HINWEIS:
                return False
```

Die Rand-Regel aus Abschnitt 1. Erste Zeile: Wir setzen ein Buchstabenfeld in Spalte 1, und in Spalte 0 steht auch ein Buchstabe. Dann beginnt in Spalte 0 ein waagerechtes Wort. Dessen Hinweis muss im Feld darüber stehen (Knick-Pfeil). Ist das kein Hinweisfeld → verboten. Die zweite Zeile ist dasselbe für senkrechte Wörter in Zeile 0.

```python
        for hr, hc in ((r, c), (r, c - 1), (r, c - 2), (r - 1, c), (r - 2, c),
                       (r - 1, 0), (0, c - 1)):
            if not self.hinweisfeld_ok(hr, hc):
                return False
```

Welche Hinweisfelder können durch das neue Feld `(r, c)` ihren Status geändert haben? Genau die, deren "erste zwei Felder" `(r, c)` enthalten:

- `(r, c)` selbst (falls es ein Hinweisfeld ist; am rechten/unteren Rand kann es sofort leer sein),
- `(r, c-1)` und `(r, c-2)`: deren Pfeil `rechts` schaut auf `(r, c)`,
- `(r-1, c)` und `(r-2, c)`: deren Pfeil `unten` schaut auf `(r, c)`,
- `(r-1, 0)` und `(0, c-1)`: die Knick-Pfeile am Rand.

Statt nach jedem Schritt das ganze Gitter zu prüfen, prüfen wir nur diese 7 Felder. Das macht die Suche schnell. Man nennt so etwas **inkrementelle Prüfung**.

```python
        for br, bc in ((r - 1, c), (r, c - 1), (r, c)):
            if self.isoliert(br, bc):
                return False
        return True
```

Dasselbe Prinzip für isolierte Buchstaben: Nur die Felder prüfen, deren letzter offener Nachbar gerade entschieden wurde.

#### Welche Möglichkeit zuerst?

```python
    def reihenfolge(self, r, c):
        if r == 0 and c == 0:
            return [HINWEIS]
        links = self.lauf_links(r, c)
        oben = self.lauf_oben(r, c)
        p = self.p_hinweis
        if links == 0 and c > 0:
            p *= 0.35
        if links == 1:
            p *= 0.4
        if oben == 1:
            p *= 0.6
        if links >= 3:
            p += 0.15 * (links - 2)
        if oben >= 3:
            p += 0.10 * (oben - 2)
        p = min(max(p, 0.02), 0.95)
        if self.rng.random() < p:
            return [HINWEIS, LUECKE]
        return [LUECKE, HINWEIS]
```

Das ist die **Heuristik**: eine Faustregel, welche Möglichkeit wir zuerst probieren. Beide werden notfalls probiert, die Reihenfolge entscheidet aber, wie das Rätsel aussieht.

- Oben links ist immer ein Hinweisfeld. Ein Buchstabe dort könnte nie einen Hinweis haben (es gibt kein Feld davor oder daneben für einen Knick).
- Steht links schon ein Hinweisfeld (`links == 0`), ist ein zweites daneben unschön → Wahrscheinlichkeit runter.
- Ist das Wort links erst 1 Buchstabe lang, würde ein Hinweisfeld es beenden, bevor es ein Wort ist → eher nicht.
- Je länger das Wort schon ist, desto eher beenden wir es.
- `min(max(p, 0.02), 0.95)` hält `p` zwischen 2 % und 95 %. Ein beliebtes Muster zum "Einklemmen" eines Wertes.
- `self.rng.random()` liefert eine Zufallszahl zwischen 0 und 1. Ist sie kleiner als `p`, kommt das Hinweisfeld zuerst.

#### Die Suche selbst (Rekursion)

```python
    def baue(self, max_schritte=5000):
        felder = [(r, c) for r in range(self.H) for c in range(self.B)]
        return self._suche(felder, 0, max_schritte)
```

`felder` ist die Reihenfolge, in der wir vorgehen: Zeile für Zeile. Eine Comprehension mit zwei `for` entspricht zwei verschachtelten Schleifen.

```python
    def _suche(self, felder, i, max_schritte):
        if i == len(felder):
            return True
        self.schritte += 1
        if self.schritte > max_schritte:
            return False
        r, c = felder[i]
        for inhalt in self.reihenfolge(r, c):
            self.gitter[r][c] = inhalt
            if self.regeln_ok(r, c) and self._suche(felder, i + 1, max_schritte):
                return True
            self.gitter[r][c] = None
            if self.schritte > max_schritte:
                return False
        return False
```

Das ist Backtracking in seiner reinsten Form. Die Methode **ruft sich selbst auf** (Rekursion):

1. `i == len(felder)`: Alle Felder sind entschieden → Erfolg.
2. `self.schritte` zählt mit. Nach 5000 Schritten geben wir auf. Der Aufrufer startet dann mit neuem Zufall von vorn. Das ist oft schneller, als sich in einer schlechten Ecke des Suchraums festzubeißen (in der Fachsprache: **Restarts**).
3. Für jede Möglichkeit (Hinweisfeld oder Lücke) in der Reihenfolge der Heuristik:
   - eintragen,
   - Regeln prüfen **und** (nur wenn die Regeln passen) rekursiv das nächste Feld bearbeiten. `and` wertet von links nach rechts aus und hört beim ersten `False` auf. Das ist hier wichtig: Bei Regelverstoß wird gar nicht erst tiefer gesucht.
   - Klappt alles bis zum Ende → `True` nach oben durchreichen.
   - Sonst: Feld zurücksetzen (`None`) und nächste Möglichkeit.
4. Keine Möglichkeit hat geklappt → `False`. Die Ebene darüber probiert dann ihre nächste Möglichkeit.

Der Name `_suche` beginnt mit Unterstrich: In Python heißt das "intern, nicht von außen aufrufen". Von außen ruft man `baue()` auf.

> **Zum Ausprobieren:** Setz in `_suche` ein `print(i, r, c, inhalt)` direkt nach `self.gitter[r][c] = inhalt` und erzeuge ein einzelnes kleines Rätsel. Du siehst, wie die Suche vor- und zurückspringt.

---

### 3.6 Phase 2: `WortFueller` – Wörter einsetzen

Jetzt haben wir eine Schablone wie:

```
# . . . . # . .
# . # # # . . #
. . . . . # . .
```

Und eine Liste von Lücken, z. B. "5 Felder waagerecht ab (2, 0)". Gesucht: Wörter für alle Lücken, sodass sich die Buchstaben an den Kreuzungen decken.

#### Der Index

```python
    def __init__(self, woerter, gewichte, rng):
        self.rng = rng
        self.gewichte = gewichte
        self.nach_laenge = collections.defaultdict(list)
        self.index = collections.defaultdict(set)
        for w in woerter:
            self.nach_laenge[len(w)].append(w)
            for i, buchstabe in enumerate(w):
                self.index[(len(w), i, buchstabe)].add(w)
```

Ein **`defaultdict`** ist ein Dict, das fehlende Schlüssel automatisch anlegt. `defaultdict(list)` legt eine leere Liste an, `defaultdict(set)` eine leere Menge. So spart man sich:

```python
if laenge not in nach_laenge:
    nach_laenge[laenge] = []
nach_laenge[laenge].append(w)
```

Der Index ordnet jedem Tripel *(Wortlänge, Position, Buchstabe)* die Menge aller passenden Wörter zu. Für HUND entstehen die Einträge:

```
(4, 0, "H") -> {..., "HUND", ...}
(4, 1, "U") -> {..., "HUND", ...}
(4, 2, "N") -> {..., "HUND", ...}
(4, 3, "D") -> {..., "HUND", ...}
```

Das ist im Grunde wie das Stichwortverzeichnis hinten in einem Buch: Man schlägt nicht jede Seite auf, sondern schaut im Register nach.

#### Kandidaten für eine Lücke

```python
    def kandidaten(self, luecke):
        laenge = len(luecke["felder"])
        mengen = []
        for i, f in enumerate(luecke["felder"]):
            buchstabe = self.buchstaben.get(f)
            if buchstabe:
                mengen.append(self.index.get((laenge, i, buchstabe), set()))
```

`self.buchstaben` ist ein Dict *Feld → Buchstabe* mit allem, was schon eingetragen ist. Für jedes Feld der Lücke, das schon einen Buchstaben hat (weil ein kreuzendes Wort dort steht), holen wir die passende Menge aus dem Index. `dict.get(schluessel, standard)` liefert den Standardwert, wenn der Schlüssel fehlt, statt einen Fehler zu werfen.

```python
        if not mengen:
            passende = self.nach_laenge.get(laenge, [])
        else:
            mengen.sort(key=len)
            passende = set(mengen[0])
            for m in mengen[1:]:
                passende &= m
        return [w for w in passende if w not in self.benutzt]
```

- Ist noch gar kein Buchstabe bekannt, passt jedes Wort der richtigen Länge.
- Sonst bilden wir die **Schnittmenge** (`&`) aller Mengen: Wörter, die an Position 1 ein A **und** an Position 3 ein E haben.
- `sort(key=len)` sortiert nach Größe, damit wir mit der kleinsten Menge anfangen. Die Schnittmenge wird dadurch schnell klein, und die weiteren `&` sind billig.
- `set(mengen[0])` macht eine **Kopie**. Ohne Kopie würde `&=` die Menge im Index verändern und alles kaputt machen. Ein klassischer Fehler!
- Am Ende fliegen Wörter raus, die schon im Rätsel stehen (Regel 6).

#### Füllen mit "engste Stelle zuerst"

```python
    def fuelle(self, luecken, max_schritte=2000):
        self.luecken = luecken
        self.buchstaben = {}
        self.belegt = [None] * len(luecken)
        self.benutzt = set()
        self.schritte = 0
        self.max_schritte = max_schritte
        return self._suche()
```

Setzt alles auf Anfang und startet die Suche. `belegt[i]` merkt sich, welches Wort in Lücke `i` steht.

```python
    def _suche(self):
        self.schritte += 1
        if self.schritte > self.max_schritte:
            return False

        beste, beste_kand = None, None
        for i, luecke in enumerate(self.luecken):
            if self.belegt[i] is not None:
                continue
            kand = self.kandidaten(luecke)
            if not kand:
                return False
            if beste is None or len(kand) < len(beste_kand):
                beste, beste_kand = i, kand
                if len(kand) == 1:
                    break
        if beste is None:
            return True
```

Das ist die wichtigste Idee des ganzen Generators. In der Fachsprache heißt sie **MRV** ("minimum remaining values"): Wir füllen nicht der Reihe nach, sondern immer die offene Lücke mit den **wenigsten** passenden Wörtern. Zwei Gründe:

1. **Sackgassen früh erkennen.** Hat irgendeine Lücke 0 Kandidaten, ist der aktuelle Zustand hoffnungslos → sofort `return False`. Das passiert hier bei jedem Schritt für *alle* offenen Lücken. Man nennt das **Vorausschau** (forward checking).
2. **Wenig Verzweigung.** Eine Lücke mit 2 Kandidaten verzweigt in 2 Möglichkeiten, eine mit 300 in 300. Lieber die schmale Stelle zuerst, dann sind die breiten oft schon durch Kreuzungen eingeengt.

Mit nur einem Kandidaten kann es nicht enger werden → `break`.

```python
        beste_kand.sort(key=lambda w: self.rng.random() ** (1.0 / self.gewichte.get(w, 1.0)),
                        reverse=True)
```

Jetzt die Reihenfolge, in der wir die Kandidaten probieren. Wir wollen Zufall (sonst wären alle Rätsel gleich), aber mit Vorlieben: Selten benutzte Wörter sollen öfter drankommen, bei "Schwer" seltene Wörter.

- `lambda w: ...` ist eine **anonyme Funktion** in einer Zeile. `sort` ruft sie für jedes Wort auf und sortiert nach dem Ergebnis.
- Der Ausdruck `zufall ** (1 / gewicht)` ist ein bekannter Trick für **gewichtetes Ziehen ohne Zurücklegen** (nach Efraimidis und Spirakis). Ein Wort mit Gewicht 3 landet im Schnitt weiter vorne als eins mit Gewicht 1, aber nicht immer. Warum? Für eine Zufallszahl zwischen 0 und 1 gilt: Hoch `1/3` (dritte Wurzel) macht sie größer, also rutscht das Wort beim absteigenden Sortieren nach vorn.

```python
        luecke = self.luecken[beste]
        for wort in beste_kand[:30]:
            neu = []
            for f, buchstabe in zip(luecke["felder"], wort):
                if f not in self.buchstaben:
                    self.buchstaben[f] = buchstabe
                    neu.append(f)
            self.belegt[beste] = wort
            self.benutzt.add(wort)
            if self._suche():
                return True
            self.belegt[beste] = None
            self.benutzt.discard(wort)
            for f in neu:
                del self.buchstaben[f]
            if self.schritte > self.max_schritte:
                return False
        return False
```

- `beste_kand[:30]`: Höchstens 30 Kandidaten probieren. Wenn 30 Wörter nicht klappen, liegt es meist an der Schablone, nicht am Wort. Dann lieber schnell aufgeben und eine neue Schablone probieren.
- `zip(a, b)` läuft gleichzeitig durch zwei Listen: Feld 1 mit Buchstabe 1, Feld 2 mit Buchstabe 2 usw.
- Wichtig ist `neu`: Wir merken uns nur die Felder, die **dieses** Wort neu gefüllt hat. Kreuzungsfelder, die vorher schon da waren, dürfen beim Zurücknehmen nicht gelöscht werden, sonst fehlt dem kreuzenden Wort ein Buchstabe.
- `discard` entfernt aus einer Menge, ohne Fehler, falls das Element fehlt (im Gegensatz zu `remove`).

---

### 3.7 Lösungswort

```python
def waehle_loesung(gitter, kandidaten, laenge, rng, versuche=400):
    nach_buchstabe = collections.defaultdict(list)
    for r, zeile in enumerate(gitter):
        for c, inhalt in enumerate(zeile):
            if inhalt != HINWEIS:
                nach_buchstabe[inhalt].append((r, c))
```

Zuerst ein Verzeichnis: Wo im Gitter steht welcher Buchstabe? Etwa `{"E": [(0, 3), (2, 4), ...], ...}`.

```python
    passende = [w for w in kandidaten if len(w) == laenge]
    rng.shuffle(passende)
    for wort in passende[:versuche]:
        gewaehlt = []
        for buchstabe in wort:
            moeglich = [f for f in nach_buchstabe[buchstabe]
                        if f not in gewaehlt
                        and all(abs(f[0] - g[0]) + abs(f[1] - g[1]) > 2 for g in gewaehlt)]
            if not moeglich:
                break
            gewaehlt.append(rng.choice(moeglich))
        else:
            return {"wort": wort, "felder": [list(f) for f in gewaehlt]}
    return None
```

Für ein zufälliges Wort der gewünschten Länge suchen wir für jeden Buchstaben ein Feld, das

- diesen Buchstaben enthält,
- noch nicht gewählt ist,
- und von allen bisher gewählten Feldern mindestens 3 Schritte entfernt ist. `abs(dr) + abs(dc)` ist die **Manhattan-Distanz**: Schritte, wenn man nur waagerecht/senkrecht gehen darf (wie durch die Straßen von Manhattan, oder die Quadrate in Mannheim). So verteilen sich die Kreise übers Gitter.

Das `else` hinter der `for`-Schleife ist eine Python-Besonderheit, die viele nicht kennen: Der `else`-Block läuft nur, wenn die Schleife **ohne `break`** durchgelaufen ist. Hier heißt das: Alle Buchstaben wurden gefunden → Treffer. Bei `break` (ein Buchstabe fehlte) geht es mit dem nächsten Wort weiter.

`[list(f) for f in gewaehlt]` wandelt die Tupel in Listen um, weil JSON keine Tupel kennt.

### 3.8 Bewertung und Hinweistext

```python
def bewerte(gitter, woerter, info, schwierigkeit):
    hinweisfelder = sum(zeile.count(HINWEIS) for zeile in gitter)
    zweier = sum(1 for w in woerter if len(w["wort"]) == 2)
    lange = sum(len(w["wort"]) for w in woerter if len(w["wort"]) >= 5)
    level = sum(info[w["wort"]]["level"] for w in woerter) / len(woerter)
    punkte = lange - 2.0 * zweier - 1.0 * hinweisfelder
    if schwierigkeit == "schwer":
        punkte += 15 * level
    return punkte
```

Der Generator baut pro Rätsel 5 fertige Gitter und nimmt das mit den meisten Punkten. Die Formel drückt aus, was ein schönes Rätsel ist: viele lange Wörter, wenige Zweier-Wörter, wenige Hinweisfelder. Bei "Schwer" zählt der Durchschnitts-Level stark. Die Gewichte (2.0, 1.0, 15) sind ausprobiert, nicht berechnet. Spiel ruhig damit.

`sum(1 for w in ... if ...)` ist ein häufiges Muster zum **Zählen**: Für jedes passende Element wird 1 addiert.

```python
def max_nutzung(wort, einstellung):
    if len(wort) == 2:
        return 1000
    if len(wort) == 3:
        return 10
    return einstellung["max_wiederholung"]
```

Wie oft ein Wort in allen 100 Rätseln zusammen vorkommen darf. Auch das ist eine Lehre aus der Entwicklung: Anfangs waren auch kurze Wörter streng begrenzt. Dann wurden die späten Rätsel (ab etwa Nr. 70) immer langsamer, zuletzt über 2 Minuten pro Stück, weil die "Klebstoff-Wörter" ausgingen. Mit dieser Regel dauern alle 100 zusammen gut 5 Minuten.

```python
def hinweistext(eintrag, schwierigkeit):
    if schwierigkeit == "leicht":
        return eintrag["leicht"]
    if schwierigkeit == "mittel":
        return eintrag["schwer"] if eintrag["level"] == 1 else eintrag["leicht"]
    return eintrag["schwer"]
```

`a if bedingung else b` ist der **bedingte Ausdruck** (in anderen Sprachen `bedingung ? a : b`).

### 3.9 Alles zusammensetzen

```python
def baue_gitter(pool, gewichte, einstellung, rng, versuche=60):
    fueller = WortFueller(pool, gewichte, rng)
    for _ in range(versuche):
        muster = MusterBauer(einstellung["breite"], einstellung["hoehe"],
                             einstellung["max_lauf"], rng)
        if not muster.baue():
            continue
        luecken = finde_woerter(muster.gitter)
        if not fueller.fuelle(luecken):
            continue
        gitter = [zeile[:] for zeile in muster.gitter]
        for (r, c), buchstabe in fueller.buchstaben.items():
            gitter[r][c] = buchstabe
        return gitter
    return None
```

Phase 1 und 2 hintereinander. Klappt das Füllen nicht, gibt es eine neue Schablone. Der `WortFueller` wird nur einmal gebaut, weil sein Index für alle Versuche gleich ist (der Index zu bauen kostet etwas Zeit).

- `zeile[:]` ist eine **Kopie** der Liste (Slice über alles).
- `for (r, c), buchstabe in fueller.buchstaben.items()`: `.items()` liefert Paare `(Schlüssel, Wert)`. Der Schlüssel ist selbst ein Tupel `(r, c)`, das direkt entpackt wird.

```python
def baue_raetsel(info, pool, gewichte, einstellung, schwierigkeit, rng, auswahl=5):
    beste = None
    for _ in range(auswahl):
        gitter = baue_gitter(pool, gewichte, einstellung, rng)
        if gitter is None:
            continue
        woerter = finde_woerter(gitter)
        punkte = bewerte(gitter, woerter, info, schwierigkeit)
        if beste is None or punkte > beste[0]:
            beste = (punkte, gitter, woerter)
    if beste is None:
        return None
    return beste[1], beste[2]
```

5 Gitter bauen, das beste behalten. Ein klassisches "Maximum suchen" mit einer Variable, die das bisher Beste speichert.

### 3.10 JSON-Format für die App

```python
def raetsel_als_dict(nr, schwierigkeit, gitter, woerter, info, loesung):
    hinweise = []
    for w in woerter:
        hr, hc, pfeil = hinweisfeld_fuer(w)
        hinweise.append({
            "r": hr, "c": hc, "pfeil": pfeil,
            "text": hinweistext(info[w["wort"]], schwierigkeit),
            "wort": w["wort"],
            "sr": w["sr"], "sc": w["sc"],
            "richtung": w["richtung"],
            "laenge": len(w["wort"]),
        })
    oben_unten = {"rechts": 0, "rechts_unten": 1, "unten_rechts": 2, "unten": 3}
    hinweise.sort(key=lambda h: (h["r"], h["c"], oben_unten[h["pfeil"]]))
```

Sortiert wird nach einem **Tupel**: Python vergleicht Tupel Element für Element. Erst nach Zeile, bei Gleichstand nach Spalte, dann nach Pfeil-Reihenfolge. So steht in einem Feld mit zwei Hinweisen der waagerechte oben, der senkrechte unten, wie im Rätselheft.

```python
    return {
        "id": f"{schwierigkeit}-{nr:02d}",
        ...
        "gitter": ["".join(zeile) for zeile in gitter],
        ...
    }
```

`{nr:02d}` formatiert die Zahl zweistellig mit führender Null: 4 → `04`. Daraus wird `"leicht-04"`.

Ein Rätsel in `puzzles.json` sieht dann so aus (gekürzt):

```json
{
  "id": "leicht-01",
  "nr": 1,
  "schwierigkeit": "leicht",
  "breite": 8,
  "hoehe": 9,
  "gitter": ["#PLATT#I", "#U####EG", "KRONE#ML", "..."],
  "hinweise": [
    {"r": 0, "c": 0, "pfeil": "rechts", "text": "Flach",
     "wort": "PLATT", "sr": 0, "sc": 1, "richtung": "waagerecht", "laenge": 5},
    "..."
  ],
  "loesung": {"wort": "HEUTE", "felder": [[8, 6], [2, 4], [3, 7], [0, 5], [6, 7]]}
}
```

Ja, die Lösung steht in der Datei. Für ein Spiel, das nur bei dir läuft, ist das egal. Wer im Quelltext nachschaut, schummelt halt.

### 3.11 Die unabhängige Kontrolle: `pruefe_raetsel`

Diese Funktion prüft jedes fertige Rätsel **noch einmal von Grund auf**, ohne den Code der Suche zu benutzen. Sie liest nur das fertige Gitter und die Hinweise und kontrolliert alle Regeln aus Abschnitt 1:

- jedes Wort steht in der Wortliste und kommt nur einmal vor,
- jeder Buchstabe gehört zu einem Wort (`abgedeckt` ist eine Menge aller Felder, die in irgendeinem Wort vorkommen),
- jeder Hinweis steht in einem Hinweisfeld, mit dem richtigen Pfeil,
- kein Hinweisfeld hat mehr als 2 Hinweise, keins ist leer,
- die Buchstaben auf den Lösungsfeldern ergeben das Lösungswort.

Warum doppelt prüfen? Weil die Suche kompliziert ist und kompliziertem Code man nicht blind traut. Eine zweite, **einfache** Prüfung fängt Fehler, die sich in der ersten verstecken. Das ist ein Grundprinzip beim Testen: Das Ergebnis mit einem anderen Weg kontrollieren als dem, mit dem es entstanden ist.

`collections.Counter` zählt Dinge: `Counter([(0, 0), (0, 0), (1, 3)])` ergibt `{(0, 0): 2, (1, 3): 1}`.

### 3.12 Das Hauptprogramm: `main`

```python
def main():
    parser = argparse.ArgumentParser(description="Erzeugt Schwedenrätsel als JSON.")
    parser.add_argument("--seed", type=int, default=2026, help="Startwert für den Zufall")
    for name, e in SCHWIERIGKEITEN.items():
        parser.add_argument(f"--{name}", type=int, default=e["anzahl"], help=...)
    parser.add_argument("--ausgabe", type=pathlib.Path, default=AUSGABE, help=...)
    args = parser.parse_args()
```

`argparse` liest die Optionen aus der Kommandozeile. Probier mal `python generator.py --help`, dann zeigt es automatisch eine Hilfe mit allen Optionen an. `args.seed`, `args.leicht` usw. enthalten danach die Werte.

```python
    rng = random.Random(args.seed)
    info = lade_woerter()
```

Ein eigener Zufallsgenerator mit festem Seed. Alle zufälligen Entscheidungen im ganzen Programm laufen über dieses eine Objekt. Deshalb kommt mit `--seed 2026` immer exakt dasselbe heraus.

```python
    alle = []
    gitter_gesehen = set()
    nutzung = collections.Counter()
    loesungen = set()
```

Buchführung über alle Rätsel hinweg: Fingerabdrücke gegen doppelte Rätsel, wie oft jedes Wort schon dran war, welche Lösungswörter schon vergeben sind.

```python
    for schwierigkeit, einstellung in SCHWIERIGKEITEN.items():
        anzahl = getattr(args, schwierigkeit)
        nr = 1
        while nr <= anzahl:
```

`getattr(args, "leicht")` ist dasselbe wie `args.leicht`, nur dass der Name als String übergeben wird. Praktisch in Schleifen.

Eine `while`-Schleife statt `for`, weil manche Durchläufe kein Rätsel ergeben (verworfen) und `nr` dann nicht hochgezählt wird.

```python
            pool = [w for w, e in info.items()
                    if e["level"] <= einstellung["max_level"]
                    and nutzung[w] < max_nutzung(w, einstellung)]
            gewichte = {w: 1.0 / (1 + nutzung[w]) for w in pool}
            if schwierigkeit == "schwer":
                for w in pool:
                    gewichte[w] *= info[w]["level"]
```

- Der **Pool** sind die Wörter, die für dieses Rätsel infrage kommen.
- `{w: ... for w in pool}` ist eine **Dict Comprehension**, wie eine List Comprehension, nur für Dicts.
- Ein Wort, das schon einmal benutzt wurde, hat Gewicht 1/2, zweimal 1/3. So kommen frische Wörter öfter dran.
- Ein `Counter` liefert für unbekannte Schlüssel einfach 0 (statt eines Fehlers). Deshalb funktioniert `nutzung[w]` auch für Wörter, die noch nie dran waren.

```python
            ergebnis = baue_raetsel(...)
            if ergebnis is None:
                print(...)
                continue
            gitter, woerter = ergebnis
            fingerabdruck = "".join("".join(z) for z in gitter)
            if fingerabdruck in gitter_gesehen:
                continue
```

Der Fingerabdruck ist einfach das ganze Gitter als ein langer String. Strings lassen sich in einer Menge speichern und blitzschnell vergleichen. (Doppelte Rätsel sind bei dieser Größe praktisch unmöglich, aber die Prüfung kostet nichts.)

```python
            im_gitter = {w["wort"] for w in woerter}
```

Eine **Set Comprehension** (geschweifte Klammern ohne Doppelpunkt) erzeugt eine Menge.

```python
            loesung_pool = [w for w in pool
                            if w not in im_gitter and w not in loesungen
                            and info[w]["level"] <= max(1, einstellung["max_level"] - 1)]
            loesung = waehle_loesung(...)
            raetsel = raetsel_als_dict(...)
            fehler = pruefe_raetsel(raetsel, info)
            if fehler:
                print(...)
                continue
```

Das Lösungswort soll nicht schon im Gitter stehen, nicht schon in einem anderen Rätsel Lösung gewesen sein und eher bekannt sein (bei "Schwer" Level ≤ 2, sonst Level 1).

```python
            gitter_gesehen.add(fingerabdruck)
            nutzung.update(im_gitter)
            ...
            nr += 1
```

`Counter.update(menge)` erhöht für jedes Element den Zähler um 1.

```python
    args.ausgabe.parent.mkdir(parents=True, exist_ok=True)
    daten = {"version": 1, "erstellt": time.strftime("%Y-%m-%d"), "raetsel": alle}
    args.ausgabe.write_text(json.dumps(daten, ensure_ascii=False, separators=(",", ":")),
                            encoding="utf-8")
```

- `mkdir(parents=True, exist_ok=True)`: Ordner anlegen, auch fehlende Elternordner, und keinen Fehler werfen, wenn er schon existiert.
- `json.dumps` wandelt Python-Daten in JSON-Text um. `ensure_ascii=False` lässt Umlaute als echte Zeichen stehen (sonst würde aus `ä` ein `\u00e4`). `separators=(",", ":")` lässt alle Leerzeichen weg, die Datei wird kleiner (465 KB statt ~600 KB).

```python
if __name__ == "__main__":
    main()
```

`__name__` ist `"__main__"`, wenn die Datei direkt gestartet wird (`python generator.py`). Wird sie dagegen von einer anderen Datei mit `import generator` geladen, ist `__name__` gleich `"generator"`, und `main()` läuft **nicht**. So kann man einzelne Funktionen in einer Python-Konsole testen:

```python
>>> import generator as g
>>> info = g.lade_woerter()
>>> len(info)
1820
>>> g.hinweisfeld_fuer({"sr": 0, "sc": 3, "richtung": "senkrecht"})
(0, 2, 'rechts_unten')
```

---

## 4. Stellschrauben zum Experimentieren

| Was | Wo | Wirkung |
|---|---|---|
| Gittergröße | `SCHWIERIGKEITEN[...]["breite"/"hoehe"]` | Größere Rätsel. Auf dem Handy wird es ab 10 Spalten eng. |
| Anzahl Hinweisfelder | `p_hinweis` in `MusterBauer.__init__` | Höher = mehr, kürzere Wörter, einfacher zu füllen. |
| Längstes Wort | `max_lauf` | Höher = längere Wörter möglich, aber Füllen wird schwerer. |
| Rätsel-Qualität | `bewerte` und `auswahl=5` | Mehr Auswahl = schönere Rätsel, aber langsamer. |
| Wiederholungen | `max_nutzung` | Strenger = mehr Abwechslung, aber langsamer. |
| Andere Rätsel | `--seed` | Jede Zahl ergibt einen komplett anderen Satz. |

---

## Python-Spickzettel

Alles, was in `generator.py` vorkommt und über die Grundlagen hinausgeht:

| Technik | Beispiel | Bedeutung |
|---|---|---|
| List Comprehension | `[t.strip() for t in teile]` | Liste aus Schleife bauen |
| mit Bedingung | `[w for w in pool if len(w) == 5]` | nur passende Elemente |
| Dict Comprehension | `{w: 1.0 for w in pool}` | Dict aus Schleife |
| Set Comprehension | `{w["wort"] for w in woerter}` | Menge aus Schleife |
| Generator-Ausdruck | `sum(1 for w in ws if ...)` | wie Comprehension, ohne Zwischenliste |
| Entpacken | `a, b = (1, 2)` | Tupel auf Variablen verteilen |
| Stern-Entpacken | `feld(g, *a)` | Tupel als einzelne Argumente übergeben |
| f-String | `f"{nr:02d}"` | Werte formatiert in Text einsetzen |
| verkettete Vergleiche | `0 <= r < H` | zwei Vergleiche in einem |
| bedingter Ausdruck | `a if x else b` | "wenn x dann a sonst b" in einer Zeile |
| `or` als Standardwert | `schwer or leicht` | erster "wahrer" Wert |
| `for ... else` | siehe `waehle_loesung` | `else` läuft nur ohne `break` |
| `any` / `all` | `any(x is None for x in l)` | mindestens eins / alle wahr |
| `enumerate` | `for i, x in enumerate(l)` | Index und Element |
| `zip` | `for f, b in zip(felder, wort)` | zwei Listen parallel |
| `lambda` | `key=lambda h: h["r"]` | kleine namenlose Funktion |
| Sortieren nach Tupel | `key=lambda h: (h["r"], h["c"])` | erst nach r, dann nach c |
| `set` und `&` | `a & b` | Menge, Schnittmenge |
| `defaultdict` | `defaultdict(list)` | Dict mit automatischem Startwert |
| `Counter` | `Counter(liste)` | zählt Vorkommen, fehlt = 0 |
| Klasse, `self` | `class MusterBauer:` | Daten und Funktionen bündeln |
| Rekursion | `_suche` ruft `_suche` auf | Funktion ruft sich selbst |
| `random.Random(seed)` | `rng.random()` | reproduzierbarer Zufall |
| `pathlib` | `ORDNER / "woerter"` | Pfade ohne Ärger mit `\` und `/` |
| `argparse` | `--seed 7` | Kommandozeilen-Optionen |
| `json.dumps` | `json.dumps(daten)` | Python-Daten → JSON-Text |
| `if __name__ == "__main__"` | ganz unten | nur beim direkten Start ausführen |
