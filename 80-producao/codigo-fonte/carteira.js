/* =========================================================================
   Parser da "Posição Consolidada" (export XP Hub, colado como texto) +
   matcher contra o cadastro + calculadora do aportador esporádico.
   ========================================================================= */

function parseMoneyBR(s){
  if(s===undefined||s===null||s==='') return null;
  const t = String(s).replace(/[^\d,.\-]/g,'').replace(/\./g,'').replace(',','.');
  const v = parseFloat(t);
  return isFinite(v) ? v : null;
}

function parsePosicaoConsolidada(texto){
  const linhas = texto.split(/\r?\n/).map(l => l.split('\t').map(c=>c.trim()));
  const itens = [];
  const categorias = []; // {nome, total, tipo:'nivel1'|'nivel2'}
  let colunas = null;     // cabeçalho de colunas vigente
  let catAtual = null, subAtual = null;
  const avisos = [];

  const reCat = /^([\d.,]+)\s*%\|(.+)$/;

  for(const cells of linhas){
    if(!cells.length || cells.every(c=>c==='')) continue;
    const c0 = cells[0];
    const restoPreenchido = cells.slice(1).filter(c=>c!=='');
    const m = c0.match(reCat);

    if(m){
      const nome = m[2].trim();
      if(restoPreenchido.length <= 1){
        // nível 1: categoria-mãe (ou total geral) — só o valor, sem cabeçalho de coluna junto
        const total = parseMoneyBR(restoPreenchido[0]);
        categorias.push({nome, total, tipo:'nivel1'});
        catAtual = nome; subAtual = null; colunas = null;
      } else {
        // nível 2: sub-categoria + cabeçalho de colunas na mesma linha
        subAtual = nome;
        colunas = cells.slice(1);
        categorias.push({nome, total:null, tipo:'nivel2', categoriaMae:catAtual});
      }
      continue;
    }
    if(c0==='Ativo' || c0==='Aplicação' || c0==='Data cota'){
      colunas = cells.slice(1); // cabeçalho de colunas puro, sem nova sub-categoria
      continue;
    }
    if(c0==='Custódia remunerada'){
      const v = restoPreenchido.length ? parseMoneyBR(restoPreenchido[restoPreenchido.length-1]) : 0;
      itens.push({categoria:'Caixa', subcategoria:null, nome:'Custódia remunerada', valor: v ?? 0, campos:{}, tipo:'caixa'});
      continue;
    }
    if(!colunas || !catAtual){
      avisos.push(`Linha não reconhecida (ignorada): ${cells.join(' | ').slice(0,80)}`);
      continue;
    }
    // linha de item: zera pelos nomes de coluna vigentes
    const campos = {};
    colunas.forEach((h,i)=>{ if(h) campos[h] = cells[i+1] ?? ''; });
    const valorBruto = campos['Posição'] ?? campos['Valor líquido'] ?? campos['Provisionado'];
    const valor = parseMoneyBR(valorBruto);
    if(valor===null){
      // linha de resumo numérico (ex.: bloco final "Saldo Disponível | Garantia | ...") — não é item
      continue;
    }
    itens.push({categoria:catAtual, subcategoria:subAtual, nome:c0, valor, campos, tipo:'ativo'});
  }

  const totalDeclarado = categorias.find(c=>c.tipo==='nivel1' && /patrim/i.test(c.nome));
  const somaItens = itens.reduce((a,b)=>a+(b.valor||0),0);
  return {itens, categorias, avisos, somaItens};
}

