/* =========================================================================
   UI — abas, questionário, objetivos, composição, apresentação, editor
   ========================================================================= */

/* ---------------- questionário ---------------- */
const QUESTOES = [
  {id:'q1', t:'Qual o objetivo principal deste patrimônio?', o:[
    {r:'Preservar o poder de compra', s:'Não quero ver o valor cair', pts:0},
    {r:'Gerar renda', s:'Complementar a renda mensal', pts:1},
    {r:'Crescer no longo prazo', s:'Aceito oscilar para acumular', pts:2},
    {r:'Crescer agressivamente', s:'Busco retorno acima da média', pts:3},
  ]},
  {id:'q2', t:'Em quanto tempo pretende usar a maior parte do recurso?', o:[
    {r:'Menos de 2 anos', pts:0, teto:10},
    {r:'De 2 a 5 anos',   pts:1, teto:6},
    {r:'De 5 a 10 anos',  pts:2, teto:10},
    {r:'Mais de 10 anos', pts:3, teto:10},
  ]},
  {id:'q3', t:'Se a carteira caísse 15% em seis meses, o que faria?', o:[
    {r:'Resgataria tudo', s:'Não suporto ver perda no extrato', pts:0, teto:0},
    {r:'Resgataria uma parte', pts:1, teto:6},
    {r:'Manteria a posição', pts:2, teto:10},
    {r:'Aportaria mais', s:'Vejo queda como oportunidade', pts:3, teto:10},
  ]},
  {id:'q4', t:'Que produtos você já usou?', o:[
    {r:'Poupança e renda fixa', pts:0, teto:10},
    {r:'Fundos e Tesouro Direto', pts:1, teto:6},
    {r:'Bolsa e multimercados', pts:2, teto:10},
    {r:'Derivativos e alternativos', pts:3, teto:10},
  ]},
  {id:'q5', t:'Este dinheiro representa quanto do seu patrimônio total?', o:[
    {r:'Praticamente tudo', pts:0, teto:10},
    {r:'Uma parte relevante', pts:1, teto:6},
    {r:'Uma parcela pequena', pts:2, teto:10},
    {r:'Irrelevante no conjunto', pts:3, teto:10},
  ]},
  {id:'q6', t:'Em quanto tempo precisa poder resgatar?', liq:true, o:[
    {r:'No mesmo dia (D+0)', liq:0},
    {r:'Em até 30 dias',     liq:30},
    {r:'Em até 180 dias',    liq:180},
    {r:'Posso carregar até o vencimento', liq:99999},
  ]},
  {id:'q7', t:'Enquadramento do investidor', o:[
    {r:'Investidor comum', qual:false},
    {r:'Qualificado — mais de R$ 1 milhão declarado', qual:true},
    {r:'Qualificado — certificação (CGA, CNPI, CFP...)', qual:true},
  ]},
];

function renderDiag(){
  const el = document.getElementById('quest');
  el.innerHTML = QUESTOES.map(q=>`
    <div class="qbox">
      <div class="qt">${esc(q.t)}</div>
      <div class="radios" data-q="${q.id}">
        ${q.o.map((o,i)=>`<button data-i="${i}" aria-pressed="${state.q[q.id]===i}">
          <span class="dot"></span><span><b>${esc(o.r)}</b>${o.s?`<small>${esc(o.s)}</small>`:''}</span></button>`).join('')}
      </div>
    </div>`).join('') + `
    <div class="qbox">
      <div class="qt">Reserva de emergência</div>
      <div class="qgrid">
        <div class="f"><label>Custo de vida mensal</label>
          <input class="inp money" id="q-custo" value="${fmtMoney(state.custo)}"></div>
        <div class="f"><label>Meses de reserva</label>
          <input class="inp" id="q-meses" type="number" min="0" max="36" value="${state.meses}"></div>
      </div>
    </div>
    <div class="qbox">
      <div class="qt">Patrimônio a alocar</div>
      <div class="qgrid">
        <div class="f"><label>Nome do cliente</label><input class="inp" id="q-nome" value="${esc(state.nome)}" placeholder="Cliente ou prospect"></div>
        <div class="f"><label>Valor total</label><input class="inp money" id="q-total" value="${fmtMoney(state.total)}"></div>
      </div>
    </div>`;

  el.querySelectorAll('.radios[data-q]').forEach(g=>{
    g.onclick = e=>{
      const b = e.target.closest('button[data-i]'); if(!b) return;
      state.q[g.dataset.q] = +b.dataset.i;
      renderDiag(); renderCriterios();
    };
  });
  bindMoney('q-custo','custo', ()=>{ renderCriterios(); });
  document.getElementById('q-meses').oninput = e=>{ state.meses=+e.target.value||0; renderCriterios(); };
  document.getElementById('q-nome').oninput  = e=>{ state.nome=e.target.value; syncRail(); };
  bindMoney('q-total','total', ()=>{ renderCriterios(); });
  renderCriterios();
}

function derivarCriterios(){
  const resp = QUESTOES.map(q => ({q, o: q.o[state.q[q.id]]}));
  const faltam = resp.filter(x=>!x.o).map(x=>x.q.id);
  const pontuadas = resp.filter(x=>x.o && x.o.pts!==undefined);
  const pts = pontuadas.reduce((a,b)=>a+b.o.pts,0);
  const max = pontuadas.reduce((a,b)=>a+3,0) || 1;
  const r = pts/max;
  const perfil = r < 0.34 ? 'C' : (r < 0.67 ? 'M' : 'A');
  const tetos = resp.filter(x=>x.o && x.o.teto!==undefined).map(x=>x.o.teto);
  const teto = tetos.length ? Math.min(...tetos) : 3;
  const qLiq = resp.find(x=>x.q.liq && x.o);
  const qQual = resp.find(x=>x.q.id==='q7' && x.o);
  return {
    faltam, pts, max, razao:r, perfil, teto,
    liqMax: qLiq ? qLiq.o.liq : 99999,
    qual: qQual ? qQual.o.qual : false,
    reserva: state.custo*state.meses,
  };
}

