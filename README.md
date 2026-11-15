# Jelly Notes

Eine Notiz-Web-App im Stil digitaler Notizbücher: handschriftlich schreiben, PDFs annotieren, Notizbücher verwalten. Läuft komplett im Browser, ohne Server und ohne Build-Schritt. Ohne Einrichtung bleiben alle Daten lokal im Browser. Optional gibt es Benutzerkonten mit Cloud-Speicher.

## Funktionen

- **Bibliothek** mit Seitenleiste (Dokumente, Favoriten, Geteilt), Suche, Raster- oder Listenansicht, Filter nach Notizbüchern oder PDFs
- **Favoriten** per Stern, **Papierkorb** mit Wiederherstellen (endgültiges Löschen nach 30 Tagen)
- **Profil-Menü** mit Einstellungen (hell/dunkel/System, Nur-Stift-Modus), Cloud & Backup (ganze Bibliothek sichern und laden), Über, Datenschutz, Nutzungsbedingungen, Impressum
- **Ordner**, beliebig ineinander verschachtelt: anlegen, umbenennen, einfärben, Notizbücher und Ordner verschieben (über das Menü oder per Drag-and-drop). Beim Löschen eines Ordners bleibt der Inhalt erhalten und rutscht eine Ebene nach oben.
- **Papiervorlagen:** Blanko, Liniert, Kariert, Gepunktet, Cornell; Weiß, Creme, Dunkel; Hoch- oder Querformat
- **Stift** mit Drucksensitivität (Apple Pencil, Surface Pen, Wacom), Farben und Strichstärken
- **Textmarker** (halbtransparent, liegt nicht über der Schrift)
- **Radierer:** entfernt ganze Striche. Das Radierer-Ende eines Stifts wird erkannt.
- **Lasso:** auswählen, verschieben, skalieren, umfärben, duplizieren, kopieren und einfügen, löschen
- **Formen:** Linie, Pfeil, Rechteck, Ellipse. Mit Umschalt entstehen Quadrat bzw. Kreis.
- **Tabs:** geöffnete Notizbücher bleiben oben als Tabs offen (auch nach dem Neuladen)
- **Stiftarten** Füller, Kugelschreiber, Pinsel; **Formerkennung** begradigt Linien, Kreise und Rechtecke
- **Textfelder** mit Schriftart, Schriftgröße, fett und kursiv; **Haftnotizen**; **Laserpointer**; **Sprachaufnahmen**; **Lesezeichen**; **Suche** in Textfeldern und Haftnotizen
- **Textfelder** und **Bilder** (über Button, Drag-and-drop oder Einfügen aus der Zwischenablage)
- **PDF-Import** als neues Notizbuch oder über **Einfügen → PDF einfügen** direkt in ein Notizbuch, um PDFs zu annotieren
- **Dokumente scannen** mit der Kamera: Blattecken werden automatisch erkannt und lassen sich nachziehen, das Blatt wird entzerrt und aufgehellt (Farbe, Graustufen, S/W oder Original). Mehrere Seiten nacheinander, Einfügen ins offene Notizbuch oder als neues Notizbuch.
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
- **Firebase Hosting (Google):** Die Datei `firebase.json` ist schon vorbereitet. In der [Firebase-Konsole](https://console.firebase.google.com) ein Projekt anlegen, dann im Projektordner:
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase deploy --only hosting --project DEINE-PROJEKT-ID
  ```
  Die App läuft danach unter `https://DEINE-PROJEKT-ID.web.app`.
- **GitHub Pages:** nur bei öffentlichem Repo oder kostenpflichtigem GitHub-Plan. Unter **Settings → Pages** „Deploy from a branch“ und den Branch mit dem Code wählen. Die App läuft dann unter `https://lauri-worker.github.io/Jelly/`.

**Updates:** Die App prüft beim Öffnen, beim Zurückkehren in die App und alle 15 Minuten, ob auf dem Server eine neue Version liegt. Ist das so, speichert sie das offene Notizbuch, lädt sich neu und zeigt „App wurde aktualisiert“. Versionsnummern muss man dafür nicht pflegen.

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
- `legal.js`: Texte für Datenschutz, Nutzungsbedingungen, Impressum (Platzhalter bitte ausfüllen) und Neuigkeiten
- `scan.js`: Dokumenten-Scanner (Eckenerkennung, Entzerrung, Aufhellen)
- `cloud.js`, `config.js`, `supabase/schema.sql`: Benutzerkonten und Cloud-Speicher mit Supabase
- `sw.js`, `manifest.webmanifest`: PWA/Offline
- `vendor/`: [jsPDF](https://github.com/parallax/jsPDF) (MIT), [pdf.js](https://github.com/mozilla/pdf.js) (Apache 2.0) [supabase-js](https://github.com/supabase/supabase-js) (MIT) und die Schrift Bricolage Grotesque (SIL Open Font License)
