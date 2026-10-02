const pptxgen = require('pptxgenjs');
const { applyTheme } = require('/root/.claude/skills/synced/d518ac60-d69e-4dfc-80b9-5ae5d1bd0cdf_f3b8cba4-e70d-4b97-ad0f-05fb2f4ad055/pptx/scripts/apply_theme.js');
const D = require('./slides.json');
const OUT = process.argv[2] || 'deck.pptx';
const THEME = { name: 'Latao e Tinta', headFontFace: 'Cambria', bodyFontFace: 'Calibri',
  colors: { dk1: '1C2230', lt1: 'FFFFFF', dk2: '3A4357', lt2: 'F1F2F4', accent1: 'A8823F', accent2: '6E5426',
    accent3: 'D9C7A3', accent4: '7A8599', accent5: 'B5533C', accent6: '4F6B5A', hlink: 'A8823F', folHlink: '6E5426' } };
const HEX = { brass: 'A8823F', brassD: '6E5426', brassL: 'D9C7A3', ink: '1C2230', ink2: '3A4357', grey: '7A8599', card: 'F1F2F4', line: 'B9A27A', white: 'FFFFFF' };
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Brave Asset - abertura das carteiras'; pres.author = 'Alexandre Welter';
const C = pres.SchemeColor;
const fmt = (p, d = 1) => p.toFixed(d).replace('.', ',') + '%';

pres.defineSlideMaster({ title: 'CAPA', background: { color: HEX.ink },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 1.6, w: 11.9, h: 1.6, fontFace: 'Cambria', fontSize: 40, bold: true, color: C.background1, valign: 'bottom', align: 'left' }, text: '' } },
            { placeholder: { options: { name: 'body', type: 'body', x: 0.7, y: 3.3, w: 11.9, h: 0.9, fontSize: 18, color: C.accent3, valign: 'top' }, text: '' } }] });
pres.defineSlideMaster({ title: 'FECHO', background: { color: HEX.ink },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 0.6, w: 11.9, h: 0.9, fontFace: 'Cambria', fontSize: 34, bold: true, color: C.background1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
            { placeholder: { options: { name: 'body', type: 'body', x: 0.7, y: 1.5, w: 11.9, h: 0.6, fontSize: 16, color: C.accent3, valign: 'top', align: 'left', margin: 0 }, text: '' } }] });
pres.defineSlideMaster({ title: 'CONTEUDO', background: { color: HEX.white },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: 10.5, h: 0.6, fontFace: 'Cambria', fontSize: 30, bold: true, color: C.text1, valign: 'middle', align: 'left', margin: 0 }, text: '' } }],
  slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 9, color: C.accent4, align: 'right' } });

// ---------- helpers ----------
let oid = 0; const nm = (s) => `${s}-${++oid}`;
function txt(sl, t, o) { sl.addText(t, Object.assign({ isTextBox: true, margin: 0, fontSize: 10, color: C.text1, objectName: nm('t') }, o)); }
function box(sl, o) { sl.addShape(pres.shapes.ROUNDED_RECTANGLE, Object.assign({ rectRadius: 0.06, objectName: nm('box') }, o)); }
function seg(sl, x, y, w, h) { sl.addShape(pres.shapes.LINE, { x, y, w, h, line: { color: HEX.line, width: 1.25 }, objectName: nm('ln') }); }
function elbow(sl, x1, y1, x2, y2) {
  const xm = (x1 + x2) / 2;
  seg(sl, x1, y1, xm - x1, 0);
  if (Math.abs(y2 - y1) > 0.005) seg(sl, xm, Math.min(y1, y2), 0, Math.abs(y2 - y1));
  seg(sl, xm, y2, x2 - xm, 0);
}
const TOP = 1.8, BOT = 6.75;
const COL = { a: [0.5, 1.75], b: [2.62, 1.9], c: [4.92, 5.0], d: [10.32, 2.52] };

