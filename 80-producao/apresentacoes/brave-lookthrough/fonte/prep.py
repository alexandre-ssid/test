import json,re
R=json.load(open('deck_data.json'))
FIX={'Red':None,'De':'FIDC CNPJ 54.326.936','Futuro Previdencia Consignado Pu':'Futuro Previdência Consig.','Não Padronizados Sifra Performan':'Sifra Performance NP',
 'Multissetorial One7':'One7','Multisetorial Ásia':'Ásia','Chimera Alternative Assets Xii Sr.2':'Chimera XII Sr.2','Sicoob Prime Flex':'Sicoob Prime Flex (Fiagro)',
 'Ubyfol Agro Iii':'Ubyfol Agro III','Libra Ii':'Libra II','Asa Lp Ii':'ASA LP II (FIC)','Unique Ii':'Unique II','Varyagi Ii':'Varyagi II','Varyagi I':'Varyagi I','Rnx':'RNX','Rdf':'RDF','Cd Cash':'CD Cash','Ms Open':'MS Open','Clm':'CLM','Fmd':'FMD','Jpi':'JPI','Bocom Bbm':'Bocom BBM (Fiagro)','Taipatsb':'TaipaTSB','Dcash':'DCash','Sifra Lp':'Sifra LP','Garson Br':'Garson BR','Feedpro E Fertifer':'Feedpro e Fertifer','Ridolfinvest 2':'Ridolfinvest 2 NP','Gavea Open':'Gávea Open'}
def lab(a): return FIX.get(a,a) if FIX.get(a,a) else a
def bank(a):
    a=re.sub(r'\s*-\s*Sociedade.*','',a); a=re.sub(r'\b(S\.?\s?A\.?|Sa|Holding|N A)\s*$','',a.strip()).strip()
    a=re.sub(r'\b(S\.?\s?A\.?|Sa|Holding)\b','',a).strip(' .')
    return a.replace('Banco ','').replace('Btg','BTG').replace('Abc','ABC').replace('C6','C6').replace('Itau','Itaú').replace('Do Brasil','do Brasil').replace('Unibanco','').replace('(Brasil)','').replace('Cooperativo ','').strip() or a
# Red split: recover by re-reading raw json cnpj -> need separate; redo grouping for FIDCs with cnpj-level names
d=json.load(open('brave_cda.json'))
NAMEBYCNPJ={'08632394000102':'RED Multisetorial','17250006000110':'RED Real','11489344000122':'RED Performance NP','54326936000136':'FIDC CNPJ 54.326.936'}
def dig(s): return re.sub(r'\D','',s or '')
def red_split(cnpj,dt,pl):
    out={}
    for r in d:
        if r['CNPJ_FUNDO_CLASSE']==cnpj and r['DT_COMPTC']==dt and r.get('TP_APLIC')=='Cotas de Fundos':
            c=dig(r.get('CNPJ_FUNDO_CLASSE_COTA') or r.get('CPF_CNPJ_EMISSOR'))
            if c in NAMEBYCNPJ: out[NAMEBYCNPJ[c]]=out.get(NAMEBYCNPJ[c],0)+100*float(r['VL_MERC_POS_FINAL'])/pl
    return out
def items(g,key,fund):
    it=R[fund]['groups'].get(g,[])
    if g=='FIDCs (cotas)':
        it=[x for x in it if x[0] not in ('Red','De')]+list(red_split(R[fund]['cnpj'],R[fund]['dt'],R[fund]['pl']).items())
        it=sorted([(lab(a),p) for a,p in it],key=lambda z:-z[1])
    elif g=='Letras financeiras': it=[(bank(a),p) for a,p in it]
    elif g=='Debêntures': it=[('MINERVA' if a=='MINE' else a,p) for a,p in it]
    elif g=='Caixa e fundos RF': it=[(a.replace('Letras Financeiras Do Tesouro','LFT (Tesouro)').replace('Títulos Públicos','Títulos públicos').replace('BRAVE PREVIDÊNCIA FIFE','Brave Prev FIFE').replace('Compromissadas (títulos públicos)','Compromissadas (TPF)').replace('Safra Soberano Regime Próprio','Safra Soberano RP'),p) for a,p in it]
    return it
def grp(fund,g,title,maxn):
    it=items(g,None,fund); tot=sum(p for _,p in it)
    top=it[:maxn]; rest=it[maxn:]
    return {'title':title,'pct':tot,'n':len(it),'top':top,'rest_n':len(rest),'rest_pct':sum(p for _,p in rest)}
def seg(fund):
    s=[(a,p) for a,p in R[fund]['seg'] if p>=0.05]
    return s
