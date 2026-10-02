import json,csv,re
from collections import defaultdict
d=json.load(open('brave_cda.json'))
def dig(s): return re.sub(r'\D','',s or '')
def load_inf(m):
    I={};II={}
    for r in csv.DictReader(open(f'fidc{m}/inf_mensal_fidc_tab_I_2026{m}.csv',encoding='latin1'),delimiter=';'): I[dig(r['CNPJ_FUNDO_CLASSE'])]=r
    for r in csv.DictReader(open(f'fidc{m}/inf_mensal_fidc_tab_II_2026{m}.csv',encoding='latin1'),delimiter=';'): II[dig(r['CNPJ_FUNDO_CLASSE'])]=r
    return I,II
INF={'08':load_inf('08'),'06':load_inf('06')}
SEG={'Indústria':['TAB_II_A_VL_INDUST'],'Imobiliário':['TAB_II_B_VL_IMOBIL'],'Comércio/varejo':['TAB_II_C_VL_COMERC'],
 'Serviços':['TAB_II_D_VL_SERV'],'Agronegócio':['TAB_II_E_VL_AGRONEG'],'Crédito consignado':['TAB_II_F2_VL_CRED_PESSOA_CONSIG'],
 'Crédito pessoal e corp.':['TAB_II_F1_VL_CRED_PESSOA','TAB_II_F3_VL_CRED_CORP','TAB_II_F4_VL_MIDMARKET','TAB_II_F5_VL_VEICULO','TAB_II_F6_VL_IMOBIL_EMPRESA','TAB_II_F7_VL_IMOBIL_RESID','TAB_II_F8_VL_OUTRO'],
 'Cartão de crédito':['TAB_II_G_VL_CREDITO'],'Factoring':['TAB_II_H_VL_FACTOR'],'Setor público':['TAB_II_I_VL_SETOR_PUBLICO'],'Judicial/marca':['TAB_II_J_VL_JUDICIAL','TAB_II_K_VL_MARCA']}
def f(x):
    try: return float(x or 0)
    except: return 0.0
def isfidc(nm): return bool(re.search(r'DIREITOS\s+CRED|FIDC|FIAGRO|CADEIAS PRODUTIVAS',nm.upper()))
def short(nm):
    nm=re.sub(r'\s+',' ',nm).strip()
    nm=re.split(r' FUNDO DE| - FIDC| FIDC| FIAGRO| FIF\b| FI EM|- CLASSE',nm)[0].strip(' -')
    if nm in ('','FUNDO','RED -'): nm=None
    return nm
CASHNAMES={'03256793000100':'Bradesco RF Ref. DI Federal','06175696000173':'Itaú Soberano RF Simples','09215250000113':'BTG Tesouro Selic','10347195000102':'Safra Soberano Regime Próprio','16565016000181':'BTG Pactual CDB I FI RF','17899612000160':'MAG Cash FIF RF'}
def fund(cnpj,dt,mi):
    rows=[r for r in d if r['CNPJ_FUNDO_CLASSE']==cnpj and r['DT_COMPTC']==dt]
    pl=f(next(r['VL_PATRIM_LIQ'] for r in rows if r.get('VL_PATRIM_LIQ')))
    G=defaultdict(lambda: defaultdict(float)); seg=defaultdict(float); fidcs=[]
    for r in rows:
        if '_PL_' in r['_file'] or not r.get('VL_MERC_POS_FINAL'): continue
        v=f(r['VL_MERC_POS_FINAL']); a=r.get('TP_APLIC','')
        if a=='Cotas de Fundos':
            nm=r.get('NM_FUNDO_CLASSE_SUBCLASSE_COTA') or r.get('EMISSOR') or ''; cn=dig(r.get('CNPJ_FUNDO_CLASSE_COTA') or r.get('CPF_CNPJ_EMISSOR'))
            if isfidc(nm):
                lab=short(nm) or f'FIDC CNPJ {r.get("CNPJ_FUNDO_CLASSE_COTA")}'
                if lab.startswith('FUNDO DE INVESTIMENTO') or len(lab)>40: lab=(re.sub(r'.*CREDIT[OÓ]RIOS\s*','',nm).split(' LP')[0].split(' DE RESP')[0].split(' RESP')[0].strip(' -') or lab)[:32]
                G['FIDCs (cotas)'][lab.title()]+=v; fidcs.append((cn,v,lab))
            else: G['Caixa e fundos RF'][CASHNAMES.get(cn, short(nm) or nm)]+=v
        elif a=='Debêntures': G['Debêntures'][(r.get('CD_ATIVO') or 'MINE')[:4]]+=v
        elif a.startswith('Depósitos'): G['Letras financeiras'][r.get('EMISSOR','').title()]+=v
        elif a=='Operações Compromissadas': G['Caixa e fundos RF']['Compromissadas (títulos públicos)']+=v
        elif a=='Títulos Públicos': G['Caixa e fundos RF'][(r.get('TP_TITPUB') or 'Títulos públicos').title()]+=v
        else: G['Valores a pagar/receber'][r.get('EMISSOR') or a]+=v if 'receber' in a else -v
    I,II=INF[mi]; nocov=0
    for cn,v,lab in fidcs:
        t1=I.get(cn); t2=II.get(cn); at=f(t1['TAB_I_VL_ATIVO']) if t1 else 0
        if not t2 or at<=0 or f(t2['TAB_II_VL_CARTEIRA'])<=0: nocov+=v; continue
        s=0
        for k,cols in SEG.items():
            x=sum(f(t2[c]) for c in cols)/at; seg[k]+=v*x; s+=x
        seg['Caixa dos FIDCs']+=v*max(0,1-s)
    if nocov: seg['Sem abertura (FIC/Fiagro)']=nocov
    out={'cnpj':cnpj,'dt':dt,'pl':pl,'groups':{g:sorted(((k,100*x/pl) for k,x in it.items()),key=lambda z:-z[1]) for g,it in G.items()},
         'seg':sorted(((k,100*x/pl) for k,x in seg.items()),key=lambda z:-z[1]),'nfidc':len(fidcs)}
    out['gtot']={g:sum(p for _,p in v) for g,v in out['groups'].items()}
    return out
R={'b90':fund('35.726.300/0001-37','2026-08-31','08'),'b180':fund('63.762.704/0001-11','2026-08-31','08'),
   'iron':fund('54.485.055/0001-68','2026-06-30','06'),'prevxp':fund('51.675.926/0001-18','2026-08-31','08'),'fife':fund('49.933.828/0001-91','2026-06-30','06')}
I,_=INF['08']; b=I['41196241000135']; at=f(b['TAB_I_VL_ATIVO'])
R['b30']={'dt':'2026-08-31','ativo':at,'fidc':100*f(b['TAB_I2H_VL_COTA_FIDC'])/at,'fif':100*f(b['TAB_I2C5_VL_COTA_FIF'])/at,'outros':100*f(b['TAB_I4_VL_OUTRO_ATIVO'])/at}
json.dump(R,open('deck_data.json','w'),ensure_ascii=False,indent=1)
for k,v in R.items():
    if k=='b30': print(k,v); continue
    print('\n==',k,v['dt'],round(v['pl']/1e6,1),'nFIDC',v['nfidc'],{g:round(t,2) for g,t in v['gtot'].items()})
    for g,it in v['groups'].items(): print('  ',g,[(a,round(p,2)) for a,p in it[:8]])
    print('   SEG',[(a,round(p,2)) for a,p in v['seg']], round(sum(p for _,p in v['seg']),2))
