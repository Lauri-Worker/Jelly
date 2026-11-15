// Rechtliche Texte und Neuigkeiten der App.
// WICHTIG: Das Impressum enthält Platzhalter in [eckigen Klammern]. Bitte mit den echten
// Angaben der Person ersetzen, die die Website betreibt. Die Texte sind keine Rechtsberatung.

export const APP_VERSION = '1.7';

export const NEWS_VERSION = 7;
export const NEWS = [
  { title: 'Tape zum Lernen', text: 'Decke Begriffe mit farbigem Tape ab und tippe darauf, um sie aufzudecken – ideal zum Abfragen.' },
  { title: 'Lasso-Werkzeug', text: 'Tippe das Lasso nochmal an: rechteckig oder freihand auswählen und festlegen, was mit ausgewählt wird.' },
  { title: 'Seiten wischen', text: 'Blättere mit dem Finger nach links und rechts durch deine Seiten – jede Seite füllt den Bildschirm. Fortlaufendes Scrollen gibt es weiter unter Ansicht.' },
  { title: 'Flüssige Animationen', text: 'Dokumente öffnen sich mit einer Zoom-Animation, Ordner gleiten herein, angetippte Elemente werden hervorgehoben.' },
  { title: 'Tabs für geöffnete Dokumente', text: 'Geöffnete Notizbücher bleiben oben als Tabs offen – antippen zum Wechseln, × zum Schließen.' },
  { title: 'Neue Werkzeuge', text: 'Haftnotizen, Laserpointer, Sprachaufnahmen, Lesezeichen und Suche im Dokument.' },
  { title: 'Stifte und Text', text: 'Füller, Kugelschreiber oder Pinsel, Formerkennung sowie Schriftart, Schriftgröße, fett und kursiv für Textfelder.' },
  { title: 'Neue Bibliothek', text: 'Seitenleiste mit Dokumenten, Favoriten und Geteilt, Rasteransicht oder Liste, mehr Ordnerfarben.' },
  { title: 'Papierkorb', text: 'Gelöschtes landet zuerst im Papierkorb und kann 30 Tage lang wiederhergestellt werden.' },
  { title: 'PDFs ohne Notizbuch', text: 'Über + Neu → PDF hinzufügen direkt ein PDF anlegen und darauf schreiben.' },
  { title: 'Dokumente scannen', text: 'Blätter mit der Kamera einscannen, gerade ziehen und aufhellen.' },
  { title: 'Ordner', text: 'Ordner beliebig ineinander verschachteln, einfärben und als Favorit markieren.' },
];

export const LEGAL = {
  privacy: {
    title: 'Datenschutzrichtlinie',
    html: `
<p>Jelly Notes ist so gebaut, dass deine Notizen dir gehören. Diese Seite erklärt, welche Daten wo gespeichert werden.</p>
<h3>Ohne Konto</h3>
<p>Alle Notizbücher, PDFs, Bilder, Ordner und Einstellungen werden nur im Speicher deines Browsers auf diesem Gerät abgelegt (IndexedDB und localStorage). Sie werden nicht an einen Server übertragen. Wenn du die Website-Daten im Browser löschst, sind auch deine Notizen weg. Sichere sie deshalb regelmäßig über <b>Cloud &amp; Backup</b>.</p>
<h3>Mit Konto</h3>
<p>Wenn Benutzerkonten eingerichtet sind und du dich anmeldest, werden deine E-Mail-Adresse, ein verschlüsseltes Passwort sowie deine Notizbücher, Ordner und Bilder beim Datenbankdienst Supabase gespeichert. Nur du kannst deine Daten lesen; das sichern Zugriffsregeln in der Datenbank ab.</p>
<h3>Hosting</h3>
<p>Die Website wird über einen Hosting-Dienst (z.B. GitHub Pages) ausgeliefert. Dieser Dienst kann beim Aufruf technisch notwendige Daten wie deine IP-Adresse kurzzeitig in Server-Protokollen speichern.</p>
<h3>Keine Werbung, kein Tracking</h3>
<p>Jelly Notes verwendet keine Analyse- oder Werbedienste und setzt keine Tracking-Cookies. Schriften und Programmbibliotheken werden direkt von dieser Website geladen, nicht von fremden Servern.</p>
<h3>Deine Rechte</h3>
<p>Du kannst jederzeit alle deine Daten exportieren (Cloud &amp; Backup) und löschen. Bei Fragen wende dich an die im Impressum genannte Kontaktadresse.</p>`,
  },
  terms: {
    title: 'Nutzungsbedingungen',
    html: `
<p>Jelly Notes ist eine kostenlose Notiz-App, die ohne Gewähr bereitgestellt wird.</p>
<h3>Deine Inhalte</h3>
<p>Alles, was du schreibst, zeichnest, scannst oder hochlädst, bleibt deins. Du bist selbst dafür verantwortlich, dass du die Rechte an hochgeladenen Dokumenten hast.</p>
<h3>Datensicherung</h3>
<p>Wir bemühen uns, dass keine Daten verloren gehen, können das aber nicht garantieren. Erstelle regelmäßig ein Backup über <b>Cloud &amp; Backup</b>.</p>
<h3>Haftung</h3>
<p>Die Nutzung erfolgt auf eigenes Risiko. Für Datenverluste oder Ausfälle wird keine Haftung übernommen, soweit das gesetzlich zulässig ist.</p>
<h3>Änderungen</h3>
<p>Die App wird laufend weiterentwickelt. Funktionen können sich ändern; Neuerungen findest du unter der Glocke oben rechts.</p>`,
  },
  imprint: {
    title: 'Impressum',
    html: `
<p class="legal-note">Bitte die Angaben in [eckigen Klammern] durch die echten Daten der verantwortlichen Person ersetzen (Datei <code>legal.js</code>).</p>
<h3>Angaben gemäß § 5 DDG</h3>
<p>[Vorname Nachname]<br>[Straße Hausnummer]<br>[PLZ Ort]<br>[Land]</p>
<h3>Kontakt</h3>
<p>E-Mail: [kontakt@beispiel.de]</p>
<h3>Verantwortlich für den Inhalt</h3>
<p>[Vorname Nachname], Anschrift wie oben</p>`,
  },
};
