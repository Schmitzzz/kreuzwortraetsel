"""
Schwedenrätsel-Generator
========================

Liest die Wortlisten aus dem Ordner ``woerter/`` und baut daraus Schwedenrätsel
in drei Schwierigkeitsgraden. Das Ergebnis landet in ``../data/puzzles.json``
und wird von der App geladen.

Aufruf (im Ordner ``generator``):

    python generator.py                          # 35 leicht, 35 mittel, 30 schwer
    python generator.py --seed 7                 # andere Startzahl = andere Rätsel
    python generator.py --leicht 3 --mittel 3 --schwer 3   # schnell zum Testen

Wie ein Schwedenrätsel aufgebaut ist (ausführlich in docs/02-generator.md):

* Jedes Feld ist entweder ein Buchstabenfeld oder ein Hinweisfeld ("#").
* Jede waagerechte oder senkrechte Folge von 2+ Buchstaben ist ein Wort.
* Der Hinweis zu einem Wort steht im Feld direkt davor (links bzw. oben).
  Am Rand gibt es kein Feld davor, dort zeigt ein Knick-Pfeil aus dem
  Nachbarfeld auf das Wort.
* Ein Hinweisfeld fasst höchstens 2 Hinweise und darf nicht leer sein.

Der Generator arbeitet in zwei Phasen:

1. Schablone bauen: Wo sind Hinweisfelder, wo Buchstaben? (Klasse MusterBauer)
2. Wörter einsetzen: Passende Wörter in die Lücken füllen. (Klasse WortFueller)
"""

import argparse
import collections
import json
import pathlib
import random
import time

# ---------------------------------------------------------------------------
# 0) Einstellungen
# ---------------------------------------------------------------------------

ORDNER = pathlib.Path(__file__).resolve().parent      # Ordner dieser Datei
WORT_ORDNER = ORDNER / "woerter"                       # hier liegen die .txt-Listen
AUSGABE = ORDNER.parent / "data" / "puzzles.json"      # hierhin schreiben wir

HINWEIS = "#"          # Zeichen für ein Hinweisfeld
LUECKE = "."           # Platzhalter für ein Buchstabenfeld in der Schablone

# Pro Schwierigkeitsgrad:
#   breite/hoehe      Größe des Gitters (inklusive Hinweisfelder)
#   anzahl            wie viele Rätsel erzeugt werden
#   max_level         höchstes erlaubtes Wort-Level aus der Wortliste
#   max_lauf          längstes erlaubtes Wort
#   loesung_laenge    Länge des Lösungsworts
#   max_wiederholung  wie oft ein Wort (4+ Buchstaben) in allen Rätseln vorkommen darf
SCHWIERIGKEITEN = {
    "leicht": {"breite": 8, "hoehe": 9, "anzahl": 35, "max_level": 1,
               "max_lauf": 6, "loesung_laenge": 5, "max_wiederholung": 2},
    "mittel": {"breite": 9, "hoehe": 11, "anzahl": 35, "max_level": 2,
               "max_lauf": 7, "loesung_laenge": 6, "max_wiederholung": 2},
    "schwer": {"breite": 10, "hoehe": 13, "anzahl": 30, "max_level": 3,
               "max_lauf": 7, "loesung_laenge": 7, "max_wiederholung": 2},
}

# Die vier Pfeil-Typen. Sie sagen, wo das Wort beginnt – gesehen vom Hinweisfeld:
#   rechts        Wort beginnt rechts daneben und läuft nach rechts      →
#   unten         Wort beginnt darunter und läuft nach unten              ↓
#   unten_rechts  Wort beginnt darunter, läuft aber nach rechts           ↳  (nur linker Rand)
#   rechts_unten  Wort beginnt rechts daneben, läuft aber nach unten      ↴  (nur oberer Rand)
PFEILE = ("rechts", "unten", "unten_rechts", "rechts_unten")


# ---------------------------------------------------------------------------
# 1) Wortliste laden
# ---------------------------------------------------------------------------

