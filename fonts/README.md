# Schriften

Selbst gehostet, kein Aufruf an Google Fonts beim Seitenbesuch — das vermeidet die
Übertragung der Besucher-IP an Google und damit das bekannte DSGVO-Problem.

| Datei | Schrift | Verwendung | Lizenz |
| --- | --- | --- | --- |
| `archivo.woff2` | Archivo, variabel (`wght` 400–800) | alles: Schlagzeilen, Fließtext, Labels, Zahlen | SIL OFL 1.1, siehe `OFL-Archivo.txt` |

Eine einzige Schrift für die ganze Seite. Die Hierarchie entsteht über Größe und
Gewicht, nicht über einen Schriftwechsel. Aus `google/fonts` bezogen und mit
`fonttools` auf die tatsächlich benötigten Zeichen verkleinert: Latin, deutsche
Umlaute und ß, Anführungs- und Gedankenstriche, Euro, Pfeile. 26 kB.

Zwischenstände, die verworfen wurden: Bodoni Moda (zu dünne Haarstriche auf dem
Handy) und Fraunces (immer noch zu verspielt). Wer erneut wechselt, muss die
Fallback-Metrik in `styles.css` (`size-adjust`) neu messen — sonst springt das
Layout, sobald die Schrift nachgeladen ist.
