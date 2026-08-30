# Keramotec Manufaktur

Cineastische, responsive One-Page-Website für Keramotec Manufaktur.

## Inhalt

- Leistungen und Einsatzbereiche der Keramikversiegelung
- Schutzwirkung und Speziallösungen
- vollständige Preisübersicht aus der bereitgestellten Broschüre
- Informationen zu Marcus Siebenhaar und der Reisemobil-Beratung
- Kontakt- und Standortdaten
- barrierearme Navigation, reduzierte Bewegung und mobile Kontaktleiste

## Cinematic-Scroll

Das Hero und der Abschnitt „Schutz" laufen über eine Canvas-Bühne
(`cinematic.js`, Technik aus dem `scroll-cinematic`-Skill). Statt einer
vorgeladenen Frame-Sequenz zeichnet die Engine die vorhandene Fotografie pro
Frame neu und leitet den Effekt aus der Scroll-Position ab:

- **Hero:** langsame Kamerafahrt plus Versiegelungswelle, die matte Oberfläche
  in versiegelten Glanz überführt; der Text läuft in drei Beats mit.
- **Schutz:** Oberflächen-Makro mit Lotus-Effekt, Wasserperlen bilden sich
  während des Durchlaufs.

Auf Zeigegeräten glättet Lenis (`vendor/lenis.min.js`) den Scroll; auf
Touchgeräten bleibt der native Scroll aktiv. Die Bühnenlänge ist pro
Geräteklasse gestaffelt (Desktop 460vh bis Handy quer 240vh).

Ohne JavaScript, bei `prefers-reduced-motion: reduce` oder bei aktiviertem
Datensparmodus wird kein Canvas gezeichnet: die Seite bleibt dann ein
klassisches Hero mit Hintergrundbild, die drei Textblöcke stehen untereinander.

## Breakpoints

| Breite | Anpassung |
| --- | --- |
| ≤ 1180 px | schmalere Ränder, kürzere Bühne |
| ≤ 1024 px | Tablet quer: zweispaltige Speziallösungen, engere Raster |
| ≤ 980 px | Tablet hoch: Burger-Menü, einspaltige Textraster |
| ≤ 680 px | Handy: volle Buttonbreite, fixe Kontaktleiste, Safe-Area-Abstände |
| ≤ 400 px | kleines Handy: kleinere Displayzeilen und Preistabellen |
| Höhe ≤ 560 px, quer | Handy quer: kurze Bühne, kompakte Abstände |

## Lokal ansehen

Die Seite ist bewusst ohne Build-Abhängigkeiten umgesetzt. Im Projektordner genügt ein statischer
Webserver, zum Beispiel:

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080` im Browser öffnen.

## Veröffentlichung

Das Repository kann direkt mit GitHub Pages oder jedem statischen Webhost veröffentlicht werden.