def lade_woerter(ordner=WORT_ORDNER):
    """Liest alle .txt-Dateien im Ordner. Rückgabe: Dict  WORT -> Eintrag."""
    woerter = {}
    for datei in sorted(ordner.glob("*.txt")):
        text = datei.read_text(encoding="utf-8")
        for nummer, zeile in enumerate(text.splitlines(), start=1):
            zeile = zeile.strip()
            if not zeile or zeile.startswith("#"):          # leer oder Kommentar
                continue
            teile = [t.strip() for t in zeile.split("|")]
            if len(teile) != 4:
                raise ValueError(f"{datei.name}:{nummer}: erwartet 4 Spalten, gefunden {len(teile)}")
            wort, level, leicht, schwer = teile
            if not (wort.isascii() and wort.isalpha() and wort.isupper()):
                raise ValueError(f"{datei.name}:{nummer}: '{wort}' darf nur A-Z enthalten")
            if wort in woerter:
                raise ValueError(f"{datei.name}:{nummer}: '{wort}' steht doppelt in der Liste")
            woerter[wort] = {
                "wort": wort,
                "level": int(level),
                "leicht": leicht,
                "schwer": schwer or leicht,     # leerer schwerer Hinweis -> leichten nehmen
            }
    return woerter


# ---------------------------------------------------------------------------
# Gemeinsame Regeln für Hinweisfelder (werden von beiden Phasen gebraucht)
# ---------------------------------------------------------------------------

def feld(gitter, r, c):
    """Inhalt von Zeile r, Spalte c. Außerhalb des Gitters zählt als Hinweisfeld."""
    if 0 <= r < len(gitter) and 0 <= c < len(gitter[0]):
        return gitter[r][c]
    return HINWEIS


def slot_status(gitter, r, c, pfeil):
    """Beginnt beim Hinweisfeld (r, c) in Richtung `pfeil` ein Wort?

    True  = ja, dort stehen 2 Buchstaben hintereinander
    False = sicher nicht (Rand oder Hinweisfeld im Weg)
    None  = noch unklar, weil Felder noch nicht entschieden sind
    """
    if pfeil == "rechts":
        a, b = (r, c + 1), (r, c + 2)
    elif pfeil == "unten":
        a, b = (r + 1, c), (r + 2, c)
    elif pfeil == "unten_rechts":            # Knick-Pfeil, nur am linken Rand
        if c != 0:
            return False
        a, b = (r + 1, 0), (r + 1, 1)
    else:                                    # rechts_unten, nur am oberen Rand
        if r != 0:
            return False
        a, b = (0, c + 1), (1, c + 1)
    fa, fb = feld(gitter, *a), feld(gitter, *b)
    if fa == HINWEIS or fb == HINWEIS:
        return False
    if fa is None or fb is None:
        return None
    return True


def finde_woerter(gitter):
    """Alle Wörter (2+ Buchstaben) eines Gitters mit Startfeld, Richtung und Feldern."""
    H, B = len(gitter), len(gitter[0])
    ergebnis = []
    for r in range(H):
        for c in range(B):
            if gitter[r][c] == HINWEIS:
                continue
            # Ein waagerechtes Wort beginnt hier, wenn links kein Buchstabe ist.
            if c == 0 or gitter[r][c - 1] == HINWEIS:
                ende = c
                while ende < B and gitter[r][ende] != HINWEIS:
                    ende += 1
                if ende - c >= 2:
                    felder = [(r, k) for k in range(c, ende)]
                    ergebnis.append({"sr": r, "sc": c, "richtung": "waagerecht",
                                     "felder": felder,
                                     "wort": "".join(gitter[r][k] for k in range(c, ende))})
            # Ein senkrechtes Wort beginnt hier, wenn oben kein Buchstabe ist.
            if r == 0 or gitter[r - 1][c] == HINWEIS:
                ende = r
                while ende < H and gitter[ende][c] != HINWEIS:
                    ende += 1
                if ende - r >= 2:
                    felder = [(k, c) for k in range(r, ende)]
                    ergebnis.append({"sr": r, "sc": c, "richtung": "senkrecht",
                                     "felder": felder,
                                     "wort": "".join(gitter[k][c] for k in range(r, ende))})
    return ergebnis


def hinweisfeld_fuer(wort):
    """In welchem Hinweisfeld steht der Hinweis zu diesem Wort – und mit welchem Pfeil?"""
    r, c = wort["sr"], wort["sc"]
    if wort["richtung"] == "waagerecht":
        if c > 0:
            return r, c - 1, "rechts"
        return r - 1, 0, "unten_rechts"       # Wort am linken Rand: Knick von oben
    if r > 0:
        return r - 1, c, "unten"
    return 0, c - 1, "rechts_unten"           # Wort am oberen Rand: Knick von links


