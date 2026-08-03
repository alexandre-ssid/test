/* Refaz a busca de drawdown no Yahoo Finance para os ETFs do cadastro que já têm
   volFonte:'drawdown' ou 'drawdown-proxy', e imprime um relatório comparando o
   vol10 atual do core.js com o que o dado de hoje daria. NUNCA escreve no
   core.js sozinho — a decisão de aplicar é sempre manual (ver B-22: "não virar
   automação cega"). Rodar: node atualizar-volatilidade.js */
const {PROD} = require('./core.js');

/* ticker próprio (B3, sufixo .SA) ou proxy internacional — mantido em paralelo
   ao core.js porque o cadastro não guarda o ticker/proxy usado, só o resultado.
   Atualize esta lista junto de qualquer novo produto que ganhe drawdown real. */
const FONTES = {
  debb: {ticker:'DEBB11.SA', label:'DEBB11 (próprio)'},
  divo: {ticker:'DIVO11.SA', label:'DIVO11 (próprio)'},
  hash: {ticker:'HASH11.SA', label:'HASH11 (próprio)'},
  spxr: {ticker:'^GSPC',     label:'SPXR11 → proxy S&P 500'},
  golx: {ticker:'GC=F',      label:'GOLX11 → proxy ouro'},
  bilf: {ticker:'ILF',       label:'BILF39 → proxy iShares Latin America 40 (ILF)'},
  bcom: {ticker:'COMT',      label:'BCOM39 → proxy iShares Commodity Dynamic Roll (COMT) — match por nome, não confirmado'},
  hgbr: {ticker:'LQD',       label:'HGBR11 → proxy LQD/iBoxx IG — proxy imperfeito, HGBR11 é "hedge carry"'},
};

async function fetchHist(ticker){
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=10y&interval=1d`;
  const res = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}});
  if(!res.ok) return {erro:`HTTP ${res.status}`};
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  if(!r) return {erro: j?.chart?.error?.description || 'sem resultado'};
  const ts = r.timestamp||[], closes = r.indicators?.quote?.[0]?.close||[];
  const pares = ts.map((t,i)=>[t,closes[i]]).filter(([,c])=>c!=null);
  if(!pares.length) return {erro:'sem preços de fechamento'};
  return {pares};
}
function maxDrawdown(pares){
  let pico=-Infinity, pior=0, picoData=null, valeData=null, dp=null;
  for(const [t,c] of pares){ if(c>pico){pico=c;dp=t;} const dd=(c-pico)/pico; if(dd<pior){pior=dd;valeData=t;picoData=dp;} }
  return {pior,picoData,valeData};
}
const fmt = ts => ts ? new Date(ts*1000).toISOString().slice(0,10) : '—';

(async()=>{
  console.log('Relatório de volatilidade — comparação com o core.js\n' + '='.repeat(70));
  for(const [id, fonte] of Object.entries(FONTES)){
    const prod = PROD.find(p=>p.id===id);
    if(!prod){ console.log(`${id}: não encontrado no cadastro (removido?)`); continue; }
    const h = await fetchHist(fonte.ticker);
    if(h.erro){ console.log(`${prod.nome} (${fonte.label}): ERRO — ${h.erro}`); await new Promise(r=>setTimeout(r,700)); continue; }
    const {pior, picoData, valeData} = maxDrawdown(h.pares);
    const vol10Novo = Math.min(10, Math.abs(pior)/0.50*10);
    const diff = Math.abs(vol10Novo - prod.vol10);
    const alerta = diff > 0.5 ? '  ⚠️  mudou mais de 0,5 — revisar' : '';
    console.log(`${prod.nome} (${fonte.label})`);
    console.log(`  vol10 atual: ${prod.vol10} | vol10 recalculado: ${vol10Novo.toFixed(2)}${alerta}`);
    console.log(`  drawdown: ${(pior*100).toFixed(2)}% (pico ${fmt(picoData)}, vale ${fmt(valeData)}, ${h.pares.length} pontos)\n`);
    await new Promise(r=>setTimeout(r,700)); // evita 429 por rajada
  }
  console.log('='.repeat(70));
  console.log('Nenhum valor foi escrito no core.js. Para aplicar uma mudança, edite o produto manualmente e rode npm test.');
})();
