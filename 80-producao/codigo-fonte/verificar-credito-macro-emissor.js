/* Verificador das 3 features do motor portadas da v1.41 (Bruno, B-37): exclusão
   por risco de crédito, giro por ciclo macro (conservação de peso dentro da
   classe) e teto de pulverização por emissor (hoje no-op no cadastro real,
   testado aqui com um cenário sintético de 2 produtos do mesmo emissor).
   Uso: node verificar-credito-macro-emissor.js <caminho-do-html> */
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const alvo = process.argv[2] || '../ssid-portfolio-manager-v3.5.0.html';
const html = fs.readFileSync(alvo, 'utf8');

const vc = new VirtualConsole();
const erros = [];
vc.on('jsdomError', e => { if(!/scrollTo/.test(e.message)) erros.push('jsdomError: '+e.message); });
const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc});
const w = dom.window;

function ok(cond, msg){ console.log((cond?'  OK ':'  ❌ ') + msg); if(!cond) process.exitCode = 1; }
console.log('== Arquivo:', alvo, '==');

/* 1. Exclusão por crédito: tetoCredito=1 deve excluir Jive/Pátria (credito:8) */
w.eval("state.total=1000000; state.perfil='A'; state.qual=true; state.teto=10; state.liqMax=99999; state.tetoCredito=1; state.macroCiclo='estavel';");
let r = w.eval("calcular()");
ok(r.remocoes.some(x=>/crédito/.test(x.motivo)), 'ao menos uma remoção com motivo de crédito, tetoCredito=1');
ok(!r.vivos.some(v=>v.credito!==undefined && v.credito>1), 'nenhum produto vivo com credito acima do tetoCredito=1');
let somaVivos = r.vivos.reduce((a,b)=>a+b.valor,0);
ok(Math.abs(somaVivos + r.naoAlocado - r.investivel) < 0.02, 'conservação de valor preservada com filtro de crédito ativo');

/* 2. tetoCredito=10 (sem restrição) não deve gerar exclusão de crédito nenhuma */
w.eval("state.tetoCredito=10;");
r = w.eval("calcular()");
ok(!r.remocoes.some(x=>/crédito/.test(x.motivo)), 'tetoCredito=10 não gera exclusão por crédito');

/* 3. Giro por ciclo macro: conservação de peso dentro da classe 'inf' (B30/B35/B50/Educa+)
      comparando macroCiclo='estavel' (baseline) com 'corte'/'alta'. Perfil M
      (não A): é o único perfil em que B30 (dur curta, w.M=14.5) E B35 (dur
      longa, w.M=1.5) têm AMBOS peso base não-zero — em A, B30 vale 0 no
      cadastro, o que tornaria a razão B50/B30 um artefato sem sentido. */
w.eval("state.tetoCredito=10; state.teto=10; state.liqMax=99999; state.qual=true; state.perfil='M'; state.macroCiclo='estavel';");
const base = w.eval("calcular()");
const pesoClasseInf = arr => arr.vivos.filter(v=>v.cl==='inf').reduce((a,b)=>a+b.w,0);
const baseInf = pesoClasseInf(base);
w.eval("state.macroCiclo='corte';");
const corte = w.eval("calcular()");
const corteInf = pesoClasseInf(corte);
ok(Math.abs(baseInf - corteInf) < 1e-6, `giro macro conserva o peso da classe Inflação (${baseInf.toFixed(6)} vs ${corteInf.toFixed(6)})`);
/* A fórmula de giro reconstrói a proporção interna do grupo via
   duration^(±1) — ela NÃO parte dos pesos-base originais (que refletem
   política de alocação, não duration), só preserva o total do grupo. Por
   isso o teste certo é "corte" vs "alta" diretamente (corte deve favorecer
   a duration longa MAIS que "alta"), não cada um contra o "base" intocado
   — o base pode legitimamente já estar mais/menos inclinado que os dois. */
const pesoDe = (arr,id) => (arr.vivos.find(v=>v.id===id)||{w:0}).w;
const razaoCorte = pesoDe(corte,'b35') / (pesoDe(corte,'b30')||1e-9);
w.eval("state.macroCiclo='alta';");
const alta = w.eval("calcular()");
const razaoAlta = pesoDe(alta,'b35') / (pesoDe(alta,'b30')||1e-9);
ok(razaoCorte > razaoAlta, `ciclo de corte favorece duration longa (B35) mais que ciclo de alta, frente à duration curta (B30): razão B35/B30 = ${razaoCorte.toFixed(4)} (corte) vs ${razaoAlta.toFixed(4)} (alta)`);
w.eval("state.macroCiclo='estavel'; state.perfil='A';");

/* 4. Teto de pulverização por emissor: cenário sintético — injeta 2 produtos fake
      do mesmo emissor na mesma classe 'pos', cada um com peso alto no perfil,
      restaura PROD depois do teste. */
w.eval(`
  window.__PROD_BACKUP__ = JSON.parse(JSON.stringify(PROD));
  PROD.push({id:'fake_em_a', nome:'Fake Emissor A', cl:'pos', ve:'Fundo', vol10:1, volFonte:'fixo', sub:'C', liq:30, qual:false, min:0, emissor:'EmissorFake', w:{C:30,M:30,A:30}});
  PROD.push({id:'fake_em_b', nome:'Fake Emissor B', cl:'pos', ve:'Fundo', vol10:1, volFonte:'fixo', sub:'C', liq:30, qual:false, min:0, emissor:'EmissorFake', w:{C:30,M:30,A:0}});
  PROD.push({id:'fake_outra', nome:'Fake Outra', cl:'pos', ve:'Fundo', vol10:1, volFonte:'fixo', sub:'C', liq:30, qual:false, min:0, emissor:'OutroEmissor', w:{C:10,M:10,A:0}});
`);
w.eval("state.total=1000000; state.perfil='C'; state.qual=false; state.teto=10; state.liqMax=99999; state.tetoCredito=10; state.capFundo=100; state.macroCiclo='estavel';");
r = w.eval("calcular()");
const pesoClassePos = r.vivos.filter(v=>v.cl==='pos').reduce((a,b)=>a+b.w,0);
const pesoEmissorFake = r.vivos.filter(v=>v.emissor==='EmissorFake').reduce((a,b)=>a+b.w,0);
ok(pesoEmissorFake <= pesoClassePos*0.5 + 1e-6, `teto de emissor ativa: EmissorFake ≤ 50% da classe pos (${pesoEmissorFake.toFixed(4)} de ${pesoClassePos.toFixed(4)})`);
w.eval("PROD.length=0; window.__PROD_BACKUP__.forEach(p=>PROD.push(p));");

/* 5. Janela móvel: presença estática na aba Evidências Científicas */
const d = dom.window.document;
w.eval("document.querySelector('.tabs button[data-t=\\\"apres\\\"]').click();");
const janela = [...d.querySelectorAll('.mini-panel h3')].some(h=>/Janela móvel/.test(h.textContent));
ok(janela, 'seção "Janela móvel" presente na aba Evidências Científicas');

console.log('erros de console (fora scrollTo):', erros.length);
erros.forEach(e=>console.log('  ', e));