# ---------------------------------------------------------------------------
# 2) Phase 1: Die Schablone bauen
# ---------------------------------------------------------------------------

class MusterBauer:
    """Entscheidet für jedes Feld: Hinweisfeld oder Buchstabenfeld?

    Wir gehen Zeile für Zeile von oben links nach unten rechts. Für jedes Feld
    probieren wir (zufällig sortiert) beide Möglichkeiten. Verletzt ein Feld
    eine Regel, nehmen wir es zurück und probieren die andere Möglichkeit.
    Klappt keine, gehen wir ein Feld zurück. Das nennt man Backtracking.
    """

    def __init__(self, breite, hoehe, max_lauf, rng, p_hinweis=0.3):
        self.B = breite
        self.H = hoehe
        self.max_lauf = max_lauf          # längstes erlaubtes Wort
        self.rng = rng                    # Zufallsgenerator
        self.p_hinweis = p_hinweis        # Grund-Wahrscheinlichkeit für ein Hinweisfeld
        self.gitter = [[None] * breite for _ in range(hoehe)]   # None = noch offen
        self.schritte = 0

    def ist_luecke(self, r, c):
        return feld(self.gitter, r, c) == LUECKE

    def lauf_links(self, r, c):
        """Wie viele Buchstabenfelder stehen direkt links von (r, c)?"""
        n = 0
        while c - 1 - n >= 0 and self.gitter[r][c - 1 - n] == LUECKE:
            n += 1
        return n

    def lauf_oben(self, r, c):
        """Wie viele Buchstabenfelder stehen direkt über (r, c)?"""
        n = 0
        while r - 1 - n >= 0 and self.gitter[r - 1 - n][c] == LUECKE:
            n += 1
        return n

    def hinweisfeld_ok(self, r, c):
        """Regel: Ein Hinweisfeld erklärt 1 oder 2 Wörter – nicht 0, nicht 3."""
        if feld(self.gitter, r, c) != HINWEIS or not (0 <= r < self.H and 0 <= c < self.B):
            return True
        status = [slot_status(self.gitter, r, c, p) for p in PFEILE]
        if status.count(True) > 2:
            return False
        if all(s is False for s in status):
            return False
        return True

    def isoliert(self, r, c):
        """Regel: Ein Buchstabe ganz ohne Nachbar-Buchstaben gehört zu keinem Wort."""
        if not self.ist_luecke(r, c):
            return False
        nachbarn = [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]
        if any(feld(self.gitter, *n) is None for n in nachbarn):
            return False                  # noch nicht entscheidbar
        return not any(self.ist_luecke(*n) for n in nachbarn)

    def regeln_ok(self, r, c):
        """Prüft alle Regeln, die durch das gerade gesetzte Feld (r, c) betroffen sind."""
        if self.gitter[r][c] == LUECKE:
            # Wörter dürfen nicht zu lang werden.
            if self.lauf_links(r, c) + 1 > self.max_lauf:
                return False
            if self.lauf_oben(r, c) + 1 > self.max_lauf:
                return False
            # Wörter am Rand brauchen das Hinweisfeld für den Knick-Pfeil.
            if c == 1 and self.ist_luecke(r, 0) and feld(self.gitter, r - 1, 0) != HINWEIS:
                return False
            if r == 1 and self.ist_luecke(0, c) and feld(self.gitter, 0, c - 1) != HINWEIS:
                return False
        # Hinweisfelder in der Nähe, deren Status sich jetzt geändert haben kann:
        for hr, hc in ((r, c), (r, c - 1), (r, c - 2), (r - 1, c), (r - 2, c),
                       (r - 1, 0), (0, c - 1)):
            if not self.hinweisfeld_ok(hr, hc):
                return False
        # Buchstaben, deren Nachbarn jetzt alle feststehen:
        for br, bc in ((r - 1, c), (r, c - 1), (r, c)):
            if self.isoliert(br, bc):
                return False
        return True

    def reihenfolge(self, r, c):
        """In welcher Reihenfolge probieren wir Hinweisfeld und Buchstabe aus?"""
        if r == 0 and c == 0:
            return [HINWEIS]              # oben links ist immer ein Hinweisfeld
        links = self.lauf_links(r, c)
        oben = self.lauf_oben(r, c)
        p = self.p_hinweis
        if links == 0 and c > 0:
            p *= 0.35                     # zwei Hinweisfelder nebeneinander eher vermeiden
        if links == 1:
            p *= 0.4                      # Wörter mit nur 1 Buchstabe gibt es nicht
        if oben == 1:
            p *= 0.6
        if links >= 3:
            p += 0.15 * (links - 2)       # lange Wörter irgendwann beenden
        if oben >= 3:
            p += 0.10 * (oben - 2)
        p = min(max(p, 0.02), 0.95)
        if self.rng.random() < p:
            return [HINWEIS, LUECKE]
        return [LUECKE, HINWEIS]

    def baue(self, max_schritte=5000):
        """Startet die Suche. True = fertige Schablone in self.gitter."""
        felder = [(r, c) for r in range(self.H) for c in range(self.B)]
        return self._suche(felder, 0, max_schritte)

    def _suche(self, felder, i, max_schritte):
        if i == len(felder):
            return True                   # alle Felder entschieden
        self.schritte += 1
        if self.schritte > max_schritte:
            return False                  # festgefahren -> Aufrufer probiert neu
        r, c = felder[i]
        for inhalt in self.reihenfolge(r, c):
            self.gitter[r][c] = inhalt
            if self.regeln_ok(r, c) and self._suche(felder, i + 1, max_schritte):
                return True
            self.gitter[r][c] = None      # zurücknehmen
            if self.schritte > max_schritte:
                return False
        return False


