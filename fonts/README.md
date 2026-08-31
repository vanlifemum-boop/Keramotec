# Schriften

Selbst gehostet, kein Aufruf an Google Fonts beim Seitenbesuch — das vermeidet die
Übertragung der Besucher-IP an Google und damit das bekannte DSGVO-Problem.

| Datei | Schrift | Verwendung | Lizenz |
| --- | --- | --- | --- |
| `bodoni-moda.woff2` | Bodoni Moda, variabel (`wght` 400–700, `opsz` 48–96) | Schlagzeilen | SIL OFL 1.1, siehe `OFL-BodoniModa.txt` |
| `archivo.woff2` | Archivo, variabel (`wght` 400–800) | Fließtext, Labels, Zahlen | SIL OFL 1.1, siehe `OFL-Archivo.txt` |

Beide stammen aus dem Repository `google/fonts` und wurden mit `fonttools` auf die
tatsächlich benötigten Zeichen verkleinert: Latin, deutsche Umlaute und ß, Anführungs-
und Gedankenstriche, Euro, Pfeile. Zusammen 52 kB statt mehrerer hundert.

Beim Austauschen einer Schrift daran denken, die Fallback-Metriken in `styles.css`
(`size-adjust`, `ascent-override`) neu zu messen — sonst springt das Layout beim Nachladen.
