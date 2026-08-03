/* Fuzz dedicado do motor de revisão de carteira completa (B-12, modo 2/3).
   Gera carteiras sintéticas (RF, Ações, Fundos, Previdência) e checa os
   invariantes do SPEC-carteira-atual.md §Modo 2. Não usa core.js calcular() —
   testa classificarItemCarteira() + calcularRevisaoCompleta() isoladamente. */
const C = require('./core.js'); const {PROD} = C;
const {classificarItemCarteira, calcularRevisaoCompleta} = require('./carteira.js');

const R = (a,b) => a + Math.random()*(b-a);
const I = (a,b) => Math.floor(R(a,b+1));
const P = a => a[I(0,a.length-1)];
const brl = n => 'R$ ' + n.toFixed(2).replace('.',',');
const dataBR = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

const HOJE = new Date(2026,6,16); // 16/07/2026 fixo, para reprodutibilidade

function gerarItemBruto(){
  const tipo = P(['rf','acao','fundo','prev']);
  if(tipo==='rf'){
    const sub = P(['Prefixada','Pós-Fixada','Inflação']);
    const aplicado = R(1000,100000);
    const ganhoOuPerda = R(-0.05, 0.30); // pode ter posição levemente negativa (título ruim)
    const bruto = Math.max(aplicado * (1+ganhoOuPerda), 0);
    const irEmbutido = Math.max(bruto - aplicado,0) * R(0.15,0.225); // XP já desconta
    const liquido = Math.max(bruto - irEmbutido, 0);
    const carenciaDias = I(-400, 400); // negativo = já passou, positivo = no futuro
    const carencia = new Date(HOJE.getTime() + carenciaDias*86400000);
    const disponivel = P([0, 0, 1, 5, 20]); // às vezes zero (sem qtd disponível)
    return {categoria:'Renda Fixa', subcategoria:sub, nome:'Título '+sub+' '+I(1,999), valor: bruto,
      campos:{'Valor aplicado': brl(aplicado), 'Valor líquido': brl(liquido), 'Carência': dataBR(carencia), 'Disponível': String(disponivel)}};
  }
  if(tipo==='acao'){
    const precoMedio = R(5,100);
    const ultimaCot = precoMedio * R(0.5, 2.0);
    const qtd = I(10,1000);
    const valor = ultimaCot*qtd;
    return {categoria:'Ações', subcategoria:null, nome:'ATIV'+I(1,999)+'3', valor,
      campos:{'Preço Médio': brl(precoMedio), 'Última Cotação': brl(ultimaCot), 'Qtd. Total': String(qtd)}};
  }
  if(tipo==='fundo')
    return {categoria:'Fundos de Investimento', subcategoria:P(['Fundos de Renda Fixa Pós-Fixado','Fundos Multimercados']), nome:'Fundo '+I(1,999), valor:R(1000,200000), campos:{}};
  return {categoria:'Previdência', subcategoria:null, nome:'Prev '+I(1,999), valor:R(1000,200000), campos:{}};
}

let falhas=0, comVenda=0, comResidual=0, comNaoRebal=0;
const N = 20000;
for(let n=0;n<N;n++){
  const nItens = I(3,25);
  const itensBrutos = Array.from({length:nItens}, gerarItemBruto);
  const itensClassificados = itensBrutos.map(i => classificarItemCarteira(i, HOJE));
  const perfil = P(['C','M','A']);
  const filtros = {teto: R(0,10), qual: Math.random()>0.5, liqMin:0, liqMax: P([0,1,2,5,30,90,180,365,99999]),
    ve: {'Tesouro Direto':true,'ETF':Math.random()>0.2,'Fundo':true,'FIDC':Math.random()>0.2,'Previdência':true,'Renda Fixa Bancária':true}};

  let r;
  try{ r = calcularRevisaoCompleta(itensClassificados, perfil, filtros, PROD); }
  catch(e){ console.log('❌ EXCEÇÃO', e.message); falhas++; continue; }

  const bad = [];

  // determinismo
  const r2 = calcularRevisaoCompleta(itensClassificados, perfil, filtros, PROD);
  const assinatura = x => JSON.stringify(x.vendas.map(v=>[v.item.nome,v.valorBruto.toFixed(2)]).sort());
  if(assinatura(r) !== assinatura(r2)) bad.push('não-determinístico');

  // nunca vende fundo/previdência/item "mantido"
  if(r.vendas.some(v => v.item.tipo==='mantido')) bad.push('vendeu item mantido (fundo/previdência/outro)');
  // nunca vende RF bloqueado
  if(r.vendas.some(v => v.item.tipo==='rf' && !v.item.elegivelVenda)) bad.push('vendeu RF não elegível (carência/sem disponível)');
  // custo e valores sempre não-negativos e dentro do item
  r.vendas.forEach(v => {
    if(v.custo < -1e-6) bad.push('custo negativo');
    if(v.valorBruto > v.item.valor + 1e-6) bad.push('vendeu mais que a posição');
    if(v.liquidoRecebido < -1e-6) bad.push('líquido recebido negativo');
  });
  // conservação: líquido recebido soma = caixa de rebalanceamento
  const somaLiquido = r.vendas.reduce((a,b)=>a+b.liquidoRecebido,0);
  if(Math.abs(somaLiquido - r.caixaRebalanceamento) > 0.02) bad.push('caixa de rebalanceamento não bate com soma das vendas');
  // caixa = alocado + não rebalanceado
  const alocado = Object.values(r.alocacao).reduce((a,b)=>a+b,0);
  if(Math.abs(r.caixaRebalanceamento - (alocado + r.naoRebalanceado)) > 0.02) bad.push('caixa != alocado + não rebalanceado');
  if(r.naoRebalanceado < -1e-6) bad.push('não rebalanceado negativo');
  // ganho de ação nunca reduz o IR (custo de ação sempre >=0, já checado acima)

  if(r.vendas.length) comVenda++;
  if(Object.keys(r.excessoResidual).length) comResidual++;
  if(r.naoRebalanceado > 0.01) comNaoRebal++;

  if(bad.length){
    falhas++;
    if(falhas<=10) console.log('❌', bad.join(' | '));
  }
}
console.log(`\n${N} cenários de carteira · falhas=${falhas} · com sugestão de venda=${comVenda} · com excesso residual=${comResidual} · com sobra não-rebalanceada=${comNaoRebal}`);