/* ---------------- matching contra o cadastro ---------------- */
function normaliza(s){
  return String(s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
/* Termos financeiros genéricos não contam como sinal de identidade — "CDB Banco X"
   e "CDB Banco Y" não podem parecer o mesmo produto só por compartilhar "cdb/banco/jul". */
const STOPWORDS = new Set([
  'banco','cdb','lci','lca','lcd','fic','fif','fim','fidc','rl','ltda','sa','s','cic',
  'cotas','cota','fundo','fundos','incentivada','incentivadas','incentivado','debenture','debentures',
  'pos','pós','fixado','fixada','renda','fixa','credito','crédito','privado','classe','classes',
  'investimento','investimentos','resp','limitada','fii','fof','deb','cra','cri',
  'cdi','xp','ipca','selic','di','fic','ref','referenciado','simples',
  'jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
]);
function tokensSignificativos(s){
  return normaliza(s).split(' ').filter(w => w.length>2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}
function tokenScore(a, b){
  const ta = new Set(tokensSignificativos(a));
  const tb = new Set(tokensSignificativos(b));
  if(!ta.size || !tb.size) return 0;
  let inter = 0; for(const t of ta) if(tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}
function casarProduto(item, PROD){
  const nomeN = normaliza(item.nome);
  const exato = PROD.find(p => normaliza(p.nome) === nomeN);
  if(exato) return {produto:exato, conf:'alta', score:1};
  let melhor = null, melhorScore = 0;
  for(const p of PROD){
    const s = tokenScore(item.nome, p.nome);
    if(s > melhorScore){ melhorScore = s; melhor = p; }
  }
  if(melhor && melhorScore >= 0.6) return {produto:melhor, conf:'media', score:melhorScore};
  if(melhor && melhorScore >= 0.34) return {produto:melhor, conf:'baixa', score:melhorScore};
  return {produto:null, conf:'nenhuma', score:melhorScore||0};
}

/* ---------------- aportador esporádico (só compra — D-13) ---------------- */
/* itensMapeados: [{produto: <PROD item>, valor: R$}] já resolvidos manualmente.
   aporte: valor novo a alocar. Usa as MESMAS funções de restrição do motor
   principal (folgaGeral-like: capIndividual, fatorFuturo) para não duplicar regra. */
function calcularAportadorEsporadico(itensMapeados, aporte, perfil, filtros, PROD){
  const porClasse = {};
  itensMapeados.forEach(i => { porClasse[i.produto.cl] = (porClasse[i.produto.cl]||0) + i.valor; });
  const patrimMapeado = itensMapeados.reduce((a,b)=>a+b.valor,0);
  const novoTotal = patrimMapeado + aporte;

  // peso ideal por classe (soma dos pesos de produto do perfil, dentro dos filtros ativos)
  const elegiveis = PROD.filter(p => !p.emerg
    && (filtros.ve ? filtros.ve[p.ve] : true)
    && p.vol10 <= (filtros.teto ?? 10)
    && (!p.qual || filtros.qual)
    && p.liq <= (filtros.liqMax ?? 99999) && p.liq >= (filtros.liqMin ?? 0)
    && (p.w[perfil]||0) > 0);
  const somaPesoTotal = elegiveis.reduce((a,b)=>a+b.w[perfil],0) || 1;
  const pesoIdealClasse = {};
  elegiveis.forEach(p => { pesoIdealClasse[p.cl] = (pesoIdealClasse[p.cl]||0) + p.w[perfil]/somaPesoTotal; });

  if(!elegiveis.length){
    return {novoTotal, patrimMapeado, deficits:{}, linhas:[], naoAlocado: aporte,
      aviso: 'Nenhum produto do cadastro atende aos filtros atuais (volatilidade, liquidez, enquadramento, veículo). O aporte não foi alocado — relaxe algum filtro ou cadastre um produto compatível.'};
  }

  // déficit por classe (nunca negativo — só compra)
  let deficits = {};
  Object.keys(pesoIdealClasse).forEach(cl => {
    const alvo = pesoIdealClasse[cl] * novoTotal;
    const hoje = porClasse[cl] || 0;
    deficits[cl] = Math.max(alvo - hoje, 0);
  });
  const somaDeficit = Object.values(deficits).reduce((a,b)=>a+b,0);

  let alocPorClasse = {};
  if(somaDeficit >= aporte - 1e-9){
    // não dá para fechar tudo: distribui o aporte proporcional ao déficit de cada classe
    Object.keys(deficits).forEach(cl => { alocPorClasse[cl] = deficits[cl]/somaDeficit * aporte; });
  } else {
    // fecha todos os déficits e distribui a sobra pelo peso ideal entre todas as classes elegíveis
    Object.keys(deficits).forEach(cl => { alocPorClasse[cl] = deficits[cl]; });
    const sobra = aporte - somaDeficit;
    Object.keys(pesoIdealClasse).forEach(cl => { alocPorClasse[cl] = (alocPorClasse[cl]||0) + pesoIdealClasse[cl]*sobra; });
  }

  // dentro de cada classe, distribui pelos pesos relativos dos produtos elegíveis daquela classe
  const linhas = [];
  Object.entries(alocPorClasse).forEach(([cl, valorClasse]) => {
    if(valorClasse <= 1e-9) return;
    const prodsClasse = elegiveis.filter(p=>p.cl===cl);
    const somaW = prodsClasse.reduce((a,b)=>a+b.w[perfil],0) || 1;
    prodsClasse.forEach(p => {
      const v = valorClasse * (p.w[perfil]/somaW);
      if(v > 0.005) linhas.push({produto:p, valor: Math.round(v*100)/100});
    });
  });
  const somaLinhas = linhas.reduce((a,b)=>a+b.valor,0);
  const resid = Math.round((aporte - somaLinhas)*100)/100;
  if(linhas.length && Math.abs(resid)>0) linhas.sort((a,b)=>b.valor-a.valor)[0].valor += resid;

  return {novoTotal, patrimMapeado, deficits, linhas, naoAlocado: 0};
}

/* ---------------- revisão de carteira completa (B-12, modo 2/3) ----------------
   Sugestão de venda só em RF bancária/títulos (fora de carência) e Ações (ganho de
   capital simplificado a 15%). Fundos, FIDC e Previdência NUNCA são sugeridos para
   venda: o extrato da XP não traz o valor aportado original para eles, e sem custo
   de aplicação não há como calcular ganho/IR com segurança. Ver SPEC-carteira-atual.md
   §Modo 2 — escopo confirmado por Alexandre em 16/07/2026. */
const CLASSE_SUBCATEGORIA_RF = {'Prefixada':'pre', 'Pós-Fixada':'pos', 'Inflação':'inf'};

function parseDataBR(s){
  const m = String(s||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if(!m) return null;
  return new Date(+m[3], +m[2]-1, +m[1]);
}

/* Enriquece um item já parseado com classe, elegibilidade de venda e custo de saída.
   `hoje` é injetável (default: agora) para deixar o cálculo de carência testável. */
function classificarItemCarteira(item, hoje){
  hoje = hoje || new Date();
  if(item.categoria==='Renda Fixa'){
    const cl = CLASSE_SUBCATEGORIA_RF[item.subcategoria];
    if(!cl) return {...item, cl:null, tipo:'mantido', elegivelVenda:false, valorLiquido:item.valor, custoSaida:0,
      motivoBloqueio:'sub-categoria de Renda Fixa não reconhecida'};
    const aplicado = parseMoneyBR(item.campos['Valor aplicado']);
    const liquido = parseMoneyBR(item.campos['Valor líquido']) ?? item.valor;
    const carencia = parseDataBR(item.campos['Carência']);
    const disponivel = parseMoneyBR(item.campos['Disponível']);
    const bloqueadoPorCarencia = !!(carencia && carencia > hoje);
    const semQtdDisponivel = disponivel !== null && disponivel <= 0;
    return {...item, cl, tipo:'rf', aplicado, valorLiquido: liquido, custoSaida: Math.max(item.valor - liquido, 0),
      elegivelVenda: !bloqueadoPorCarencia && !semQtdDisponivel,
      motivoBloqueio: bloqueadoPorCarencia ? `em carência até ${carencia.toLocaleDateString('pt-BR')}`
                    : semQtdDisponivel ? 'sem quantidade disponível para resgate' : null};
  }
  if(item.categoria==='Ações'){
    const precoMedio = parseMoneyBR(item.campos['Preço Médio']);
    const ultimaCot = parseMoneyBR(item.campos['Última Cotação']);
    const qtd = parseMoneyBR(item.campos['Qtd. Total']) ?? parseMoneyBR(item.campos['Qtd. Disponivel']);
    const ganho = (precoMedio!=null && ultimaCot!=null && qtd!=null) ? Math.max((ultimaCot-precoMedio)*qtd, 0) : 0;
    const ir = ganho * 0.15;
    const valorLiquido = Math.max(item.valor - ir, 0);
    return {...item, cl:'rvb', tipo:'acao', valorLiquido, custoSaida: ir, elegivelVenda: true,
      ver: ir>0 ? 'IR estimado a 15% flat sobre o ganho de capital, sem considerar a isenção mensal de R$20.000 em vendas de ações nem compensação de prejuízos de outras operações — conferir produto a produto antes de executar.' : null};
  }
  if(item.tipo==='caixa' || item.categoria==='Caixa')
    return {...item, cl:null, tipo:'caixa', elegivelVenda:false, valorLiquido:item.valor, custoSaida:0,
      motivoBloqueio: 'saldo em caixa / custódia remunerada — já é liquidez, não há o que vender'};
  return {...item, cl:null, tipo:'mantido', elegivelVenda:false, valorLiquido:item.valor, custoSaida:0,
    motivoBloqueio: 'o extrato não traz o valor aportado original para este tipo de produto — sem essa informação não é possível calcular ganho/IR com segurança para sugerir venda'};
}

/* itensClassificados: saída de classificarItemCarteira() para cada item da carteira atual.
   Reaproveita a mesma noção de "peso ideal por classe" do aportador esporádico. */
function calcularRevisaoCompleta(itensClassificados, perfil, filtros, PROD){
  const patrimonioTotal = itensClassificados.reduce((a,b)=>a+(b.valor||0),0);
  const porClasse = {};
  itensClassificados.forEach(i => { if(i.cl) porClasse[i.cl] = (porClasse[i.cl]||0) + i.valor; });

  const elegiveis = PROD.filter(p => !p.emerg
    && (filtros.ve ? filtros.ve[p.ve] : true)
    && p.vol10 <= (filtros.teto ?? 10)
    && (!p.qual || filtros.qual)
    && p.liq <= (filtros.liqMax ?? 99999) && p.liq >= (filtros.liqMin ?? 0)
    && (p.w[perfil]||0) > 0);
  const somaPesoTotal = elegiveis.reduce((a,b)=>a+b.w[perfil],0) || 1;
  const pesoIdealClasse = {};
  elegiveis.forEach(p => { pesoIdealClasse[p.cl] = (pesoIdealClasse[p.cl]||0) + p.w[perfil]/somaPesoTotal; });

  if(patrimonioTotal<=0 || !elegiveis.length){
    return {patrimonioTotal, porClasse, pesoIdealClasse, excessos:{}, deficits:{}, vendas:[],
      excessoResidual:{}, caixaRebalanceamento:0, alocacao:{}, naoRebalanceado:0,
      aviso: !elegiveis.length ? 'Nenhum produto do cadastro atende aos filtros atuais (volatilidade, liquidez, enquadramento, veículo).' : null};
  }

  const classes = new Set([...Object.keys(porClasse), ...Object.keys(pesoIdealClasse)]);
  const excessos = {}, deficits = {};
  classes.forEach(cl => {
    const hoje = porClasse[cl]||0;
    const alvo = (pesoIdealClasse[cl]||0) * patrimonioTotal;
    const dif = hoje - alvo;
    if(dif > 1e-6) excessos[cl] = dif; else if(dif < -1e-6) deficits[cl] = -dif;
  });

  const vendas = [];
  const excessoResidual = {};
  let caixaRebalanceamento = 0;
  for(const cl in excessos){
    let restante = excessos[cl];
    const candidatos = itensClassificados
      .filter(i => i.cl===cl && i.elegivelVenda && i.valor>1e-9)
      .sort((a,b) => (b.valorLiquido/b.valor) - (a.valorLiquido/a.valor));
    for(const item of candidatos){
      if(restante <= 1e-6) break;
      const valorBruto = Math.min(item.valor, restante);
      const proporcao = valorBruto / item.valor;
      const liquidoRecebido = item.valorLiquido * proporcao;
      const custo = item.custoSaida * proporcao;
      vendas.push({item, classe:cl, valorBruto, liquidoRecebido, custo});
      caixaRebalanceamento += liquidoRecebido;
      restante -= valorBruto;
    }
    if(restante > 1e-6) excessoResidual[cl] = restante;
  }

  const somaDeficit = Object.values(deficits).reduce((a,b)=>a+b,0);
  const alocacao = {};
  if(somaDeficit > 1e-6 && caixaRebalanceamento > 1e-9){
    const fator = Math.min(caixaRebalanceamento / somaDeficit, 1);
    Object.keys(deficits).forEach(cl => { alocacao[cl] = deficits[cl]*fator; });
    const alocado = Object.values(alocacao).reduce((a,b)=>a+b,0);
    const sobra = caixaRebalanceamento - alocado;
    if(sobra > 1e-6){
      const somaPesoDeficit = Object.keys(deficits).reduce((a,c)=>a+(pesoIdealClasse[c]||0),0) || 1;
      Object.keys(deficits).forEach(cl => { alocacao[cl] += sobra*(pesoIdealClasse[cl]||0)/somaPesoDeficit; });
    }
  }
  const alocadoFinal = Object.values(alocacao).reduce((a,b)=>a+b,0);
  const naoRebalanceado = Math.max(caixaRebalanceamento - alocadoFinal, 0);

  return {patrimonioTotal, porClasse, pesoIdealClasse, excessos, deficits, vendas,
    excessoResidual, caixaRebalanceamento, alocacao, naoRebalanceado};
}

if(typeof module !== 'undefined') module.exports = {parsePosicaoConsolidada, casarProduto, calcularAportadorEsporadico,
  normaliza, classificarItemCarteira, calcularRevisaoCompleta};