function fundSlide(k, sectionTitle) {
  const F = D[k];
  const sl = pres.addSlide({ masterName: 'CONTEUDO', sectionTitle });
  sl.addText(F.name, { placeholder: 'title' });
  txt(sl, `CNPJ ${F.cnpj}  ·  PL ${F.pl_lamina} (lâmina set/26)  ·  Resgate ${F.res}` + (F.mid ? `  ·  ${F.mid}` : ''), { x: 0.5, y: 0.92, w: 12.3, h: 0.3, fontSize: 11, color: C.accent4 });
  // level labels
  const lv = [['a', 'FUNDO'], ['b', 'CLASSES · lâmina'], ['c', k === 'prev' ? 'ATIVOS DO FIFE · CVM' : 'ATIVOS · CVM'], ['d', 'LASTRO DOS FIDCs']];
  lv.forEach(([c, t], i) => txt(sl, [{ text: `${i + 1}  `, options: { bold: true, color: C.accent1 } }, { text: t, options: { color: C.accent2 } }],
    { x: COL[c][0], y: 1.42, w: COL[c][1], h: 0.28, fontSize: 9.5, bold: true, charSpacing: 1 }));

  // ----- level 3 groups (col C) -----
  const ROW = 0.205, HDR = 0.34;
  const grs = F.groups.map((g) => {
    const rows = g.text ? 3 : Math.ceil(g.top.length / 2);
    const h = HDR + rows * ROW + (g.rest_n ? ROW : 0) + 0.1;
    return Object.assign({}, g, { rows, h });
  });
  const tot = grs.reduce((s, g) => s + g.h, 0), gap = Math.min(0.24, (BOT - TOP - tot) / Math.max(1, grs.length - 1));
  let y = TOP + (BOT - TOP - tot - gap * (grs.length - 1)) / 2;
  const [cx, cw] = COL.c;
  grs.forEach((g) => {
    g.y = y; g.mid = y + g.h / 2;
    box(sl, { x: cx, y, w: cw, h: g.h, fill: { color: HEX.card }, line: { color: HEX.card } });
    txt(sl, [{ text: g.title, options: { bold: true, color: C.text1 } }, { text: g.n ? `   ${g.n} ${g.n === 1 ? 'posição' : 'posições'}` : '', options: { color: C.accent4, fontSize: 9.5 } }],
      { x: cx + 0.15, y: y + 0.06, w: cw - 1.3, h: 0.26, fontSize: 11.5 });
    txt(sl, fmt(g.pct), { x: cx + cw - 1.15, y: y + 0.04, w: 1.0, h: 0.3, fontSize: 14, bold: true, color: C.accent2, align: 'right' });
    if (g.text) {
      txt(sl, g.text, { x: cx + 0.15, y: y + HDR, w: cw - 0.3, h: g.rows * ROW, fontSize: 9.5, color: C.text2, italic: true, valign: 'top' });
    } else {
      const colw = (cw - 0.4) / 2;
      g.top.forEach(([a, p], i) => {
        const r = Math.floor(i / 2), c = i % 2, xx = cx + 0.15 + c * (colw + 0.1), yy = y + HDR + r * ROW;
        txt(sl, a, { x: xx, y: yy, w: colw - 0.55, h: ROW, fontSize: 9.5, color: C.text2, fit: 'shrink' });
        txt(sl, fmt(p), { x: xx + colw - 0.55, y: yy, w: 0.5, h: ROW, fontSize: 9.5, bold: true, color: C.text1, align: 'right' });
      });
      if (g.rest_n) txt(sl, `+ ${g.rest_n} outras posições somando ${fmt(g.rest_pct)}`, { x: cx + 0.15, y: y + HDR + g.rows * ROW, w: cw - 0.3, h: ROW, fontSize: 9, italic: true, color: C.accent4 });
    }
    y += g.h + gap;
  });

  // ----- level 2 classes (col B) -----
  const [bx, bw] = COL.b, BH = 0.6;
  const n = F.classes.length, cgap = Math.min(0.25, (BOT - TOP - n * BH) / Math.max(1, n - 1));
  let by = TOP + (BOT - TOP - n * BH - cgap * (n - 1)) / 2;
  const cls = F.classes.map(([lab, p, tg]) => { const o = { lab, p, tg, y: by, mid: by + BH / 2 }; by += BH + cgap; return o; });
  // ----- level 1 fund (col A) -----
  const [ax, aw] = COL.a, AH = 1.5, ay = (TOP + BOT) / 2 - AH / 2;
  cls.forEach((c) => elbow(sl, ax + aw, ay + AH / 2, bx, c.mid));
  cls.forEach((c) => c.tg.forEach((t) => elbow(sl, bx + bw, c.mid, cx, grs[t].mid)));
  box(sl, { x: ax, y: ay, w: aw, h: AH, fill: { color: HEX.ink }, line: { color: HEX.ink } });
  txt(sl, [{ text: F.name, options: { bold: true, fontSize: 12.5, color: C.background1, breakLine: true } },
           { text: F.pl_lamina, options: { fontSize: 10.5, color: C.accent3 } }], { x: ax + 0.12, y: ay + 0.1, w: aw - 0.24, h: AH - 0.2, valign: 'middle', fontFace: 'Cambria' });
  cls.forEach((c) => {
    box(sl, { x: bx, y: c.y, w: bw, h: BH, fill: { color: HEX.white }, line: { color: HEX.brass, width: 1.25 } });
    txt(sl, c.lab, { x: bx + 0.1, y: c.y + 0.04, w: bw - 0.2, h: 0.28, fontSize: 10, color: C.text2, fit: 'shrink' });
    txt(sl, fmt(c.p, 0), { x: bx + 0.1, y: c.y + 0.28, w: bw - 0.2, h: 0.28, fontSize: 14, bold: true, color: C.accent2 });
  });

  // ----- level 4 lastro (col D) -----
  const [dx, dw] = COL.d;
  const fg = grs.find((g) => /FIDC/.test(g.title));
  if (F.seg && F.seg.length) {
    const rows = F.seg.filter(([, p]) => p >= 0.1);
    const RH = 0.3, h = 0.42 + rows.length * RH + 0.66;
    let dy = Math.max(TOP, Math.min(BOT - h, fg.mid - h / 2));
    elbow(sl, cx + cw, fg.mid, dx, Math.min(Math.max(fg.mid, dy + 0.3), dy + h - 0.3));
    box(sl, { x: dx, y: dy, w: dw, h, fill: { color: HEX.white }, line: { color: HEX.brassL, width: 1 } });
    txt(sl, 'Recebíveis · % do PL do fundo', { x: dx + 0.12, y: dy + 0.08, w: dw - 0.24, h: 0.28, fontSize: 9.5, bold: true, color: C.accent2 });
    const mx = Math.max(...rows.map(([, p]) => p));
    rows.forEach(([a, p], i) => {
      const yy = dy + 0.42 + i * RH;
      txt(sl, a, { x: dx + 0.12, y: yy, w: dw - 0.85, h: 0.15, fontSize: 8.5, color: C.text2, fit: 'shrink' });
      const bwid = Math.max(0.03, (dw - 0.95) * p / mx);
      sl.addShape(pres.shapes.RECTANGLE, { x: dx + 0.12, y: yy + 0.16, w: bwid, h: 0.09, fill: { color: /Sem abertura|Caixa/.test(a) ? HEX.grey : HEX.brass }, line: { type: 'none' }, objectName: nm('bar') });
      txt(sl, fmt(p), { x: dx + dw - 0.68, y: yy + 0.07, w: 0.56, h: 0.2, fontSize: 8.5, bold: true, color: C.text1, align: 'right' });
    });
    txt(sl, 'Rateio pela carteira de cada FIDC (Informe Mensal CVM). Não separa sênior/mezanino. “Crédito pessoal e corp.” inclui outros créditos financeiros.', { x: dx + 0.12, y: dy + h - 0.62, w: dw - 0.24, h: 0.56, fontSize: 8, italic: true, color: C.accent4, valign: 'top' });
  } else {
    const h = 1.5, dy = fg.mid - h / 2;
    elbow(sl, cx + cw, fg.mid, dx, fg.mid);
    box(sl, { x: dx, y: dy, w: dw, h, fill: { color: HEX.white }, line: { color: HEX.brassL, width: 1, dashType: 'dash' } });
    txt(sl, [{ text: '[verificar]', options: { bold: true, color: C.accent5, breakLine: true } },
             { text: 'Sem a lista de FIDCs investidos não dá para abrir o lastro. Pedir à Brave a carteira aberta do Brave 30.', options: { color: C.text2 } }],
      { x: dx + 0.15, y: dy + 0.12, w: dw - 0.3, h: h - 0.24, fontSize: 9.5, valign: 'top' });
  }
  txt(sl, F.src + '  ·  *Caixa = zeragem e títulos públicos (nota da lâmina). % do nível 2 = lâmina set/26; % dos níveis 3–4 = data-base CVM indicada.', { x: 0.5, y: 6.92, w: 11.6, h: 0.4, fontSize: 8.5, color: C.accent4, valign: 'top' });
  return sl;
}