S={}
S['b30']={'name':'Brave 30 FIDC','cnpj':'41.196.241/0001-35','pl_lamina':'R$ 757,5 mi','res':'D+31',
 'classes':[('FIDC Sênior',66,[0]),('Caixa*',34,[1])],
 'groups':[{'title':'Cotas de FIDC','pct':R['b30']['fidc'],'n':None,'top':[],'rest_n':0,'rest_pct':0,'text':'Informe Mensal FIDC (31/08/26) só traz o total. FIDCs investidos não são listados na base pública. [verificar com a Brave: carteira aberta]'},
           {'title':'Cotas de fundos (FIF)','pct':R['b30']['fif'],'n':None,'top':[],'rest_n':0,'rest_pct':0,'text':'Provavelmente os fundos de caixa/zeragem da nota da lâmina. Quais fundos: [verificar]'}],
 'seg':None,'src':'Classes: lâmina set/26 · Nível 2: Informe Mensal FIDC CVM, 31/08/2026 (Brave 30 não entrega CDA com ativos)'}
S['b90']={'name':'Brave 90 FIC FIDC','cnpj':'35.726.300/0001-37','pl_lamina':'R$ 1,61 bi','res':'D+91',
 'classes':[('FIDC Sênior',79,[0]),('FIDC Mezanino',8,[0]),('Caixa*',12,[1])],
 'groups':[grp('b90','FIDCs (cotas)','FIDCs investidos',14),grp('b90','Caixa e fundos RF','Caixa e fundos RF',6)],
 'seg':seg('b90'),'src':'Classes: lâmina set/26 · Ativos: CDA CVM 31/08/2026 · Lastro: Informe Mensal FIDC CVM 08/2026'}
S['b180']={'name':'Brave 180 XP','cnpj':'63.762.704/0001-11','pl_lamina':'R$ 51,3 mi','res':'D+181',
 'classes':[('FIDC Sênior',81,[0]),('FIDC Mezanino',17,[0]),('Caixa*',3,[1])],
 'groups':[grp('b180','FIDCs (cotas)','FIDCs investidos',14),grp('b180','Caixa e fundos RF','Caixa e fundos RF',4)],
 'seg':seg('b180'),'src':'Classes: lâmina set/26 · Ativos: CDA CVM 31/08/2026 · Lastro: Informe Mensal FIDC CVM 08/2026'}
S['iron']={'name':'Brave Iron FIRF','cnpj':'54.485.055/0001-68','pl_lamina':'R$ 58,2 mi','res':'D+46',
 'classes':[('Debênture',30,[0]),('Bancário',25,[1]),('Caixa*',23,[3]),('FIDC Sênior',19,[2]),('FIDC Mezanino',2,[2])],
 'groups':[grp('iron','Debêntures','Debêntures (código do ativo)',8),grp('iron','Letras financeiras','Letras financeiras (emissor)',6),grp('iron','FIDCs (cotas)','FIDCs investidos',6),grp('iron','Caixa e fundos RF','Caixa e fundos RF',3)],
 'seg':seg('iron'),'src':'Classes: lâmina set/26 · Ativos: CDA CVM 30/06/2026 (ago/26 em sigilo até 29/11/26) · Lastro: Informe Mensal FIDC CVM 06/2026'}
S['prev']={'name':'Brave Prev XP Seguros FIC FIRF','cnpj':'51.675.926/0001-18','pl_lamina':'R$ 514,9 mi','res':'D+21',
 'classes':[('FIRF → Brave Prev FIFE',99,[0,1,2,3]),('Caixa*',1,[3])],
 'groups':[grp('fife','Debêntures','Debêntures (código do ativo)',8),grp('fife','Letras financeiras','Letras financeiras (emissor)',6),grp('fife','FIDCs (cotas)','FIDCs investidos',6),grp('fife','Caixa e fundos RF','Caixa e compromissadas',4)],
 'seg':seg('fife'),'mid':'Brave Prev FIFE FIRF CP · 49.933.828/0001-91 · 99,95% do PL (CDA 31/08/26)',
 'src':'Classes: lâmina set/26 · FIC→FIFE: CDA 31/08/2026 · Ativos do FIFE: CDA 30/06/2026 (ago/26 em sigilo até 29/11/26) · Lastro: Informe FIDC 06/2026'}
# overlap
F={'b90':'Brave 90','b180':'Brave 180 XP','iron':'Iron','prev':'Prev (via FIFE)'}
ov={}
for k in F:
    for a,p in S[k]['groups'][0 if k in('b90','b180') else 2]['top']+[]: pass
allf={}
for k,src in [('b90','b90'),('b180','b180'),('iron','iron'),('prev','fife')]:
    for a,p in items('FIDCs (cotas)',None,src): allf.setdefault(a,{})[k]=p
ovl=sorted([(a,v) for a,v in allf.items() if len(v)>=3],key=lambda z:(-len(z[1]),-sum(z[1].values())))
S['overlap']=[[a]+[v.get(k) for k in F] for a,v in ovl[:14]]
S['overlap_n']=len(ovl); S['overlap_total']=len(allf)
json.dump(S,open('slides.json','w'),ensure_ascii=False,indent=1)
for k in ['b90','b180','iron','prev']:
    print(k,[(g['title'],round(g['pct'],1),g['n'],[(a,round(p,1)) for a,p in g['top']],g['rest_n'],round(g['rest_pct'],1)) for g in S[k]['groups']])
print(S['overlap_n'],S['overlap_total']); [print(r) for r in S['overlap']]
