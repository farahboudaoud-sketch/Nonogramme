// Nonogramme 絵 : moteur (générateur d'images, solveur ligne par ligne) puis interface
// Cases : -1 inconnue, 0 vide, 1 noire.
const NonoEngine = (function () {
  const runs = line => { const r = []; let n = 0; for (const x of line) { if (x) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r; };
  // which values each cell of a line can take, given the clue and the known cells
  function lineSolve(clue, cur) {
    const n = cur.length, k = clue.length;
    // f[i][j]: first i cells can hold the first j blocks (cell i-1 being the end of a block or empty)
    const f = []; for (let i = 0; i <= n; i++) f.push(new Uint8Array(k + 1));
    f[0][0] = 1;
    const canBlock = (s, len) => { if (s + len > n) return false; for (let t = s; t < s + len; t++) if (cur[t] === 0) return false; return !(s + len < n && cur[s + len] === 1); };
    for (let i = 0; i < n; i++) for (let j = 0; j <= k; j++) {
      if (!f[i][j]) continue;
      if (cur[i] !== 1) f[i + 1][j] = 1;                               // cell i empty
      if (j < k && canBlock(i, clue[j])) {                             // block j starts at i
        const e = i + clue[j];
        if (e === n) f[n][j + 1] = 1; else f[e + 1][j + 1] = 1;        // followed by an empty cell
      }
    }
    if (!f[n][k]) return null;
    const g = []; for (let i = 0; i <= n + 1; i++) g.push(new Uint8Array(k + 1));
    g[n][k] = 1; g[n + 1] = new Uint8Array(k + 1); g[n + 1][k] = 1;
    for (let i = n - 1; i >= 0; i--) for (let j = k; j >= 0; j--) {
      if (cur[i] !== 1 && g[i + 1][j]) g[i][j] = 1;
      if (j < k && canBlock(i, clue[j])) { const e = i + clue[j]; if ((e === n && g[n][j + 1]) || (e < n && g[e + 1][j + 1])) g[i][j] = 1; }
    }
    const canE = new Uint8Array(n), canF = new Uint8Array(n);
    for (let i = 0; i < n; i++) for (let j = 0; j <= k; j++) if (f[i][j] && cur[i] !== 1 && g[i + 1][j]) { canE[i] = 1; break; }
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) {
      if (!f[i][j] || !canBlock(i, clue[j])) continue;
      const e = i + clue[j];
      if ((e === n && g[n][j + 1]) || (e < n && g[e + 1][j + 1])) for (let t = i; t < e; t++) canF[t] = 1;
      // separator cell after the block is an empty cell
      if (e < n && g[e + 1][j + 1]) canE[e] = canE[e] || (cur[e] !== 1 ? 1 : 0);
    }
    return { canE, canF };
  }
  function makeBoard(W, H, rows, cols) { return { W, H, rows, cols }; }
  // note(i, val, lineType, lineIndex) -> true to stop
  function propagate(B, v, note) {
    const { W, H } = B;
    const dirty = new Set(); for (let r = 0; r < H; r++) dirty.add('r' + r); for (let c = 0; c < W; c++) dirty.add('c' + c);
    while (dirty.size) {
      const key = dirty.values().next().value; dirty.delete(key);
      const isRow = key[0] === 'r', idx = +key.slice(1);
      const n = isRow ? W : H, cells = [];
      for (let t = 0; t < n; t++) cells.push(isRow ? idx * W + t : t * W + idx);
      const cur = cells.map(i => v[i]);
      const res = lineSolve(isRow ? B.rows[idx] : B.cols[idx], cur);
      if (!res) return false;
      for (let t = 0; t < n; t++) {
        if (cur[t] !== -1) continue;
        let val = -1;
        if (res.canF[t] && !res.canE[t]) val = 1; else if (res.canE[t] && !res.canF[t]) val = 0; else if (!res.canE[t] && !res.canF[t]) return false;
        if (val < 0) continue;
        const i = cells[t];
        v[i] = val;
        if (note && note(i, val, isRow ? 'row' : 'col', idx)) return 'stop';
        dirty.add(isRow ? 'c' + t : 'r' + t);
      }
    }
    return true;
  }
  function rate(B) {
    const v = new Int8Array(B.W * B.H).fill(-1);
    if (propagate(B, v) === false) return { level: -1 };
    const open = () => v.filter(x => x === -1).length;
    const u0 = open();
    let look = 0;
    while (open()) {
      let progress = false;
      for (let i = 0; i < v.length && !progress; i++) {
        if (v[i] !== -1) continue;
        for (const val of [1, 0]) {
          const v2 = v.slice(); v2[i] = val;
          if (propagate(B, v2) === false) { v[i] = 1 - val; look++; progress = true; if (propagate(B, v) === false) return { level: -1 }; break; }
        }
      }
      if (!progress) return { level: 2, u0, look };
    }
    return { level: u0 ? 1 : 0, u0, look };
  }
  function image(W, H, density) {
    let g = new Uint8Array(W * H);
    for (let i = 0; i < g.length; i++) g[i] = Math.random() < density ? 1 : 0;
    const mirror = Math.random() < 0.5;
    for (let it = 0; it < 2; it++) {
      const n = new Uint8Array(W * H);
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        let s = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < H && cc < W) s += g[rr * W + cc]; }
        n[r * W + c] = s >= 5 ? 1 : (s <= 3 ? 0 : g[r * W + c]);
      }
      g = n;
    }
    if (mirror) for (let r = 0; r < H; r++) for (let c = 0; c < W / 2; c++) g[r * W + W - 1 - c] = g[r * W + c];
    return g;
  }
  function clues(W, H, g) {
    const rows = [], cols = [];
    for (let r = 0; r < H; r++) rows.push(runs(Array.from(g.slice(r * W, r * W + W))));
    for (let c = 0; c < W; c++) { const l = []; for (let r = 0; r < H; r++) l.push(g[r * W + c]); cols.push(runs(l)); }
    return { rows, cols };
  }
  function generate(L) {
    const t0 = Date.now();
    let best = null;
    for (let a = 0; a < 3000; a++) {
      if (Date.now() - t0 > 6000 && best) break;
      const g = image(L.W, L.H, L.density);
      const filled = g.reduce((x, y) => x + y, 0);
      if (filled < g.length * 0.3 || filled > g.length * 0.75) continue;
      const { rows, cols } = clues(L.W, L.H, g);
      if (rows.some(r => !r.length) && Math.random() < 0.7) continue;
      const B = makeBoard(L.W, L.H, rows, cols);
      const r = rate(B);
      if (r.level !== 0 && r.level !== 1) continue;
      if (L.simple && r.level !== 0) continue;
      const out = { W: L.W, H: L.H, rows, cols, sol: Array.from(g), rating: r };
      if (!L.hard) return out;
      if (r.look >= L.hard.look) return out;
      if (!best || r.look > best.rating.look) best = out;
    }
    return best;
  }
  return { runs, lineSolve, makeBoard, propagate, rate, image, clues, generate };
})();
if (typeof module !== 'undefined') module.exports = NonoEngine;

