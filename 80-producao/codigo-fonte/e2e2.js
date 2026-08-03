const {JSDOM}=require('jsdom'); const fs=require('fs'); const os=require('os'); const path=require('path');
const html=fs.readFileSync('../guia-alocacao.html','utf8');
const erros=[];
const vc = new (require('jsdom').VirtualConsole)();
vc.on('jsdomError', e=>erros.push('jsdomError: '+e.message));
vc.on('error', (...a)=>erros.push('console.error: '+a.join(' ')));
const dom=new JSDOM(html,{runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc});
const w=dom.window, d=w.document;
let capt=null;
w.URL.createObjectURL=b=>{capt=b;return 'blob:x';};
w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){};
w.navigator.clipboard={writeText:async()=>{}};

const click=(sel)=>{const e=d.querySelector(sel); if(!e) throw new Error('sem '+sel); e.click();};
const ok=(c,m)=>{ if(!c){erros.push('ASSERT: '+m);} };

// 1. abas existem e alternam
['diag','obj','cart','comp','apres','prod'].forEach(t=>{
  click(`.tabs button[data-t="${t}"]`);
  const s=d.querySelector(`section[data-tab="${t}"]`);
  ok(s && !s.hidden, 'aba '+t+' não abriu');
});

// 2. questionário: responder tudo e aplicar
click('.tabs button[data-t="diag"]');
const grupos=[...d.querySelectorAll('.radios[data-q]')];
ok(grupos.length===7, 'esperava 7 perguntas, veio '+grupos.length);
// respostas: perfil arrojado, mas q3 = "resgataria tudo" => teto deve travar em 0
const respostas={q1:3,q2:3,q3:0,q4:3,q5:3,q6:2,q7:1};
for(const g of grupos){ const i=respostas[g.dataset.q]; g.querySelectorAll('button')[i].click(); }
const critTxt = d.getElementById('criterios').textContent;
ok(/Arrojado/.test(critTxt), 'perfil derivado não é Arrojado: '+critTxt.slice(0,120));
ok(/N0/.test(critTxt), 'teto não travou em N0 (a pergunta restritiva deve vencer)');
ok(/Qualificado/.test(critTxt), 'enquadramento qualificado não propagou');
click('#q-aplicar');
ok(w.eval('state.teto')===0, 'state.teto != 0 após aplicar');
ok(w.eval('state.perfil')==='A', 'state.perfil != A');
ok(w.eval('state.qual')===true, 'state.qual != true');

// 3. carteira com teto 0 -> só produtos sem volatilidade
const r1=w.eval('ULTIMO');
ok(r1.vivos.every(i=>i.vol10===0), 'produto com volatilidade>0 sobreviveu ao teto 0 (escala 0-10)');
ok(r1.vivos.some(i=>i.ve==='Tesouro Direto'), 'Tesouro Selic (vol10=0) não entrou com teto 0');
console.log('  teto0 (escala 0-10) →', r1.vivos.map(i=>i.nome.slice(0,26)+' '+(i.w*100).toFixed(1)+'%').join(' | '));
// teto=1 já deve liberar título bancário (vol10=1)
w.eval("state.teto=1; render();");
const r1b=w.eval('ULTIMO');
ok(r1b.vivos.some(i=>i.ve==='Renda Fixa Bancária'), 'títulos bancários (vol10=1) não entraram nem com teto=1');
w.eval("state.teto=0; render();");

// 4. objetivos
w.eval("state.teto=3; state.perfil='M'; state.total=800000; render();");
click('#obj-add');
w.eval("state.objetivos[0]={id:'x',nome:'Carro',valor:100000,anos:1,carve:true}; render();");
const r2=w.eval('ULTIMO');
ok(Math.abs(r2.somaBolsoes-100000)<0.01, 'bolsão não somou 100k');
ok(Math.abs(r2.investivel - (800000 - r2.reserva - 100000))<0.01, 'investível não descontou o bolsão');
const sug=d.getElementById('obj-sug').textContent;
ok(sug.length>50, 'sugestão de objetivo vazia');
ok(!/HASH11|DIVO11|SPXR11/.test(sug), 'objetivo de 1 ano recebeu renda variável');
console.log('  objetivo 1a →', w.eval("sugerirObjetivo(state.objetivos[0]).linhas.map(l=>l.p.nome+' '+(l.w*100).toFixed(0)+'%').join(' | ')"));