# ---------------------------------------------------------------------------
# 3) Phase 2: Wörter einsetzen
# ---------------------------------------------------------------------------

class WortFueller:
    """Setzt passende Wörter in die Lücken einer Schablone.

    Trick 1 – Index: Für jede Kombination (Wortlänge, Position, Buchstabe)
    merken wir uns alle passenden Wörter. "Wörter mit 5 Buchstaben, deren
    2. Buchstabe A ist" findet man so sofort.

    Trick 2 – "Engste Stelle zuerst": Wir füllen immer die Lücke, für die es
    gerade am wenigsten passende Wörter gibt. Hat eine Lücke 0 Kandidaten,
    wissen wir sofort, dass wir zurück müssen.
    """

    def __init__(self, woerter, gewichte, rng):
        self.rng = rng
        self.gewichte = gewichte                        # Wort -> Vorliebe (größer = lieber)
        self.nach_laenge = collections.defaultdict(list)
        self.index = collections.defaultdict(set)
        for w in woerter:
            self.nach_laenge[len(w)].append(w)
            for i, buchstabe in enumerate(w):
                self.index[(len(w), i, buchstabe)].add(w)

    def kandidaten(self, luecke):
        """Alle noch unbenutzten Wörter, die in diese Lücke passen."""
        laenge = len(luecke["felder"])
        mengen = []
        for i, f in enumerate(luecke["felder"]):
            buchstabe = self.buchstaben.get(f)
            if buchstabe:
                mengen.append(self.index.get((laenge, i, buchstabe), set()))
        if not mengen:                                  # noch kein Buchstabe bekannt
            passende = self.nach_laenge.get(laenge, [])
        else:
            mengen.sort(key=len)                        # kleinste Menge zuerst = schneller
            passende = set(mengen[0])
            for m in mengen[1:]:
                passende &= m                           # Schnittmenge
        # sorted(): Mengen haben in Python bei jedem Programmstart eine andere
        # Reihenfolge. Sortiert ist sie immer gleich -> gleicher Seed = gleiche Rätsel.
        return sorted(w for w in passende if w not in self.benutzt)

    def fuelle(self, luecken, max_schritte=2000):
        """Füllt alle Lücken. True bei Erfolg, Buchstaben stehen dann in self.buchstaben."""
        self.luecken = luecken
        self.buchstaben = {}            # (zeile, spalte) -> Buchstabe
        self.belegt = [None] * len(luecken)
        self.benutzt = set()
        self.schritte = 0
        self.max_schritte = max_schritte
        return self._suche()

    def _suche(self):
        self.schritte += 1
        if self.schritte > self.max_schritte:
            return False

        # Engste Lücke suchen.
        beste, beste_kand = None, None
        for i, luecke in enumerate(self.luecken):
            if self.belegt[i] is not None:
                continue
            kand = self.kandidaten(luecke)
            if not kand:
                return False                            # Sackgasse -> zurück
            if beste is None or len(kand) < len(beste_kand):
                beste, beste_kand = i, kand
                if len(kand) == 1:
                    break                               # enger geht's nicht
        if beste is None:
            return True                                 # keine Lücke mehr offen -> fertig!

        # Kandidaten zufällig, aber nach Vorliebe gewichtet sortieren.
        beste_kand.sort(key=lambda w: self.rng.random() ** (1.0 / self.gewichte.get(w, 1.0)),
                        reverse=True)
        luecke = self.luecken[beste]
        for wort in beste_kand[:30]:                    # höchstens 30 probieren
            neu = []
            for f, buchstabe in zip(luecke["felder"], wort):
                if f not in self.buchstaben:
                    self.buchstaben[f] = buchstabe
                    neu.append(f)
            self.belegt[beste] = wort
            self.benutzt.add(wort)
            if self._suche():
                return True
            # Zurücknehmen
            self.belegt[beste] = None
            self.benutzt.discard(wort)
            for f in neu:
                del self.buchstaben[f]
            if self.schritte > self.max_schritte:
                return False
        return False


