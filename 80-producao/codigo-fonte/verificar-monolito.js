/* Verificador do monólito (base SSID Portfolio Manager v1.36+). Carrega o HTML
   único via jsdom, expõe o motor (calcular/state/PROD) e confere: (1) o novo
   PGBL como bolsão e a conservação de valor incluindo pgbl; (2) que o B-33
   (agregado Renda Variável) renderiza na aba Composição. Uso:
     node verificar-monolito.js <caminho-do-html>
   Passo intermediário até fuzz/e2e serem plenamente portados para o monólito. */
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const alvo = process.argv[2] || '../ssid-portfolio-manager-v1.37.0.html';
const html = fs.readFileSync(alvo, 'utf8');

const vc = new VirtualConsole();
const erros = [];
vc.on('jsdomError', e => { if(!/scrollTo/.test(e.message)) erros.push('jsdomError: '+e.message); });
const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc});
const w = dom.window, d = w.document;

function ok(cond, msg){ console.log((cond?'  OK ':'  ❌ ') + msg); if(!cond) process.exitCode = 1; }

console.log('== Arquivo:', alvo, '==');

// 1. motor com PGBL
w.eval("state.total=1000000; state.rendaTributavel=200000; state.perfil='M';");
const r = w.eval("calcular()");
ok(Math.abs(r.pgbl - 24000) < 1, `PGBL = 12% de 200k = ${r.pgbl} (esperado 24000)`);
const somaVivos = r.vivos.reduce((a,b)=>a+b.valor,0);
const total = r.reserva + r.pgbl + r.somaBolsoes + r.naoAlocado + somaVivos;
ok(Math.abs(total - 1000000) < 0.02, `conservação: reserva+pgbl+bolsões+nãoAlocado+vivos = ${total.toFixed(2)} (esperado 1000000)`);

// 2. B-33: agregado Renda Variável na Composição
w.eval("document.querySelector('.tabs button[data-t=\\\"comp\\\"]').click(); render();");
const rvLinhas = d.querySelectorAll('#comp-perfis .rv-total');
ok(rvLinhas.length === 3, `linha "Renda Variável (total)" nos 3 perfis (achou ${rvLinhas.length})`);
const painelRv = d.getElementById('comp-real-rv');
ok(painelRv && /Renda Variável/.test(painelRv.textContent), 'painel "Carteira do cliente · Renda Variável" presente');

// 3. versão no rodapé
const footer = d.querySelector('footer')?.textContent || '';
const mv = footer.match(/v(\d+\.\d+\.\d+)/);
ok(!!mv, 'versão visível no rodapé: ' + (mv?mv[1]:'NÃO ENCONTRADA'));

console.log('erros de console (fora scrollTo):', erros.length);
erros.forEach(e=>console.log('  ', e));
