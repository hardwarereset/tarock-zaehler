# Tarock-Zähler

Eine kleine Web-App zum Mitzählen von Tarockrunden (Königrufen-Familie) am Handy. Sie läuft offline und lässt sich installieren.

- Spieler und Sitzordnung eingeben, Vorhand wählen (4 Spieler oder 5 mit aussetzendem Geber)
- Jedes Spiel in einigen Schritten eintragen: Lizitation, Partner/Vogel, Kontra, Ergebnis, Valat, Prämien (still/angesagt)
- Abrechnung mit nachvollziehbarem Rechenweg; Partnerspiele 2:2, Alleinspiele 1:3, Negativspiele einzeln je Gegner
- Trischaken mit Bürgermeister, Jungfrau und Vorhand-Regel
- Radl: erste und letzte Runde, nach Trischaken, oder manuell
- Gespeicherte Spiele ansehen und nachträglich ändern

## Eigene Hausregeln

Alle Spiele, Werte und Prämien stehen in [`regeln.js`](regeln.js). Für andere Runden lassen sich dort Spiele ergänzen, Werte ändern oder Prämien anpassen, ohne den restlichen Code anzufassen.

## Installation am Handy

Die Adresse der App in Chrome öffnen, dann im Menü **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“** wählen.

## Lokal starten

```
python -m http.server 8765
```
und dann http://localhost:8765 öffnen.