function renderCriterios(){
  const d = derivarCriterios();
  const box = document.getElementById('criterios');
  const pronto = d.faltam.length===0;
  const restricao = d.teto < ({C:1,M:2,A:3}[d.perfil]);
  box.innerHTML = `
    <h2>Critérios derivados</h2>
    ${!pronto ? `<div class="al warn" style="margin-bottom:12px"><span class="ic">!</span><span>Faltam ${d.faltam.length} resposta(s). Os critérios abaixo usam apenas o que já foi respondido.</span></div>` : ''}
    <div class="crit">
      <div><span class="ck">Perfil</span><span class="cv">${nomePerfil(d.perfil)}</span>
           <span class="cs">${d.pts} de ${d.max} pontos</span></div>
      <div><span class="ck">Volatilidade máxima</span><span class="cv">N${d.teto}</span>
           <span class="cs">${rotuloVol(d.teto)}</span></div>
      <div><span class="ck">Liquidez aceita</span><span class="cv">${rotuloLiq(d.liqMax)}</span>
           <span class="cs">Produtos mais lentos são excluídos</span></div>
      <div><span class="ck">Enquadramento</span><span class="cv">${d.qual?'Qualificado':'Comum'}</span>
           <span class="cs">${d.qual?'FIDCs e restritos liberados':'FIDCs restritos excluídos'}</span></div>
      <div><span class="ck">Reserva</span><span class="cv">${brl(d.reserva)}</span>
           <span class="cs">${state.meses} meses × ${brl(state.custo)}</span></div>
      <div><span class="ck">Carteira</span><span class="cv">${brl(Math.max(state.total-d.reserva,0))}</span>
           <span class="cs">Antes dos objetivos de curto prazo</span></div>
    </div>
    ${restricao ? `<div class="al info" style="margin-top:12px"><span class="ic">i</span><span>O perfil pontuou <b>${nomePerfil(d.perfil)}</b>, mas uma resposta específica travou a volatilidade em <b>N${d.teto}</b>. A carteira será mais defensiva do que o perfil sugere. Isso é intencional: a pergunta que trava vence a média.</span></div>` : ''}
    <div class="ed-actions">
      <button class="btn btn-p" id="q-aplicar">Aplicar critérios à carteira</button>
      <button class="btn" id="q-limpar">Limpar respostas</button>
    </div>
    <p class="note">O questionário não substitui o suitability da corretora. Ele traduz as respostas em filtros para este guia; a aderência regulatória continua sendo verificada no processo oficial.</p>`;

  document.getElementById('q-aplicar').onclick = ()=>{
    Object.assign(state, {perfil:d.perfil, teto:d.teto, liqMax:d.liqMax, qual:d.qual, resmodo:'meses'});
    syncRail(); render(); irPara('cart'); toast('Critérios aplicados à carteira.');
  };
  document.getElementById('q-limpar').onclick = ()=>{ state.q={}; renderDiag(); };
}

/* ---------------- objetivos ---------------- */
function renderObj(){
  const r = ULTIMO || calcular();
  const tot = state.total || 1;
  const somaB = state.objetivos.filter(o=>o.carve).reduce((a,b)=>a+(b.valor||0),0);
  const livre = Math.max(state.total - r.reserva - somaB, 0);

  document.getElementById('obj-bar').innerHTML = `
    <div class="bar">
      <div class="seg-r" style="width:${r.reserva/tot*100}%" title="Reserva — ${brl(r.reserva)}"></div>
      ${state.objetivos.filter(o=>o.carve).map((o,i)=>
        `<div class="seg-c" style="width:${(o.valor||0)/tot*100}%;background:var(--brass-lt);opacity:${1-i*0.13}" title="${esc(o.nome)} — ${brl(o.valor||0)}"></div>`).join('')}
      <div class="seg-c" style="width:${livre/tot*100}%;background:var(--c-pos)" title="Carteira de longo prazo"></div>
    </div>
    <div class="legend">
      <span class="lg"><i style="background:repeating-linear-gradient(45deg,var(--c-res) 0 3px,#9BA3AA 3px 6px)"></i>Reserva <b>${brl(r.reserva)}</b></span>
      <span class="lg"><i style="background:var(--brass-lt)"></i>Objetivos <b>${brl(somaB)}</b></span>
      <span class="lg"><i style="background:var(--c-pos)"></i>Carteira <b>${brl(livre)}</b></span>
    </div>`;

  const linhas = state.objetivos.map((o,ix)=>{
    const reg = regraObjetivo(o.anos||0);
    return `<tr>
      <td><input value="${esc(o.nome)}" data-o="${ix}" data-k="nome" placeholder="Ex.: comprar um carro"></td>
      <td><input class="money" value="${fmtMoney(o.valor||0)}" data-o="${ix}" data-k="valor"></td>
      <td><input type="number" min="0" step="0.5" value="${o.anos||0}" data-o="${ix}" data-k="anos"></td>
      <td><span class="pill">${reg.nome}</span></td>
      <td><span class="pill">N${reg.teto}</span></td>
      <td><span class="pill">${rotuloLiq(Math.min(reg.liq, Math.max(Math.round((o.anos||0)*365),1)))}</span></td>
      <td class="chk"><input type="checkbox" data-o="${ix}" data-k="carve" ${o.carve?'checked':''}></td>
      <td><button class="btn" data-delo="${ix}" style="padding:2px 8px">×</button></td>
    </tr>`;
  }).join('');
  document.getElementById('obj-body').innerHTML = linhas ||
    `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:22px">Nenhum objetivo cadastrado. O patrimônio inteiro, menos a reserva, vai para a carteira de longo prazo.</td></tr>`;

  document.getElementById('obj-sug').innerHTML = state.objetivos.filter(o=>o.carve && o.valor>0).map(o=>{
    const s = sugerirObjetivo(o);
    if(!s.linhas.length) return `<div class="al err"><span class="ic">!!</span><span>
      <b>${esc(o.nome)}</b> — nenhum produto do cadastro atende a ${o.anos} ano(s) com volatilidade até N${s.regra.teto} e liquidez compatível. Relaxe o prazo ou cadastre um produto adequado.</span></div>`;
    return `<div class="sug">
      <div class="sug-h"><b>${esc(o.nome)}</b> · ${brl(o.valor)} · ${o.anos} ano(s)
        <span class="pill">${s.regra.nome}</span></div>
      <div class="sug-d">Horizonte de ${o.anos} ano(s) ⇒ volatilidade máxima <b>${s.regra.teto}</b> (${rotuloVol(s.regra.teto).toLowerCase()}) e liquidez até <b>${rotuloLiq(s.regra.liq)}</b>. Este bolsão não entra na carteira de perfil nem na reserva.</div>
      <table class="mini"><tbody>${s.linhas.map(l=>`<tr>
        <td>${esc(l.p.nome)}<span class="ve">${l.p.ve}</span>${l.p.ver?`<span class="flag" title="${esc(l.p.ver)}">!</span>`:''}</td>
        <td>${rotuloLiq(l.p.liq)}</td><td>${pc(l.w)}</td><td>${brlc(l.valor)}</td></tr>`).join('')}</tbody></table>
    </div>`;
  }).join('') || '';

  const el = document.getElementById('obj-body');
  el.oninput = e=>{
    const t=e.target, ix=+t.dataset.o, k=t.dataset.k; if(isNaN(ix)||!k) return;
    if(k==='carve') state.objetivos[ix].carve = t.checked;
    else if(k==='valor') state.objetivos[ix].valor = parseMoney(t.value);
    else if(k==='anos') state.objetivos[ix].anos = +t.value||0;
    else state.objetivos[ix][k] = t.value;
    render();
  };
  el.onclick = e=>{
    const d = e.target.dataset.delo; if(d===undefined) return;
    state.objetivos.splice(+d,1); render();
  };
}

