# Jelly Notes

Eine Notiz-Web-App im Stil digitaler Notizbücher: handschriftlich schreiben, PDFs annotieren, Notizbücher verwalten. Läuft komplett im Browser, ohne Server und ohne Build-Schritt. Alle Daten bleiben lokal (IndexedDB).

## Funktionen

- **Bibliothek** mit Notizbüchern (Cover-Farben oder Vorschau der ersten Seite), Suche, Umbenennen, Duplizieren, Löschen
- **Papiervorlagen:** Blanko, Liniert, Kariert, Gepunktet, Cornell; Weiß, Creme, Dunkel; Hoch- oder Querformat
- **Stift** mit Drucksensitivität (Apple Pencil, Surface Pen, Wacom), Farben und Strichstärken
- **Textmarker** (halbtransparent, liegt nicht über der Schrift)
- **Radierer:** entfernt ganze Striche. Das Radierer-Ende eines Stifts wird erkannt.
- **Lasso:** auswählen, verschieben, skalieren, umfärben, duplizieren, kopieren und einfügen, löschen
- **Formen:** Linie, Pfeil, Rechteck, Ellipse. Mit Umschalt entstehen Quadrat bzw. Kreis.
- **Textfelder** und **Bilder** (über Button, Drag-and-drop oder Einfügen aus der Zwischenablage)
- **PDF-Import** als neues Notizbuch oder als angehängte Seiten, um PDFs zu annotieren
- **Export:** PDF, aktuelle Seite als PNG, Backup als `.json` (lässt sich wieder importieren)
- **Seiten:** hinzufügen, duplizieren, verschieben, löschen, Papier ändern; Seitenübersicht mit Miniaturen
- **Zoom:** Zwei-Finger-Geste, Strg + Mausrad oder Buttons
- **„Nur Stift zeichnet“:** Handballenerkennung, Finger scrollen dann nur
- Rückgängig/Wiederholen, automatisches Speichern, als App installierbar (PWA, offline nutzbar)

## Starten

Die App braucht einen lokalen Webserver (wegen ES-Modulen und Service Worker):

```bash
python3 -m http.server 8000
# oder
npx serve .
```

Danach im Browser `http://localhost:8000` öffnen. Für ein Hosting reicht jeder statische Host, z.B. GitHub Pages.

## Tastenkürzel

| Taste | Aktion |
|---|---|
| P / H / E / L / S / T | Stift / Textmarker / Radierer / Lasso / Formen / Text |
| Strg+Z, Strg+Umschalt+Z | Rückgängig, Wiederholen |
| Strg+C / Strg+X / Strg+V | Auswahl kopieren / ausschneiden / einfügen |
| Entf | Auswahl löschen |
| Strg + / Strg − / Strg 0 | Zoomen / an Breite anpassen |

## Aufbau

- `index.html`, `style.css`: Oberfläche
- `app.js`: Editor, Rendering (Canvas), Werkzeuge, Bibliothek, Import/Export
- `db.js`: Speicherung in IndexedDB (Notizbücher, Metadaten und Bilder getrennt)
- `sw.js`, `manifest.webmanifest`: PWA/Offline
- `vendor/`: [jsPDF](https://github.com/parallax/jsPDF) (MIT) und [pdf.js](https://github.com/mozilla/pdf.js) (Apache 2.0)
