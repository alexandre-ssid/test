const C=require('./core.js'); const {state,PROD,calcular}=C;
const R=(a,b)=>a+Math.random()*(b-a), I=(a,b)=>Math.floor(R(a,b+1)), P=a=>a[I(0,a.length-1)];
const LIQ=[0,1,2,5,30,90,180,365,99999];
let falhas=0, semLinhas=0, fgcEst=0;
for(let n=0;n<20000;n++){
  const ve={}; ['Tesouro Direto','ETF','Fundo','FIDC','Previdência','Renda Fixa Bancária'].forEach(v=>ve[v]=Math.random()>0.18);
  const objs=[];
  for(let k=0;k<I(0,2);k++) objs.push({id:'o'+k,nome:'obj'+k,valor:R(0,200000),anos:R(0.2,12),carve:Math.random()>0.3});
  Object.assign(state,{
    nome:'fuzz', total:R(5000,5e6), perfil:P(['C','M','A']), teto:R(0,10), qual:Math.random()>0.5,
    piso:P([0,500,1000,5000,20000]), resmodo:P(['meses','valor']), custo:R(1000,30000), meses:I(0,18),
    resval:R(0,300000), resprod:'ts_emerg', liqMin:0, liqMax:P(LIQ),
    capFundo:R(1,20), capPrev:Math.random()>0.7, capFidc:Math.random()>0.3, repos:P(['auto','sempre','nunca']),
    fgcLim:250000, cdiProj:R(2,18), aliqEtf:15, ve, objetivos:objs, q:{}
  });
  let r; try{ r=calcular(); }catch(e){ console.log('❌ EXCEÇÃO', e.message, JSON.stringify({p:state.perfil,t:state.teto,l:state.liqMax})); falhas++; continue; }
  // checagem de determinismo: mesmo state em memória, roda de novo, tem que dar o mesmo resultado
  const r2 = calcular();
  const w1 = r.vivos.map(i=>i.id+':'+i.w.toFixed(8)).sort().join('|');
  const w2 = r2.vivos.map(i=>i.id+':'+i.w.toFixed(8)).sort().join('|');
  if(w1 !== w2){
    console.log('❌❌ NÃO DETERMINÍSTICO na iteração', n);
    console.log('  1a chamada:', w1);
    console.log('  2a chamada:', w2);
    console.log('  STATE:', JSON.stringify(state));
  }
  const bad=[];
  const sw=r.vivos.reduce((a,b)=>a+b.w,0);
  if(r.investivel>0.01 && r.vivos.length && Math.abs(sw-1)>1e-6) bad.push('pesos '+sw);
  const sv=r.vivos.reduce((a,b)=>a+b.valor,0);
  if(Math.abs(sv+r.naoAlocado-r.investivel)>0.02) bad.push('valores '+sv.toFixed(2)+'≠'+r.investivel.toFixed(2));
  if(r.vivos.some(i=>i.vol10>state.teto)) bad.push('vol');
  if(r.vivos.some(i=>i.liq>state.liqMax)) bad.push('liq');
  if(r.vivos.some(i=>!state.ve[i.ve])) bad.push('veículo');
  if(r.vivos.some(i=>i.qual&&!state.qual)) bad.push('qual');
  if(r.vivos.some(i=>i.valor<0)) bad.push('valor negativo');
  // teto de classe (Diretrizes)
  const CAP = {C:{inf:17.5,pre:7.5,mm:5.0,rvb:5.0,fli:5.0,alt:0.0,rfg:5.0,rvg:7.5},
               M:{inf:27.5,pre:12.5,mm:16.5,rvb:10.0,fli:6.5,alt:10.5,rfg:5.0,rvg:8.5},
               A:{inf:32.5,pre:10.0,mm:12.5,rvb:20.0,fli:12.0,alt:14.5,rfg:5.0,rvg:10.0}};
  const grupoDe = cl => cl==='rval' ? 'rvg' : cl;
  const nomes = {inf:'Inflação', pre:'Prefixado', mm:'Multimercados', rvb:'RV Brasil', fli:'Fundos Listados', alt:'Alternativos', rfg:'RF Global', rvg:'RV Global'};
  const pesosGrupo = {};
  r.vivos.forEach(i=>{ const g=grupoDe(i.cl); pesosGrupo[g]=(pesosGrupo[g]||0)+i.w; });
  const capPerfil = CAP[state.perfil]||{};
  for(const g in pesosGrupo){
    if(r.investivel <= 0.01) continue; // 100% de R$0 não é violação de nada
    const cap = capPerfil[g]; if(cap===undefined) continue;
    if(pesosGrupo[g] > cap/100 + 1e-6 && !r.tetosClasse.some(t=>t.resto>1e-9) && !r.violacoesClassePorPiso.some(v=>v.classe===(nomes[g]||g)))
      bad.push(`classe ${g}=${(pesosGrupo[g]*100).toFixed(2)}% > teto ${cap}%`);
  }

  if(!isFinite(sv)||isNaN(sv)) bad.push('NaN');
  // teto de fundo (tolerância: só se houve destino; senão o motor devolve e avisa)
  const capOf=i=>(i.ve==='Fundo'||(state.capFidc&&i.ve==='FIDC')||(state.capPrev&&i.ve==='Previdência'))?state.capFundo/100:Infinity;
  const vio=r.vivos.filter(i=>i.w>capOf(i)+1e-6);
  if(vio.length && r.vivos.length>1 && !r.tetos.some(t=>t.resto>1e-9)) bad.push('teto fundo '+vio.length);
  // FGC: ou respeita, ou registrou estouro
  const g={};
  r.vivos.filter(i=>i.ve==='Renda Fixa Bancária'&&i.fgc).forEach(i=>{
    const f=Math.pow(1+(state.cdiProj/100)*((i.pctCDI||100)/100), i.prazoAnos||0);
    g[i.emissor]=(g[i.emissor]||0)+i.valor*f;});
  for(const k in g) if(g[k]>state.fgcLim+1 && !r.fgcEstouro.some(e=>e.emissor===k)) bad.push('FGC silencioso '+k);
  if(r.fgcEstouro.length) fgcEst++;
  if(!r.vivos.length && r.investivel>0.01){ semLinhas++; if(!r.naoAlocado) bad.push("dinheiro sumiu"); }
  if(bad.length){
    falhas++;
    if(falhas<=10) console.log('❌', bad.join(' | '));
    // salva o state exato da falha em ./falhas/ — reproduzir com:
    //   node -e "const C=require('./core.js'); Object.assign(C.state, require('./falhas/falha-N.json').state); console.log(C.calcular())"
    const fs = require('fs');
    if(!fs.existsSync('falhas')) fs.mkdirSync('falhas');
    fs.writeFileSync('falhas/falha-'+falhas+'.json', JSON.stringify({bad, state}, null, 2));
  }
}
console.log(`\n20000 cenários aleatórios · falhas=${falhas} · estouros de FGC sinalizados=${fgcEst} · carteiras vazias=${semLinhas}`);
