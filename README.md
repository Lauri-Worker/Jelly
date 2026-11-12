# Jelly Notes

Eine Notiz-Web-App im Stil digitaler Notizbücher: handschriftlich schreiben, PDFs annotieren, Notizbücher verwalten. Läuft komplett im Browser, ohne Server und ohne Build-Schritt. Ohne Einrichtung bleiben alle Daten lokal im Browser. Optional gibt es Benutzerkonten mit Cloud-Speicher.

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

## Benutzerkonten einrichten (optional)

Ohne Einrichtung speichert die App alles nur im Browser des jeweiligen Geräts. Mit Supabase kann sich jeder ein eigenes Konto mit E-Mail und Passwort erstellen. Die Notizbücher liegen dann in der Cloud und sind auf jedem Gerät verfügbar. Jeder Nutzer sieht nur seine eigenen Notizbücher.

1. Auf [supabase.com](https://supabase.com) kostenlos ein Konto und ein neues Projekt anlegen.
2. Im Projekt den **SQL Editor** öffnen, den Inhalt von `supabase/schema.sql` einfügen und auf **Run** klicken. Das legt die Tabelle, den Speicher für Bilder und PDFs und die Zugriffsregeln an.
3. Unter **Project Settings → API** die **Project URL** und den **anon public**-Key kopieren und in `config.js` eintragen.
4. Unter **Authentication → URL Configuration** bei **Site URL** die Adresse eintragen, unter der die App läuft, z.B. `https://deine-app.netlify.app`. Dorthin führen die Links aus den Bestätigungs- und Passwort-E-Mails.
5. Die App veröffentlichen (siehe unten).

Supabase verlangt standardmäßig, dass neue Nutzer ihre E-Mail bestätigen. Das lässt sich unter **Authentication → Sign In / Providers → Email → Confirm email** abschalten. Der eingebaute E-Mail-Versand von Supabase schickt nur wenige E-Mails pro Stunde. Für viele Nutzer unter **Authentication → Emails → SMTP Settings** einen eigenen Mail-Anbieter eintragen.

## Veröffentlichen

Die App besteht nur aus statischen Dateien. Jeder dieser kostenlosen Dienste funktioniert, auch mit privatem GitHub-Repo:

- **Netlify:** auf [app.netlify.com/drop](https://app.netlify.com/drop) den Projektordner ins Browserfenster ziehen. Oder ein neues Projekt aus dem GitHub-Repo anlegen (Build-Befehl leer, Publish-Ordner `.`).
- **Vercel** oder **Cloudflare Pages:** Projekt aus dem GitHub-Repo importieren, ohne Build-Befehl.
- **GitHub Pages:** nur bei öffentlichem Repo oder kostenpflichtigem GitHub-Plan.

Danach öffnet sich die App unter der Adresse des Dienstes in Safari, Chrome und jedem anderen Browser.

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
- `db.js`: lokale Speicherung in IndexedDB (Notizbücher, Metadaten und Bilder getrennt)
- `cloud.js`, `config.js`, `supabase/schema.sql`: Benutzerkonten und Cloud-Speicher mit Supabase
- `sw.js`, `manifest.webmanifest`: PWA/Offline
- `vendor/`: [jsPDF](https://github.com/parallax/jsPDF) (MIT), [pdf.js](https://github.com/mozilla/pdf.js) (Apache 2.0) und [supabase-js](https://github.com/supabase/supabase-js) (MIT)
