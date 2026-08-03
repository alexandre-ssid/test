/* ---------------- boot ---------------- */
document.getElementById('i-liq').innerHTML = LIQ_OPCOES.map(o=>
  `<option value="${o.v}" ${o.v===state.liqMax?'selected':''}>${o.r} — ${o.d}</option>`).join('');
const dc = document.getElementById('disc-cdi');
const pintaCdi = ()=>{ if(dc) dc.textContent = state.cdiProj.toLocaleString('pt-BR',{minimumFractionDigits:1})+'%'; };
const _renderApres = renderApres;
renderApres = function(){ _renderApres(); pintaCdi(); };

renderEditor();
syncResProd();
syncRail();
renderDiag();
render();
irPara('diag');