/* ---------------- composição ---------------- */
function pesosPerfil(p){
  const its = PROD.filter(x=>(x.w[p]||0)>0);
  const s = its.reduce((a,b)=>a+b.w[p],0) || 1;
  return {its, s};
}
function renderComp(){
  /* toggles de veículo */
  document.getElementById('ve-toggles').innerHTML = VEICULOS.map(v=>{
    const n = PROD.filter(p=>p.ve===v).length;
    return `<label class="vetog ${state.ve[v]?'on':''}">
      <input type="checkbox" data-ve="${esc(v)}" ${state.ve[v]?'checked':''}>
      <span class="vn">${v}</span><span class="vc">${n} produto${n===1?'':'s'}</span></label>`;
  }).join('');
  document.getElementById('ve-toggles').onchange = e=>{
    const v = e.target.dataset.ve; if(!v) return;
    state.ve[v] = e.target.checked; render();
  };

  /* tabelas por perfil, no formato da planilha */
  const RV_CLASSES = ['rvb','rval','rvg','fli']; // B-33: "Renda Variável" agregada — RV Brasil + Am. Latina + Global + Fundos Listados (FIIs, incluídos por decisão do Alexandre em 21/07). ALT (Alternativos) fica de fora.
  document.getElementById('comp-perfis').innerHTML = ['C','M','A'].map(p=>{
    const {its, s} = pesosPerfil(p);
    const porVe = {}, porSub = {C:0,M:0,A:0};
    let rvTotal = 0;
    its.forEach(i=>{
      const g = GRUPO_VE(i.ve);
      porVe[g] = (porVe[g]||0) + i.w[p]/s;
      porSub[i.sub||'C'] += i.w[p]/s;
      if(RV_CLASSES.includes(i.cl)) rvTotal += i.w[p]/s;
    });
    const cor = {C:'#DDEBDD', M:'#F6E2A8', A:'#C0392B'};
    return `<div class="cperfil">
      <div class="cph">${nomePerfil(p)}</div>
      <table class="mini"><tbody>
        ${Object.entries(porVe).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
          `<tr><td>${k==='Fundo'?'Fundos de Investimentos':k}</td><td>${pc2(v)}</td></tr>`).join('')}
        <tr class="sep"><td colspan="2"></td></tr>
        <tr class="rv-total" style="font-weight:600"><td>Renda Variável (total)</td><td>${pc2(rvTotal)}</td></tr>
        <tr class="sep"><td colspan="2"></td></tr>
        ${['C','M','A'].map(k=>
          `<tr class="sub" style="background:${cor[k]};${k==='A'?'color:#fff':''}">
             <td>${k}</td><td>${pc2(porSub[k])}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  }).join('');

  /* composição realizada do cliente */
  const r = ULTIMO || calcular();
  const inv = r.investivel || 1;
  const g = (fn) => {
    const m = new Map();
    r.vivos.forEach(i=>m.set(fn(i), (m.get(fn(i))||0)+i.valor));
    const arr=[...m.entries()].sort((a,b)=>b[1]-a[1]);
    const max = arr.length?arr[0][1]:1;
    return arr.map(([k,v])=>`<div class="crow"><div class="lbl">${k}</div><div class="val">${pc(v/inv)}</div>
      <div class="track"><div class="fill" style="width:${v/max*100}%"></div></div></div>`).join('')
      || '<div class="crow"><div class="lbl">Sem posições</div><div class="val">—</div></div>';
  };
  document.getElementById('comp-real-ve').innerHTML  = g(i=>GRUPO_VE(i.ve)==='Fundo'?'Fundos de Investimentos':i.ve);
  document.getElementById('comp-real-sub').innerHTML = g(i=>SUBS[i.sub||'C']);
  const rvValor = r.vivos.filter(i=>RV_CLASSES.includes(i.cl)).reduce((a,b)=>a+b.valor,0);
  document.getElementById('comp-real-rv').innerHTML = `<div class="crow"><div class="lbl">Renda Variável (RV Brasil + América Latina + Global + FIIs)</div><div class="val">${pc(rvValor/inv)}</div>
    <div class="track"><div class="fill" style="width:${inv>0?Math.min(rvValor/inv*100,100):0}%"></div></div></div>`;

  /* knobs */
  const set = (id,v)=>{ const e=document.getElementById(id); if(e && e.value!=String(v)) e.value=v; };
  set('k-cap', state.capFundo); set('k-fgc', fmtMoney(state.fgcLim)); set('k-cdi', state.cdiProj);
  document.getElementById('k-fidc').checked = state.capFidc;
  document.getElementById('k-prev').checked = state.capPrev;
  document.querySelectorAll('#s-repos button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.v===state.repos)));
}

/* ---------------- apresentação técnico-comercial ---------------- */
function chartSVG(serie, w=680, h=280){
  const pad = {l:52,r:14,t:14,b:34};
  const maxV = Math.max(...serie.map(p=>Math.max(p.fundo,p.etf)));
  const minV = serie[0].etf;
  const tMax = serie[serie.length-1].t;
  const X = t => pad.l + (t/tMax)*(w-pad.l-pad.r);
  const Y = v => h-pad.b - ((v-minV)/((maxV-minV)||1))*(h-pad.t-pad.b);
  const linha = k => serie.map(p=>`${X(p.t).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ');
  const ticksY = 5, ticksX = Math.min(Math.round(tMax),6) || 1;
  let g = '';
  for(let i=0;i<=ticksY;i++){
    const v = minV + (maxV-minV)*i/ticksY, y = Y(v);
    g += `<line x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}" stroke="var(--rule2)"/>
          <text x="${pad.l-8}" y="${y+3.5}" text-anchor="end" class="ax">${(v/serie[0].etf*100-100).toFixed(0)}%</text>`;
  }
  for(let i=0;i<=ticksX;i++){
    const t = tMax*i/ticksX, x = X(t);
    g += `<text x="${x}" y="${h-pad.b+16}" text-anchor="middle" class="ax">${t.toFixed(t<1?1:0)}a</text>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Comparativo de acumulação com e sem come-cotas">
    ${g}
    <polyline points="${linha('etf')}"   fill="none" stroke="var(--brass)" stroke-width="2.4"/>
    <polyline points="${linha('fundo')}" fill="none" stroke="var(--c-pos)" stroke-width="2.4" stroke-dasharray="0"/>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h-pad.b}" stroke="var(--rule)"/>
    <line x1="${pad.l}" x2="${w-pad.r}" y1="${h-pad.b}" y2="${h-pad.b}" stroke="var(--rule)"/>
  </svg>`;
}

function renderBandas(){
  const r = ULTIMO || calcular();
  const inv = r.investivel || 1;
  const perfil = state.perfil;
  document.getElementById('bandas-perfil-nome').textContent = nomePerfil(perfil);

  const pesos = {};
  r.vivos.forEach(i => { const g = grupoDe(i.cl); pesos[g] = (pesos[g]||0) + i.valor; });

  const ordem = CLASSES.filter(c=>c.id!=='rval'); // rval é mostrado junto de rvg (D-23)
  const linhas = ordem.map(c => {
    const g = c.id;
    const valorCliente = pesos[g] || 0;
    const pctCliente = valorCliente / inv;
    const teto = CAP_CLASSE[perfil]?.[g];
    const piso = CAP_CLASSE_MIN[perfil]?.[g];
    return {c, pctCliente, teto, piso, temPeso: valorCliente > 0.001};
  }).filter(l => l.temPeso || l.teto!==undefined);

  document.getElementById('bandas-lista').innerHTML = linhas.map(l => {
    const semTeto = l.teto===undefined;
    const escalaMax = Math.max(l.teto||0, l.pctCliente*100, l.piso||0) * 1.2 || 10;
    const pctPos = v => Math.min(v/escalaMax*100, 100);
    const nomeExibido = l.c.id==='rvg' ? 'RV Global (inclui RV América Latina)' : l.c.nome;
    const fora = !semTeto && l.pctCliente*100 > l.teto + 0.05;
    return `<div class="banda-row">
      <div class="banda-nome">${nomeExibido}${semTeto?'<span class="banda-livre">livre de risco</span>':''}</div>
      <div class="banda-track">
        ${l.piso!==undefined && l.teto!==undefined ? `<div class="banda-faixa" style="left:${pctPos(l.piso)}%;width:${pctPos(l.teto)-pctPos(l.piso)}%"></div>` :
          (l.teto!==undefined ? `<div class="banda-faixa" style="left:0%;width:${pctPos(l.teto)}%"></div>` : '')}
        ${l.teto!==undefined ? `<div class="banda-teto" style="left:${pctPos(l.teto)}%"></div>` : ''}
        <div class="banda-cliente ${fora?'fora':''}" style="left:${pctPos(l.pctCliente*100)}%" title="${nomeExibido}: ${pc(l.pctCliente)} da carteira"></div>
      </div>
      <div class="banda-vals">
        <span class="cli">${pc(l.pctCliente)}</span>
        <span class="lim">${l.piso!==undefined?pc(l.piso/100)+' – ':''}${semTeto?'sem teto':pc(l.teto/100)}</span>
      </div>
    </div>`;
  }).join('') || '<p class="note">Monte a carteira na aba Carteira para ver a aderência às bandas.</p>';
}

function renderApres(){
  const r = ULTIMO || calcular();
  const inv = r.investivel || 1;
  const V0 = state.simVal, anos = state.simAnos, cdi = state.cdiProj/100;
  const s = simComeCotas(V0, cdi, anos, state.aliqEtf);
  const dif = s.etfLiquido - s.fundoLiquido;

  document.getElementById('sim-chart').innerHTML = chartSVG(s.serie);
  document.getElementById('sim-num').innerHTML = [
    ['Sem come-cotas, líquido', brl(s.etfLiquido), 'brass'],
    ['Com come-cotas, líquido', brl(s.fundoLiquido), ''],
    ['Diferença ao fim de '+anos+' anos', brl(dif), 'brass'],
    ['Em % sobre o valor final', pc(dif/s.fundoLiquido), ''],
  ].map(([k,v,c])=>`<div class="kpi"><div class="k">${k}</div><div class="v ${v.length>11?'sm':''}" ${c?'style="color:var(--brass)"':''}>${v}</div></div>`).join('');

  document.getElementById('sim-tw').innerHTML = `
    <p>O fundo com come-cotas pagou <b>${brl(s.impostoComeCotas)}</b> de imposto no período.
    O produto sem come-cotas pagou <b>${brl(s.impostoEtf)}</b> — <b>mais</b> imposto — e ainda assim
    terminou com <b>${brl(dif)}</b> a mais no bolso do cliente.</p>
    <p>A diferença não está na alíquota. Está em <b>quando</b> o imposto sai. Cada parcela antecipada
    em maio e novembro deixa de render pelos anos seguintes. É juro composto que o cliente não recebe.</p>`;

  /* métricas da carteira montada */
  const emissores = new Set(r.vivos.filter(i=>i.emissor).map(i=>i.emissor));
  const fgcCob = r.vivos.filter(i=>ehBancarioFgc(i)).reduce((a,b)=>a+b.valor,0);
  const isento = r.vivos.filter(i=>i.isento).reduce((a,b)=>a+b.valor,0);
  const mtm = r.vivos.filter(i=>i.vol10>2).reduce((a,b)=>a+b.valor,0);
  const rv  = r.vivos.filter(i=>i.vol10>=7).reduce((a,b)=>a+b.valor,0);
  const liqPond = r.vivos.reduce((a,b)=>a+b.w*Math.min(b.liq,365),0);
  const maior = r.vivos.length ? Math.max(...r.vivos.map(i=>i.w)) : 0;
  const top5 = [...r.vivos].sort((a,b)=>b.w-a.w).slice(0,5).reduce((a,b)=>a+b.w,0);
  const hhi = r.vivos.reduce((a,b)=>a+b.w*b.w,0);

  document.getElementById('ap-kpis').innerHTML = [
    ['Linhas na carteira', String(r.vivos.length)],
    ['Emissores distintos', String(emissores.size || '—')],
    ['Maior posição individual', pc(maior)],
    ['Concentração top 5', pc(top5)],
    ['Equivalente a', (hhi>0? (1/hhi).toFixed(1):'—')+' posições iguais'],
    ['Liquidez média ponderada', 'D+'+liqPond.toFixed(0)],
    ['Coberto pelo FGC', pc(fgcCob/inv)],
    ['Isento de IR', pc(isento/inv)],
    ['Com marcação a mercado', pc(mtm/inv)],
    ['Renda variável e alternativos', pc(rv/inv)],
  ].map(([k,v])=>`<div class="kpi"><div class="k">${k}</div><div class="v ${v.length>11?'sm':''}">${v}</div></div>`).join('');

  /* argumentos derivados da própria carteira, não genéricos */
  const args = [];
  if(r.vivos.length >= 8) args.push([`${r.vivos.length} linhas, nenhuma acima de ${pc(maior)}`,
    `A maior posição da carteira é ${pc(maior)}. O equivalente em posições iguais é ${(1/hhi).toFixed(1)} — quanto maior esse número, menos o resultado depende de um único acerto.`]);
  const nf = r.vivos.filter(i=>i.ve==='Fundo'||i.ve==='FIDC').length;
  if(nf) args.push([`Teto de ${state.capFundo}% por fundo`,
    `Nenhum dos ${nf} fundos da carteira passa de ${state.capFundo}%. Se um gestor errar, o dano é limitado por construção, não por sorte.`]);
  if(fgcCob>0) args.push(['Cobertura do FGC respeitada na projeção',
    `Os títulos bancários foram dimensionados para que o valor <b>projetado no vencimento</b> — e não o valor aplicado hoje — caiba dentro de ${brl(state.fgcLim)} por grupo emissor. É o erro mais comum: aplicar R$ 250 mil e resgatar R$ 320 mil, com R$ 70 mil descobertos.`]);
  if(isento>0) args.push([`${pc(isento/inv)} da carteira isenta de IR`,
    `Produtos incentivados e LCI/LCA não pagam imposto de renda para pessoa física. Confirme cada um: a isenção está marcada no cadastro, não verificada por mim.`]);
  if(mtm/inv < 0.4) args.push([`Só ${pc(mtm/inv)} sofre marcação a mercado`,
    `O resto da carteira não oscila com a curva de juros. O extrato do cliente não vai contar uma história de queda que a carteira não viveu.`]);
  document.getElementById('ap-args').innerHTML = args.map(([t,d])=>
    `<div class="argx"><div class="argt">${t}</div><div class="argd">${d}</div></div>`).join('')
    || '<p class="note">Monte a carteira na aba Carteira para gerar os argumentos.</p>';
  renderBandas();
}

/* ---------------- editor ---------------- */
function renderEditor(){
  document.getElementById('ed-body').innerHTML = PROD.map((p,ix)=>`
    <tr>
      <td><input value="${esc(p.nome)}" data-i="${ix}" data-k="nome">${p.ver?`<span class="flag" title="${esc(p.ver)}">!</span>`:''}</td>
      <td><select data-i="${ix}" data-k="cl">${CLASSES.map(c=>`<option value="${c.id}" ${c.id===p.cl?'selected':''}>${c.nome}</option>`).join('')}</select></td>
      <td><select data-i="${ix}" data-k="ve">${VEICULOS.map(v=>`<option ${v===p.ve?'selected':''}>${v}</option>`).join('')}</select></td>
      <td><input type="number" min="0" max="10" step="0.1" value="${p.vol10}" data-i="${ix}" data-k="vol10" style="max-width:56px"></td>
      <td><span class="pill" style="${p.volFonte==='provisorio'?'background:var(--warn-bg);color:var(--warn)':''}">${p.volFonte||'—'}</span></td>
      <td><select data-i="${ix}" data-k="sub">${['C','M','A'].map(k=>`<option value="${k}" ${k===(p.sub||'C')?'selected':''}>${k}</option>`).join('')}</select></td>
      <td><input type="number" min="0" step="1" value="${p.liq??0}" data-i="${ix}" data-k="liq"></td>
      <td><input value="${esc(p.emissor||'')}" data-i="${ix}" data-k="emissor" placeholder="—" style="min-width:88px"></td>
      <td><input type="number" min="0" step="1" value="${p.pctCDI??''}" data-i="${ix}" data-k="pctCDI" placeholder="—"></td>
      <td><input type="number" min="0" step="0.5" value="${p.prazoAnos??''}" data-i="${ix}" data-k="prazoAnos" placeholder="—"></td>
      <td class="chk"><input type="checkbox" data-i="${ix}" data-k="fgc" ${p.fgc?'checked':''}></td>
      <td class="chk"><input type="checkbox" data-i="${ix}" data-k="isento" ${p.isento?'checked':''}></td>
      <td class="chk"><input type="checkbox" data-i="${ix}" data-k="qual" ${p.qual?'checked':''}></td>
      <td><input type="number" min="0" step="100" value="${p.min||0}" data-i="${ix}" data-k="min"></td>
      <td><input type="number" min="0" step="0.25" value="${p.w.C}" data-i="${ix}" data-k="wC"></td>
      <td><input type="number" min="0" step="0.25" value="${p.w.M}" data-i="${ix}" data-k="wM"></td>
      <td><input type="number" min="0" step="0.25" value="${p.w.A}" data-i="${ix}" data-k="wA"></td>
      <td><button class="btn" data-del="${ix}" style="padding:2px 8px">×</button></td>
    </tr>`).join('') + `<tr><td colspan="14" style="text-align:right;font-weight:700">Soma dos pesos</td>
      ${['C','M','A'].map(k=>{const s=PROD.reduce((a,b)=>a+(+b.w[k]||0),0);
        return `<td style="font-family:var(--mono);text-align:right;font-weight:700;color:${Math.abs(s-100)<0.01?'var(--ink)':'var(--danger)'}">${s.toLocaleString('pt-BR',{maximumFractionDigits:2})}</td>`;}).join('')}<td></td></tr>`;

  const b = document.getElementById('ed-body');
  b.oninput = e=>{
    const t=e.target, ix=+t.dataset.i, k=t.dataset.k; if(isNaN(ix)||!k) return;
    if(['qual','fgc','isento'].includes(k)) PROD[ix][k] = t.checked;
    else if(k[0]==='w' && k.length===2) PROD[ix].w[k[1]] = +t.value||0;
    else if(['vol10','min','liq'].includes(k)) PROD[ix][k] = +t.value||0;
    else if(['pctCDI','prazoAnos'].includes(k)) PROD[ix][k] = t.value===''?undefined:(+t.value||0);
    else PROD[ix][k] = t.value;
    render();
  };
  b.onchange = b.oninput;
  b.onclick = e=>{
    const d=e.target.dataset.del; if(d===undefined) return;
    PROD.splice(+d,1); renderEditor(); render();
  };
}

function syncResProd(){
  const sel = document.getElementById('i-resprod');
  const cands = PROD.filter(p=>p.vol10<=2 && p.liq<=30);
  sel.innerHTML = cands.map(p=>`<option value="${p.id}">${esc(p.nome.replace(/ — Reserva de (Emergência|Estratégica)$/,''))} · ${rotuloLiq(p.liq)}</option>`).join('');
  if(cands.some(p=>p.id===state.resprod)) sel.value = state.resprod;
  else if(cands.length){ state.resprod = cands[0].id; sel.value = state.resprod; }
}

/* ---------------- carteira ---------------- */
let ULTIMO = null;

function render(){
  const r = calcular(); ULTIMO = r;
  const {reserva, investivel, vivos, alerts, somaBolsoes} = r;
  const tot = state.total || 1;
  const inv = investivel || 1;

  const mtm = vivos.filter(i=>i.vol10>2).reduce((a,b)=>a+b.valor,0);
  const rv  = vivos.filter(i=>i.vol10>=7).reduce((a,b)=>a+b.valor,0);
  document.getElementById('kpis').innerHTML = [
    ['Patrimônio', brl(state.total)],
    ['Reserva', brl(reserva)],
    ['Objetivos', brl(somaBolsoes)],
    ['Carteira', brl(investivel)],
    ['Linhas', String(vivos.length)],
    ['Com marcação a mercado', pc(mtm/inv)],
    ['Renda variável e alternativos', pc(rv/inv)],
  ].map(([k,v])=>`<div class="kpi"><div class="k">${k}</div><div class="v ${v.length>11?'sm':''}">${v}</div></div>`).join('');

  const porClasse = CLASSES.map(c=>({...c, valor: vivos.filter(i=>i.cl===c.id).reduce((a,b)=>a+b.valor,0)})).filter(c=>c.valor>0.005);
  document.getElementById('bar-tot').textContent =
    `reserva ${pc(reserva/tot)} · objetivos ${pc(somaBolsoes/tot)} · carteira ${pc(investivel/tot)}`;
  document.getElementById('bar').innerHTML =
    (reserva>0?`<div class="seg-r" style="width:${reserva/tot*100}%" title="Reserva — ${brl(reserva)}"></div>`:'') +
    (somaBolsoes>0?`<div class="seg-c" style="width:${somaBolsoes/tot*100}%;background:var(--brass-lt)" title="Objetivos — ${brl(somaBolsoes)}"></div>`:'') +
    porClasse.map(c=>`<div class="seg-c" style="width:${c.valor/tot*100}%;background:var(${c.cor})" title="${c.nome} — ${brl(c.valor)}"></div>`).join('');
  document.getElementById('legend').innerHTML =
    (reserva>0?`<span class="lg"><i style="background:repeating-linear-gradient(45deg,var(--c-res) 0 3px,#9BA3AA 3px 6px)"></i>Reserva <b>${pc(reserva/tot)}</b></span>`:'') +
    (somaBolsoes>0?`<span class="lg"><i style="background:var(--brass-lt)"></i>Objetivos <b>${pc(somaBolsoes/tot)}</b></span>`:'') +
    porClasse.map(c=>`<span class="lg"><i style="background:var(${c.cor})"></i>${c.nome} <b>${pc(c.valor/tot)}</b></span>`).join('');

  document.getElementById('alerts').innerHTML = alerts.map(([t,m])=>{
    const ic = t==='err'?'!!':(t==='warn'?'!':'i');
    return `<div class="al ${t}"><span class="ic">${ic}</span><span>${m}</span></div>`;
  }).join('');

  const rp = PROD.find(x=>x.id===state.resprod) || {nome:'Tesouro Selic', liq:1};
  let html = '';
  if(reserva>0){
    html += `<tr class="cls" style="--cc:var(--c-res)"><td>Reserva de emergência</td><td>—</td><td>${pc(reserva/tot)}</td><td>${brlc(reserva)}</td></tr>
      <tr class="item"><td>${esc(rp.nome.replace(/ — Reserva de Emergência$/,''))}<span class="tag-res">${rotuloLiq(rp.liq)}</span></td>
      <td>—</td><td>${pc(reserva/tot)}</td><td>${brlc(reserva)}</td></tr>`;
  }
  for(const o of state.objetivos.filter(o=>o.carve && o.valor>0)){
    const s = sugerirObjetivo(o);
    html += `<tr class="cls" style="--cc:var(--brass-lt)"><td>${esc(o.nome)} · ${o.anos} ano(s)</td><td>—</td><td>${pc(o.valor/tot)}</td><td>${brlc(o.valor)}</td></tr>`;
    for(const l of s.linhas)
      html += `<tr class="item"><td>${esc(l.p.nome)}<span class="ve">${l.p.ve}</span></td><td>—</td><td>${pc(l.valor/tot)}</td><td>${brlc(l.valor)}</td></tr>`;
  }
  for(const c of CLASSES){
    const its = vivos.filter(i=>i.cl===c.id).sort((a,b)=>b.valor-a.valor);
    if(!its.length) continue;
    const sv = its.reduce((a,b)=>a+b.valor,0);
    html += `<tr class="cls" style="--cc:var(${c.cor})"><td>${c.nome}</td><td>${pc(sv/inv)}</td><td>${pc(sv/tot)}</td><td>${brlc(sv)}</td></tr>`;
    for(const i of its){
      const f = i.ver ? `<span class="flag" title="${esc(i.ver)}">!</span>` : '';
      const est = /Reserva Estratégica/.test(i.nome) ? '<span class="tag-res">estratégica</span>' : '';
      html += `<tr class="item"><td>${esc(i.nome.replace(/ — Reserva Estratégica$/,''))}${est}<span class="ve">${i.ve}</span><span class="ve">${rotuloLiq(i.liq)}</span>${f}</td>
        <td>${pc(i.valor/inv)}</td><td>${pc(i.valor/tot)}</td><td>${brlc(i.valor)}</td></tr>`;
    }
  }
  if(r.naoAlocado>0){
    html += `<tr class="cls" style="--cc:var(--danger)"><td>Não alocado</td><td>${pc(1)}</td><td>${pc(r.naoAlocado/tot)}</td><td>${brlc(r.naoAlocado)}</td></tr>
      <tr class="item"><td>Nenhum produto compatível com os filtros atuais</td><td>—</td><td>${pc(r.naoAlocado/tot)}</td><td>${brlc(r.naoAlocado)}</td></tr>`;
  }
  const somaTudo = investivel + reserva + somaBolsoes;
  html += `<tr class="tot"><td>Total</td><td>100,0%</td><td>${pc(somaTudo/tot)}</td><td>${brlc(somaTudo)}</td></tr>`;
  document.getElementById('tbody').innerHTML = html;

  renderObj(); renderComp(); renderApres();
}

/* ---------------- navegação ---------------- */
function irPara(t){
  document.querySelectorAll('section[data-tab]').forEach(s=>s.hidden = s.dataset.tab!==t);
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.t===t)));
  try{ window.scrollTo({top:0, behavior:'instant'}); }catch(e){}
}
document.querySelector('.tabs').onclick = e=>{
  const b = e.target.closest('button[data-t]'); if(b) irPara(b.dataset.t);
};

/* ---------------- bindings ---------------- */
function bindMoney(id, key, after){
  const el = document.getElementById(id); if(!el) return;
  el.addEventListener('input', ()=>{ state[key]=parseMoney(el.value); (after||render)(); });
  el.addEventListener('blur',  ()=>{ el.value=fmtMoney(state[key]); (after||render)(); });
}
function segBind(id, key, cast=(v=>v)){
  const el = document.getElementById(id); if(!el) return;
  el.onclick = e=>{ const b=e.target.closest('button[data-v]'); if(!b) return;
    [...el.querySelectorAll('button')].forEach(x=>x.setAttribute('aria-pressed', String(x===b)));
    state[key]=cast(b.dataset.v); afterSeg(key); render(); };
}
function afterSeg(key){
  if(key==='resmodo'){
    document.getElementById('box-meses').hidden = state.resmodo!=='meses';
    document.getElementById('box-valor').hidden = state.resmodo!=='valor';
  }
}
function syncRail(){
  document.getElementById('i-nome').value = state.nome;
  document.getElementById('i-total').value = fmtMoney(state.total);
  document.getElementById('i-custo').value = fmtMoney(state.custo);
  document.getElementById('i-meses').value = state.meses;
  document.getElementById('i-resval').value = fmtMoney(state.resval);
  document.getElementById('i-piso').value = fmtMoney(state.piso);
  document.getElementById('i-liq').value = String(state.liqMax);
  ['perfil','resmodo'].forEach(k=>document.querySelectorAll(`#s-${k} button`).forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.v===state[k]))));
  document.querySelectorAll('#s-vol button').forEach(b=>b.setAttribute('aria-pressed', String(+b.dataset.v===state.teto)));
  document.getElementById('i-teto').value = state.teto;
  pintaTeto();
  document.querySelectorAll('#s-qual button').forEach(b=>b.setAttribute('aria-pressed', String((b.dataset.v==='1')===state.qual)));
  afterSeg('resmodo');
}