// 5. teto de fundo morde
w.eval("state.capFundo=2; render();");
const r3=w.eval('ULTIMO');
const viol=r3.vivos.filter(i=>(i.ve==='Fundo'||i.ve==='FIDC') && i.w>0.02+1e-9);
ok(viol.length===0, 'teto de 2% violado por '+viol.map(v=>v.nome).join(','));
w.eval("state.capFundo=5; render();");

// 6. composição: desligar ETF
w.eval("state.ve['ETF']=false; render();");
ok(w.eval('ULTIMO').vivos.every(i=>i.ve!=='ETF'), 'ETF sobreviveu ao toggle');
w.eval("state.ve['ETF']=true; render();");

// 7. apresentação: gráfico e números
click('.tabs button[data-t="apres"]');
ok(d.querySelector('#sim-chart svg'), 'gráfico não renderizou');
ok(d.querySelectorAll('#sim-chart polyline').length===2, 'esperava 2 curvas');
ok(d.getElementById('ap-args').textContent.length>80, 'argumentos vazios');
ok(/10,0%/.test(d.getElementById('disc-cdi').textContent+''), 'CDI do disclaimer não pintou: '+d.getElementById('disc-cdi').textContent);

// 8. exportações
capt=null; click('#btn-xlsx'); ok(capt && capt.size>3000, 'xlsx não gerado');
const blobX=capt;
capt=null; click('#btn-csv');  ok(capt && capt.size>200, 'csv não gerado');
capt=null; d.getElementById('btn-wpp').onclick();

// 10. aba Carteira Atual: colar extrato real, analisar, calcular aporte esporádico
click('.tabs button[data-t="cli"]');
ok(!d.querySelector('section[data-tab="cli"]').hidden, 'aba Carteira Atual não abriu');
const posicaoReal = fs.readFileSync('fixtures/posicao-teste.tsv','utf8');
d.getElementById('cli-paste').value = posicaoReal;
click('#cli-analisar');
const clim = w.eval('CLI_MATCHES');
ok(clim.length >= 20, 'poucos itens identificados: '+clim.length);
ok(!d.getElementById('cli-resultado').style.display.includes('none'), 'painel de resultado não apareceu');
const kpiTxt = d.getElementById('cli-kpis').textContent;
ok(/25|24|23/.test(kpiTxt), 'contagem de linhas não bate no KPI: '+kpiTxt.slice(0,80));

// forçar 2 casamentos manuais para exercitar o aportador com itens mapeados reais
w.eval(`
  const ix1 = CLI_MATCHES.findIndex(m=>m.item.nome.includes('PICPAY'));
  if(ix1>=0) CLI_MATCHES[ix1].produtoManual = 'cdb_venc';
  const ix2 = CLI_MATCHES.findIndex(m=>m.item.nome.includes('Jive'));
  if(ix2>=0) CLI_MATCHES[ix2].produtoManual = 'jive';
`);
d.getElementById('cli-aporte').value = '50.000';
w.eval("document.getElementById('cli-aporte').dispatchEvent(new Event('input'))");
click('#cli-calcular');
const aporteHtml = d.getElementById('cli-aporte-resultado').innerHTML;
ok(aporteHtml.length > 100, 'resultado do aportador esporádico vazio');
ok(/50\.000|50000/.test(aporteHtml.replace(/\s/g,'')) || /R\$\s*50/.test(aporteHtml), 'valor do aporte não aparece no resultado: '+aporteHtml.slice(0,200));