// ---------- capa ----------
pres.addSection({ title: 'Abertura' });
let s = pres.addSlide({ masterName: 'CAPA', sectionTitle: 'Abertura' });
s.addText('Fundos Brave até o ativo final', { placeholder: 'title' });
s.addText('Brave 30 · Brave 90 · Brave 180 XP · Brave Iron · Brave Prev XP Seguros', { placeholder: 'body' });
const steps = [['1', 'Fundo', 'lâmina'], ['2', 'Classe', 'lâmina set/26'], ['3', 'Ativos', 'CDA CVM'], ['4', 'Lastro', 'Informe FIDC']];
steps.forEach(([n, a, b], i) => {
  const x = 0.7 + i * 2.55;
  s.addShape(pres.shapes.OVAL, { x, y: 4.75, w: 0.62, h: 0.62, fill: { color: HEX.brass }, line: { color: HEX.brass }, objectName: nm('dot') });
  txt(s, n, { x, y: 4.75, w: 0.62, h: 0.62, align: 'center', valign: 'middle', fontSize: 16, bold: true, color: C.text1, fontFace: 'Cambria' });
  txt(s, [{ text: a, options: { bold: true, fontSize: 14, color: C.background1, breakLine: true } }, { text: b, options: { fontSize: 10.5, color: C.accent3 } }], { x: x + 0.78, y: 4.72, w: 1.6, h: 0.7, valign: 'middle' });
  if (i < 3) s.addShape(pres.shapes.LINE, { x: x + 2.05, y: 5.06, w: 0.4, h: 0, line: { color: HEX.brassL, width: 1 }, objectName: nm('ln') });
});
txt(s, 'Material interno de trabalho, 02/10/2026. Não é recomendação de investimento. Números extraídos das lâminas e dos dados abertos da CVM, sem conferência no regulamento; datas-base diferentes por nível (ver último slide).', { x: 0.7, y: 6.55, w: 11.9, h: 0.5, fontSize: 10, color: C.accent4 });
s.addNotes('Cada slide de fundo lê da esquerda para a direita: fundo, classes da lâmina de setembro, ativos da última carteira pública na CVM e o lastro dos FIDCs investidos.');