# ---------------------------------------------------------------------------
# 4) Lösungswort, Bewertung, Hinweistexte
# ---------------------------------------------------------------------------

def waehle_loesung(gitter, kandidaten, laenge, rng, versuche=400):
    """Sucht ein Wort, dessen Buchstaben auf verschiedenen, weit verteilten Feldern liegen."""
    nach_buchstabe = collections.defaultdict(list)
    for r, zeile in enumerate(gitter):
        for c, inhalt in enumerate(zeile):
            if inhalt != HINWEIS:
                nach_buchstabe[inhalt].append((r, c))

    passende = [w for w in kandidaten if len(w) == laenge]
    rng.shuffle(passende)
    for wort in passende[:versuche]:
        gewaehlt = []
        for buchstabe in wort:
            moeglich = [f for f in nach_buchstabe[buchstabe]
                        if f not in gewaehlt
                        and all(abs(f[0] - g[0]) + abs(f[1] - g[1]) > 2 for g in gewaehlt)]
            if not moeglich:
                break                               # dieser Buchstabe fehlt -> nächstes Wort
            gewaehlt.append(rng.choice(moeglich))
        else:   # "else" an einer for-Schleife: läuft nur, wenn kein "break" kam
            return {"wort": wort, "felder": [list(f) for f in gewaehlt]}
    return None


def bewerte(gitter, woerter, info, schwierigkeit):
    """Punkte für ein fertiges Gitter: lange Wörter gut, viele Zweier und Hinweisfelder schlecht."""
    hinweisfelder = sum(zeile.count(HINWEIS) for zeile in gitter)
    zweier = sum(1 for w in woerter if len(w["wort"]) == 2)
    lange = sum(len(w["wort"]) for w in woerter if len(w["wort"]) >= 5)
    level = sum(info[w["wort"]]["level"] for w in woerter) / len(woerter)
    punkte = lange - 2.0 * zweier - 1.0 * hinweisfelder
    if schwierigkeit == "schwer":
        punkte += 15 * level            # bei "schwer" lieber seltene Wörter
    return punkte


def max_nutzung(wort, einstellung):
    """Wie oft darf ein Wort insgesamt (über alle Rätsel) vorkommen?

    Kurze Wörter sind der "Klebstoff" jedes Schwedenrätsels. Ohne sie lassen
    sich die Gitter kaum füllen, deshalb dürfen sie oft vorkommen. Lange
    Wörter sollen sich möglichst selten wiederholen.
    """
    if len(wort) == 2:
        return 1000          # praktisch unbegrenzt
    if len(wort) == 3:
        return 10
    return einstellung["max_wiederholung"]


def hinweistext(eintrag, schwierigkeit):
    """Welcher der beiden Hinweise wird gezeigt?"""
    if schwierigkeit == "leicht":
        return eintrag["leicht"]
    if schwierigkeit == "mittel":
        # Bekannte Wörter bekommen den kniffligen Hinweis, seltene den leichten.
        return eintrag["schwer"] if eintrag["level"] == 1 else eintrag["leicht"]
    return eintrag["schwer"]


# ---------------------------------------------------------------------------
# 5) Ein komplettes Rätsel bauen
# ---------------------------------------------------------------------------