segBind('s-perfil','perfil');
segBind('s-resmodo','resmodo');
segBind('s-vol','teto', v=>+v);
document.getElementById('s-vol').addEventListener('click', ()=>{
  document.getElementById('i-teto').value = state.teto; pintaTeto();
});
document.getElementById('i-teto').addEventListener('input', e=>{
  state.teto = Math.max(0, Math.min(10, +e.target.value || 0));
  document.querySelectorAll('#s-vol button').forEach(b=>b.setAttribute('aria-pressed', String(+b.dataset.v===state.teto)));
  pintaTeto(); render();
});
function pintaTeto(){ const el=document.getElementById('i-teto-nome'); if(el) el.textContent = rotuloVol(state.teto); }
segBind('s-qual','qual', v=>v==='1');
segBind('s-repos','repos');

bindMoney('i-total','total'); bindMoney('i-custo','custo');
bindMoney('i-resval','resval'); bindMoney('i-piso','piso');
document.getElementById('i-meses').addEventListener('input', e=>{ state.meses=+e.target.value||0; render(); });
document.getElementById('i-nome').addEventListener('input', e=>{ state.nome=e.target.value; });
document.getElementById('i-resprod').addEventListener('change', e=>{ state.resprod=e.target.value; render(); });
document.getElementById('i-liq').addEventListener('change', e=>{ state.liqMax=+e.target.value; render(); });

