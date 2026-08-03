/* ---------------- aba 07 · Carteira Atual ---------------- */
let CLI_PARSED = null;      // resultado do parsePosicaoConsolidada
let CLI_MATCHES = [];       // [{item, match:{produto,conf,score}, produtoManual:id|null}]

document.getElementById('cli-analisar').onclick = ()=>{
  const texto = document.getElementById('cli-paste').value;
  if(!texto.trim()){ toast('Cole o texto da posição consolidada antes de analisar.'); return; }
  const r = parsePosicaoConsolidada(texto);
  CLI_PARSED = r;
  CLI_MATCHES = r.itens.filter(i=>i.tipo==='ativo').map(item => ({
    item, match: casarProduto(item, PROD), produtoManual: null,
  }));
  renderCliResultado();
  document.getElementById('cli-resultado').style.display = '';
  toast(`${r.itens.length} linha(s) identificada(s).`);
};
document.getElementById('cli-limpar').onclick = ()=>{
  document.getElementById('cli-paste').value=''; CLI_PARSED=null; CLI_MATCHES=[];
  document.getElementById('cli-resultado').style.display='none';
};

function renderCliResultado(){
  const r = CLI_PARSED;
  const ativos = r.itens.filter(i=>i.tipo==='ativo');
  const caixa = r.itens.filter(i=>i.tipo==='caixa').reduce((a,b)=>a+b.valor,0);
  const somaTudo = ativos.reduce((a,b)=>a+b.valor,0) + caixa;
  const totalPatrimonio = r.categorias.find(c=>c.tipo==='nivel1' && /patrim|total investido/i.test(c.nome));

  const mapeados = CLI_MATCHES.filter(m => m.produtoManual || (m.match.produto && m.match.conf!=='baixa' && m.match.conf!=='nenhuma')).length;
  document.getElementById('cli-kpis').innerHTML = [
    ['Linhas identificadas', String(ativos.length)],
    ['Casadas com o cadastro', String(mapeados)],
    ['Não mapeadas', String(ativos.length-mapeados)],
    ['Soma dos itens', brl(somaTudo)],
  ].map(([k,v])=>`<div class="kpi"><div class="k">${k}</div><div class="v ${v.length>11?'sm':''}">${v}</div></div>`).join('');

  const avisos = [];
  const somaCategorias = r.categorias.filter(c=>c.tipo==='nivel1').reduce((a,b)=>a+(b.total||0),0);
  if(Math.abs(somaCategorias - somaTudo) > 1){
    avisos.push(['warn', `A soma das categorias declaradas no extrato (${brl(somaCategorias)}) difere da soma dos itens lidos (${brl(somaTudo)}) em ${brl(Math.abs(somaCategorias-somaTudo))}. Diferenças pequenas costumam ser rendimento não quebrado por linha no extrato; diferenças grandes merecem conferência.`]);
  }
  if(r.avisos.length) avisos.push(['info', `${r.avisos.length} linha(s) do texto colado não foram reconhecidas e ficaram de fora (cabeçalhos e resumos do próprio extrato — normal).`]);
  document.getElementById('cli-avisos').innerHTML = avisos.map(([t,m])=>
    `<div class="al ${t}"><span class="ic">${t==='warn'?'!':'i'}</span><span>${m}</span></div>`).join('');

  document.getElementById('cli-body').innerHTML = CLI_MATCHES.map((cm,ix)=>{
    const m = cm.match;
    const corConf = {alta:'', media:'color:var(--brass)', baixa:'color:var(--warn)', nenhuma:'color:var(--danger)'}[m.conf];
    const opcoesManual = PROD.map(p=>`<option value="${p.id}" ${cm.produtoManual===p.id?'selected':''}>${esc(p.nome)}</option>`).join('');
    return `<tr>
      <td>${esc(cm.item.categoria)}${cm.item.subcategoria?' · '+esc(cm.item.subcategoria):''}</td>
      <td>${esc(cm.item.nome)}</td>
      <td style="text-align:right;font-family:var(--mono)">${brlc(cm.item.valor)}</td>
      <td>
        <select data-ix="${ix}" class="cli-sel">
          <option value="">— não mapeado —</option>
          ${opcoesManual}
        </select>
        <div style="font-size:10.5px;margin-top:2px;${corConf}">
          ${cm.produtoManual ? 'ajustado manualmente' : (m.produto ? `sugestão automática · confiança ${m.conf} (${(m.score*100).toFixed(0)}%)` : 'nenhum candidato razoável')}
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Nenhum item identificado.</td></tr>';

  // pré-seleciona o select com a sugestão automática (se houver e não tiver ajuste manual)
  document.querySelectorAll('.cli-sel').forEach(sel=>{
    const ix = +sel.dataset.ix, cm = CLI_MATCHES[ix];
    if(!cm.produtoManual && cm.match.produto && cm.match.conf!=='nenhuma') sel.value = cm.match.produto.id;
  });
  document.getElementById('cli-body').onchange = e=>{
    const sel = e.target.closest('.cli-sel'); if(!sel) return;
    CLI_MATCHES[+sel.dataset.ix].produtoManual = sel.value || null;
  };
}

document.querySelectorAll('#cli-s-perfil button').forEach(b=>{
  b.onclick = ()=>{ document.querySelectorAll('#cli-s-perfil button').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); };
});
document.querySelectorAll('#cli-r-perfil button').forEach(b=>{
  b.onclick = ()=>{ document.querySelectorAll('#cli-r-perfil button').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); };
});
document.querySelectorAll('#cli-r-modo button').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#cli-r-modo button').forEach(x=>x.setAttribute('aria-pressed', String(x===b)));
    document.getElementById('cli-r-titulo').textContent = b.dataset.m==='novo'
      ? 'Enquadramento de novo cliente — da carteira que ele traz até o alvo'
      : 'Revisão de carteira completa — pode sugerir venda';
  };
});
document.getElementById('cli-aporte').addEventListener('input', e=>{
  e.target.dataset.raw = parseMoney(e.target.value);
});
document.getElementById('cli-aporte').addEventListener('blur', e=>{
  e.target.value = fmtMoney(parseMoney(e.target.value));
});

document.getElementById('cli-calcular').onclick = ()=>{
  if(!CLI_MATCHES.length){ toast('Analise uma posição consolidada primeiro.'); return; }
  const itensMapeados = CLI_MATCHES.map(cm=>{
    const id = cm.produtoManual || (cm.match.conf!=='baixa' && cm.match.conf!=='nenhuma' ? cm.match.produto?.id : null);
    if(!id) return null;
    const p = PROD.find(x=>x.id===id);
    return p ? {produto:p, valor: cm.item.valor} : null;
  }).filter(Boolean);

  const aporte = parseMoney(document.getElementById('cli-aporte').value);
  const perfil = document.querySelector('#cli-s-perfil button[aria-pressed="true"]').dataset.v;
  const filtros = {teto:state.teto, qual:state.qual, liqMax:state.liqMax, liqMin:state.liqMin, ve:state.ve};
  const r = calcularAportadorEsporadico(itensMapeados, aporte, perfil, filtros, PROD);

  const el = document.getElementById('cli-aporte-resultado');
  if(r.naoAlocado){
    el.innerHTML = `<div class="al err"><span class="ic">!!</span><span>${r.aviso}</span></div>`;
    return;
  }
  const porClasse = {};
  r.linhas.forEach(l=>{ porClasse[l.produto.cl]=(porClasse[l.produto.cl]||0)+l.valor; });
  const linhasHtml = CLASSES.filter(c=>porClasse[c.id]>0.005).map(c=>{
    const itens = r.linhas.filter(l=>l.produto.cl===c.id).sort((a,b)=>b.valor-a.valor);
    return `<tr class="cls" style="--cc:var(${c.cor})"><td>${c.nome}</td><td colspan="2">${brl(itens.reduce((a,b)=>a+b.valor,0))}</td></tr>` +
      itens.map(l=>`<tr class="item"><td>${esc(l.produto.nome)}<span class="ve">${l.produto.ve}</span></td><td></td><td>${brlc(l.valor)}</td></tr>`).join('');
  }).join('');
  el.innerHTML = `
    <div class="kpis" style="margin-bottom:14px">
      <div class="kpi"><div class="k">Patrimônio mapeado</div><div class="v sm">${brl(r.patrimMapeado)}</div></div>
      <div class="kpi"><div class="k">Aporte</div><div class="v sm">${brl(aporte)}</div></div>
      <div class="kpi"><div class="k">Total após o aporte</div><div class="v sm">${brl(r.novoTotal)}</div></div>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th style="text-align:left">Onde entrar com o aporte</th><th></th><th>Valor</th></tr></thead>
      <tbody>${linhasHtml}</tbody></table></div>`;
};

/* ---------------- revisão de carteira completa (B-12 modo 2) ---------------- */
document.getElementById('cli-revisar').onclick = ()=>{
  if(!CLI_PARSED || !CLI_PARSED.itens.length){ toast('Analise uma posição consolidada primeiro.'); return; }
  const modo = document.querySelector('#cli-r-modo button[aria-pressed="true"]').dataset.m; // 'rev' | 'novo'
  const novo = modo==='novo';
  const perfil = document.querySelector('#cli-r-perfil button[aria-pressed="true"]').dataset.v;
  const filtros = {teto:state.teto, qual:state.qual, liqMax:state.liqMax, liqMin:state.liqMin, ve:state.ve};
  const classificados = CLI_PARSED.itens.map(i => classificarItemCarteira(i));
  const r = calcularRevisaoCompleta(classificados, perfil, filtros, PROD);
  const el = document.getElementById('cli-revisao-resultado');

  if(r.aviso){ el.innerHTML = `<div class="al err"><span class="ic">!!</span><span>${r.aviso}</span></div>`; return; }

  const nomeCls = cl => (CM[cl] && CM[cl].nome) || cl;
  const somaVendaBruta = r.vendas.reduce((a,b)=>a+b.valorBruto,0);
  const somaCusto = r.vendas.reduce((a,b)=>a+b.custo,0);
  // rótulos que mudam com o modo (mesma matemática — ver SPEC-carteira-atual.md §Modo 3)
  const L = novo ? {
    total:'Patrimônio que entra', vender:'A desmontar (bruto)', caixa:'Caixa p/ montar o alvo',
    tituloVendas:'Posições a desmontar para chegar ao alvo',
    semVenda:`Nada a desmontar: as classes ajustáveis da carteira que o cliente traz (Renda Fixa e Ações) já estão dentro do peso ideal do perfil ${perfil}, ou não há posição elegível (tudo em carência, fundos ou previdência).`,
    tituloAloc:'Composição-alvo a montar com o caixa',
  } : {
    total:'Patrimônio total', vender:'Sugerido vender (bruto)', caixa:'Caixa p/ rebalancear',
    tituloVendas:'Sugestões de venda',
    semVenda:`Nenhuma venda sugerida: as classes vendáveis da carteira (Renda Fixa e Ações) já estão dentro do peso ideal do perfil ${perfil}, ou não há posição elegível para venda (tudo em carência, fundos ou previdência).`,
    tituloAloc:'Para onde levar o caixa das vendas',
  };

  const kpis = `<div class="kpis" style="margin-bottom:14px">
    <div class="kpi"><div class="k">${L.total}</div><div class="v sm">${brl(r.patrimonioTotal)}</div></div>
    <div class="kpi"><div class="k">${L.vender}</div><div class="v sm">${brl(somaVendaBruta)}</div></div>
    <div class="kpi"><div class="k">Custo de saída (IR)</div><div class="v sm">${brl(somaCusto)}</div></div>
    <div class="kpi"><div class="k">${L.caixa}</div><div class="v sm">${brl(r.caixaRebalanceamento)}</div></div>
  </div>`;

  let vendasHtml;
  if(r.vendas.length){
    vendasHtml = `<div class="panel" style="margin-top:0"><h2>${L.tituloVendas}</h2>
      <div class="tbl-wrap"><table>
        <thead><tr><th style="text-align:left">Ativo</th><th style="text-align:left">Classe</th><th>${novo?'Desmontar':'Vender'} (bruto)</th><th>Custo (IR)</th><th>Líquido</th></tr></thead>
        <tbody>${r.vendas.sort((a,b)=>b.valorBruto-a.valorBruto).map(v=>`<tr>
          <td>${esc(v.item.nome)}<span class="ve">${esc(v.item.categoria)}</span>${v.item.ver?` <span class="flag" title="${esc(v.item.ver)}">!</span>`:''}</td>
          <td>${esc(nomeCls(v.classe))}</td>
          <td style="text-align:right;font-family:var(--mono)">${brlc(v.valorBruto)}</td>
          <td style="text-align:right;font-family:var(--mono)">${brlc(v.custo)}</td>
          <td style="text-align:right;font-family:var(--mono)">${brlc(v.liquidoRecebido)}</td>
        </tr>`).join('')}</tbody>
      </table></div></div>`;
  } else {
    vendasHtml = `<div class="al info"><span class="ic">i</span><span>${L.semVenda}</span></div>`;
  }

  const alocEntries = Object.entries(r.alocacao).filter(([,v])=>v>0.005).sort((a,b)=>b[1]-a[1]);
  let alocHtml = '';
  if(alocEntries.length){
    alocHtml = `<div class="panel" style="margin-top:16px"><h2>${L.tituloAloc}</h2>
      <div class="tbl-wrap"><table><thead><tr><th style="text-align:left">Classe em déficit</th><th>Valor a alocar</th></tr></thead>
        <tbody>${alocEntries.map(([cl,v])=>`<tr class="cls" style="--cc:var(${(CM[cl]&&CM[cl].cor)||'--rule'})"><td>${esc(nomeCls(cl))}</td><td style="text-align:right;font-family:var(--mono)">${brlc(v)}</td></tr>`).join('')}</tbody>
      </table></div></div>`;
  }

  const avisos = [];
  Object.entries(r.excessoResidual).forEach(([cl,v])=>{
    avisos.push(['warn', `A classe <b>${esc(nomeCls(cl))}</b> está acima do peso ideal em ${brl(v)}, mas não há posição elegível para venda que cubra esse excesso (o excedente está em fundo, previdência ou título ainda em carência). Ajuste manualmente ou aguarde a carência.`]);
  });
  if(r.naoRebalanceado > 0.01){
    avisos.push(['info', `Sobraram ${brl(r.naoRebalanceado)} de caixa após fechar todos os déficits das classes vendáveis. O valor fica líquido na conta — decida o destino (novo aporte em objetivo, reserva ou reforço de classe).`]);
  }
  const mantidos = classificados.filter(i=>i.tipo==='mantido');
  if(mantidos.length){
    avisos.push(['info', `${mantidos.length} posição(ões) em fundo/FIDC/previdência não entram na sugestão de venda — o extrato não traz o valor aportado, sem o qual não há custo de saída calculável. Elas contam no patrimônio total e no diagnóstico por classe, mas ficam mantidas.`]);
  }
  const avisosHtml = avisos.length ? `<div class="alerts" style="margin-top:16px">${avisos.map(([t,m])=>`<div class="al ${t}"><span class="ic">${t==='warn'?'!':'i'}</span><span>${m}</span></div>`).join('')}</div>` : '';

  el.innerHTML = kpis + vendasHtml + alocHtml + avisosHtml;
};
