/* ---------------- download ---------------- */
function baixar(nome, conteudo, tipo){
  const blob = new Blob([conteudo], {type: tipo+';charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
/* ---------------- escritor .xlsx (ZIP store, sem dependências) ---------------- */
const _CRCT = (()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0;}return t;})();
function _crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=_CRCT[(c^u8[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function _enc(s){return new TextEncoder().encode(s);}
function _zip(files){
  const parts=[],central=[]; let off=0;
  const dv=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
  const sv=n=>{const b=new Uint8Array(2);new DataView(b.buffer).setUint16(0,n,true);return b;};
  for(const f of files){
    const nm=_enc(f.name), d=f.data, c=_crc32(d);
    const lh=[_enc('PK\x03\x04'),sv(20),sv(0),sv(0),sv(0),sv(0),dv(c),dv(d.length),dv(d.length),sv(nm.length),sv(0),nm,d];
    parts.push(...lh);
    central.push([_enc('PK\x01\x02'),sv(20),sv(20),sv(0),sv(0),sv(0),sv(0),dv(c),dv(d.length),dv(d.length),sv(nm.length),sv(0),sv(0),sv(0),sv(0),dv(0),dv(off),nm]);
    off+=lh.reduce((a,b)=>a+b.length,0);
  }
  const cd=[]; let cdLen=0;
  for(const e of central){ cd.push(...e); cdLen+=e.reduce((a,b)=>a+b.length,0); }
  const all=[...parts,...cd,_enc('PK\x05\x06'),sv(0),sv(0),sv(files.length),sv(files.length),dv(cdLen),dv(off),sv(0)];
  const out=new Uint8Array(all.reduce((a,b)=>a+b.length,0)); let p=0;
  for(const b of all){ out.set(b,p); p+=b.length; }
  return out;
}
const _x = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _col = n => { let s='';n++; while(n>0){const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=(n-m-1)/26;} return s; };
function _cell(ref,c){
  if(c===null||c===undefined||c==='') return '';
  if(typeof c!=='object') c = (typeof c==='number') ? {v:c,t:'n'} : {v:c,t:'s'};
  const st = c.s ? ` s="${c.s}"` : '';
  if(c.f!==undefined) return `<c r="${ref}"${st}><f>${_x(c.f)}</f><v>${c.v??0}</v></c>`;
  if(c.t==='n')       return `<c r="${ref}"${st}><v>${c.v}</v></c>`;
  return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${_x(c.v)}</t></is></c>`;
}
function _sheet(rows,larg){
  const cols = larg ? `<cols>${larg.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const body = rows.map((r,ri)=>{
    const cs = r.map((c,ci)=>_cell(_col(ci)+(ri+1), c)).join('');
    return cs ? `<row r="${ri+1}">${cs}</row>` : `<row r="${ri+1}"/>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>${cols}<sheetData>${body}</sheetData></worksheet>`;
}
/* estilos: 1 negrito · 2 R$ · 3 % · 4 título · 5 cabeçalho · 6 total R$ · 7 total texto · 8 nota */
const _STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="0.00%"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF666666"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFEBE3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><top style="thin"><color rgb="FF999999"/></top></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function montarXlsx(abas){
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${abas.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas.map((a,i)=>`<sheet name="${_x(a.nome)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
  const wbr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${abas.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return _zip([
    {name:'[Content_Types].xml', data:_enc(ct)},
    {name:'_rels/.rels', data:_enc(rels)},
    {name:'xl/workbook.xml', data:_enc(wb)},
    {name:'xl/_rels/workbook.xml.rels', data:_enc(wbr)},
    {name:'xl/styles.xml', data:_enc(_STYLES)},
    ...abas.map((a,i)=>({name:`xl/worksheets/sheet${i+1}.xml`, data:_enc(_sheet(a.rows,a.larguras))}))
  ]);
}



/* ---------------- boleta .xlsx ---------------- */
function linhasBoleta(){
  const r = ULTIMO, tot = state.total||0;
  const rp = PROD.find(x=>x.id===state.resprod) || {nome:'—', ve:'', liq:0};
  const hoje = new Date().toLocaleDateString('pt-BR');
  const b = [];
  b.push([{v:'Boleta de alocação',s:4}]);
  b.push([{v:'Gerado em',s:1}, hoje]);
  b.push([]);
  b.push([{v:'Cliente',s:1}, state.nome||'—', '', {v:'Perfil',s:1}, nomePerfil(state.perfil)]);
  b.push([{v:'Enquadramento',s:1}, state.qual?'Investidor qualificado':'Investidor comum', '', {v:'Volatilidade máxima',s:1}, `${state.teto} — ${rotuloVol(state.teto)}`]);
  b.push([{v:'Liquidez aceita',s:1}, `até ${rotuloLiq(state.liqMax)}`, '', {v:'Piso por posição',s:1}, {v:state.piso||0,t:'n',s:2}]);
  b.push([{v:'Patrimônio',s:1}, {v:tot,t:'n',s:2}, '', {v:'Teto por fundo',s:1}, {v:state.capFundo/100,t:'n',s:3}]);
  b.push([{v:'Reserva de emergência',s:1}, {v:r.reserva,t:'n',s:2}, '', {v:'Objetivos (bolsões)',s:1}, {v:r.somaBolsoes,t:'n',s:2}]);
  b.push([{v:'Carteira de longo prazo',s:1}, {v:r.investivel,t:'n',s:2}, '', {v:'FGC por grupo emissor',s:1}, {v:state.fgcLim,t:'n',s:2}]);
  b.push([]);
  b.push([{v:'Bolsão',s:5},{v:'Classe',s:5},{v:'Produto',s:5},{v:'Veículo',s:5},{v:'Volatilidade',s:5},{v:'Liquidez',s:5},
          {v:'Restrição',s:5},{v:'% carteira',s:5},{v:'% patrimônio',s:5},{v:'Valor (R$)',s:5},{v:'Executado',s:5},{v:'Data',s:5},{v:'Observação',s:5}]);
  const ini = b.length + 1;

  if(r.reserva > 0){
    const det = state.resmodo==='meses' ? `${state.meses} meses × ${brl(state.custo)}` : 'valor definido';
    b.push(['Reserva','Reserva de emergência', rp.nome, rp.ve||'', rotuloVol(0), rotuloLiq(rp.liq||0), '', '',
            {v: tot?r.reserva/tot:0,t:'n',s:3}, {v:r.reserva,t:'n',s:2}, '', '', det]);
  }
  for(const o of state.objetivos.filter(o=>o.carve && o.valor>0)){
    const s = sugerirObjetivo(o);
    for(const l of s.linhas){
      b.push([`${o.nome} (${o.anos}a)`, CM[l.p.cl].nome, l.p.nome, l.p.ve, `${l.p.vol10} — ${rotuloVol(l.p.vol10)}`, rotuloLiq(l.p.liq),
              l.p.qual?'Investidor qualificado':'', '', {v: tot?l.valor/tot:0,t:'n',s:3}, {v:l.valor,t:'n',s:2},
              '', '', l.p.ver||'']);
    }
  }
  for(const c of CLASSES){
    r.vivos.filter(i=>i.cl===c.id && i.valor>0.005).sort((a,b2)=>b2.valor-a.valor).forEach(i=>{
      b.push(['Carteira', c.nome, i.nome, i.ve, `${i.vol10} — ${rotuloVol(i.vol10)}`, rotuloLiq(i.liq),
              i.qual?'Investidor qualificado':'',
              {v: r.investivel ? i.valor/r.investivel : 0,t:'n',s:3},
              {v: tot ? i.valor/tot : 0,t:'n',s:3},
              {v: i.valor,t:'n',s:2}, '', '', i.ver||'']);
    });
  }
  if(r.naoAlocado>0)
    b.push(['NÃO ALOCADO','—','Nenhum produto compatível com os filtros','','','','','',
            {v: tot?r.naoAlocado/tot:0,t:'n',s:3},{v:r.naoAlocado,t:'n',s:2},'','',
            'Relaxe um filtro ou cadastre um produto compatível antes de boletar.']);
  const fim = b.length;
  const somaTot = r.reserva + r.somaBolsoes + r.naoAlocado + r.vivos.reduce((a,x)=>a+x.valor,0);
  b.push([{v:'TOTAL',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},
          {v: Math.round(somaTot*100)/100, t:'n', s:6, f:`SUM(J${ini}:J${fim})`},{v:'',s:7},{v:'',s:7},{v:'',s:7}]);
  b.push([]);
  b.push([{v:'A coluna "Observação" traz itens do cadastro que dependem de conferência na lâmina ou no regulamento do produto.',s:8}]);
  b.push([{v:'Simulação sujeita a suitability, disponibilidade dos produtos e análise individual. Não constitui recomendação de investimento.',s:8}]);
  return b;
}

function linhasResumo(){
  const r = ULTIMO, semTags = s => String(s).replace(/<[^>]+>/g,'');
  const s2 = [];
  s2.push([{v:'Resumo da carteira',s:4}]);
  s2.push([`${state.nome||'—'} · ${nomePerfil(state.perfil)} · ${state.qual?'Qualificado':'Comum'} · ${new Date().toLocaleDateString('pt-BR')}`]);
  s2.push([]);
  const agrup = fn => r.vivos.reduce((a,i)=>{ const k=fn(i); a[k]=(a[k]||0)+i.valor; return a; },{});
  const bloco = (t, mapa) => {
    s2.push([{v:t,s:1}]);
    s2.push([{v:'Item',s:5},{v:'% da carteira',s:5},{v:'Valor (R$)',s:5}]);
    Object.entries(mapa).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>
      s2.push([k, {v: r.investivel? v/r.investivel : 0, t:'n', s:3}, {v: Math.round(v*100)/100, t:'n', s:2}]));
    s2.push([]);
  };
  bloco('Por classe de ativo', agrup(i=>CM[i.cl].nome));
  bloco('Por veículo', agrup(i=>GRUPO_VE(i.ve)==='Fundo'?'Fundos de Investimentos':i.ve));
  bloco('Por sub-perfil', agrup(i=>SUBS[i.sub||'C']));
  bloco('Por nível de volatilidade', agrup(i=>`${i.vol10} — ${rotuloVol(i.vol10)}`));
  bloco('Por faixa de liquidez', agrup(i=>rotuloLiq(i.liq)));

  const banc = r.vivos.filter(i=>ehBancarioFgc(i));
  if(banc.length){
    s2.push([{v:`Checagem do FGC — CDI projetado de ${state.cdiProj}% a.a.`,s:1}]);
    s2.push([{v:'Grupo emissor',s:5},{v:'Aplicado hoje (R$)',s:5},{v:'Projetado no vencimento (R$)',s:5},{v:'Limite (R$)',s:5},{v:'Folga (R$)',s:5}]);
    const g = {};
    banc.forEach(i=>{ (g[i.emissor]=g[i.emissor]||{hoje:0,fut:0}); g[i.emissor].hoje+=i.valor; g[i.emissor].fut+=i.valor*fatorFuturo(i); });
    Object.entries(g).forEach(([k,v])=> s2.push([k,
      {v:Math.round(v.hoje*100)/100,t:'n',s:2}, {v:Math.round(v.fut*100)/100,t:'n',s:2},
      {v:state.fgcLim,t:'n',s:2}, {v:Math.round((state.fgcLim-v.fut)*100)/100,t:'n',s:2}]));
    s2.push([]);
  }
  if(r.remocoes.length || r.cortes.length || r.tetos.length || r.fgc.length){
    s2.push([{v:'Ajustes aplicados ao modelo',s:1}]);
    s2.push([{v:'Produto / grupo',s:5},{v:'Peso ou excesso',s:5},{v:'Motivo',s:5},{v:'Destino',s:5}]);
    r.remocoes.forEach(x=> s2.push([x.nome, {v:x.peso,t:'n',s:3}, semTags(x.motivo), x.dest]));
    r.tetos.forEach(x=> s2.push([x.nome, {v:x.excesso,t:'n',s:3}, semTags(x.motivo), x.dest]));
    r.fgc.forEach(x=> s2.push([x.emissor, {v:x.excesso,t:'n',s:3}, `Projeção de ${brl(x.proj)} acima do FGC`, x.dest]));
    r.cortes.forEach(x=> s2.push([x.nome, {v:x.peso,t:'n',s:3}, `Abaixo do mínimo de ${brl(x.minimo)}`, x.dest]));
    s2.push([]);
  }
  if(r.alerts.length){
    s2.push([{v:'Observações',s:1}]);
    r.alerts.forEach(a=> s2.push([semTags(a[1])]));
  }
  return s2;
}

document.getElementById('btn-xlsx').onclick = ()=>{
  const bin = montarXlsx([
    {nome:'Boleta', rows:linhasBoleta(), larguras:[22,22,46,20,34,14,22,13,14,16,12,12,52]},
    {nome:'Resumo', rows:linhasResumo(), larguras:[52,20,26,18,18]},
  ]);
  const slug = (state.nome||'cliente').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  baixar(`boleta-${slug}.xlsx`, bin, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  toast('Boleta exportada.');
};

document.getElementById('btn-csv').onclick = ()=>{
  const r = ULTIMO;
  const linhas = [['Bolsão','Classe','Produto','Veículo','Volatilidade','Liquidez','% carteira','% patrimônio','Valor']];
  if(r.reserva>0) linhas.push(['Reserva','Reserva de emergência','','','','','', (r.reserva/state.total).toFixed(4), r.reserva.toFixed(2)]);
  state.objetivos.filter(o=>o.carve&&o.valor>0).forEach(o=>
    sugerirObjetivo(o).linhas.forEach(l=>linhas.push([o.nome,CM[l.p.cl].nome,l.p.nome,l.p.ve,l.p.vol10,rotuloLiq(l.p.liq),'',(l.valor/state.total).toFixed(4),l.valor.toFixed(2)])));
  r.vivos.forEach(i=>linhas.push(['Carteira',CM[i.cl].nome,i.nome,i.ve,i.vol10,rotuloLiq(i.liq),
    (i.valor/(r.investivel||1)).toFixed(4),(i.valor/(state.total||1)).toFixed(4),i.valor.toFixed(2)]));
  if(r.naoAlocado>0) linhas.push(['NÃO ALOCADO','—','Nenhum produto compatível','','','','','',(r.naoAlocado/(state.total||1)).toFixed(4),r.naoAlocado.toFixed(2)]);
  const csv = '\uFEFF' + linhas.map(l=>l.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
  baixar('carteira.csv', csv, 'text/csv');
  toast('CSV exportado.');
};

document.getElementById('btn-wpp').onclick = async ()=>{
  const r = ULTIMO;
  const L = [];
  L.push(`*Proposta de alocação — ${state.nome||'cliente'}*`);
  L.push(`Perfil ${nomePerfil(state.perfil)} · ${state.qual?'qualificado':'comum'} · volatilidade até N${state.teto} · liquidez até ${rotuloLiq(state.liqMax)}`);
  L.push('');
  L.push(`Patrimônio: ${brl(state.total)}`);
  if(r.reserva>0) L.push(`Reserva de emergência: ${brl(r.reserva)}`);
  if(r.somaBolsoes>0) L.push(`Objetivos de curto prazo: ${brl(r.somaBolsoes)}`);
  L.push(`Carteira de longo prazo: ${brl(r.investivel)}`);
  L.push('');
  for(const c of CLASSES){
    const its = r.vivos.filter(i=>i.cl===c.id).sort((a,b)=>b.valor-a.valor);
    if(!its.length) continue;
    L.push(`*${c.nome}* — ${pc(its.reduce((a,b)=>a+b.valor,0)/(r.investivel||1))}`);
    its.forEach(i=>L.push(`• ${i.nome} — ${brl(i.valor)}`));
  }
  L.push('');
  L.push('_Sujeito a suitability, disponibilidade e análise individual. Não é recomendação de investimento._');
  const txt = L.join('\n');
  try{ await navigator.clipboard.writeText(txt); toast('Resumo copiado.'); }
  catch{ baixar('resumo.txt', txt, 'text/plain'); toast('Resumo salvo em arquivo.'); }
};