document.getElementById('k-cap').addEventListener('input', e=>{ state.capFundo=+e.target.value||0; render(); });
document.getElementById('k-cdi').addEventListener('input', e=>{ state.cdiProj=+e.target.value||0; render(); });
bindMoney('k-fgc','fgcLim');
document.getElementById('k-fidc').addEventListener('change', e=>{ state.capFidc=e.target.checked; render(); });
document.getElementById('k-prev').addEventListener('change', e=>{ state.capPrev=e.target.checked; render(); });

document.getElementById('obj-add').onclick = ()=>{
  state.objetivos.push({id:uid(), nome:'Novo objetivo', valor:50000, anos:1, carve:true});
  render();
};
document.getElementById('sim-val').addEventListener('input', e=>{ state.simVal=parseMoney(e.target.value); renderApres(); });
document.getElementById('sim-anos').addEventListener('input', e=>{ state.simAnos=+e.target.value||1; renderApres(); });
document.getElementById('sim-aliq').addEventListener('input', e=>{ state.aliqEtf=+e.target.value||0; renderApres(); });
document.getElementById('sim-cdi').addEventListener('input', e=>{ state.cdiProj=+e.target.value||0; render(); });

document.getElementById('btn-add').onclick = ()=>{
  PROD.push({id:'novo'+Date.now(), nome:'Novo produto', cl:'pos', ve:'Renda Fixa Bancária', vol10:0, volFonte:'provisorio', sub:'C', liq:0, qual:false, min:0, w:{C:0,M:0,A:0}});
  renderEditor(); syncResProd(); render();
};
document.getElementById('btn-reset').onclick = ()=>{
  PROD = JSON.parse(JSON.stringify(PADRAO)); renderEditor(); syncResProd(); render(); toast('Cadastro original restaurado.');
};
document.getElementById('btn-exp').onclick = ()=>{
  baixar('guia-alocacao-config.json', JSON.stringify({versao:2, atualizado:new Date().toISOString().slice(0,10), produtos:PROD, parametros:{capFundo:state.capFundo, capFidc:state.capFidc, capPrev:state.capPrev, fgcLim:state.fgcLim, cdiProj:state.cdiProj, repos:state.repos}}, null, 2), 'application/json');
  toast('Configuração exportada.');
};
document.getElementById('btn-imp').onclick = ()=> document.getElementById('file-imp').click();
document.getElementById('file-imp').onchange = e=>{
  const f=e.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload = ()=>{ try{
      const j=JSON.parse(rd.result);
      if(!Array.isArray(j.produtos)) throw 0;
      PROD = j.produtos;
      if(j.parametros) Object.assign(state, j.parametros);
      renderEditor(); syncResProd(); syncRail(); render(); toast('Configuração importada.');
    }catch{ toast('Arquivo inválido. Esperado um JSON exportado por este guia.'); } };
  rd.readAsText(f); e.target.value='';
};

function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1900);}