pres.addSection({ title: 'Fundos' });
fundSlide('b30', 'Fundos').addNotes('O Brave 30 entrega Informe Mensal de FIDC, que só traz os totais: 67,3% em cotas de FIDC e 32,4% em cotas de fundos FIF em 31/08. A base pública não lista os FIDCs investidos. Pedir a carteira aberta à Brave.');
fundSlide('b90', 'Fundos').addNotes('Brave 90: 75 FIDCs/Fiagros na CDA de 31/08/2026; o maior, Tecnomyl, tem 4,8% do PL. Pulverizado: as 14 maiores posições somam cerca de 37%.');
fundSlide('b180', 'Fundos').addNotes('Brave 180 XP: 32 FIDCs; é mais concentrado que o Brave 90 (Empresarial 8,8%, RED Multisetorial 7,0%). Fundo novo, de dez/25.');
fundSlide('iron', 'Fundos').addNotes('Brave Iron: a CDA de agosto está em sigilo até 29/11/2026, por isso o nível de ativos usa 30/06/2026. Debêntures aparecem pelo código do ativo; o nome do emissor precisa ser conferido.');
fundSlide('prev', 'Fundos').addNotes('Brave Prev XP Seguros: FIC que aplica 99,95% no Brave Prev FIFE. Os ativos mostrados são os do FIFE em 30/06/2026; agosto está em sigilo até 29/11/2026.');

