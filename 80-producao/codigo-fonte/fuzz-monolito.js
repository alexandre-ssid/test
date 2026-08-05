/* Fuzz do motor sobre o MONÓLITO (base SSID Portfolio Manager v1.36+, HTML único
   sem código-fonte modular). Carrega o HTML via jsdom UMA vez, injeta a rotina de
   fuzz no contexto da página e roda N cenários contra os invariantes — incluindo o
   novo PGBL como bolsão (conservação de valor agora soma pgbl). Uso:
     node fuzz-monolito.js [caminho-html] [N]
   Substitui o antigo fuzz.js (que dependia de core.js modular, inexistente na base
   monolítica). Ver CLAUDE.md / DECISÃO de rebase v1.36. */
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const alvo = process.argv[2] || '../ssid-portfolio-manager-v1.37.0.html';
const N = parseInt(process.argv[3] || '20000', 10);
const html = fs.readFileSync(alvo, 'utf8');

const vc = new VirtualConsole();
vc.on('jsdomError', e => { if(!/scrollTo/.test(e.message)) console.log('jsdomError:', e.message); });
const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc});
const w = dom.window;

// A rotina de fuzz roda DENTRO do contexto da página (acesso direto a calcular/state/PROD/CAP_CLASSE),
// evitando 20.000 travessias de ponte jsdom. Retorna um resumo serializável.
const script = `(function(N){
  const R=(a,b)=>a+Math.random()*(b-a), I=(a,b)=>Math.floor(R(a,b+1)), P=a=>a[I(0,a.length-1)];
  const LIQ=[0,1,2,5,30,90,180,365,99999];
  const grupoDe = cl => cl==='rval' ? 'rvg' : cl;
  let falhas=0, semLinhas=0, fgcEst=0, comPgbl=0;
  const exemplos=[];
  for(let n=0;n<N;n++){
    const ve={}; ['Tesouro Direto','ETF','Fundo','FIDC','Previdência','Renda Fixa Bancária'].forEach(v=>ve[v]=Math.random()>0.18);
    // B-31: às vezes remove alguns produtos manualmente (exercita a exclusão manual no motor)
    const exMan = Math.random()>0.6 ? PROD.filter(()=>Math.random()>0.85).map(x=>x.id) : [];
    const objs=[];
    for(let k=0;k<I(0,2);k++) objs.push({id:'o'+k,nome:'obj'+k,valor:R(0,200000),anos:R(0.2,12),carve:Math.random()>0.3});
    Object.assign(state,{
      nome:'fuzz', total:R(5000,5e6), perfil:P(['C','M','A']), teto:R(0,10), qual:Math.random()>0.5,
      piso:P([0,500,1000,5000,20000]), resmodo:P(['meses','valor']), custo:R(1000,30000), meses:I(0,18),
      resval:R(0,300000), resprod:'ts_emerg', liqMin:0, liqMax:P(LIQ),
      rendaTributavel:P([0,0,50000,120000,300000,800000]),
      capFundo:R(1,20), capPrev:Math.random()>0.7, capFidc:Math.random()>0.3, repos:P(['auto','sempre','nunca']),
      tetoCredito:P([1,4,7,10,10,10]), macroCiclo:P(['corte','estavel','estavel','alta']),
      fgcLim:250000, cdiProj:R(2,18), aliqEtf:15, ve, objetivos:objs, q:{},
      excluidosManuais:exMan, cartView:P(['estrategia','veiculo']),
      maxAtivos:P([0,0,0,3,5,8,12])
    });
    let r; try{ r=calcular(); }catch(e){ falhas++; if(exemplos.length<10) exemplos.push('EXCEÇÃO '+e.message); continue; }
    // determinismo
    const r2=calcular();
    const w1=r.vivos.map(i=>i.id+':'+i.w.toFixed(8)).sort().join('|');
    const w2=r2.vivos.map(i=>i.id+':'+i.w.toFixed(8)).sort().join('|');
    const bad=[];
    if(w1!==w2) bad.push('não-determinístico');
    // conservação de valor: Σvalor(vivos) + naoAlocado = investível (mesmo invariante do fuzz.js original;
    // os bolsões — reserva/pgbl/objetivos — podem exceder o total em cenários-lixo, então o motor corta
    // investível para 0 e avisa; conservação se verifica DENTRO do investível, não contra o total).
    const sv=r.vivos.reduce((a,b)=>a+b.valor,0);
    if(Math.abs(sv + r.naoAlocado - r.investivel) > 0.02) bad.push('valor '+sv.toFixed(2)+'+'+r.naoAlocado.toFixed(2)+'≠inv '+r.investivel.toFixed(2));
    // coerência dos bolsões: investível = max(total - reserva - pgbl - bolsões, 0)
    const invEsperado = Math.max(state.total - r.reserva - (r.pgbl||0) - r.somaBolsoes, 0);
    if(Math.abs(r.investivel - invEsperado) > 0.02) bad.push('investível '+r.investivel.toFixed(2)+'≠'+invEsperado.toFixed(2));
    // PGBL nunca negativo, nunca acima de 12% da renda
    if((r.pgbl||0) < -1e-6) bad.push('pgbl negativo');
    if((r.pgbl||0) > (state.rendaTributavel||0)*0.12 + 0.01) bad.push('pgbl acima de 12%');
    // conservação de peso
    const sw=r.vivos.reduce((a,b)=>a+b.w,0);
    if(r.investivel>0.01 && r.vivos.length && Math.abs(sw-1)>1e-6) bad.push('pesos '+sw);
    // nenhum produto violado
    if(r.vivos.some(i=>i.vol10>state.teto)) bad.push('vol');
    if(r.vivos.some(i=>i.liq>state.liqMax)) bad.push('liq');
    if(r.vivos.some(i=>!state.ve[i.ve])) bad.push('veículo');
    if(r.vivos.some(i=>i.qual&&!state.qual)) bad.push('qual');
    if(r.vivos.some(i=>i.valor<0)) bad.push('valor negativo');
    // B-37: nenhum produto vivo acima da tolerância de crédito aceita
    if(r.vivos.some(i=>i.credito!==undefined && i.credito>state.tetoCredito+1e-9)) bad.push('crédito');
    // B-37: giro macro/teto de emissor fazem subtração direta de peso — nunca negativo
    if(r.vivos.some(i=>i.w<-1e-9)) bad.push('peso negativo (giro/emissor)');
    // teto de classe
    const capPerfil = CAP_CLASSE[state.perfil]||{};
    const pesosGrupo={}; r.vivos.forEach(i=>{const g=grupoDe(i.cl); pesosGrupo[g]=(pesosGrupo[g]||0)+i.w;});
    for(const g in pesosGrupo){
      if(r.investivel<=0.01) continue;
      const cap=capPerfil[g]; if(cap===undefined) continue;
      if(pesosGrupo[g] > cap/100 + 1e-6 && !r.tetosClasse.some(t=>t.resto>1e-9) && !r.violacoesClassePorPiso.some(v=>true))
        bad.push('classe '+g+'='+(pesosGrupo[g]*100).toFixed(2)+'%>'+cap+'%');
    }
    // teto de fundo (tolera concentração deliberada do limite de quantidade — B-26)
    const capOf=i=>(i.ve==='Fundo'||(state.capFidc&&i.ve==='FIDC')||(state.capPrev&&i.ve==='Previdência'))?state.capFundo/100:Infinity;
    if(r.vivos.filter(i=>i.w>capOf(i)+1e-6).length && r.vivos.length>1 && !r.tetos.some(t=>t.resto>1e-9) && !r.fundoRelaxado) bad.push('teto fundo');
    // limite de quantidade: nunca mais linhas que o teto quando foi possível reduzir (senão o motor avisa)
    if((state.maxAtivos||0)>0 && r.vivos.length>state.maxAtivos && !r.alerts.some(a=>/Não foi possível chegar a/.test(a[1]))) bad.push('maxAtivos '+r.vivos.length+'>'+state.maxAtivos);
    // FGC
    const gg={};
    r.vivos.filter(i=>i.ve==='Renda Fixa Bancária'&&i.fgc).forEach(i=>{
      const f=Math.pow(1+(state.cdiProj/100)*((i.pctCDI||100)/100), i.prazoAnos||0);
      gg[i.emissor]=(gg[i.emissor]||0)+i.valor*f;});
    for(const k in gg) if(gg[k]>state.fgcLim+1 && !r.fgcEstouro.some(e=>e.emissor===k)) bad.push('FGC silencioso '+k);
    if(r.fgcEstouro.length) fgcEst++;
    if((r.pgbl||0)>0) comPgbl++;
    if(!r.vivos.length && r.investivel>0.01){ semLinhas++; if(!r.naoAlocado) bad.push('dinheiro sumiu'); }
    if(bad.length){ falhas++; if(exemplos.length<10) exemplos.push(bad.join(' | ')); }
  }
  return JSON.stringify({falhas, semLinhas, fgcEst, comPgbl, exemplos});
})(${N})`;

const res = JSON.parse(w.eval(script));
console.log(`${N} cenários (monólito) · falhas=${res.falhas} · com PGBL=${res.comPgbl} · estouros FGC=${res.fgcEst} · carteiras vazias=${res.semLinhas}`);
res.exemplos.forEach(e=>console.log('  ❌', e));
process.exitCode = res.falhas ? 1 : 0;