def baue_gitter(pool, gewichte, einstellung, rng, versuche=60):
    """Phase 1 + 2 zusammen. Gibt ein fertiges Gitter (Liste von Listen) oder None zurück."""
    fueller = WortFueller(pool, gewichte, rng)
    for _ in range(versuche):
        muster = MusterBauer(einstellung["breite"], einstellung["hoehe"],
                             einstellung["max_lauf"], rng)
        if not muster.baue():
            continue                                    # keine Schablone -> neu
        luecken = finde_woerter(muster.gitter)
        if not fueller.fuelle(luecken):
            continue                                    # Wörter passen nicht -> neue Schablone
        gitter = [zeile[:] for zeile in muster.gitter]
        for (r, c), buchstabe in fueller.buchstaben.items():
            gitter[r][c] = buchstabe
        return gitter
    return None


def baue_raetsel(info, pool, gewichte, einstellung, schwierigkeit, rng, auswahl=5):
    """Baut mehrere Gitter und nimmt das mit der besten Bewertung."""
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


def raetsel_als_dict(nr, schwierigkeit, gitter, woerter, info, loesung):
    """Bringt ein Rätsel in das JSON-Format, das die App liest."""
    hinweise = []
    benutzte_texte = set()
    for w in woerter:
        hr, hc, pfeil = hinweisfeld_fuer(w)
        eintrag = info[w["wort"]]
        text = hinweistext(eintrag, schwierigkeit)
        if text in benutzte_texte:
            # Derselbe Hinweis steht schon im Rätsel (z. B. zweimal "Frauenname")
            # -> den anderen Hinweis dieses Worts nehmen.
            text = eintrag["schwer"] if text == eintrag["leicht"] else eintrag["leicht"]
        benutzte_texte.add(text)
        hinweise.append({
            "r": hr, "c": hc, "pfeil": pfeil,
            "text": text,
            "wort": w["wort"],
            "sr": w["sr"], "sc": w["sc"],
            "richtung": w["richtung"],
            "laenge": len(w["wort"]),
        })
    # Sortieren: nach Hinweisfeld, darin der "rechts"-Hinweis oben, der "unten"-Hinweis unten.
    oben_unten = {"rechts": 0, "rechts_unten": 1, "unten_rechts": 2, "unten": 3}
    hinweise.sort(key=lambda h: (h["r"], h["c"], oben_unten[h["pfeil"]]))
    return {
        "id": f"{schwierigkeit}-{nr:02d}",
        "nr": nr,
        "schwierigkeit": schwierigkeit,
        "breite": len(gitter[0]),
        "hoehe": len(gitter),
        "gitter": ["".join(zeile) for zeile in gitter],
        "hinweise": hinweise,
        "loesung": loesung,
    }


# ---------------------------------------------------------------------------
# 6) Unabhängige Kontrolle: Ist ein Rätsel wirklich korrekt?
# ---------------------------------------------------------------------------

def pruefe_raetsel(raetsel, info):
    """Prüft ein fertiges Rätsel von Grund auf. Rückgabe: Liste mit Fehlern (leer = gut)."""
    fehler = []
    gitter = [list(z) for z in raetsel["gitter"]]
    H, B = raetsel["hoehe"], raetsel["breite"]
    if len(gitter) != H or any(len(z) != B for z in gitter):
        return ["Gittergröße stimmt nicht"]

    woerter = finde_woerter(gitter)
    gesehen = set()
    abgedeckt = set()
    for w in woerter:
        if w["wort"] not in info:
            fehler.append(f"{w['wort']} steht nicht in der Wortliste")
        if w["wort"] in gesehen:
            fehler.append(f"{w['wort']} kommt doppelt vor")
        gesehen.add(w["wort"])
        abgedeckt.update(w["felder"])

    for r in range(H):
        for c in range(B):
            if gitter[r][c] != HINWEIS and (r, c) not in abgedeckt:
                fehler.append(f"Buchstabe in ({r},{c}) gehört zu keinem Wort")

    if len(raetsel["hinweise"]) != len(woerter):
        fehler.append("Anzahl Hinweise passt nicht zur Anzahl Wörter")
    pro_feld = collections.Counter((h["r"], h["c"]) for h in raetsel["hinweise"])
    for h in raetsel["hinweise"]:
        if feld(gitter, h["r"], h["c"]) != HINWEIS:
            fehler.append(f"Hinweis für {h['wort']} steht nicht in einem Hinweisfeld")
        if (h["r"], h["c"], h["pfeil"]) != hinweisfeld_fuer(h):
            fehler.append(f"Pfeil für {h['wort']} passt nicht")
        if not h["text"]:
            fehler.append(f"Hinweistext für {h['wort']} fehlt")
    for (r, c), n in pro_feld.items():
        if n > 2:
            fehler.append(f"Hinweisfeld ({r},{c}) hat {n} Hinweise")
    for r in range(H):
        for c in range(B):
            if gitter[r][c] == HINWEIS and (r, c) not in pro_feld:
                fehler.append(f"Hinweisfeld ({r},{c}) ist leer")

    loesung = raetsel.get("loesung")
    if loesung:
        buchstaben = "".join(gitter[r][c] for r, c in loesung["felder"])
        if buchstaben != loesung["wort"]:
            fehler.append("Lösungswort passt nicht zu den markierten Feldern")
    return fehler


