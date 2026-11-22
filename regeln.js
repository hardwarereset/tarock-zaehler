/*
  Tarock-Zähler – Regeldatei (Hausregeln)
  ----------------------------------------
  Hier stehen alle Spiele, Werte und Prämien. Andere Runden passen nur diese Datei an.

  Spiel-Felder:
    id          eindeutige Kennung
    kuerzel     Anzeige-Kürzel (Standard: id)
    name        Name
    stufe       Gruppe in der Lizitation (Reihenfolge = Rangfolge)
    wert        Grundwert
    wertVerloren  (optional) Wert bei verlorenem Spiel, z. B. Sechserdreier 4 (8)
    vogelFaktor (optional) Wert = wert + vogelFaktor × V  (V = Roh-Wert des Vogels)
    voegel      (optional) wählbare Vögel (Prämien-ids)
    typ         'partner' (2 gegen 2, mit Ruf), 'allein' (1 gegen 3),
                'negativ' (Abrechnung einzeln mit jedem Gegner), 'trischaken'
    nurVorhand  nur Vorhand darf es spielen  – im Speisezettel mit (V) markiert
    mussAnsagen Spielerseite muss mindestens eine Prämie (Zutat) ansagen
    pflichtPraemien  Prämien, die bei diesem Spiel automatisch angesagt sind (z. B. Sack);
                wird eine davon verfehlt, ist das ganze Spiel verloren
    solo        alle Prämien zählen doppelt (soloPraemienFaktor)
*/
window.TAROCK_REGELN = {
  name: 'Hausregeln laut Speisezettel',

  stufenNamen: { 1: 'Vorhandspiele', 2: 'Stufe 2', 3: 'Stufe 3', 4: 'Stufe 4' },

  spiele: [
    { id: 'R',    name: 'Rufer',                wert: 1,  typ: 'partner',    stufe: 1, nurVorhand: true, mussAnsagen: true },
    { id: 'T',    name: 'Trischaken',           wert: 2,  typ: 'trischaken', stufe: 1, nurVorhand: true },

    { id: 'P',    name: 'Piccolo',              wert: 2,  typ: 'negativ',    stufe: 2 },
    { id: 'S',    name: 'Solorufer',            wert: 2,  typ: 'partner',    stufe: 2, solo: true },
    { id: 'BR12', kuerzel: 'BR I/II', name: 'Besserrufer I, II', wert: 1, vogelFaktor: 1,
      voegel: ['pagat', 'uhu'], typ: 'partner', stufe: 2 },
    // Supraregional = Rufer mit angesagtem Sack: 1 + Sack angesagt (2) = 3
    { id: 'SR',   name: 'Supraregional',        wert: 1,  pflichtPraemien: ['sack1'], typ: 'partner', stufe: 2 },
    { id: 'B',    name: 'Bettel',               wert: 4,  typ: 'negativ',    stufe: 2 },
    { id: 'E6',   name: 'Sechserdreier',        wert: 4,  wertVerloren: 8, typ: 'allein', stufe: 2, nurVorhand: true },
    { id: 'F',    name: 'Farbendreier',         wert: 5,  typ: 'allein',     stufe: 2 },
    { id: 'E',    name: 'Dreier',               wert: 5,  typ: 'allein',     stufe: 2 },

    { id: 'ZSO',  name: 'Zwiccolo semiouvert',  wert: 6,  typ: 'negativ',    stufe: 3 },
    { id: 'PSO',  name: 'Piccolo semiouvert',   wert: 6,  typ: 'negativ',    stufe: 3 },
    { id: 'BSO',  name: 'Bettel semiouvert',    wert: 6,  typ: 'negativ',    stufe: 3 },
    { id: 'F1',   name: 'Farbeneiner',          wert: 6,  typ: 'allein',     stufe: 3 },
    { id: 'E1',   name: 'Einer',                wert: 6,  typ: 'allein',     stufe: 3 },

    { id: 'SB',   name: 'Solobesserrufer',      wert: 1,  vogelFaktor: 2,
      voegel: ['pagat', 'uhu', 'kakadu', 'quapil'], typ: 'partner', stufe: 4, solo: true },
    { id: 'BR34', kuerzel: 'BR III/IIII', name: 'Besserrufer III, IIII', wert: 1, vogelFaktor: 1,
      voegel: ['kakadu', 'quapil'], typ: 'partner', stufe: 4 },
    { id: 'TO',   name: 'Triccolo ouvert',      wert: 8,  typ: 'negativ',    stufe: 4 },
    { id: 'ZO',   name: 'Zwiccolo ouvert',      wert: 8,  typ: 'negativ',    stufe: 4 },
    { id: 'PO',   name: 'Piccolo ouvert',       wert: 8,  typ: 'negativ',    stufe: 4 },
    { id: 'BO',   name: 'Bettel ouvert',        wert: 8,  typ: 'negativ',    stufe: 4 },
    { id: 'FS',   name: 'Farbensolo',           wert: 10, typ: 'allein',     stufe: 4, solo: true },
    { id: 'SE',   name: 'Solodreier',           wert: 10, typ: 'allein',     stufe: 4, solo: true }
  ],

  // Beilagen: roh = still, gar = angesagt
  praemien: [
    { id: 'koenig',     name: 'König ultimo', roh: 1, gar: 2 },
    { id: 'pagat',      name: 'Pagat',        roh: 1, gar: 2 },
    { id: 'uhu',        name: 'Uhu',          roh: 2, gar: 4 },
    { id: 'kakadu',     name: 'Kakadu',       roh: 3, gar: 6 },
    { id: 'quapil',     name: 'Quapil',       roh: 4, gar: 8 },
    { id: 'mondfang',   name: 'Mondfang',     roh: 1, gar: 2 },
    { id: 'koenigfang', name: 'Königfang',    roh: 1, gar: 2 },
    { id: 'trull',      name: 'Trull',        roh: 1, gar: 2 },
    { id: 'vierkoenig', name: 'Vier Könige',  roh: 1, gar: 2 },
    { id: 'sack1',      name: '1. Sack (Gegner < 24)', roh: 1, gar: 2 },
    { id: 'sack2',      name: '2. Sack (Gegner < 14)', roh: 1, gar: 2, schliesstEin: ['sack1'] },
    { id: 'sack3',      name: '3. Sack (Gegner < 7)',  roh: 1, gar: 2, schliesstEin: ['sack1', 'sack2'] }
  ],
  // schliesstEin: beim Antippen werden diese Prämien automatisch mit hinzugefügt (zählen zusätzlich)

  valat: { roh: 4, gar: 8 },          // Spielwert × Faktor; angesagte Prämien ebenfalls × Faktor, stille entfallen
  soloPraemienFaktor: 2,

  trischaken: { buergermeisterAb: 36, gesamtPunkte: 70 },

  radl: {
    ersteRunde: true,                 // erste Runde zählt doppelt
    letzteRunde: true,                // Knopf „Letzte Runde“
    nachTrischaken: true              // Trischaken bringt eine Radl-Runde
  }
};
