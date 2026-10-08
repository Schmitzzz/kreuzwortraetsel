# 01 – Die Wortliste

Alles beginnt mit den Wörtern. Sie liegen in `generator/woerter/`, aufgeteilt nach Länge:

```
02-buchstaben.txt     2 Buchstaben  (ER, AB, KG, MA …)
03-buchstaben.txt     3 Buchstaben  (AAL, OMA, ZOO …)
04-buchstaben.txt     4 Buchstaben
05-buchstaben.txt     5 Buchstaben
06-buchstaben.txt     6 Buchstaben
07-plus-buchstaben.txt 7 und mehr
```

Die Aufteilung ist nur für dich zum Bearbeiten. Der Generator liest alle `.txt`-Dateien im Ordner und mischt sie zusammen. Du könntest also auch eine Datei `meine-woerter.txt` dazulegen.

## Das Format

Jede Zeile ist ein Wort:

```
HUND | 1 | Bester Freund | Bello
```

| Spalte | Bedeutung |
|---|---|
| `HUND` | Das Lösungswort. Nur Großbuchstaben A–Z. |
| `1` | Das **Level**: wie bekannt das Wort ist. |
| `Bester Freund` | Der **leichte Hinweis**: direkt, eindeutig. |
| `Bello` | Der **schwere Hinweis**: knapper, um die Ecke gedacht. Darf leer bleiben. |

Die Spalten sind durch `|` getrennt. Leerzeichen um die Striche sind egal, der Generator entfernt sie mit `.strip()`. Zeilen, die mit `#` beginnen, sind Kommentare. Leere Zeilen werden übersprungen.

### Warum `|` und nicht Komma?

Weil Kommas in Hinweisen vorkommen ("Würde, Ansehen"). Ein Zeichen, das im Text nie auftaucht, macht das Aufteilen trivial: `zeile.split("|")`. Das ist eine häufige Überlegung bei selbst erfundenen Datenformaten. CSV-Dateien lösen dasselbe Problem mit Anführungszeichen, das ist aber komplizierter zu lesen und zu schreiben.

## Umlaute

Wie in jedem Zeitungsrätsel stehen Umlaute als zwei Buchstaben:

| Normal | Im Rätsel |
|---|---|
| Ä | AE |
| Ö | OE |
| Ü | UE |
| ß | SS |

Also `KAESE`, `MOEWE`, `SUESS`. Beim Spielen musst du das nicht selbst umrechnen: Tippst du auf der Bildschirmtastatur `Ä`, trägt die App `A` und `E` in zwei Felder ein (siehe `UMLAUTE` in `js/spiel.js`).

## Die Level

| Level | Bedeutung | Beispiele |
|---|---|---|
| 1 | Jeder kennt es | HUND, AUTO, ROT, EIS |
| 2 | Allgemeinwissen | ISAR, ELAN, ETUI, GNU |
| 3 | Typisches Rätselwissen | AAR (Adler), ARA (Papagei), ODEM (Atem), EGGE |

Der Generator benutzt das Level an drei Stellen:

1. **Welche Wörter überhaupt vorkommen dürfen.** "Leicht" nimmt nur Level 1, "Mittel" Level 1–2, "Schwer" alle (`max_level` in `SCHWIERIGKEITEN`).
2. **Welcher Hinweis gezeigt wird.** "Leicht" zeigt immer den leichten Hinweis, "Schwer" immer den schweren. "Mittel" mischt: Bekannte Wörter (Level 1) bekommen den schweren Hinweis, seltene den leichten. So ist kein Wort doppelt schwer.
3. **Bei "Schwer" werden seltene Wörter bevorzugt.** Ein Level-3-Wort wird dreimal so gern genommen wie ein Level-1-Wort.

## Gute Hinweise schreiben

Ein paar Regeln, die beim Schreiben der Liste geholfen haben:

- **Kurz.** Höchstens etwa 22 Zeichen. In einem Hinweisfeld stehen oft zwei Hinweise übereinander, und das Feld ist auf dem Handy nur gut 1 cm breit. Den vollen Text zeigt zwar die große Hinweisleiste, aber im Gitter soll er auch lesbar sein.
- **Das Wort selbst darf nicht vorkommen.** Also nicht "Ritter der Tafelrunde" für RITTER.
- **Lücken mit drei Punkten**: `„Er ... zu spät“` für KAM. Das ist ein klassisches Rätsel-Muster.
- **Abkürzungen kennzeichnen**: `Abk.: Kilogramm` für KG, `(Kfz)` für Kfz-Kennzeichen.
- **Mehrdeutigkeit ist okay.** "Zahl nach zehn" könnte auch ELF oder 11 heißen, aber die Kreuzungen mit anderen Wörtern machen es eindeutig. Genau das macht Kreuzworträtsel aus.

## Eigene Wörter hinzufügen

1. Passende Datei öffnen, zum Beispiel `05-buchstaben.txt`.
2. Neue Zeile schreiben: `FELIX | 1 | Männername | Glücklich (lat.)`. Die Reihenfolge innerhalb der Datei ist egal.
3. Generator laufen lassen: `python generator.py`.

Steht ein Wort doppelt in der Liste oder enthält es ungültige Zeichen, bricht der Generator mit einer klaren Meldung ab, zum Beispiel:

```
ValueError: 05-buchstaben.txt:42: 'KÄSE' darf nur A-Z enthalten
```

Die Zahl hinter dem Doppelpunkt ist die Zeilennummer. So findest du den Fehler sofort.

## Warum gerade diese Wörter?

Schwedenrätsel brauchen viele **kurze** Wörter, weil sich die Wörter ständig kreuzen. Fast jedes Feld gehört zu einem waagerechten *und* einem senkrechten Wort. Ein 5-Buchstaben-Wort wird dadurch von bis zu 5 anderen Wörtern "festgenagelt". Je mehr kurze Wörter zur Auswahl stehen, desto leichter findet der Generator passende Kombinationen. Deshalb gibt es rund 140 Wörter mit 2 Buchstaben, darunter viele Abkürzungen, Kfz-Kennzeichen (MA für Mannheim, HD für Heidelberg) und chemische Zeichen. Das ist in echten Rätselheften genauso.

Aktuell enthält die Liste gut 1.800 Wörter. Davon kommen in den 100 Rätseln knapp 1.400 vor.