# ---------------------------------------------------------------------------
# 7) Hauptprogramm
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Erzeugt Schwedenrätsel als JSON.")
    parser.add_argument("--seed", type=int, default=2026, help="Startwert für den Zufall")
    for name, e in SCHWIERIGKEITEN.items():
        parser.add_argument(f"--{name}", type=int, default=e["anzahl"],
                            help=f"Anzahl Rätsel '{name}' (Standard {e['anzahl']})")
    parser.add_argument("--ausgabe", type=pathlib.Path, default=AUSGABE,
                        help="Zieldatei (Standard: ../data/puzzles.json)")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    info = lade_woerter()
    print(f"{len(info)} Wörter geladen.")

    alle = []
    gitter_gesehen = set()             # Fingerabdrücke, damit kein Rätsel doppelt vorkommt
    nutzung = collections.Counter()    # wie oft jedes Wort schon verwendet wurde
    loesungen = set()                  # schon benutzte Lösungswörter
    start = time.time()

    for schwierigkeit, einstellung in SCHWIERIGKEITEN.items():
        anzahl = getattr(args, schwierigkeit)
        nr = 1
        while nr <= anzahl:
            # Wort-Pool für dieses Rätsel: passendes Level und nicht schon zu oft benutzt.
            # Kurze Wörter braucht man ständig, deshalb dürfen sie öfter vorkommen.
            pool = [w for w, e in info.items()
                    if e["level"] <= einstellung["max_level"]
                    and nutzung[w] < max_nutzung(w, einstellung)]
            # Selten benutzte Wörter bekommen ein höheres Gewicht.
            gewichte = {w: 1.0 / (1 + nutzung[w]) for w in pool}
            if schwierigkeit == "schwer":
                for w in pool:
                    gewichte[w] *= info[w]["level"]       # Level 3 = dreifach so beliebt

            ergebnis = baue_raetsel(info, pool, gewichte, einstellung, schwierigkeit, rng)
            if ergebnis is None:
                print(f"  {schwierigkeit} {nr}: kein Gitter gefunden, neuer Versuch")
                continue
            gitter, woerter = ergebnis
            fingerabdruck = "".join("".join(z) for z in gitter)
            if fingerabdruck in gitter_gesehen:
                continue                                  # gab's schon -> nochmal

            im_gitter = {w["wort"] for w in woerter}
            loesung_pool = [w for w in pool
                            if w not in im_gitter and w not in loesungen
                            and info[w]["level"] <= max(1, einstellung["max_level"] - 1)]
            loesung = waehle_loesung(gitter, loesung_pool, einstellung["loesung_laenge"], rng)

            raetsel = raetsel_als_dict(nr, schwierigkeit, gitter, woerter, info, loesung)
            fehler = pruefe_raetsel(raetsel, info)
            if fehler:
                print(f"  {schwierigkeit} {nr}: verworfen ({fehler[0]})")
                continue

            gitter_gesehen.add(fingerabdruck)
            nutzung.update(im_gitter)
            if loesung:
                loesungen.add(loesung["wort"])
            alle.append(raetsel)
            print(f"  {raetsel['id']}: {len(woerter)} Wörter, "
                  f"Lösungswort {loesung['wort'] if loesung else '-'}")
            nr += 1

    args.ausgabe.parent.mkdir(parents=True, exist_ok=True)
    daten = {"version": 1, "erstellt": time.strftime("%Y-%m-%d"), "raetsel": alle}
    # separators=(",", ":") spart Leerzeichen -> kleinere Datei
    args.ausgabe.write_text(json.dumps(daten, ensure_ascii=False, separators=(",", ":")),
                            encoding="utf-8")
    dauer = time.time() - start
    print(f"{len(alle)} Rätsel in {dauer:.0f} s gespeichert: {args.ausgabe}")


if __name__ == "__main__":
    main()