// 10b. revisão de carteira completa (B-12 modo 2): clicar de verdade no botão novo
click('#cli-revisar');
const revHtml = d.getElementById('cli-revisao-resultado').innerHTML;
ok(revHtml.length > 100, 'resultado da revisão de carteira vazio');
ok(/Patrim.nio total/.test(revHtml), 'KPI de patrimônio total não apareceu na revisão');
// o extrato real tem RF fora de carência e ações com ganho → deve haver sugestão de venda OU aviso coerente
ok(/Sugest.es de venda|Nenhuma venda sugerida/.test(revHtml), 'revisão não renderizou nem venda nem aviso de ausência');
// invariante crítico: nenhuma linha de venda pode ser de fundo/previdência (checado no HTML pela categoria)
const revData = w.eval(`(function(){
  const cls = CLI_PARSED.itens.map(i=>classificarItemCarteira(i));
  const r = calcularRevisaoCompleta(cls, 'M', {teto:state.teto,qual:state.qual,liqMax:state.liqMax,liqMin:state.liqMin,ve:state.ve}, PROD);
  return {vendeuMantido: r.vendas.some(v=>v.item.tipo==='mantido'||v.item.tipo==='caixa'),
          caixaBate: Math.abs(r.vendas.reduce((a,b)=>a+b.liquidoRecebido,0) - r.caixaRebalanceamento) < 0.02};
})()`);
ok(!revData.vendeuMantido, 'revisão sugeriu vender fundo/previdência/caixa — proibido');
ok(revData.caixaBate, 'caixa de rebalanceamento não bate com a soma dos líquidos vendidos');

// 10c. modo 3 (novo cliente): trocar o toggle, reanalisar, conferir que o rótulo muda mas a conta é a mesma
click('#cli-r-modo button[data-m="novo"]');
ok(/novo cliente/i.test(d.getElementById('cli-r-titulo').textContent), 'título não mudou para modo novo cliente');
click('#cli-revisar');
const revNovoHtml = d.getElementById('cli-revisao-resultado').innerHTML;
ok(revNovoHtml.length > 100, 'resultado do modo novo cliente vazio');
ok(/desmontar|montar/i.test(revNovoHtml), 'rótulos do modo novo cliente não apareceram');
console.log('  carteira atual → itens='+clim.length, '| aporte + revisão (modos 2 e 3) renderizados ok');

// 11. bandas de alocação na Apresentação: cenário do E-11/B-21 (DL, 70k, Moderado, teto=6)
click('.tabs button[data-t="cart"]');
w.eval(`
  state.objetivos=[]; state.ve={'Tesouro Direto':true,'ETF':true,'Fundo':true,'FIDC':true,'Previdência':true,'Renda Fixa Bancária':true};
  state.capFundo=5; state.capFidc=true; state.capPrev=false; state.repos='auto'; state.liqMax=99999; state.liqMin=0;
  state.nome='DL'; state.total=70000; state.perfil='M'; state.teto=6; state.qual=false; state.piso=1000;
  state.resmodo='meses'; state.custo=1000; state.meses=3; render();
`);
click('.tabs button[data-t="apres"]');
const bandasHtml = d.getElementById('bandas-lista').innerHTML;
ok(bandasHtml.length > 200, 'bandas-lista vazia');
ok(/livre de risco/.test(bandasHtml), 'Pós-fixado não marcado como livre de risco');
ok(d.querySelectorAll('.banda-row').length >= 3, 'poucas linhas de banda renderizadas: '+d.querySelectorAll('.banda-row').length);
// Inflação deve estar no teto (27,5%) — não deve aparecer marcada como "fora" (o teto já é respeitado pelo motor)
const infRow = [...d.querySelectorAll('.banda-row')].find(row=>row.textContent.includes('Inflação'));
ok(infRow && !infRow.querySelector('.banda-cliente.fora'), 'Inflação marcada como fora da banda, mas o motor já deveria ter respeitado o teto');
console.log('  bandas → linhas='+d.querySelectorAll('.banda-row').length, '| perfil='+d.getElementById('bandas-perfil-nome').textContent);

// 9. editor: soma dos pesos
click('.tabs button[data-t="prod"]');
const lin=d.querySelectorAll('#ed-body tr').length;
ok(lin===w.eval('PROD.length')+1, 'linhas do editor: '+lin);

console.log('\nerros:', erros.length);
erros.forEach(e=>console.log('  ❌', e));
(async()=>{ if(blobX){ const ab=await blobX.arrayBuffer(); const destino=path.join(os.tmpdir(),'boleta2.xlsx'); fs.writeFileSync(destino, Buffer.from(ab)); console.log('\nboleta salva:', fs.statSync(destino).size, 'bytes'); } })();
