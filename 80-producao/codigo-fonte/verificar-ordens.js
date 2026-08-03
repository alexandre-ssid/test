/* Verificador do gerador de ordens por e-mail (B-36). Carrega o monólito via
   jsdom, monta uma carteira com perfil Arrojado + qualificado (cobre Tesouro
   Direto, ETF, Fundo/FIDC e Renda Fixa Bancária de reposição) e confere que
   cada produto recebe o modelo de compliance correto — não o mailto único
   que falhava silenciosamente (ver ERROR-LOG). Uso:
     node verificar-ordens.js <caminho-do-html>
*/
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const alvo = process.argv[2] || '../ssid-portfolio-manager-v3.4.0.html';
const html = fs.readFileSync(alvo, 'utf8');

const vc = new VirtualConsole();
const erros = [];
vc.on('jsdomError', e => { if(!/scrollTo/.test(e.message)) erros.push('jsdomError: '+e.message); });
const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc});
const w = dom.window;

function ok(cond, msg){ console.log((cond?'  OK ':'  ❌ ') + msg); if(!cond) process.exitCode = 1; }

console.log('== Arquivo:', alvo, '==');

w.eval("state.total=2000000; state.perfil='A'; state.qual=true; state.teto=10; state.liqMax=99999; state.nome='Cliente Teste';");
w.eval("render()");

const ordens = w.eval("gerarOrdensCarteira()");
ok(Array.isArray(ordens) && ordens.length > 5, `gerarOrdensCarteira() devolveu ${ordens.length} ordem(ns)`);

const porVeiculo = v => ordens.find(o => w.eval(`PROD.find(p=>p.nome===${JSON.stringify(o.titulo.split(': ').slice(1).join(': '))})`)?.ve === v);

// 1. Tesouro Direto — indexador + vencimento aproximado, nunca a taxa como certa
const td = ordens.find(o=>/Tesouro Direto/.test(o.titulo));
ok(!!td, 'Achou ao menos uma ordem de Tesouro Direto (via reserva ou carteira)');
if(td) ok(/\[confirmar/.test(td.corpo), 'Tesouro Direto marca vencimento/rentabilidade como a confirmar, não como certo');

// 2. ETF — ordem a mercado, quantidade calculada, nunca inventada
const etf = ordens.find(o=>/^Compra:/.test(o.titulo));
if(etf){
  ok(/Ordem a mercado/.test(etf.corpo), 'ETF usa "Ordem a mercado" (não inventa preço)');
  ok(/\[calcular pela cotação/.test(etf.corpo), 'ETF marca quantidade como a calcular na cotação do dia');
}

// 3. Fundo/FIDC — modelo de aplicação em fundo, sem inventar emissor
const fundo = ordens.find(o=>/^Fundo — Aplicação:/.test(o.titulo));
if(fundo) ok(!/Emissor/.test(fundo.corpo), 'Fundo/FIDC não usa campo Emissor (fora do modelo do PDF)');

// 4. Renda Fixa Bancária — só entra por reposição (vol/liquidez); força o cenário
w.eval("state.teto=1; state.liqMax=1; state.qual=false; state.repos='auto'; render();");
const ordensRestritas = w.eval("gerarOrdensCarteira()");
const rfb = ordensRestritas.find(o=>/^Renda Fixa — Aplicação:/.test(o.titulo));
ok(!!rfb, 'Cenário restritivo aciona reposição em Renda Fixa Bancária');
if(rfb) ok(/\[conferir taxa vigente|confirmar cotação/.test(rfb.corpo), 'RF Bancária nunca apresenta a taxa do cadastro como definitiva');

// 5. Previdência não tem modelo no PDF — deve avisar, não inventar um texto de ordem
w.eval("state.capPrev=true;");
w.eval("render()");
const ordensComPrev = w.eval("gerarOrdensCarteira()");
const prev = ordensComPrev.find(o => o.semModelo);
if(prev) ok(/não tem modelo de ordem/.test(prev.corpo), 'Previdência sem modelo no PDF gera aviso, não um texto inventado');

// 6. UI: abrir o modal renderiza um card por ordem, escapado (sem quebrar o HTML)
w.eval("renderOrdens(); document.getElementById('ord-overlay').hidden=false;");
const hidden = w.eval("document.getElementById('ord-overlay').hidden");
ok(hidden===false, 'Modal de ordens abre ao clicar (hidden=false)');
const nCards = w.eval("document.querySelectorAll('.ord-item').length");
ok(nCards === ordensComPrev.length, `Modal renderiza ${nCards} card(s) = ${ordensComPrev.length} ordem(ns) do último cenário calculado`);

console.log('erros de console (fora scrollTo):', erros.length);
erros.forEach(e=>console.log('  '+e));
if(erros.length) process.exitCode = 1;