// ---------- sobreposição ----------
pres.addSection({ title: 'Leitura cruzada' });
s = pres.addSlide({ masterName: 'CONTEUDO', sectionTitle: 'Leitura cruzada' });
s.addText('Os mesmos FIDCs se repetem nos fundos', { placeholder: 'title' });
box(s, { x: 0.5, y: 1.4, w: 3.4, h: 5.2, fill: { color: HEX.ink }, line: { color: HEX.ink } });
txt(s, String(D.overlap_n), { x: 0.8, y: 1.75, w: 2.8, h: 1.2, fontSize: 66, bold: true, color: C.accent3, fontFace: 'Cambria' });
txt(s, `dos ${D.overlap_total} FIDCs/Fiagros mapeados aparecem em pelo menos 3 dos 4 fundos abertos.`, { x: 0.8, y: 3.0, w: 2.8, h: 1.1, fontSize: 14, color: C.background1, valign: 'top' });
txt(s, 'Quem soma posições em mais de um fundo Brave não diversifica tanto quanto parece: o risco de cada FIDC se repete.', { x: 0.8, y: 4.3, w: 2.8, h: 1.5, fontSize: 11.5, italic: true, color: C.accent3, valign: 'top' });
const head = ['FIDC', 'Brave 90', 'Brave 180 XP', 'Iron', 'Prev (FIFE)'].map((t, i) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: HEX.brassD }, align: i ? 'right' : 'left' } }));
const rows = D.overlap.map((r, j) => r.map((v, i) => ({ text: i ? (v == null ? '—' : fmt(v)) : v, options: { align: i ? 'right' : 'left', color: C.text1, fill: { color: j % 2 ? HEX.white : HEX.card } } })));
s.addTable([head, ...rows], { x: 4.3, y: 1.4, w: 8.55, colW: [3.15, 1.35, 1.35, 1.35, 1.35], rowH: 0.32, fontSize: 10.5, fontFace: 'Calibri', margin: [0, 0.08, 0, 0.08], border: { type: 'none' }, objectName: 'tabela-sobreposicao' });
txt(s, `% do PL de cada fundo. Brave 90 e 180 XP: CDA 31/08/2026; Iron e FIFE: CDA 30/06/2026. ${D.overlap.length} maiores de ${D.overlap_n} em comum. Brave 30 fora (sem lista pública).`, { x: 4.3, y: 6.25, w: 8.55, h: 0.4, fontSize: 9, color: C.accent4 });
s.addNotes('Ponto de conversa: Empresarial, RED, Futuro Previdência, Harpia, Hope I e Ironwood aparecem nos quatro fundos.');

// ---------- fontes ----------
pres.addSection({ title: 'Fontes' });
s = pres.addSlide({ masterName: 'FECHO', sectionTitle: 'Fontes' });
s.addText('Fontes, datas e ressalvas', { placeholder: 'title' });
s.addText('Antes de usar com cliente, conferir na lâmina, no regulamento e no relatório de gestão.', { placeholder: 'body' });
const B = [
  'Nível 2 (classes): lâminas Brave Asset de setembro/2026.',
  'Nível 3 (ativos): CDA da CVM (dados.cvm.gov.br). Brave 90, Brave 180 XP e Prev XP Seguros em 31/08/2026. Iron e Prev FIFE em 30/06/2026, porque agosto está em sigilo até 29/11/2026.',
  'Brave 30: só o Informe Mensal de FIDC (31/08/2026), sem os FIDCs investidos. [verificar] com a gestora.',
  'Nível 4 (lastro): Informe Mensal de FIDC (CVM, 06 e 08/2026) de cada FIDC investido, rateado pela posição. É aproximação: ignora sênior x mezanino e a subordinação.',
  'Debêntures aparecem pelo código do ativo (ex.: RDOR, SBSP). O emissor deve ser conferido; não foi inferido.',
  'Percentuais da lâmina e da CVM têm datas diferentes e não precisam bater.',
];
s.addText(B.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < B.length - 1 } })), { x: 0.7, y: 2.45, w: 11.9, h: 4.3, fontSize: 15, color: C.background1, paraSpaceAfter: 10, valign: 'top', isTextBox: true, objectName: 'fontes' });

pres.writeFile({ fileName: OUT }).then(async () => { await applyTheme(OUT, THEME); console.log('ok', OUT); });
