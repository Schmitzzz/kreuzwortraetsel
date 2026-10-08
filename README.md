# Schwedenrätsel

Eine selbstgebaute Kreuzworträtsel-App im Stil der Rätselhefte: 100 Schwedenrätsel in drei Schwierigkeitsgraden, ohne Werbung, ohne Konto, ohne In-App-Käufe. Läuft im Browser, lässt sich aufs iPhone legen und funktioniert danach auch offline.

- **Leicht**: 35 Rätsel, 8 × 9 Felder, Alltagswörter, direkte Hinweise
- **Mittel**: 35 Rätsel, 9 × 11 Felder, mehr Allgemeinwissen, kniffligere Hinweise
- **Schwer**: 30 Rätsel, 10 × 13 Felder, Rätsel-Klassiker wie ARA, AAR und ODEM

Jedes Rätsel hat ein Lösungswort. Es gibt Hilfen (Buchstabe oder Wort aufdecken, Fehler zeigen), eine Uhr und einen Fortschritt pro Rätsel. Alles wird nur auf deinem Gerät gespeichert.

## So startest du es auf dem PC

Die App braucht einen kleinen Webserver, weil Browser JavaScript-Module und `fetch` nicht direkt aus Dateien laden. Python bringt einen mit:

```bash
cd kreuzwortraetsel
python -m http.server 8000
```

Dann im Browser <http://localhost:8000> öffnen. Beenden mit `Strg + C`.

## Neue Rätsel erzeugen

```bash
cd generator
python generator.py            # schreibt ../data/puzzles.json
python generator.py --seed 7   # andere Startzahl = komplett andere Rätsel
```

Wörter und Hinweise stehen in `generator/woerter/*.txt`. Eigene Wörter einfach dazuschreiben und den Generator neu laufen lassen.

## Ordner

| Pfad | Was drin ist |
|---|---|
| `index.html` | Gerüst der App (Startseite, Spielseite, Dialoge) |
| `css/style.css` | Aussehen, helles und dunkles Design |
| `js/app.js` | Startpunkt: Laden, Seitenwechsel, Startseite |
| `js/spiel.js` | Ein Rätsel spielen: Gitter, Eingabe, Hilfen, Uhr |
| `js/speicher.js` | Spielstände im Browser speichern |
| `js/tastatur.js` | Bildschirmtastatur fürs Handy |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `manifest.webmanifest` | Infos für "Zum Home-Bildschirm" |
| `data/puzzles.json` | Die fertigen Rätsel (vom Generator erzeugt) |
| `generator/` | Python-Generator und Wortlisten |
| `docs/` | Die Lern-Doku |

## Lern-Doku

Die Doku erklärt jede Datei Zeile für Zeile. Am besten in dieser Reihenfolge lesen:

1. [Überblick: Wie alles zusammenhängt](docs/00-ueberblick.md)
2. [Die Wortliste](docs/01-wortliste.md)
3. [Der Generator (Python)](docs/02-generator.md)
4. [HTML: das Gerüst](docs/03-html.md)
5. [CSS: das Aussehen](docs/04-css.md)
6. [JavaScript: die Logik](docs/05-javascript.md)
7. [Offline und iPhone: PWA und Service Worker](docs/06-pwa-offline.md)
8. [Git und GitHub Pages](docs/07-git-github-pages.md)
9. [Übungen zum Weiterbauen](docs/08-uebungen.md)

## Lizenzen

Code und Wortliste: frei zur eigenen Nutzung. Schrift: [Archivo](https://github.com/Omnibus-Type/Archivo) von Omnibus-Type, SIL Open Font License (siehe `fonts/OFL.txt`).
