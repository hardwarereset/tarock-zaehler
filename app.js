/* Tarock-Zähler – App-Logik. Regeln kommen aus regeln.js */
(function () {
  'use strict';
  const R = window.TAROCK_REGELN;
  const KEY = 'tarock-zaehler-v1';
  const KONTRA = [{ f: 1, l: 'ohne' }, { f: 2, l: 'Kontra' }, { f: 4, l: 'Re' }, { f: 8, l: 'Sub' }];

  let S = laden();
  let ui = { screen: S ? 'stand' : 'setup', e: null, setup: { anzahl: 4, namen: ['', '', '', '', ''], vh: 0 } };
  let letzterScreen = null;

  // ---------- Hilfen ----------
  function laden() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.spieler ? s : null; } catch (_) { return null; } }
  function sichern() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const spielDef = id => R.spiele.find(s => s.id === id);
  const prDef = id => R.praemien.find(p => p.id === id);
  const N = () => S.spieler.length;
  const nm = i => esc(S.spieler[i]);
  const aktiveVon = vh => [0, 1, 2, 3].map(k => (vh + k) % N());
  const geberVon = vh => (vh - 1 + N()) % N();
  const kontraLabel = f => (KONTRA.find(k => k.f === f) || KONTRA[0]).l;
  const kuerzel = d => d.kuerzel || d.id;
  function fmt(x) {
    const r = Math.round(x * 100) / 100;
    if (r === 0) return '0';
    const a = Math.abs(r);
    return (r > 0 ? '+' : '−') + (Number.isInteger(a) ? a : a.toFixed(2).replace('.', ','));
  }
  const cls = x => (x > 0.001 ? 'pos' : x < -0.001 ? 'neg' : '');
  function summen() { const t = new Array(N()).fill(0); S.spiele.forEach(g => g.P.forEach((v, i) => (t[i] += v))); return t; }
  function wertText(s) {
    if (s.vogelFaktor) return s.wert + '+' + (s.vogelFaktor > 1 ? s.vogelFaktor + '×' : '') + 'V';
    if (s.wertVerloren) return s.wert + ' (' + s.wertVerloren + ')';
    if (s.pflichtPraemien) return String(s.wert + s.pflichtPraemien.reduce((a, id) => a + prDef(id).gar, 0));
    return String(s.wert);
  }
  function spielwert(d, e) {
    let w = d.wert;
    if (d.vogelFaktor) { const v = prDef(e.vogel); w = d.wert + d.vogelFaktor * (v ? v.roh : 0); }
    if (e.gewonnen === false && d.wertVerloren) w = d.wertVerloren;
    return w;
  }

  // Spiel gilt als verloren, wenn eine Pflicht-Ansage (z. B. Sack beim Supraregional) verfehlt wurde
  function istGewonnen(d, e) {
    if (!e.gewonnen) return false;
    if (e.valat) return true;
    return !(d.pflichtPraemien || []).some(id => e.praemien[id] && !e.praemien[id].erfuellt);
  }

  // ---------- Berechnung ----------
  function berechne(e) {
    const d = spielDef(e.spielId);
    const P = new Array(N()).fill(0);
    const Z = [];
    const radl = e.radl || 1;
    const akt = e.aktive;

    if (d.typ === 'trischaken') {
      const u = d.wert * radl;
      const pts = akt.map(i => ({ i, p: Number(e.trisch.punkte[i]) || 0 }));
      const bm = pts.find(x => x.p >= R.trischaken.buergermeisterAb);
      const max = Math.max(...pts.map(x => x.p));
      const tops = pts.filter(x => x.p === max);
      const zahltAllein = (i, a, grund) => {
        akt.forEach(j => { if (j !== i) { P[j] += a; P[i] -= a; } });
        Z.push(`${grund}: ${nm(i)} zahlt je ${a} an alle drei`);
      };
      const jungfrauen = akt.filter(i => e.trisch.jungfrau[i]);
      if (jungfrauen.length) {
        // Jungfrau ersetzt die normale Abrechnung
        jungfrauen.forEach(i => {
          akt.forEach(j => { if (j !== i) { P[j] -= u; P[i] += u; } });
          Z.push(`Jungfrau ${nm(i)} kassiert je ${u} von allen drei (statt der normalen Abrechnung)`);
        });
      } else if (bm) {
        const f = bm.i === e.vorhand ? 2 : 1;
        zahltAllein(bm.i, u * f, 'Bürgermeister (' + bm.p + ')' + (f > 1 ? ', Vorhand → doppelt' : ''));
      } else if (tops.length === 1 && tops[0].i === e.vorhand) {
        zahltAllein(e.vorhand, u, 'Vorhand hat die meisten Punkte');
      } else {
        const sorted = [...pts].sort((a, b) => b.p - a.p);
        const basis = [-u, -u, u, u];
        let k = 0;
        while (k < 4) {
          let j = k;
          while (j + 1 < 4 && sorted[j + 1].p === sorted[k].p) j++;
          let s = 0; for (let m = k; m <= j; m++) s += basis[m];
          for (let m = k; m <= j; m++) P[sorted[m].i] += s / (j - k + 1);
          k = j + 1;
        }
        Z.push(`Die zwei mit den meisten Punkten zahlen je ${u} an die beiden anderen (Gleichstand wird geteilt)`);
      }
      if (radl > 1) Z.push('Radl: alles doppelt (schon eingerechnet)');
      return { P, Z, radl };
    }

    if (d.typ === 'negativ') {
      const sg = e.gewonnen ? 1 : -1;
      akt.filter(i => i !== e.spieler).forEach(o => {
        const k = e.kontraEinzel[o] || 1;
        const a = d.wert * k * radl * sg;
        P[e.spieler] += a; P[o] -= a;
        Z.push(`${nm(o)}: ${d.wert}${k > 1 ? ' × ' + k + ' (' + kontraLabel(k) + ')' : ''}${radl > 1 ? ' × 2 (Radl)' : ''} → ${nm(o)} ${fmt(-a)}`);
      });
      return { P, Z, radl };
    }

    // positive Spiele (allein / partner)
    const team = (d.typ === 'partner' && typeof e.partner === 'number' && e.partner !== e.spieler) ? [e.spieler, e.partner] : [e.spieler];
    const opps = akt.filter(i => !team.includes(i));
    const gew = istGewonnen(d, e);
    const sg = gew ? 1 : -1;
    const basis = spielwert(d, e);
    const k = e.kontra || 1;
    let summe = 0;
    const kTxt = k > 1 ? ` × ${k} (${kontraLabel(k)})` : '';
    if (e.gewonnen && !gew) Z.push('Pflicht-Ansage nicht geschafft → Spiel verloren');
    if (e.valat) {
      const f = R.valat[e.valat];
      const v = basis * f * k * sg;
      summe += v;
      Z.push(`Valat ${e.valat === 'gar' ? 'angesagt' : 'still'}: ${basis} × ${f}${kTxt}, ${gew ? 'gewonnen' : 'verloren'} → ${fmt(v)}`);
      let stillIgnoriert = false;
      R.praemien.map(p => p.id).filter(id => e.praemien[id]).forEach(id => {
        const p = e.praemien[id], pd = prDef(id);
        if (!p.angesagt) { stillIgnoriert = true; return; }
        let w = pd.gar, txt = String(w);
        if (d.solo) { w *= R.soloPraemienFaktor; txt += ' × ' + R.soloPraemienFaktor + ' (Solo)'; }
        if (p.kontra > 1) { w *= p.kontra; txt += ' × ' + p.kontra + ' (' + kontraLabel(p.kontra) + ')'; }
        w *= f; txt += ' × ' + f + ' (Valat)';
        const s = ((p.seite === 'spieler') === p.erfuellt) ? 1 : -1;
        summe += w * s;
        Z.push(`${esc(pd.name)} angesagt, ${p.seite === 'spieler' ? 'Spielerseite' : 'Gegner'}, ${p.erfuellt ? 'erfüllt' : 'verfehlt'}: ${txt} → ${fmt(w * s)}`);
      });
      if (stillIgnoriert) Z.push('Stille Prämien zählen bei Valat nicht');
    } else {
      const v = basis * k * sg;
      summe += v;
      Z.push(`Spiel: ${basis}${kTxt}, ${gew ? 'gewonnen' : 'verloren'} → ${fmt(v)}`);
      R.praemien.map(p => p.id).filter(id => e.praemien[id]).forEach(id => {
        const p = e.praemien[id], pd = prDef(id);
        if (!pd) return;
        let w = p.angesagt ? pd.gar : pd.roh;
        let txt = String(w);
        if (d.solo) { w *= R.soloPraemienFaktor; txt += ' × ' + R.soloPraemienFaktor + ' (Solo)'; }
        if (p.angesagt && p.kontra > 1) { w *= p.kontra; txt += ' × ' + p.kontra + ' (' + kontraLabel(p.kontra) + ')'; }
        const s = ((p.seite === 'spieler') === p.erfuellt) ? 1 : -1;
        summe += w * s;
        Z.push(`${esc(pd.name)} ${p.angesagt ? 'angesagt' : 'still'}, ${p.seite === 'spieler' ? 'Spielerseite' : 'Gegner'}, ${p.erfuellt ? 'erfüllt' : 'verfehlt'}: ${txt} → ${fmt(w * s)}`);
      });
    }
    const gesamt = summe * radl;
    if (radl > 1) Z.push(`Radl: ${fmt(summe)} × 2 = ${fmt(gesamt)}`);
    if (team.length === 1) {
      opps.forEach(o => { P[o] -= gesamt; P[team[0]] += gesamt; });
      Z.push(`${nm(team[0])} allein: jeder Gegner ${fmt(-gesamt)}`);
    } else {
      team.forEach(t => (P[t] += gesamt));
      opps.forEach(o => (P[o] -= gesamt));
      Z.push(`${nm(team[0])} & ${nm(team[1])} gegen ${opps.map(nm).join(' & ')}: je ${fmt(gesamt)} / ${fmt(-gesamt)}`);
    }
    return { P, Z, radl };
  }

  function kurztext(e) {
    const d = spielDef(e.spielId);
    if (d.typ === 'trischaken') return 'T';
    let t = kuerzel(d);
    if (d.vogelFaktor && e.vogel) t += ' ' + prDef(e.vogel).name;
    t += istGewonnen(d, e) ? ' ✓' : ' ✗';
    if (e.valat) t += ' Valat';
    return t;
  }

  function speichereSpiel() {
    const e = ui.e, d = spielDef(e.spielId), r = berechne(e);
    if (ui.editIdx != null) {
      const alt = S.spiele[ui.editIdx];
      const warT = spielDef(alt.spielId).typ === 'trischaken', istT = d.typ === 'trischaken';
      if (R.radl.nachTrischaken && warT !== istT) S.radlRest = Math.max(0, S.radlRest + (istT ? N() : -N()));
      Object.assign(alt, { spielId: e.spielId, spieler: e.spieler, partner: e.partner, radl: r.radl > 1, P: r.P, text: kurztext(e), eingabe: e, geaendert: new Date().toISOString() });
      ui.editIdx = null; ui.e = null; ui.screen = 'stand';
      sichern();
      return;
    }
    S.spiele.push({
      nr: S.spiele.length + 1, spielId: e.spielId, spieler: e.spieler, partner: e.partner,
      vorhand: e.vorhand, radl: r.radl > 1, P: r.P, text: kurztext(e), eingabe: e,
      vorher: { vorhand: S.vorhand, radlRest: S.radlRest, letzteRunde: S.letzteRunde }
    });
    if (S.radlRest > 0) S.radlRest--;
    if (d.typ === 'trischaken' && R.radl.nachTrischaken) S.radlRest += N();
    S.vorhand = (S.vorhand + 1) % N();
    sichern();
    ui.e = null;
    ui.screen = 'stand';
  }

  // ---------- Bausteine ----------
  const kopf = (t, r) => `<header><h1>${t}</h1>${r || ''}</header>`;
  const card = (t, inner) => `<div class="card"><h2>${t}</h2>${inner}</div>`;
  const chips = (items, a, o) => '<div class="chips">' + items.map(x =>
    `<button class="chip ${x.on ? 'on' : ''}" data-a="${a}" data-v="${x.v}"${o != null ? ` data-o="${o}"` : ''}>${x.l}</button>`).join('') + '</div>';
  const seg = (items, a, o) => '<div class="seg">' + items.map(x =>
    `<button class="${x.on ? 'on' : ''}" data-a="${a}" data-v="${x.v}"${o != null ? ` data-o="${o}"` : ''}>${x.l}</button>`).join('') + '</div>';
  const kontraSeg = (aktuell, a, o) => seg(KONTRA.map(k => ({ v: k.f, l: k.l, on: (aktuell || 1) === k.f })), a, o);

  // ---------- Bildschirme ----------
  function vSetup() {
    const u = ui.setup;
    let h = kopf('Neue Partie', S ? '<button data-a="geh" data-v="stand">Abbrechen</button>' : '');
    h += '<main>';
    h += card('Anzahl Spieler', seg([4, 5].map(a => ({ v: a, l: a === 5 ? '5 (Geber setzt aus)' : '4', on: u.anzahl === a })), 'anzahl'));
    h += '<div class="card"><h2>Sitzordnung in Spielrichtung</h2><div class="stack">';
    for (let i = 0; i < u.anzahl; i++) {
      h += `<div class="row" style="align-items:center"><input type="text" data-f="name" data-i="${i}" value="${esc(u.namen[i])}" placeholder="Spieler ${i + 1}" autocomplete="off">
        <button class="chip ${u.vh === i ? 'on' : ''}" style="flex:0 0 auto" data-a="setvh" data-v="${i}">Vorhand</button></div>`;
    }
    h += '</div><p class="muted">Namen in der Reihenfolge eintragen, in der gespielt wird. Wer im ersten Spiel Vorhand ist, wird markiert.</p></div>';
    h += '</main><div class="footer"><button class="btn" data-a="start">Partie starten</button></div>';
    return h;
  }

  function vStand() {
    const t = summen(), vh = S.vorhand, g = geberVon(vh);
    let h = kopf('Tarock', '<button data-a="geh" data-v="regeln">Regeln</button><button data-a="neu">Neu</button>');
    h += '<main>';
    if (S.radlRest > 0) h += `<div class="hinweis">Radl: ${S.radlRest === 1 ? 'noch 1 Spiel zählt' : 'noch ' + S.radlRest + ' Spiele zählen'} doppelt</div>`;
    h += '<div class="card"><h2>Stand nach ' + S.spiele.length + (S.spiele.length === 1 ? ' Spiel' : ' Spielen') + '</h2><table>';
    S.spieler.forEach((s, i) => {
      const b = (i === vh ? '<span class="badge">Vorhand</span>' : '') + (N() === 5 && i === g ? '<span class="badge grau">Geber</span>' : '');
      h += `<tr><td>${esc(s)}${b}</td><td class="num ${cls(t[i])}"><b>${fmt(t[i])}</b></td></tr>`;
    });
    h += '</table></div>';
    h += `<div class="row"><button class="btn sec" data-a="radl-plus">+ Radl-Runde</button>
      <button class="btn sec" data-a="letzte" ${S.letzteRunde ? 'disabled' : ''}>${S.letzteRunde ? 'Letzte Runde läuft' : 'Letzte Runde'}</button></div>`;
    if (S.spiele.length) {
      const kurz = S.spieler.map(s => esc(s.slice(0, 4)));
      h += '<div class="card"><h2>Verlauf</h2><table class="hist"><tr><th>#</th><th>Spiel</th>' + kurz.map(k => `<th class="num">${k}</th>`).join('') + '</tr>';
      [...S.spiele].reverse().forEach(g2 => {
        h += `<tr data-a="detail" data-v="${g2.nr - 1}" style="cursor:pointer"><td>${g2.nr}${g2.radl ? '<sup>R</sup>' : ''}</td><td class="sp">${esc(g2.text)}<br><span class="muted">${nm(g2.spieler)}</span></td>` +
          g2.P.map(v => `<td class="num ${cls(v)}">${v === 0 ? '·' : fmt(v)}</td>`).join('') + '</tr>';
      });
      h += '</table><p class="muted">Zeile antippen: Spiel ansehen oder ändern.</p><button class="link" data-a="loeschen">Letztes Spiel löschen</button></div>';
    }
    h += `</main><div class="footer"><button class="btn" data-a="naechstes">Spiel ${S.spiele.length + 1} eintragen</button></div>`;
    return h;
  }

  function vWahl() {
    const e = ui.e;
    let h = kopf('Spiel ' + nr() + ' – Lizitation', '<button data-a="geh" data-v="stand">Abbrechen</button>');
    h += '<main>';
    if (ui.editIdx != null) h += '<div class="hinweis">Spiel ' + nr() + ' wird geändert</div>';
    else if (e.radl > 1) h += '<div class="hinweis">Radl-Spiel: zählt doppelt</div>';
    h += card('Wer spielt?', chips(e.aktive.map(i => ({ v: i, l: nm(i) + (i === e.vorhand ? ' · VH' : ''), on: e.spieler === i })), 'spieler'));
    const stufen = [...new Set(R.spiele.map(s => s.stufe))];
    stufen.forEach(st => {
      h += '<div><h2>' + esc((R.stufenNamen && R.stufenNamen[st]) || 'Stufe ' + st) + '</h2><div class="grid">';
      R.spiele.filter(s => s.stufe === st).forEach(s => {
        const dis = s.nurVorhand && e.spieler !== e.vorhand;
        h += `<button class="spiel" data-a="spiel" data-v="${s.id}" ${dis ? 'disabled' : ''}><b>${esc(kuerzel(s))}</b><small>${esc(s.name)}</small><span class="w">${wertText(s)}${s.solo ? ' · Solo' : ''}</span></button>`;
      });
      h += '</div></div>';
    });
    h += '</main>';
    return h;
  }

  function vSpiel() {
    const e = ui.e, d = spielDef(e.spielId);
    if (d.typ === 'trischaken') return vTrisch();
    let h = kopf(esc(d.name), '<button data-a="geh" data-v="wahl">Zurück</button>');
    h += `<main><div class="muted">${nm(e.spieler)} spielt <b>${esc(d.name)}</b> · Wert ${wertText(d)}${d.solo ? ' · Solo' : ''}</div>`;
    if (d.vogelFaktor) {
      h += card('Gerufener Vogel (gilt als angesagt)', chips(d.voegel.map(v => ({ v, l: esc(prDef(v).name) + ' → ' + (d.wert + d.vogelFaktor * prDef(v).roh), on: e.vogel === v })), 'vogel'));
    }
    if (d.typ === 'partner') {
      const others = e.aktive.filter(i => i !== e.spieler);
      h += card('Partner', chips([...others.map(i => ({ v: i, l: nm(i), on: e.partner === i })), { v: 'allein', l: 'allein', on: e.partner === 'allein' }], 'partner')
        + '<p class="muted">„allein“, wenn der gerufene König im Talon lag oder selbst gerufen wurde.</p>');
    }
    if (d.typ === 'negativ') {
      h += '<div class="card"><h2>Kontra je Gegner</h2><div class="stack">' + e.aktive.filter(i => i !== e.spieler).map(o =>
        `<div><div class="muted">${nm(o)}</div>${kontraSeg(e.kontraEinzel[o], 'kontra-einzel', o)}</div>`).join('') + '</div></div>';
    } else {
      h += card('Kontra (Gegner gemeinsam)', kontraSeg(e.kontra, 'kontra'));
    }
    h += card('Ergebnis', seg([{ v: '1', l: 'Gewonnen', on: e.gewonnen === true }, { v: '0', l: 'Verloren', on: e.gewonnen === false }], 'gewonnen')
      + (d.wertVerloren ? `<p class="muted">Verloren zählt ${d.wertVerloren}.</p>` : ''));
    if (d.typ !== 'negativ') {
      h += card('Valat', seg([{ v: '', l: 'kein', on: !e.valat }, { v: 'roh', l: 'still ×' + R.valat.roh, on: e.valat === 'roh' }, { v: 'gar', l: 'angesagt ×' + R.valat.gar, on: e.valat === 'gar' }], 'valat')
        + '<p class="muted">Bei Valat zählen nur angesagte Prämien, ebenfalls ×' + R.valat.roh + ' bzw. ×' + R.valat.gar + '. „Verloren“ heißt: Gegner machen Valat oder angesagter Valat misslingt.</p>');
    }
    const ok = e.gewonnen !== null && (d.typ !== 'partner' || e.partner !== null);
    const ziel = d.typ === 'negativ' ? 'abrechnung' : 'praemien';
    h += `</main><div class="footer"><button class="btn" data-a="geh" data-v="${ziel}" ${ok ? '' : 'disabled'}>${ziel === 'praemien' ? 'Weiter: Prämien' : 'Weiter: Abrechnung'}</button></div>`;
    return h;
  }

  function vTrisch() {
    const e = ui.e;
    let h = kopf('Trischaken', '<button data-a="geh" data-v="wahl">Zurück</button>');
    h += '<main><div class="card"><h2>Punkte je Spieler</h2><div class="stack">';
    e.aktive.forEach(i => {
      h += `<div class="row" style="align-items:center"><div style="flex:1.2">${nm(i)}${i === e.vorhand ? ' <span class="badge">VH</span>' : ''}</div>
        <input type="number" inputmode="numeric" min="0" max="70" data-f="tp" data-i="${i}" value="${esc(e.trisch.punkte[i] ?? '')}" placeholder="0">
        <button class="chip ${e.trisch.jungfrau[i] ? 'on' : ''}" style="flex:0 0 auto" data-a="jf" data-v="${i}">Jungfrau</button></div>`;
    });
    h += `</div><p class="muted" id="tsum"></p></div>`;
    h += card('Regeln', `<ul class="zeilen"><li>Die zwei mit den meisten Punkten zahlen je 2 an die anderen beiden.</li>
      <li>Bürgermeister (ab ${R.trischaken.buergermeisterAb}) zahlt allein je 2 an alle, als Vorhand doppelt.</li>
      <li>Vorhand mit den meisten Punkten zahlt allein je 2 an alle.</li><li>Jungfrau (kein Stich) kassiert je 2 von allen, statt der normalen Abrechnung.</li>
      <li>Gleichstand teilt; gleichstehende Mittlere gehen leer aus.</li>${R.radl.nachTrischaken ? '<li>Danach: Radl-Runde.</li>' : ''}</ul>`);
    h += '</main><div class="footer"><button class="btn" data-a="geh" data-v="abrechnung">Weiter: Abrechnung</button></div>';
    return h;
  }

  function vPraemien() {
    const e = ui.e, d = spielDef(e.spielId);
    let h = kopf('Prämien', '<button data-a="geh" data-v="spiel">Zurück</button>');
    h += '<main>';
    if (e.valat) h += `<div class="hinweis">Valat: nur angesagte Prämien zählen, ×${R.valat[e.valat]}</div>`;
    if (d.solo) h += '<div class="hinweis">Solo: alle Prämien zählen doppelt</div>';
    if (d.pflichtPraemien) h += `<div class="hinweis">${esc(d.name)}: Wird ${d.pflichtPraemien.map(id => esc(prDef(id).name.replace(/ \(.*\)/, ''))).join(' / ')} verfehlt, ist das ganze Spiel verloren.</div>`;
    const ansageFehlt = d.mussAnsagen && !Object.values(e.praemien).some(x => x.seite === 'spieler' && x.angesagt);
    if (d.mussAnsagen) h += `<div class="hinweis" style="${ansageFehlt ? '' : 'font-weight:400'}">${esc(d.name)}: Die Spielerseite muss mindestens eine Zutat ansagen.${ansageFehlt ? '' : ' ✓'}</div>`;
    h += '<p class="muted" style="margin:0">Nur antippen, was vorgekommen ist. Werte: still / angesagt.</p>';
    R.praemien.forEach(p => {
      const x = e.praemien[p.id];
      h += `<div class="card stack"><div class="row" style="align-items:center"><div><b>${esc(p.name)}</b> <span class="muted">${p.roh} / ${p.gar}</span></div>
        ${x && (x.pflicht || x.vogelRuf) ? `<span class="badge" style="flex:0 0 auto">${x.vogelRuf ? 'gerufen · angesagt' : 'Pflicht-Ansage'}</span>`
          : `<button class="chip ${x ? 'on' : ''}" style="flex:0 0 auto" data-a="pr-toggle" data-v="${p.id}">${x ? 'zählt' : 'hinzufügen'}</button>`}</div>`;
      if (x) {
        if (!x.pflicht && !x.vogelRuf) {
          h += seg([{ v: 'spieler', l: 'Spielerseite', on: x.seite === 'spieler' }, { v: 'gegner', l: 'Gegner', on: x.seite === 'gegner' }], 'pr-seite', p.id);
          h += seg([{ v: '0', l: 'still', on: !x.angesagt }, { v: '1', l: 'angesagt', on: x.angesagt }], 'pr-ang', p.id);
        }
        h += seg([{ v: '1', l: 'erfüllt', on: x.erfuellt }, { v: '0', l: 'verfehlt', on: !x.erfuellt }], 'pr-erf', p.id);
        if (x.angesagt) h += kontraSeg(x.kontra, 'pr-kontra', p.id);
      }
      h += '</div>';
    });
    h += `</main><div class="footer"><button class="btn" data-a="geh" data-v="abrechnung" ${ansageFehlt ? 'disabled' : ''}>Weiter: Abrechnung</button></div>`;
    return h;
  }

  function vAbrechnung() {
    const e = ui.e, d = spielDef(e.spielId), r = berechne(e);
    const zurueck = d.typ === 'trischaken' || d.typ === 'negativ' ? 'spiel' : 'praemien';
    let h = kopf('Abrechnung', `<button data-a="geh" data-v="${zurueck}">Zurück</button>`);
    h += `<main><div class="muted">Spiel ${nr()}: ${nm(e.spieler)} – ${esc(d.name)}${ui.editIdx != null ? ' · wird geändert' : ''}</div>`;
    h += card('Radl', seg([{ v: '0', l: 'normal', on: r.radl === 1 }, { v: '1', l: 'Radl (doppelt)', on: r.radl > 1 }], 'radl-set'));
    h += card('Berechnung', '<ul class="zeilen">' + r.Z.map(z => `<li>${z}</li>`).join('') + '</ul>');
    const t = summen();
    if (ui.editIdx != null) S.spiele[ui.editIdx].P.forEach((v, i) => (t[i] -= v));
    h += '<div class="card"><h2>Punkte</h2><table><tr><th>Spieler</th><th class="num">dieses Spiel</th><th class="num">neu gesamt</th></tr>';
    S.spieler.forEach((s, i) => {
      h += `<tr><td>${esc(s)}</td><td class="num ${cls(r.P[i])}">${e.aktive.includes(i) ? fmt(r.P[i]) : 'setzt aus'}</td><td class="num">${fmt(t[i] + r.P[i])}</td></tr>`;
    });
    h += '</table></div>';
    h += `</main><div class="footer"><button class="btn" data-a="speichern">${ui.editIdx != null ? 'Änderung speichern' : 'Spiel speichern'}</button></div>`;
    return h;
  }

  function vDetail() {
    const g = S.spiele[ui.detailIdx];
    if (!g) { ui.screen = 'stand'; return vStand(); }
    const e = g.eingabe, d = spielDef(g.spielId);
    if (!e.radl) e.radl = g.radl ? 2 : 1;
    const r = berechne(e);
    let h = kopf('Spiel ' + g.nr, '<button data-a="geh" data-v="stand">Zurück</button>');
    h += '<main><div class="card"><table>';
    h += `<tr><td>Spiel</td><td><b>${esc(d.name)}</b>${d.vogelFaktor && e.vogel ? ' (' + esc(prDef(e.vogel).name) + ')' : ''}</td></tr>`;
    h += `<tr><td>Spieler</td><td>${nm(g.spieler)}${typeof e.partner === 'number' ? ' mit ' + nm(e.partner) : e.partner === 'allein' ? ' (allein)' : ''}</td></tr>`;
    h += `<tr><td>Vorhand</td><td>${nm(e.vorhand)}</td></tr>`;
    if (d.typ !== 'trischaken') h += `<tr><td>Ergebnis</td><td>${istGewonnen(d, e) ? 'gewonnen' : 'verloren'}${e.valat ? ', Valat ' + (e.valat === 'gar' ? 'angesagt' : 'still') : ''}</td></tr>`;
    else h += `<tr><td>Punkte</td><td>${e.aktive.map(i => nm(i) + ' ' + (e.trisch.punkte[i] || 0) + (e.trisch.jungfrau[i] ? ' (Jungfrau)' : '')).join(', ')}</td></tr>`;
    h += `<tr><td>Radl</td><td>${g.radl ? 'ja' : 'nein'}</td></tr>`;
    if (g.geaendert) h += `<tr><td>Geändert</td><td>${new Date(g.geaendert).toLocaleString('de-AT')}</td></tr>`;
    h += '</table></div>';
    h += card('Berechnung', '<ul class="zeilen">' + r.Z.map(z => `<li>${z}</li>`).join('') + '</ul>');
    h += '<div class="card"><h2>Punkte</h2><table>';
    S.spieler.forEach((s, i) => { h += `<tr><td>${esc(s)}</td><td class="num ${cls(g.P[i])}">${e.aktive.includes(i) ? fmt(g.P[i]) : 'setzt aus'}</td></tr>`; });
    h += '</table></div></main><div class="footer"><button class="btn" data-a="bearbeiten">Spiel ändern</button></div>';
    return h;
  }

  function nr() { return ui.editIdx != null ? ui.editIdx + 1 : S.spiele.length + 1; }

  function vRegeln() {
    let h = kopf('Regeln', '<button data-a="geh" data-v="stand">Zurück</button>');
    const typ = { partner: '2 : 2', allein: '1 : 3', negativ: 'einzeln', trischaken: 'Trischaken' };
    h += '<main><div class="card"><h2>Speisezettel</h2><table><tr><th>Kürzel</th><th>Spiel</th><th class="num">Wert</th><th>Abr.</th></tr>';
    R.spiele.forEach(s => {
      h += `<tr><td>${esc(kuerzel(s))}</td><td>${esc(s.name)}${s.nurVorhand ? ' <span class="badge">VH</span>' : ''}${s.solo ? ' <span class="badge grau">Solo</span>' : ''}</td><td class="num">${wertText(s)}</td><td>${typ[s.typ]}</td></tr>`;
    });
    h += '</table></div><div class="card"><h2>Beilagen</h2><table><tr><th>Prämie</th><th class="num">still</th><th class="num">angesagt</th></tr>';
    R.praemien.forEach(p => { h += `<tr><td>${esc(p.name)}</td><td class="num">${p.roh}</td><td class="num">${p.gar}</td></tr>`; });
    h += `<tr><td>Valat</td><td class="num">×${R.valat.roh}</td><td class="num">×${R.valat.gar}</td></tr></table></div>`;
    h += '<p class="muted">Die Regeln stehen in der Datei regeln.js und lassen sich dort für andere Runden anpassen.</p>';
    h += '<button class="btn sec" data-a="export">Partie als Datei sichern</button></main>';
    return h;
  }

  // ---------- Steuerung ----------
  function neuerEntwurf() {
    return { vorhand: S.vorhand, aktive: aktiveVon(S.vorhand), spieler: S.vorhand, spielId: null, radl: S.radlRest > 0 ? 2 : 1, trisch: { punkte: {}, jungfrau: {} } };
  }

  // Besserrufer: der gerufene Vogel ist automatisch angesagt (Spielerseite)
  function setzeVogel(e, v) {
    Object.keys(e.praemien).forEach(id => { if (e.praemien[id].vogelRuf) delete e.praemien[id]; });
    e.vogel = v;
    if (v) e.praemien[v] = { seite: 'spieler', angesagt: true, erfuellt: true, kontra: 1, vogelRuf: true };
  }

  function act(a, v, o) {
    const e = ui.e;
    switch (a) {
      case 'anzahl': ui.setup.anzahl = +v; if (ui.setup.vh >= +v) ui.setup.vh = 0; break;
      case 'setvh': ui.setup.vh = +v; break;
      case 'start': {
        const u = ui.setup;
        const namen = u.namen.slice(0, u.anzahl).map((x, i) => x.trim() || 'Spieler ' + (i + 1));
        S = { spieler: namen, vorhand: u.vh, radlRest: R.radl.ersteRunde ? u.anzahl : 0, letzteRunde: false, spiele: [], begonnen: new Date().toISOString() };
        sichern(); ui.screen = 'stand'; break;
      }
      case 'neu':
        if (confirm('Neue Partie beginnen? Der aktuelle Stand wird dabei ersetzt.')) {
          ui.setup = { anzahl: N(), namen: [...S.spieler, '', '', '', '', ''].slice(0, 5), vh: 0 };
          ui.screen = 'setup';
        }
        break;
      case 'geh': ui.screen = v; break;
      case 'radl-plus': S.radlRest += N(); sichern(); break;
      case 'letzte': if (!S.letzteRunde && R.radl.letzteRunde) { S.radlRest += N(); S.letzteRunde = true; sichern(); } break;
      case 'loeschen':
        if (confirm('Letztes Spiel löschen?')) {
          const g = S.spiele.pop();
          Object.assign(S, g.vorher); sichern();
        }
        break;
      case 'naechstes': ui.editIdx = null; ui.e = neuerEntwurf(); ui.screen = 'wahl'; break;
      case 'detail': ui.editIdx = null; ui.detailIdx = +v; ui.screen = 'detail'; break;
      case 'bearbeiten': {
        const g = S.spiele[ui.detailIdx];
        ui.e = JSON.parse(JSON.stringify(g.eingabe));
        if (!ui.e.radl) ui.e.radl = g.radl ? 2 : 1;
        ui.editIdx = ui.detailIdx; ui.screen = 'spiel'; break;
      }
      case 'radl-set': e.radl = v === '1' ? 2 : 1; break;
      case 'spieler': e.spieler = +v; break;
      case 'spiel': {
        const d = spielDef(v);
        Object.assign(e, { spielId: v, vogel: d.voegel ? d.voegel[0] : null, partner: null, gewonnen: null, valat: '', praemien: {}, kontra: 1, kontraEinzel: {} });
        (d.pflichtPraemien || []).forEach(id => { e.praemien[id] = { seite: 'spieler', angesagt: true, erfuellt: true, kontra: 1, pflicht: true }; });
        setzeVogel(e, e.vogel);
        if (d.nurVorhand || d.typ === 'trischaken') e.spieler = e.vorhand;
        ui.screen = 'spiel'; break;
      }
      case 'vogel': setzeVogel(e, v); break;
      case 'partner': e.partner = v === 'allein' ? 'allein' : +v; break;
      case 'kontra': e.kontra = +v; break;
      case 'kontra-einzel': e.kontraEinzel[o] = +v; break;
      case 'gewonnen': e.gewonnen = v === '1'; break;
      case 'valat': e.valat = v; break;
      case 'pr-toggle':
        if (e.praemien[v]) delete e.praemien[v];
        else {
          e.praemien[v] = { seite: 'spieler', angesagt: false, erfuellt: true, kontra: 1 };
          (prDef(v).schliesstEin || []).forEach(id => {
            if (!e.praemien[id]) e.praemien[id] = { seite: 'spieler', angesagt: false, erfuellt: true, kontra: 1 };
          });
        }
        break;
      case 'pr-seite': e.praemien[o].seite = v; break;
      case 'pr-ang': e.praemien[o].angesagt = v === '1'; if (!e.praemien[o].angesagt) e.praemien[o].kontra = 1; break;
      case 'pr-erf': e.praemien[o].erfuellt = v === '1'; break;
      case 'pr-kontra': e.praemien[o].kontra = +v; break;
      case 'jf': e.trisch.jungfrau[v] = !e.trisch.jungfrau[v]; break;
      case 'speichern': speichereSpiel(); break;
      case 'export': {
        const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
        const l = document.createElement('a');
        l.href = URL.createObjectURL(blob);
        l.download = 'tarock-partie-' + new Date().toISOString().slice(0, 10) + '.json';
        l.click();
        break;
      }
    }
  }

  function trischSumme() {
    const el = document.getElementById('tsum');
    if (!el || !ui.e) return;
    const s = ui.e.aktive.reduce((a, i) => a + (Number(ui.e.trisch.punkte[i]) || 0), 0);
    el.textContent = `Summe: ${s} von ${R.trischaken.gesamtPunkte}` + (s !== R.trischaken.gesamtPunkte ? ' – bitte prüfen' : ' ✓');
  }

  const app = document.getElementById('app');
  function render() {
    const views = { setup: vSetup, stand: vStand, wahl: vWahl, spiel: vSpiel, praemien: vPraemien, abrechnung: vAbrechnung, regeln: vRegeln, detail: vDetail };
    app.innerHTML = (views[ui.screen] || vStand)();
    if (ui.screen !== letzterScreen) { window.scrollTo(0, 0); letzterScreen = ui.screen; }
    trischSumme();
  }

  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-a]');
    if (!t || t.disabled) return;
    act(t.dataset.a, t.dataset.v, t.dataset.o);
    render();
  });
  document.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.f === 'name') ui.setup.namen[+t.dataset.i] = t.value;
    if (t.dataset.f === 'tp') { ui.e.trisch.punkte[t.dataset.i] = t.value; trischSumme(); }
  });

  render();
})();