// ---------------------------------------------------------------------------
// Interface Nonogramme. st.x : 0 vide, 1 noire, 2 croix.
// ---------------------------------------------------------------------------
(function () {
  if (typeof registerGame === 'undefined') return;
  const E = NonoEngine;
  let mode = 1, paint = null;     // mode 1 : noircir, 2 : croix
  const LV = {
    facile:    { W: 5,  H: 5,  density: .58, simple: true, label: 'Facile',    kanji: '易' },
    moyen:     { W: 10, H: 10, density: .56, simple: true, label: 'Moyen',     kanji: '中' },
    difficile: { W: 15, H: 15, density: .55, label: 'Difficile', kanji: '難' },
    expert:    { W: 15, H: 20, density: .55, label: 'Expert',    kanji: '極' },
    maitre:    { W: 20, H: 25, density: .53, label: 'Maître',    kanji: '鬼', hard: { look: 6 } }
  };
  const customLevel = (W, H, hard) => ({ W, H, density: .55, simple: !hard, label: 'Personnalisé', kanji: '自', hard: hard ? { look: 2 } : null });
  const margins = s => ({ mr: Math.max(1, ...s.rows.map(r => r.length || 1)), mc: Math.max(1, ...s.cols.map(c => c.length || 1)) });
  function lineDone(s, isRow, idx) {
    const n = isRow ? s.W : s.H, l = [];
    for (let t = 0; t < n; t++) l.push(s.x[isRow ? idx * s.W + t : t * s.W + idx] === 1 ? 1 : 0);
    const a = E.runs(l), b = isRow ? s.rows[idx] : s.cols[idx];
    return a.length === b.length && a.every((x, k) => x === b[k]);
  }
  function findHint(s) {
    for (let i = 0; i < s.x.length; i++) {
      if (s.x[i] === 1 && !s.sol[i]) return { type: 'wrong', i, val: 0, text: 'Cette case ne doit pas être noircie.' };
      if (s.x[i] === 2 && s.sol[i]) return { type: 'wrong', i, val: 1, text: 'Cette case est barrée, mais elle doit être noircie.' };
    }
    const B = E.makeBoard(s.W, s.H, s.rows, s.cols);
    const known = () => { const v = new Int8Array(s.W * s.H).fill(-1); for (let i = 0; i < v.length; i++) { if (s.x[i] === 1) v[i] = 1; else if (s.x[i] === 2) v[i] = 0; } return v; };
    let found = null;
    const desc = (type, idx) => {
      const clue = (type === 'row' ? s.rows[idx] : s.cols[idx]);
      return `${type === 'row' ? 'Dans cette ligne' : 'Dans cette colonne'} (indice ${clue.length ? clue.join(' ') : '0'})`;
    };
    // filled cells first, crosses only if nothing else
    let v = known();
    E.propagate(B, v, (i, val, type, idx) => {
      if (val !== 1) return false;
      found = { i, val, line: { type, idx }, text: `${desc(type, idx)}, cette case est forcément noire : toutes les façons de placer les blocs la recouvrent.` };
      return true;
    });
    if (!found) {
      v = known();
      E.propagate(B, v, (i, val, type, idx) => {
        found = { i, val, line: { type, idx }, text: `${desc(type, idx)}, cette case reste forcément vide : aucune façon de placer les blocs ne la recouvre. Barre-la.` };
        return true;
      });
    }
    if (!found) {
      v = known(); E.propagate(B, v);
      for (let i = 0; i < v.length && !found; i++) {
        if (v[i] !== -1) continue;
        for (const val of [1, 0]) {
          const v2 = v.slice(); v2[i] = val;
          if (E.propagate(B, v2) === false) {
            found = { i, val: 1 - val, text: val === 1
              ? 'Raisonnement par l\'absurde : si cette case était noire, une ligne ou une colonne deviendrait impossible à compléter. Elle reste donc vide.'
              : 'Raisonnement par l\'absurde : si cette case restait vide, une ligne ou une colonne deviendrait impossible à compléter. Elle est donc noire.' };
            break;
          }
        }
      }
    }
    if (!found) for (let i = 0; i < s.x.length; i++) if (s.sol[i] && s.x[i] !== 1) { found = { i, val: 1, text: 'Déduction avancée : cette case est noire.' }; break; }
    return found;
  }
  const FIGS = (() => {
    const s = 18, line = (cells, bad) => {
      let o = figNum(s * .55, s / 2, '3', '', 12) + figNum(s * 1.35, s / 2, '1', '', 12);
      const x0 = s * 2;
      cells.forEach((v, k) => { if (v) o += `<rect class="${bad ? 'fr' : 'fi'}" x="${x0 + k * s + 2}" y="2" width="${s - 4}" height="${s - 4}" rx="2"/>`; });
      return o + figGrid(cells.length, 1, s, x0, 0);
    };
    const pic = ['0110', '1111', '1001', '1111'];
    const rc = pic.map(r => NonoEngine.runs([...r].map(Number)));
    const cc = [0, 1, 2, 3].map(c => NonoEngine.runs(pic.map(r => +r[c])));
    const ox = s * 2, oy = s * 2;
    let p = '';
    pic.forEach((r, i) => [...r].forEach((v, j) => { if (v === '1') p += `<rect class="fi" x="${ox + j * s + 2}" y="${oy + i * s + 2}" width="${s - 4}" height="${s - 4}" rx="2"/>`; }));
    rc.forEach((cl, i) => cl.forEach((n, k) => p += figNum(ox - (cl.length - k) * s * .8 + s * .3, oy + i * s + s / 2, n, '', 11)));
    cc.forEach((cl, j) => cl.forEach((n, k) => p += figNum(ox + j * s + s / 2, oy - (cl.length - k) * s * .8 + s * .35, n, '', 11)));
    p += figGrid(4, 4, s, ox, oy);
    return figFigs(
      ruleFig(line([1, 1, 1, 0, 1, 0, 0]), 9 * s, s, 'Indice 3 1 : un bloc de 3, puis un bloc de 1, avec au moins une case vide entre eux.', 'ok', true),
      ruleFig(line([0, 1, 1, 1, 1, 0, 0], true), 9 * s, s, 'Les blocs collés forment un bloc de 4 : ce n\'est plus « 3 1 ».', 'no', true),
      ruleFig(p, 6 * s, 6 * s, 'Chaque ligne et chaque colonne respecte ses nombres : l\'image apparaît.', 'ok'));
  })();
  registerGame({
    id: 'nonogramme', name: 'Nonogramme', kanji: '絵', winText: 'Image révélée', revealWin: true,
    levels: LV, customLevel, customDefault: { W: 10, H: 10, hard: false }, customRange: { W: [5, 30], H: [5, 30] },
    customInfo: (W, H, hard) => `${W * H} cases · ${hard ? 'raisonnements avancés' : 'ligne par ligne'}`,
    rules: `<h3 style="margin-top:0">Nonogramme 絵 : les règles</h3><ul>
      <li>Les nombres à gauche de chaque <b>ligne</b> et en haut de chaque <b>colonne</b> donnent les longueurs des blocs de cases noires, dans l'ordre.</li>
      <li>Entre deux blocs, il y a <b>au moins une case vide</b>.</li>
      <li>Noircis les bonnes cases pour <b>révéler l'image</b>.</li></ul>${FIGS}
      <h3>Commandes</h3><ul>
      <li>Choisis l'outil sous la grille : <b>noircir</b> ou <b>croix</b> (case vide sûre).</li>
      <li>Touche une case, ou glisse le doigt le long d'une ligne ou d'une colonne pour en remplir plusieurs.</li>
      <li>Les indices d'une ligne terminée s'estompent.</li></ul>`,
    valid: s => !!s.rows && !!s.cols && !!s.sol,
    generate: L => { const g = E.generate(L); return { W: g.W, H: g.H, rows: g.rows, cols: g.cols, sol: g.sol }; },
    emptyX: s => s.sol.map(() => 0),
    prepare: () => { paint = null; },
    dims: s => { const m = margins(s); return { cols: s.W + m.mr, rows: s.H + m.mc, ox: m.mr, oy: m.mc }; },
    progress: s => { let p = 0; for (let i = 0; i < s.x.length; i++) if (s.x[i] === 1 && s.sol[i]) p++; return p; },
    check: s => {
      for (let r = 0; r < s.H; r++) if (!lineDone(s, true, r)) return false;
      for (let c = 0; c < s.W; c++) if (!lineDone(s, false, c)) return false;
      return true;
    },
    wrong: s => { const b = new Set(); for (let i = 0; i < s.x.length; i++) if ((s.x[i] === 1 && !s.sol[i]) || (s.x[i] === 2 && s.sol[i])) b.add(i); return b; },
    wrongText: n => `${plural(n, 'case')} incorrecte${n > 1 ? 's' : ''}, en rouge.`,
    findHint: s => {
      const h = findHint(s);
      if (!h) return null;
      h.r = (h.i / s.W) | 0; h.c = h.i % s.W;
      h.focusText = h.line ? (h.line.type === 'row' ? 'Regarde cette ligne.' : 'Regarde cette colonne.') : 'Regarde cette case.';
      h.apply = st => { st.x[h.i] = h.val === 1 ? 1 : 2; };
      return h;
    },
    render: (s, ctx) => {
      const { mr, mc } = margins(s), out = [], W = s.W, H = s.H, ox = mr * S, oy = mc * S, h = ctx.hint;
      // clues
      for (let r = 0; r < H; r++) {
        const done = lineDone(s, true, r), cl = s.rows[r].length ? s.rows[r] : [0];
        cl.forEach((n, k) => out.push(`<text class="nn-clue${done ? ' done' : ''}" x="${ox - (cl.length - k - .5) * S * .62 - 6}" y="${oy + r * S + S / 2 + 9}">${n}</text>`));
      }
      for (let c = 0; c < W; c++) {
        const done = lineDone(s, false, c), cl = s.cols[c].length ? s.cols[c] : [0];
        cl.forEach((n, k) => out.push(`<text class="nn-clue${done ? ' done' : ''}" x="${ox + c * S + S / 2}" y="${oy - (cl.length - k - 1) * S * .6 - 14}">${n}</text>`));
      }
      if (h && h.level >= 2 && h.line) {
        if (h.line.type === 'row') out.push(`<rect class="hcell" x="3" y="${oy + h.line.idx * S + 3}" width="${ox + W * S - 6}" height="${S - 6}" rx="6"/>`);
        else out.push(`<rect class="hcell" x="${ox + h.line.idx * S + 3}" y="3" width="${S - 6}" height="${oy + H * S - 6}" rx="6"/>`);
      }
      for (let i = 0; i < W * H; i++) {
        const r = (i / W) | 0, c = i % W, x = ox + c * S, y = oy + r * S;
        const bad = ctx.flash && ctx.flash.has(i);
        if (s.x[i] === 1) out.push(`<rect class="nn-fill${bad ? ' bad' : ''}" x="${x + 2}" y="${y + 2}" width="${S - 4}" height="${S - 4}" rx="3"/>`);
        else if (s.x[i] === 2 && !ctx.won) out.push(`<path class="nn-x${bad ? ' bad' : ''}" d="M${x + 22} ${y + 22}L${x + 38} ${y + 38}M${x + 38} ${y + 22}L${x + 22} ${y + 38}"/>`);
      }
      for (let r = 0; r <= H; r++) out.push(`<line class="gl${r % 5 === 0 ? ' b' : ''}" x1="${ox}" y1="${oy + r * S}" x2="${ox + W * S}" y2="${oy + r * S}"/>`);
      for (let c = 0; c <= W; c++) out.push(`<line class="gl${c % 5 === 0 ? ' b' : ''}" x1="${ox + c * S}" y1="${oy}" x2="${ox + c * S}" y2="${oy + H * S}"/>`);
      if (h && h.level >= 3) {
        const r = (h.i / W) | 0, c = h.i % W, x = ox + c * S, y = oy + r * S;
        out.push(h.val === 1 ? `<rect class="nn-ghost" x="${x + 6}" y="${y + 6}" width="${S - 12}" height="${S - 12}" rx="3"/>` : `<rect class="hcell" x="${x + 3}" y="${y + 3}" width="${S - 6}" height="${S - 6}" rx="5"/>`);
      }
      return out.join('');
    },
    padHTML: () => `<div class="nn-pad"><button id="nnFill" class="on"><span class="nn-ic f"></span>Noircir</button><button id="nnCross"><span class="nn-ic x">✕</span>Croix</button></div>`,
    padBind: () => {
      const sync = () => { document.getElementById('nnFill').classList.toggle('on', mode === 1); document.getElementById('nnCross').classList.toggle('on', mode === 2); };
      document.getElementById('nnFill').addEventListener('click', () => { mode = 1; sync(); });
      document.getElementById('nnCross').addEventListener('click', () => { mode = 2; sync(); });
      sync();
    },
    pointerDown: (s, pt) => {
      const cell = cellAt(pt);
      if (!cell || cell.r < 0 || cell.c < 0) return { pan: true };
      const i = cell.r * s.W + cell.c;
      const from = s.x[i], to = from === mode ? 0 : mode;
      beginStroke();
      s.x[i] = to;
      paint = { from, to, r: cell.r, c: cell.c, axis: null, done: new Set([i]) };
      strokeChanged();
      return { pan: false };
    },
    pointerMove: (s, g, pt) => {
      if (!paint) return;
      const cell = cellAt(pt);
      if (!cell || cell.r < 0 || cell.c < 0 || cell.r >= s.H || cell.c >= s.W) return;
      if (!paint.axis && (cell.r !== paint.r || cell.c !== paint.c)) paint.axis = cell.r === paint.r ? 'row' : 'col';
      const r = paint.axis === 'row' ? paint.r : cell.r, c = paint.axis === 'col' ? paint.c : cell.c;
      // fill every cell between the start and the finger along the axis
      const r0 = Math.min(r, paint.r), r1 = Math.max(r, paint.r), c0 = Math.min(c, paint.c), c1 = Math.max(c, paint.c);
      let ch = false;
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        const i = rr * s.W + cc;
        if (paint.done.has(i) || s.x[i] !== paint.from) continue;
        paint.done.add(i); s.x[i] = paint.to; ch = true;
      }
      if (ch) strokeChanged();
    },
    pointerUp: () => { if (paint) { paint = null; endStroke(true); } },
    pointerCancel: () => { if (paint) { paint = null; endStroke(true); } }
  });
})();
