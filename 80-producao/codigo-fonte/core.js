/* =========================================================================
   NÚCLEO — cadastro, motor de alocação, tetos de concentração
   Este arquivo é a fonte de verdade; é injetado no HTML final.
   ========================================================================= */

const CLASSES = [
  {id:'pos', nome:'Pós-fixado',      cor:'--c-pos', fb:null },
  {id:'inf', nome:'Inflação',        cor:'--c-inf', fb:'pos'},
  {id:'pre', nome:'Prefixado',       cor:'--c-pre', fb:'inf'},
  {id:'rfg', nome:'RF Global',       cor:'--c-rfg', fb:'inf'},
  {id:'mm',  nome:'Multimercados',   cor:'--c-mm',  fb:'inf'},
  {id:'fli', nome:'Fundos Listados', cor:'--c-fli', fb:'mm' },
  {id:'rvb', nome:'RV Brasil',       cor:'--c-rvb', fb:'mm' },
  {id:'rval',nome:'RV América Latina',cor:'--c-rval',fb:'mm' },
  {id:'rvg', nome:'RV Global',       cor:'--c-rvg', fb:'mm' },
  {id:'alt', nome:'Alternativos',    cor:'--c-alt', fb:'mm' },
];
const CM = Object.fromEntries(CLASSES.map(c=>[c.id,c]));

/* -------------------------------------------------------------------------
   TETO POR CLASSE — Diretrizes do escritório, "Bandas de Alocação por Classe
   de Ativo" (imagem enviada por Alexandre em 15/07/2026). Valor = limite
   SUPERIOR da banda de cada classe, por perfil. 'pos' (Pós-fixado) não tem
   teto — é a classe "livre de risco", confirmado explicitamente; funciona
   como a válvula de segurança no fim de toda cadeia de fallback.
   'rval' (RV América Latina) não tem linha própria nas Diretrizes — tratado
   como parte de RV Global (mesmo teto, peso somado), por decisão do
   Alexandre. Ver DECISOES D-22.
   ------------------------------------------------------------------------- */
const CAP_CLASSE = {
  C: {inf:17.5, pre:7.5,  mm:5.0,  rvb:5.0,  fli:5.0, alt:0.0,  rfg:5.0, rvg:7.5},
  M: {inf:27.5, pre:12.5, mm:16.5, rvb:10.0, fli:6.5, alt:10.5, rfg:5.0, rvg:8.5},
  A: {inf:32.5, pre:10.0, mm:12.5, rvb:20.0, fli:12.0,alt:14.5, rfg:5.0, rvg:10.0},
};
const grupoDe = cl => cl==='rval' ? 'rvg' : cl;
/* Mínimo da banda — só está confirmado na imagem para Pós-fixado, Inflação e Prefixado
   (as únicas três linhas com os dois números impressos). Nas demais classes a imagem só
   traz o teto; o mínimo visual parece próximo de 0% mas não está escrito, então não é
   tratado como dado confirmado — fica de fora deste objeto, e a UI não afirma um piso ali. */
const CAP_CLASSE_MIN = {
  C: {pos:65.0, inf:7.5,  pre:2.5},
  M: {pos:28.0, inf:17.5, pre:7.5},
  A: {pos:8.5,  inf:22.5, pre:5.0},
};

/* Escala de volatilidade 0–10 (migrada de 0–3 em 14/07/2026 — ver DECISOES D-14/D-15
   e 01-fundamentos/SPEC-volatilidade-v2.md). rotuloVol(n) devolve a banda descritiva
   para exibição; o motor sempre compara o número, nunca a faixa. */
function rotuloVol(v){
  if(v<=0.01) return 'Sem volatilidade (0)';
  if(v<=2)    return 'Muito baixa (até 2)';
  if(v<=4)    return 'Baixa (até 4)';
  if(v<=6)    return 'Moderada (até 6)';
  if(v<=8)    return 'Alta (até 8)';
  return 'Muito alta (até 10)';
}
const VOL_BANDAS = [
  {ate:0,  nome:'Sem volatilidade'},
  {ate:2,  nome:'Muito baixa'},
  {ate:4,  nome:'Baixa'},
  {ate:6,  nome:'Moderada'},
  {ate:8,  nome:'Alta'},
  {ate:10, nome:'Muito alta'},
];
const VEICULOS = ['Tesouro Direto','ETF','Fundo','FIDC','Previdência','Renda Fixa Bancária'];
/* Na aba COMPOSIÇÃO da planilha, FIDC é contado dentro de "Fundos de Investimentos". */
const GRUPO_VE = v => (v==='FIDC' ? 'Fundo' : v);
const SUBS = {C:'Conservador', M:'Moderado', A:'Arrojado'};

/* Faixas de liquidez oferecidas ao usuário — mínima D+0, máxima ilimitada. */
const LIQ_OPCOES = [
  {v:0,     r:'D+0',        d:'Resgate no mesmo dia'},
  {v:1,     r:'D+1',        d:'Tesouro Direto'},
  {v:2,     r:'D+2',        d:'ETFs na B3'},
  {v:5,     r:'D+5',        d:'Previdência (após carência)'},
  {v:30,    r:'D+30',       d:'Fundos com cotização mensal'},
  {v:90,    r:'D+90',       d:'LCI/LCA e fundos trimestrais'},
  {v:180,   r:'D+180',      d:'Crédito estruturado'},
  {v:365,   r:'D+365',      d:'Até 1 ano'},
  {v:99999, r:'Ilimitada',  d:'Carrega até o vencimento'},
];
const rotuloLiq = d => { const o = LIQ_OPCOES.find(x=>x.v>=d); return o ? o.r : `D+${d}`; };

/* -------------------------------------------------------------------------
   CADASTRO
   sub  = classificação C/M/A da aba COMPOSIÇÃO da planilha. Foi RECUPERADA por
          otimização inteira: 30 dos 32 produtos têm classificação única que
          reconcilia os três perfis. Os dois ambíguos (MARG11 e DEBB11) estão
          marcados — exatamente um dos dois é 'M'.
   liq  = dias até o dinheiro na conta. ESTIMATIVAS DE PARTIDA. Confirmar.
   ------------------------------------------------------------------------- */
const PADRAO = [
  {id:'ts_estrat',  nome:'Tesouro Selic (maior venc.) — Reserva Estratégica', cl:'pos', ve:'Tesouro Direto', vol10:0, volFonte:'fixo', sub:'C', liq:1, qual:false, min:0, prot:true, receber:true, wr:30, w:{C:14.5,M:0,A:8.5}},
  {id:'lftb_estrat',nome:'LFTB11 — Reserva Estratégica', cl:'pos', ve:'ETF', vol10:2.0, volFonte:'provisorio', sub:'M', liq:2, qual:false, min:0, ver:'A planilha classifica este LFTB11 como sub-perfil Moderado e a linha "LFTB11" comum como Conservador. Mesmo ativo, dois sub-perfis — conferir. [TRIBUTAÇÃO] Confirmado por Alexandre em 20/07/2026: LFTB11 tributado a 15% flat sobre o ganho na venda, sem come-cotas (regra padrão de ETF no Brasil). [VOL] Tentei em 20/07/2026: LFTB11 tem menos de 1 ano de pregão na B3 e não achei índice internacional que replique (é um índice de duration-alvo curta específico do mercado local, sem equivalente líquido no Yahoo Finance). Alexandre decidiu manter o valor-ponte provisório em vez de forçar um proxy sem base. Valor é ponte provisória da escala antiga (N1→2,0), não dado real.', w:{C:0,M:10,A:0}},
  {id:'ts_emerg',   nome:'Tesouro Selic (maior venc.) — Reserva de Emergência', cl:'pos', ve:'Tesouro Direto', vol10:0, volFonte:'fixo', sub:'C', liq:1, qual:false, min:0, emerg:true, w:{C:10,M:10,A:5}},

  {id:'lftb', nome:'LFTB11', cl:'pos', ve:'ETF', vol10:2.0, volFonte:'provisorio', sub:'C', liq:2, qual:false, min:0, ver:'[TRIBUTAÇÃO] Confirmado por Alexandre em 20/07/2026: LFTB11 tributado a 15% flat sobre o ganho na venda, sem come-cotas (regra padrão de ETF). [VOL] Mesma pendência do LFTB11 Reserva Estratégica — tentativa de busca em 20/07/2026 sem proxy viável, valor-ponte mantido por decisão do Alexandre. Valor é ponte provisória (N1→2,0), não dado real.', w:{C:20,M:0,A:5}},
  {id:'nlfa', nome:'NLFA11', cl:'pos', ve:'ETF', vol10:2.0, volFonte:'provisorio', sub:'C', liq:2, qual:false, min:0, ver:'[VOL] NLFA11 replica um índice ANBIMA de letras financeiras sem equivalente líquido no Yahoo Finance, e tem histórico curtíssimo na B3 (menos de 2 meses em 20/07/2026). Alexandre decidiu manter o valor-ponte provisório em vez de forçar um proxy sem base. Valor é ponte provisória (N1→2,0), não dado real.', w:{C:7.5,M:5,A:0}},
  {id:'lfin', nome:'LFIN11', cl:'pos', ve:'ETF', vol10:2.0, volFonte:'provisorio', sub:'C', liq:2, qual:false, min:0, ver:'Confirmar índice de referência. [VOL] LFIN11 replica um índice DI de letras financeiras sem equivalente líquido no Yahoo Finance, e tem menos de 1 ano de pregão na B3. Alexandre decidiu manter o valor-ponte provisório em vez de forçar um proxy sem base. Valor é ponte provisória (N1→2,0), não dado real.', w:{C:7.5,M:5,A:0}},
  {id:'marg', nome:'MARG11', cl:'pos', ve:'ETF', vol10:2.0, volFonte:'provisorio', sub:'M', liq:2, qual:false, min:0, ver:'Sub-perfil ambíguo na planilha v1: MARG11 e DEBB11 só admitiam "um dos dois é Moderado". Escolhi MARG11=M, DEBB11=C. Confirmar. [VOL] MARG11 replica um índice de debêntures DI sem equivalente líquido no Yahoo Finance, e tem menos de 1 ano de pregão na B3. Alexandre decidiu manter o valor-ponte provisório em vez de forçar um proxy sem base. Valor é ponte provisória (N1→2,0), não dado real.', w:{C:3.5,M:5,A:5}},
  {id:'debb', nome:'DEBB11', cl:'pos', ve:'ETF', vol10:0.25, volFonte:'drawdown', sub:'C', liq:2, qual:false, min:0, ver:'ETF de debêntures: confirmar se há hedge de juros. Sub-perfil ambíguo (ver MARG11). [VOL] Dado real obtido via Yahoo Finance (histórico diário, 22/06/2022–20/07/2026, 4,1 anos) em 20/07/2026: drawdown máximo −1,23% (pico 12/01/2024, vale 18/01/2024). vol10=min(10,|dd|/0,50×10)=0,25 — mesma fórmula dos fundos. Autenticidade do dado verificada por cruzamento com referências conhecidas (Ibovespa, Bitcoin, Apple, Vale) antes de aplicar — ver ERROR-LOG E-16 (revisado).', w:{C:3.5,M:5,A:5}},

  {id:'jive',   nome:'Jive BossaNova High Yield Advisory FIC FIDC', cl:'pos', ve:'FIDC', vol10:3, volFonte:'fixo', sub:'A', liq:180, qual:true, min:0, ver:'Público-alvo e liquidez não confirmados. Marquei como qualificado e D+180 por precaução — conferir no regulamento.', w:{C:0,M:1.5,A:2}},
  {id:'patria', nome:'Pátria Crédito Estruturado 365 FIDC', cl:'pos', ve:'FIDC', vol10:3, volFonte:'fixo', sub:'A', liq:365, qual:true, min:0, ver:'"365" no nome sugere cotização de 365 dias. Público-alvo não confirmado — conferir no regulamento.', w:{C:0,M:1.5,A:2}},
  {id:'plural', nome:'Plural Debêntures Incentivadas Hedge 30 FIC FIF RF CP RL', cl:'pos', ve:'Fundo', vol10:0.5, volFonte:'drawdown', sub:'C', liq:30, isento:true, qual:false, min:0, ver:'[ISENÇÃO] Confirmado por Alexandre em 14/07/2026: isento de IR. "30" no nome sugere D+30 — carência ainda não confirmada no regulamento. [VOL] Drawdown real: "Plural Debêntures Incentivadas Hedge 30 Fc FIF" no Guia de Fundos 06/2026, máximo drawdown desde o início de -2,53%. Âncora: 50% de queda = 10. Nome bate com o do cadastro.', w:{C:2.5,M:2.5,A:0}},
  {id:'xpdeb',  nome:'XP Debêntures Incentivadas CDI 30', cl:'pos', ve:'Fundo', vol10:0.32, volFonte:'drawdown', sub:'C', liq:30, isento:true, qual:false, min:0, ver:'[ISENÇÃO] Confirmado por Alexandre em 14/07/2026: isento de IR. "30" no nome sugere D+30 — carência ainda não confirmada no regulamento. [MATCH] Confirmado por Alexandre em 20/07/2026: CNPJ 26.803.233/0001-16, "XP Debêntures Incentivadas CDI CP FIF Incentivado de Investimento em Infra RF RL" (resolve a ambiguidade anterior — não é o fundo indexado a IPCA que eu tinha achado por engano). [VOL] Dado real obtido via dados abertos da CVM (Informe Diário, cota diária 04/01/2021–16/07/2026, 1390 pontos): drawdown máximo −1,61% (pico 11/01/2023, vale 16/02/2023). vol10=min(10,1,61/50×10)=0,32 — baixo, coerente com fundo de crédito curto prazo.', w:{C:2.5,M:2.5,A:0}},
  {id:'prev_brad',  nome:'Previdência Bradesco Ultra XP Seg Prev', cl:'pos', ve:'Previdência', vol10:0.0, volFonte:'volatilidade', sub:'C', liq:6, qual:false, min:100, ver:'Dado real confirmado por Alexandre em 20/07/2026 (planilha Guia-de-Previdência, aba Prev XPCS, linha "Bradesco Ultra XP Seg Prev FIRF RL"): público-alvo Em Geral, aporte inicial e mínimo mensal R$100, carência de portabilidade D+0, liquidez total (cotização+liquidação) 6 dias. [VOL] Volatilidade real desde o início: 0,20% — fórmula vol10=min(10,vol×10) confirmada por Alexandre. Fundo de crédito/RF, volatilidade baixa é coerente com a classificação "Crédito High Grade" da própria planilha.', w:{C:3,M:0,A:0}},
  {id:'prev_brave', nome:'Previdência Brave Prev XP Seg', cl:'pos', ve:'Previdência', vol10:0.0, volFonte:'volatilidade', sub:'C', liq:21, qual:true, min:100, ver:'Dado real confirmado por Alexandre em 20/07/2026 (planilha Guia-de-Previdência, aba Prev XPCS, linha "Brave XP Seg FIRF CP"): público-alvo Qualificados (⚠️ cadastro tinha qual:false — corrigido), aporte inicial e mínimo mensal R$100, carência de portabilidade D+0, liquidez total 21 dias. [VOL] Volatilidade real desde o início: 0,07% — fórmula vol10=min(10,vol×10) confirmada por Alexandre.', w:{C:3,M:0,A:0}},

  {id:'b30',   nome:'Tesouro IPCA+ Principal 2030 (B30)', cl:'inf', ve:'Tesouro Direto', vol10:1.7, volFonte:'duration', sub:'M', liq:1, qual:false, min:0, ver:'[PESO] Confirmado por Alexandre em 16/07/2026 (B-02): peso Conservador ajustado de 7,5% para 6,0%, escala ×0,8 mantida como definitiva (classe Inflação do Conservador vale 10% na planilha v2, mas os produtos somavam 12,5%). [VOL] Duration ≈ anos até o vencimento (título "Principal", zero-coupon). Âncora: 20 anos = 10. CONFIRMAR a âncora.', w:{C:6,M:14.5,A:0}},
  {id:'b35',   nome:'Tesouro IPCA+ Principal 2035 (B35)', cl:'inf', ve:'Tesouro Direto', vol10:4.2, volFonte:'duration', sub:'A', liq:1, qual:false, min:0, ver:'[PESO] Confirmado por Alexandre em 16/07/2026 (B-02): peso Conservador ajustado de 2,5% para 2,0%, escala ×0,8 mantida (ver B30). [VOL] Duration ≈ anos até o vencimento. Âncora: 20 anos = 10. CONFIRMAR a âncora.', w:{C:2,M:1.5,A:17.5}},
  {id:'b50',   nome:'Tesouro IPCA+ Principal 2050 (B50)', cl:'inf', ve:'Tesouro Direto', vol10:10, volFonte:'duration', sub:'A', liq:1, qual:false, min:0, ver:'Na v2 o rótulo já vem como B50, corrigindo a divergência da v1. [VOL] Duration ≈ anos até o vencimento, truncada em 10 (vencimento além da âncora de 20 anos). CONFIRMAR a âncora.', w:{C:0,M:0,A:1.5}},
  {id:'educa', nome:'Tesouro Educa+ (venc. mais longo)', cl:'inf', ve:'Tesouro Direto', vol10:10, volFonte:'duration', sub:'A', liq:1, qual:false, min:0, ver:'[VOL] Duration truncada em 10 — assumi vencimento tão longo quanto o B50 por não ter a data exata. CONFIRMAR vencimento real e a âncora de 20 anos.', w:{C:0,M:0,A:1}},
  {id:'prev_trend', nome:'Previdência Trend IMA-B 5+ & Bolsa Americana Dólar XP Seg', cl:'inf', ve:'Previdência', vol10:0.6, volFonte:'volatilidade', sub:'A', liq:2, qual:true, min:100, ver:'Está em Inflação na planilha, mas carrega bolsa americana e câmbio. Classifiquei a volatilidade como nível 3 antes do dado real chegar. [PESO] Confirmado por Alexandre em 16/07/2026 (B-02): peso Conservador ajustado de 2,5% para 2,0%, escala ×0,8 mantida (ver B30). [VOL] Dado real confirmado por Alexandre em 20/07/2026 (planilha Guia-de-Previdência, aba Prev XPCS, linha "Trend IMA-B 5+ & Bolsa Americana Dólar XP Seg Prev FIM RL"): público-alvo Qualificados (⚠️ cadastro tinha qual:false — corrigido), aporte inicial e mínimo mensal R$100, liquidez total 2 dias. Volatilidade real desde o início: 5,88% — fórmula vol10=min(10,vol×10) confirmada por Alexandre. Vol10 baixo apesar da exposição cambial/bolsa americana; o peso do perfil e a exigência de qualificado seguem sendo as guardas de suitability, não só o vol10.', w:{C:2,M:2,A:2}},

  {id:'ltn29', nome:'Tesouro Prefixado Principal 2029 (LTN 2029)', cl:'pre', ve:'Tesouro Direto', vol10:1.2, volFonte:'duration', sub:'M', liq:1, qual:false, min:0, ver:'[PESO] Confirmado por Alexandre em 16/07/2026 (B-02): peso Conservador ajustado de 4,0% para 3,2%, escala ×0,8 mantida (classe Prefixado do Conservador vale 5,2% na planilha v2, mas os produtos somavam 6,5%). [VOL] Duration ≈ anos até o vencimento (LTN, zero-coupon). Âncora: 20 anos = 10. CONFIRMAR a âncora.', w:{C:3.2,M:6.5,A:0}},
  {id:'ltn32', nome:'Tesouro Prefixado Principal 2032 (LTN 2032)', cl:'pre', ve:'Tesouro Direto', vol10:2.7, volFonte:'duration', sub:'A', liq:1, qual:false, min:0, ver:'[PESO] Confirmado por Alexandre em 16/07/2026 (B-02): peso Conservador ajustado de 2,5% para 2,0%, escala ×0,8 mantida (ver LTN 2029). [VOL] Duration ≈ anos até o vencimento. Âncora: 20 anos = 10. CONFIRMAR a âncora.', w:{C:2,M:1.5,A:6}},

  {id:'azbayes',  nome:'AZ Quest Bayes LS Sistemático FIF em Cotas de FIM', cl:'mm', ve:'Fundo', vol10:4.9, volFonte:'drawdown', sub:'M', liq:30, qual:true, min:0, ver:'[SUB] Confirmado por Alexandre em 14/07/2026: a planilha v1 classificava como Conservador, mas o fundo é Moderado ou mais agressivo — corrigido para Moderado. Público-alvo presumido qualificado. [VOL] Drawdown real: "Az Quest Bayes Sistemático FI F" no Guia de Fundos 06/2026, máximo drawdown desde o início de -24,62%. Âncora: 50% de queda = 10. Nome bate ("Sistemático") com o do cadastro.', w:{C:0,M:2,A:0}},
  {id:'alphakey', nome:'AlphaKey Long Short FIC FIM', cl:'mm', ve:'Fundo', vol10:0.18, volFonte:'drawdown', sub:'M', liq:30, qual:true, min:0, ver:'[SUB] Confirmado por Alexandre em 14/07/2026: a planilha v1 classificava como Conservador, mas o fundo é Moderado ou mais agressivo — corrigido para Moderado. Público-alvo presumido qualificado. [MATCH] Confirmado por Alexandre em 20/07/2026: CNPJ 52.304.477/0001-64, "AlphaKey LS FIF em Cotas FIM RL" — resolve a ambiguidade anterior. O "AlphaKey Ações" do Guia de Fundos (drawdown -52,38%) era mesmo outro fundo, como eu suspeitava — dado real por CNPJ confirma valores bem diferentes. [VOL] Dado real obtido via dados abertos da CVM (Informe Diário, cota diária 28/09/2023–16/07/2026, 702 pontos): drawdown máximo −0,92% (pico 26/11/2024, vale 10/12/2024). vol10=min(10,0,92/50×10)=0,18 — muito baixo, coerente com estratégia long-short bem hedgeada (baixa exposição líquida ao mercado).', w:{C:0,M:2,A:0}},
  {id:'prev_kap', nome:'Previdência Kapitalo K10 Global Prev XP Seg', cl:'mm', ve:'Previdência', vol10:0.9, volFonte:'volatilidade', sub:'M', liq:9, qual:false, min:100, ver:'[MATCH] Confirmado por Alexandre em 20/07/2026: o fundo correto na planilha Guia-de-Previdência (aba Prev XPCS) é "Kapitalo K10 Global Prev XP Seg Advisory FICFIM RL" (havia um segundo candidato fechado para novos aportes, "...Icatu Prev...", descartado). Público-alvo Em Geral, aporte inicial e mínimo mensal R$100, liquidez total 9 dias. [VOL] Volatilidade real desde o início: 9,22% (a mais alta dos 5 fundos de previdência do cadastro) — fórmula vol10=min(10,vol×10) confirmada por Alexandre. Vol10 baixo apesar da própria planilha classificar o fundo como "Macro Alta Vol" e restringi-lo a investidor qualificado — o peso do perfil (`w`, zero no Conservador) e a exigência de qualificado seguem sendo as guardas reais de suitability, não só o vol10.', w:{C:0,M:3.6,A:4}},
  {id:'prev_arca',nome:'Previdência Arca Grão Prev XP Seg', cl:'mm', ve:'Previdência', vol10:0.5, volFonte:'volatilidade', sub:'M', liq:9, qual:false, min:100, ver:'[MATCH] Confirmado por Alexandre em 20/07/2026: o fundo correto na planilha Guia-de-Previdência (aba Prev XPCS) é "Arca Grão Previdência Advisory FIC FIM" (classe Multiestratégia/FIM — havia um segundo candidato, "Arca Grão XP Seg FIC RF CP", de Renda Fixa, descartado por não bater com a classe mm do cadastro). Público-alvo Em Geral, aporte inicial e mínimo mensal R$100, liquidez total 9 dias. [VOL] Volatilidade real desde o início: 5,42% — fórmula vol10=min(10,vol×10) confirmada por Alexandre.', w:{C:0,M:3.6,A:4}},

  {id:'hgbr', nome:'HGBR11', cl:'rfg', ve:'ETF', vol10:5.87, volFonte:'drawdown-proxy', sub:'M', liq:2, qual:false, min:0, ver:'[VOL] HGBR11 tem menos de 1 ano de pregão na B3 — drawdown próprio não é confiável. Usei o índice-base que o nome referencia (iBoxx $ Investment Grade, proxy via ETF LQD, NYSEArca): drawdown máximo real −29,37% em 10 anos (pico 06/08/2020 — auge do rali de crédito pós-pandemia com juros baixos —, vale 19/10/2023 — alta de juros do Fed). vol10=min(10,29,37/50×10)=5,87. Proxy imperfeito: HGBR11 é "hedge carry" (estrutura de hedge cambial + estratégia de carry), não uma réplica passiva pura do LQD — a volatilidade real pode diferir. Metodologia de proxy confirmada por Alexandre em 20/07/2026, mas ESTA correspondência específica (LQD) não foi confirmada por ele — CONFIRMAR.', w:{C:2.5,M:2.5,A:2.5}},
  {id:'spxr', nome:'SPXR11', cl:'rvg', ve:'ETF', vol10:6.78, volFonte:'drawdown-proxy', sub:'A', liq:2, qual:false, min:0, ver:'[PESO] Confirmado por Alexandre em 16/07/2026 (B-02): peso Conservador ajustado de 2,5% para 2,0%, escala ×0,8 mantida (classe RV Global do Conservador vale 2,0% na planilha v2). [VOL] SPXR11 tem menos de 1 ano de pregão na B3 — drawdown próprio não é confiável. Usei o índice que replica (S&P 500, ^GSPC, quanto BRL): drawdown máximo real −33,92% (pico 19/02/2020, vale 23/03/2020 — bate exatamente com o crash da COVID). vol10=min(10,33,92/50×10)=6,78. Metodologia de proxy confirmada por Alexandre em 20/07/2026.', w:{C:2,M:2.8,A:4}},
  {id:'bilf', nome:'BILF39 (BDR de ETF)', cl:'rval', ve:'ETF', vol10:10, volFonte:'drawdown-proxy', sub:'A', liq:2, qual:false, min:0, ver:'[TRIBUTAÇÃO] Confirmado por Alexandre em 14/07/2026: BILF39 é tributado como BDR (não como ETF local), conforme o sufixo 39 sugeria. Produto novo na v2, classe nova (RV América Latina); a planilha o conta dentro de ETFs mesmo sendo BDR. [VOL] BILF39 acabou de estrear na B3 (1 único pregão) — sem histórico próprio algum. Usei o ETF original que a BDR replica (iShares Latin America 40 ETF, ticker ILF, NYSEArca): drawdown máximo real −60,41% em 10 anos (pico 26/01/2018, vale 23/03/2020). vol10=min(10,60,41/50×10)=12,08→teto em 10. Metodologia de proxy confirmada por Alexandre em 20/07/2026.', w:{C:0,M:0,A:7.6}},
  {id:'divo', nome:'DIVO11', cl:'rvb', ve:'ETF', vol10:8.0, volFonte:'provisorio', sub:'A', liq:2, qual:false, min:0, ver:'[CLASSE] Confirmado por Alexandre em 14/07/2026: DIVO11 é ETF de RV Brasil. O rótulo "Fundos Listados" que aparece no Conservador da planilha provavelmente é herdado do XFIX11 (saiu da v2) — "Fundos Listados" ali provavelmente se refere só a FIIs, e DIVO11 não é FII. Mantido como RV Brasil nos 3 perfis. [PESO] Confirmado por Alexandre em 16/07/2026 (B-02): peso Conservador ajustado de 3,5% para 2,8%, escala ×0,8 mantida (ver nota do B30). [VOL] Dado real obtido via Yahoo Finance (histórico diário, 10 anos) em 20/07/2026: drawdown máximo −40,10% (pico 23/01/2020, vale 23/03/2020 — bate com o crash da COVID). vol10=min(10,|dd|/0,50×10)=8,02, coincidentemente perto do valor provisório que já estava em uso. Autenticidade do dado verificada por cruzamento com referências conhecidas antes de aplicar — ver ERROR-LOG E-16 (revisado).', w:{C:2.8,M:7,A:12}},
  {id:'golx', nome:'GOLX11', cl:'alt', ve:'ETF', vol10:5.01, volFonte:'drawdown-proxy', sub:'A', liq:2, qual:false, min:0, ver:'[VOL] GOLX11 tem menos de 3 meses de pregão na B3 — drawdown próprio não é confiável. Usei o ativo que replica (ouro, futuro contínuo GC=F): drawdown máximo real −25,06% em 10 anos (pico 29/01/2026, vale 16/07/2026). vol10=min(10,25,06/50×10)=5,01. Metodologia de proxy confirmada por Alexandre em 20/07/2026.', w:{C:0,M:1,A:2}},
  {id:'bcom', nome:'BCOM39 (BDR de ETF)', cl:'alt', ve:'ETF', vol10:9.79, volFonte:'drawdown-proxy', sub:'A', liq:2, qual:false, min:0, ver:'[VOL] BCOM39 acabou de estrear na B3 (1 único pregão) — sem histórico próprio algum. Nome retornado pelo Yahoo Finance ("BKR COMT ROLDRE") sugere BDR do iShares GSCI Commodity Dynamic Roll Strategy ETF (ticker COMT, NYSEArca) — match por semelhança de nome, não confirmado por CNPJ/prospecto. Usei o drawdown desse ETF: máximo real −48,95% em 10 anos (pico 08/06/2022, vale 08/04/2025). vol10=min(10,48,95/50×10)=9,79. Metodologia de proxy confirmada por Alexandre em 20/07/2026; match do ticker CONFIRMAR.', w:{C:0,M:0.5,A:1.4}},
  {id:'hash', nome:'HASH11', cl:'alt', ve:'ETF', vol10:10, volFonte:'drawdown', sub:'A', liq:2, qual:false, min:0, ver:'ETF de cripto. [VOL] Dado real obtido via Yahoo Finance (histórico diário, 26/04/2021–20/07/2026, 5,2 anos) em 20/07/2026: drawdown máximo −78,08% (pico 09/11/2021, vale 29/11/2022 — bate com o topo e o "inverno cripto" de 2022). vol10=min(10,|dd|/0,50×10)=15,6→teto em 10 (o dd de 78% já excede em muito a âncora de 50%). Autenticidade do dado verificada por cruzamento com referências conhecidas antes de aplicar — ver ERROR-LOG E-16 (revisado).', w:{C:0,M:1,A:2}},

  /* ---- Títulos bancários. Peso zero nos três perfis: só entram quando a carteira
         precisa de reposição (volatilidade zero, liquidez restrita). O peso de
         reposição `wr` define como o caixa se reparte entre eles. Emissor, taxa e
         prazo são PLACEHOLDERS — preencher com a oferta vigente. ---- */
  {id:'cdb_liq', nome:'CDB Banco XP S.A. — JUL/2028', cl:'pos', ve:'Renda Fixa Bancária', vol10:1, volFonte:'fixo', sub:'C', liq:1,
   qual:false, min:0, fgc:true, emissor:'Banco XP', rating:'brAAA', pctCDI:101, prazoAnos:1.99, receber:true, wr:40,
   ver:'Fonte: vitrine de renda fixa bancária, oferta de 14/07/2026 (Tax.Máx). Carência de 1 dia = liquidez praticamente diária. "Qtd Mín." da planilha é em unidades/lotes de emissão, não em R$ — mínimo de investimento em reais não confirmado. Taxa muda por oferta; conferir vigência antes de boletar.', w:{C:0,M:0,A:0}},
  {id:'cdb_venc', nome:'CDB PicPay — JUL/2031', cl:'pos', ve:'Renda Fixa Bancária', vol10:1, volFonte:'fixo', sub:'C', liq:1825,
   qual:false, min:0, fgc:true, emissor:'PicPay', rating:'AA-.br', pctCDI:106.75, prazoAnos:5.0, receber:true, wr:20,
   ver:'Fonte: vitrine de renda fixa bancária, oferta de 14/07/2026 (Tax.Máx). Sem liquidez antes do vencimento (carência = quase todo o prazo). "Qtd Mín." da planilha é em unidades/lotes, não em R$ — mínimo em reais não confirmado. Taxa muda por oferta; conferir vigência.', w:{C:0,M:0,A:0}},
  {id:'lci', nome:'LCI CEF — NOV/2026', cl:'pos', ve:'Renda Fixa Bancária', vol10:1, volFonte:'fixo', sub:'C', liq:119,
   qual:false, min:0, fgc:true, isento:true, emissor:'CEF', rating:'brAAA', pctCDI:91, prazoAnos:0.31, receber:true, wr:20,
   ver:'Fonte: vitrine de renda fixa bancária, oferta de 14/07/2026 (Tax.Máx). [ISENÇÃO] Confirmado por Alexandre em 14/07/2026: isento de IR. Carência de 119 dias. "Qtd Mín." em unidades/lotes, não R$. Taxa muda por oferta; conferir vigência.', w:{C:0,M:0,A:0}},
  {id:'lca', nome:'LCA Banco Cooperativo Sicoob — JAN/2028', cl:'pos', ve:'Renda Fixa Bancária', vol10:1, volFonte:'fixo', sub:'C', liq:571,
   qual:false, min:0, fgc:true, isento:true, emissor:'Sicoob', rating:'AAA', pctCDI:88, prazoAnos:1.56, receber:true, wr:20,
   ver:'Fonte: vitrine de renda fixa bancária, oferta de 14/07/2026 (Tax.Máx). [ISENÇÃO] Confirmado por Alexandre em 14/07/2026: isento de IR. Carência de 571 dias. "Qtd Mín." em unidades/lotes, não R$. Taxa muda por oferta; conferir vigência.', w:{C:0,M:0,A:0}},
];

let PROD = JSON.parse(JSON.stringify(PADRAO));

const state = {
  nome:'', total:500000, perfil:'M', teto:10, qual:false, piso:1000,
  resmodo:'meses', custo:12000, meses:6, resval:72000, resprod:'ts_emerg',
  liqMin:0, liqMax:99999,
  capFundo:5, capPrev:false, capFidc:true, repos:'auto',
  fgcLim:250000, cdiProj:10, aliqEtf:15,
  ve:{'Tesouro Direto':true,'ETF':true,'Fundo':true,'FIDC':true,'Previdência':true,'Renda Fixa Bancária':true},
  objetivos:[],
  q:{},
  simVal:100000, simAnos:10,
};

/* ---------------- utils ---------------- */
const brl  = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const brlc = n => n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const pc   = n => (n*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const pc2  = n => (n*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const parseMoney = s => { const t=String(s).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'); const v=parseFloat(t); return isFinite(v)?v:0; };
const fmtMoney = n => n.toLocaleString('pt-BR',{maximumFractionDigits:0});
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nomePerfil = p => SUBS[p];
const uid = () => 'o'+Math.random().toString(36).slice(2,9);

/* fator de capitalização de um título bancário até o vencimento */
function fatorFuturo(p){
  const tx = (state.cdiProj/100) * ((p.pctCDI||100)/100);
  const anos = p.prazoAnos || 0;
  return Math.pow(1+tx, anos);
}
/* teto de peso individual por concentração de fundo */
function capIndividual(p){
  const alvo = p.ve==='Fundo' || (state.capFidc && p.ve==='FIDC') || (state.capPrev && p.ve==='Previdência');
  return alvo ? state.capFundo/100 : Infinity;
}
const ehBancarioFgc = p => p.ve==='Renda Fixa Bancária' && p.fgc;

/* ---------------- realocação ---------------- */
/* Derrama `peso` em candidatos com folga, por ordem de preferência:
   1) mesma classe + mesmo veículo   2) mesma classe
   3) cadeia de fallback da classe   4) qualquer sobrevivente
   Respeita o teto individual de cada destino. */
function _tentarDistribuir(lista, pesoRef, folgaDe, destinos){
  if(pesoRef.v <= 1e-10) return;
  let guard = 0;
  while(pesoRef.v > 1e-10 && guard++ < 30){
    const cand = lista.filter(v => folgaDe(v) > 1e-10);
    if(!cand.length) return;
    const folgaTotal = cand.reduce((a,b)=>a+Math.min(folgaDe(b), 1), 0);
    if(folgaTotal <= 1e-10) return;
    const dar = Math.min(pesoRef.v, folgaTotal);
    const basePos = cand.reduce((a,b)=>a+pesoBase(b),0);
    cand.forEach(v=>{
      const share = basePos>0 ? pesoBase(v)/basePos : 1/cand.length;
      const add = Math.min(dar*share, folgaDe(v));
      v.w += add; pesoRef.v -= add;
      if(add>1e-10 && !destinos.includes(CM[v.cl].nome)) destinos.push(CM[v.cl].nome);
    });
    if(dar < 1e-10) return;
  }
}
function derramar(itens, peso, origem, folgaDe){
  const destinos = [];
  const pesoRef = {v: peso};
  const tentar = lista => _tentarDistribuir(lista, pesoRef, folgaDe, destinos);
  const vivos = itens.filter(v=>v.on && v!==origem);
  tentar(vivos.filter(v=>v.cl===origem.cl && GRUPO_VE(v.ve)===GRUPO_VE(origem.ve) && !mesmoEmissor(v,origem)));
  tentar(vivos.filter(v=>v.cl===origem.cl && !mesmoEmissor(v,origem)));
  let cls = CM[origem.cl].fb, g=0;
  while(pesoRef.v>1e-10 && cls && g++<12){ tentar(vivos.filter(v=>v.cl===cls)); cls = CM[cls].fb; }
  tentar(vivos);
  return {resto: pesoRef.v, dest: destinos.length ? destinos.join(' + ') : '—'};
}
/* Excesso de uma CLASSE inteira (não de um produto): pula direto para a cadeia de
   fallback a partir da própria classe/grupo excedente — nunca redistribui para
   dentro do mesmo grupo, que é justamente quem estourou o teto. */
function derramarClasse(itens, peso, grupoOrigem, folgaDe){
  const destinos = [];
  const pesoRef = {v: peso};
  const tentar = lista => _tentarDistribuir(lista, pesoRef, folgaDe, destinos);
  const vivos = itens.filter(v=>v.on && grupoDe(v.cl)!==grupoOrigem);
  let cls = CM[grupoOrigem]?.fb, g=0;
  while(pesoRef.v>1e-10 && cls && g++<12){ tentar(vivos.filter(v=>v.cl===cls)); cls = CM[cls].fb; }
  tentar(vivos);
  return {resto: pesoRef.v, dest: destinos.length ? destinos.join(' + ') : '—'};
}
const mesmoEmissor = (a,b) => !!(a.emissor && b.emissor && a.emissor===b.emissor);
/* REPOS: os produtos de reposição (títulos bancários, Tesouro Selic) só disputam peso
   quando a carteira perdeu produtos por VOLATILIDADE ou LIQUIDEZ — exatamente as
   restrições que eles resolvem. Uma exclusão por enquadramento não os convoca:
   o destino natural do FIDC restrito é o outro produto de crédito da mesma classe. */
let REPOS = false;
const pesoBase = v => v.w > 1e-9 ? v.w : ((v.receber && REPOS) ? (v.wr||1)/100 : 0);

/* ---------------- motor ---------------- */
function calcular(){
  const alerts = [];
  const reserva = state.resmodo==='meses' ? state.custo*state.meses : state.resval;
  const bolsoes = state.objetivos.filter(o=>o.carve);
  const somaBolsoes = bolsoes.reduce((a,b)=>a+(b.valor||0),0);
  const investivel = Math.max(state.total - reserva - somaBolsoes, 0);

  if(reserva + somaBolsoes >= state.total && state.total>0)
    alerts.push(['err','A reserva de emergência somada aos objetivos de curto prazo consome todo o patrimônio. Não sobra valor para a carteira de longo prazo.']);
  else if(state.total>0 && reserva/state.total > 0.30)
    alerts.push(['warn',`A reserva representa ${pc(reserva/state.total)} do patrimônio. Vale rever o custo mensal, o número de meses, ou tratar a construção da reserva como o objetivo desta primeira fase.`]);
  if(somaBolsoes>0)
    alerts.push(['info',`${bolsoes.length} objetivo(s) de curto/médio prazo, somando ${brl(somaBolsoes)}, foram retirados da carteira e alocados em bolsões próprios. Ficam fora da reserva de emergência e fora do modelo de perfil.`]);

  const p = state.perfil;
  const emerg = PROD.find(x=>x.emerg);
  const pesoEmerg = emerg ? (emerg.w[p]||0) : 0;

  let itens = PROD.filter(x => !x.emerg && ((x.w[p]||0) > 0 || x.receber))
                  .map(x => ({...x, w:x.w[p]||0, w0:x.w[p]||0, on:true}));
  const soma = itens.reduce((a,b)=>a+b.w,0);
  if(soma>0) itens.forEach(i=>{ i.w/=soma; i.w0=i.w; });

  if(pesoEmerg>0)
    alerts.push(['info',`A linha de reserva de emergência do modelo (${pesoEmerg.toLocaleString('pt-BR')}% no perfil ${nomePerfil(p)}) saiu da carteira e virou o valor informado. Os demais pesos foram renormalizados para 100%.`]);

  /* 1. exclusões por restrição — marca tudo antes de redistribuir, para que o
        peso e o destino reportados sejam os originais, sem efeito cascata. */
  const remocoes = [];
  const excluidos = [];
  for(const i of itens){
    let motivo = null;
    if(!state.ve[i.ve])            motivo = `veículo ${i.ve} desativado na aba Composição`;
    else if(i.vol10 > state.teto)  motivo = `volatilidade ${rotuloVol(i.vol10).toLowerCase()}`;
    else if(i.qual && !state.qual) motivo = 'restrito a investidor qualificado';
    else if(i.liq > state.liqMax)  motivo = `liquidez ${rotuloLiq(i.liq)} acima do prazo aceito (${rotuloLiq(state.liqMax)})`;
    else if(i.liq < state.liqMin)  motivo = `liquidez ${rotuloLiq(i.liq)} abaixo do mínimo exigido`;
    if(motivo){ i.on = false; excluidos.push({i,motivo, repor: /volatilidade|liquidez/.test(motivo)}); }
  }
  REPOS = state.repos==='sempre' ? true
        : state.repos==='nunca'  ? false
        : excluidos.some(e => e.repor && e.i.w0 > 1e-9);
  const sobrev = itens.filter(i=>i.on);
  const destinoDe = cls => { let c=cls,g=0; while(c && g++<12){ if(sobrev.some(v=>v.cl===c)) return c; c=CM[c].fb; } return null; };
  const balde = {};
  for(const {i,motivo} of excluidos){
    if(i.w0 <= 1e-9){ i.w = 0; continue; }   // produto de reposição nunca "removido"
    const d = destinoDe(i.cl);
    remocoes.push({nome:i.nome, peso:i.w, motivo, dest: d?CM[d].nome:'—'});
    if(d) balde[d] = (balde[d]||0) + i.w;
    i.w = 0;
  }
  for(const d in balde){
    const alvo = sobrev.filter(v=>v.cl===d);
    const s = alvo.reduce((a,b)=>a+pesoBase(b),0);
    alvo.forEach(v=> v.w += balde[d] * (s>0 ? pesoBase(v)/s : 1/alvo.length));
  }

  /* 1b. rede de segurança */
  let sw = itens.filter(i=>i.on).reduce((a,b)=>a+b.w,0);
  if(sw < 1e-9){
    const ok = x => !x.emerg && state.ve[x.ve] && x.vol10<=state.teto && (!x.qual||state.qual) && x.liq<=state.liqMax && x.liq>=state.liqMin;
    const cand = PROD.filter(ok).sort((a,b)=>a.vol10-b.vol10 || a.liq-b.liq)[0];
    if(cand){
      const ex = itens.find(i=>i.id===cand.id);
      if(ex){ ex.on=true; ex.w=1; ex.w0=1; } else itens.push({...cand, w:1, w0:1, on:true});
      alerts.push(['warn',`Nenhum produto do perfil ${nomePerfil(p)} atende às restrições. A carteira foi montada integralmente em <b>${esc(cand.nome)}</b>, único produto compatível no cadastro. Reveja o perfil, a volatilidade, a liquidez ou os veículos ativos.`]);
    } else {
      alerts.push(['err','Nenhum produto do cadastro atende às restrições selecionadas. Ajuste os filtros ou inclua produtos no editor.']);
    }
  } else if(Math.abs(sw-1) > 1e-9){
    itens.filter(i=>i.on).forEach(i=>i.w/=sw);
  }
  itens.filter(i=>i.on && i.w<=1e-9).forEach(i=>i.on=false);   // reposição que não recebeu nada

  /* 2. teto de concentração por fundo (ETFs isentos do teto) — e, junto, o teto do FGC.
     As duas restrições recaem sobre o mesmo produto bancário ao mesmo tempo, então
     toda etapa de redistribuição usa a MESMA função de folga (o mínimo das duas),
     nunca uma isolada — senão uma etapa reabre o que a outra fechou. */
  const pesoClasse = () => { const m={}; itens.filter(i=>i.on).forEach(i=>m[i.cl]=(m[i.cl]||0)+i.w); return m; };
  const clsAntes = pesoClasse();
  const tetos = [];
  const capOf = v => capIndividual(v);
  const folgaFgcDe = v => {
    if(!ehBancarioFgc(v)) return Infinity;
    if(investivel <= 0) return Infinity;
    const proj = itens.filter(x=>x.on && x.emissor===v.emissor).reduce((a,b)=>a+b.w*investivel*fatorFuturo(b),0);
    const espaco = (state.fgcLim - proj) / (investivel * fatorFuturo(v));
    return Math.max(espaco, 0);
  };
  const capClassePerfil = CAP_CLASSE[state.perfil] || {};
  const folgaClasseDe = v => {
    const g = grupoDe(v.cl);
    const cap = capClassePerfil[g];
    if(cap===undefined) return Infinity; // ex.: Pós-fixado — sem teto (D-22)
    const pesoGrupo = itens.filter(x=>x.on && grupoDe(x.cl)===g).reduce((a,b)=>a+b.w,0);
    return Math.max(cap/100 - pesoGrupo, 0);
  };
  const folgaGeral = v => Math.max(Math.min(capOf(v) - v.w, folgaFgcDe(v), folgaClasseDe(v)), 0);
  const tetosClasse = [];
  const classesInsoluveis = new Set();
  const produtosInsoluveis = new Set();
  for(let it=0; it<160; it++){
    // 2a. classe inteira acima do teto das Diretrizes — checado primeiro (é a restrição mais ampla)
    const pesosGrupo = {};
    itens.filter(i=>i.on).forEach(i=>{ const g=grupoDe(i.cl); pesosGrupo[g]=(pesosGrupo[g]||0)+i.w; });
    let grupoExc = null, capExc = null;
    for(const g in pesosGrupo){
      if(classesInsoluveis.has(g)) continue;
      const cap = capClassePerfil[g]; if(cap===undefined) continue;
      if(pesosGrupo[g] > cap/100 + 1e-9){ grupoExc=g; capExc=cap/100; break; }
    }
    if(grupoExc){
      const membros = itens.filter(i=>i.on && grupoDe(i.cl)===grupoExc);
      const somaAtual = membros.reduce((a,b)=>a+b.w,0);
      const ex = somaAtual - capExc;
      const fator = capExc/somaAtual;
      membros.forEach(m=> m.w *= fator);
      const {resto, dest} = derramarClasse(itens, ex, grupoExc, folgaGeral);
      tetosClasse.push({classe: CM[grupoExc]?.nome || grupoExc, excesso:ex, dest, resto});
      if(resto > 1e-9){
        // ninguém tinha folga: devolve o que não coube (dinheiro não desaparece) e não insiste
        // nessa classe de novo — mas outras restrições (teto de fundo) continuam sendo checadas.
        membros[membros.length-1].w += resto;
        classesInsoluveis.add(grupoExc);
      }
      continue;
    }
    // 2b. produto individual acima do teto de concentração por fundo
    const excedente = itens.filter(i=>i.on && !produtosInsoluveis.has(i.id) && i.w > capOf(i) + 1e-9).sort((a,b)=>b.w-a.w)[0];
    if(!excedente) break;
    const ex = excedente.w - capOf(excedente);
    excedente.w = capOf(excedente);
    const {resto, dest} = derramar(itens, ex, excedente, folgaGeral);
    tetos.push({nome:excedente.nome, excesso:ex, dest, resto, motivo:`teto de ${state.capFundo}% por fundo`});
    if(resto > 1e-9){ excedente.w += resto; produtosInsoluveis.add(excedente.id); }
  }

  const clsDepois = pesoClasse();
  const deriva = CLASSES.map(c=>({c, d:(clsDepois[c.id]||0)-(clsAntes[c.id]||0)}))
                        .filter(x=>x.d < -0.005);

  /* 3. teto do FGC por grupo emissor — sobre o valor PROJETADO no vencimento */
  const fgc = [];
  const fgcEstouro = [];
  if(investivel > 0){
    for(let it=0; it<40; it++){
      const grupos = {};
      itens.filter(i=>i.on && ehBancarioFgc(i) && i.w>1e-9).forEach(i=>{
        (grupos[i.emissor] = grupos[i.emissor] || []).push(i);
      });
      let estourou = null;
      for(const g in grupos){
        const proj = grupos[g].reduce((a,b)=>a + b.w*investivel*fatorFuturo(b), 0);
        if(proj > state.fgcLim + 0.01){ estourou = {g, proj, itens:grupos[g]}; break; }
      }
      if(!estourou) break;
      const k = state.fgcLim / estourou.proj;
      let excesso = 0;
      estourou.itens.forEach(i=>{ const novo = i.w*k; excesso += i.w - novo; i.w = novo; });
      const origem = estourou.itens[0];
      const {resto, dest} = derramar(itens, excesso, origem, folgaGeral);
      if(resto > 1e-9){
        // ninguém tinha folga: devolve o resto proporcionalmente ao grupo e registra o estouro
        const sg = estourou.itens.reduce((a,b)=>a+b.w,0);
        estourou.itens.forEach(i=> i.w += resto * (sg>0 ? i.w/sg : 1/estourou.itens.length));
        const projFinal = estourou.itens.reduce((a,b)=>a + b.w*investivel*fatorFuturo(b), 0);
        fgcEstouro.push({emissor:estourou.g, proj:projFinal, sobra: projFinal - state.fgcLim});
        break;
      }
      fgc.push({emissor:estourou.g, proj:estourou.proj, excesso, dest});
    }
  }
  /* Rede de segurança do FGC: o loop acima pode oscilar sem convergir quando dois ou mais
     emissores disputam a mesma folga escassa (ex.: Tesouro Direto desligado, sem válvula de
     segurança) — cada um empurra o excesso pro outro, nenhum aciona o branch de "sem folga"
     a tempo. Reconfere no final, sempre, independente de como o loop terminou. */
  if(investivel > 0){
    const gruposFinal = {};
    itens.filter(i=>i.on && ehBancarioFgc(i) && i.w>1e-9).forEach(i=>{
      (gruposFinal[i.emissor] = gruposFinal[i.emissor] || []).push(i);
    });
    for(const g in gruposFinal){
      if(fgcEstouro.some(e=>e.emissor===g)) continue; // já registrado
      const proj = gruposFinal[g].reduce((a,b)=>a+b.w*investivel*fatorFuturo(b),0);
      if(proj > state.fgcLim + 0.01) fgcEstouro.push({emissor:g, proj, sobra: proj-state.fgcLim});
    }
  }

  /* 4. piso por posição */
  const cortes = [];
  const pisoInsoluveis = new Set();
  for(let it=0; it<40; it++){
    const cand = itens.filter(i=>i.on && i.w>0 && !i.prot && !pisoInsoluveis.has(i.id));
    if(itens.filter(i=>i.on&&i.w>0).length <= 1) break;
    cand.sort((a,b)=>a.w-b.w);
    const alvo = cand.find(v => v.w*investivel < Math.max(state.piso, v.min||0));
    if(!alvo) break;
    alvo.on=false; const w=alvo.w; alvo.w=0;
    const {resto, dest} = derramar(itens, w, alvo, folgaGeral);
    if(resto > 1e-9){
      // ninguém tinha folga para receber tudo: religa o alvo com o que sobrou, em vez de
      // deixar o peso sumir (isso inflaria as outras classes na normalização final do passo 5,
      // inclusive as que já estavam exatamente no próprio teto — ver ERROR-LOG E-13). Marca
      // como insolúvel pra não ficar tentando cortar o mesmo item de novo sem progresso.
      alvo.on = true;
      alvo.w = resto;
      pisoInsoluveis.add(alvo.id);
    }
    cortes.push({nome:alvo.nome, peso:w, dest, minimo:Math.max(state.piso,alvo.min||0)});
  }

  /* O piso por posição pode reduzir a carteira a um punhado de sobreviventes — no limite,
     a um só. Quando isso acontece, o teto de classe pode acabar estourado por pura falta
     de alternativa (não há mais nenhum outro produto elegível pra segurar o excesso). Isso
     não é erro de cálculo — é o piso vencendo o teto — mas tem de virar aviso, nunca silêncio. */
  const violacoesClassePorPiso = [];
  {
    const pesosFinal = {};
    itens.filter(i=>i.on).forEach(i=>{ const g=grupoDe(i.cl); pesosFinal[g]=(pesosFinal[g]||0)+i.w; });
    for(const g in pesosFinal){
      const cap = capClassePerfil[g]; if(cap===undefined) continue;
      if(pesosFinal[g] > cap/100 + 1e-6) violacoesClassePorPiso.push({classe: CM[g]?.nome||g, pesoFinal: pesosFinal[g], cap});
    }
  }

  /* 5. valores e resíduo de arredondamento */
  const vivos = itens.filter(i=>i.on && i.w>1e-9);
  /* Nenhum produto sobreviveu aos filtros: o dinheiro não pode desaparecer da conta.
     Fica explícito como "não alocado" e a soma continua fechando no patrimônio. */
  const naoAlocado = (vivos.length===0 && investivel>0.005) ? investivel : 0;
  const sw2 = vivos.reduce((a,b)=>a+b.w,0);
  if(sw2>0 && Math.abs(sw2-1)>1e-9) vivos.forEach(i=>i.w/=sw2);
  vivos.forEach(i => i.valor = Math.round(i.w*investivel*100)/100);
  const resid = Math.round((investivel - vivos.reduce((a,b)=>a+b.valor,0))*100)/100;
  if(vivos.length && Math.abs(resid)>0) vivos.sort((a,b)=>b.valor-a.valor)[0].valor += resid;

  /* avisos de coerência */
  if(state.teto<7 && p==='A')
    alerts.push(['warn','Perfil Arrojado combinado com tolerância a volatilidade reduzida. A carteira resultante não expressa o perfil declarado — verifique a aderência ao suitability antes de propor.']);
  if(naoAlocado>0)
    alerts.push(['err',`<b>${brl(naoAlocado)} não foram alocados.</b> Nenhum produto do cadastro sobrevive à combinação atual de perfil, volatilidade, liquidez e veículos ativos. O valor aparece como "não alocado" na tabela — não sumiu da conta, mas também não tem destino. Relaxe um filtro ou cadastre um produto compatível.`]);
  if(investivel>0 && investivel < 10000)
    alerts.push(['warn','Valor investível baixo. A carteira tende a ficar concentrada em poucas linhas — considere começar só pela reserva e escalonar aportes.']);
  const banc = vivos.filter(i=>i.ve==='Renda Fixa Bancária');
  if(banc.length && banc.some(i=>/PLACEHOLDER/.test(i.ver||'')))
    alerts.push(['warn','A carteira usa títulos bancários que ainda estão como <b>placeholder</b> no cadastro (emissor, % do CDI e prazo fictícios). Preencha no editor antes de levar ao cliente — a checagem de FGC depende desses campos.']);

  tetosClasse.forEach(t => alerts.push(['info',
    `A classe <b>${esc(t.classe)}</b> ultrapassava o teto de alocação das Diretrizes para o perfil ${nomePerfil(p)}. Excesso de ${pc(t.excesso)} realocado em <b>${esc(t.dest)}</b>${t.resto>1e-9?' — parte não coube, nenhum destino com folga':''}.`]));
  tetos.forEach(t => alerts.push(['info',
    `<b>${esc(t.nome)}</b> ultrapassava o ${t.motivo}. Excesso de ${pc(t.excesso)} realocado em <b>${esc(t.dest)}</b>${t.resto>1e-9?' — parte não coube, nenhum destino com folga':''}.`]));
  fgc.forEach(f => alerts.push(['info',
    `Grupo emissor <b>${esc(f.emissor)}</b> projetava ${brl(f.proj)} no vencimento, acima do limite de ${brl(state.fgcLim)} do FGC. Excesso de ${pc(f.excesso)} realocado em <b>${esc(f.dest)}</b>.`]));
  deriva.forEach(({c,d}) => {
    const capG = capClassePerfil[grupoDe(c.id)];
    const noTeto = capG!==undefined && Math.abs((clsDepois[c.id]||0) - capG/100) < 0.005;
    if(noTeto) return; // a classe encolheu porque bateu no próprio teto das Diretrizes — comportamento esperado, não é falta de fundo
    alerts.push(['warn',
      `O teto de ${state.capFundo}% por fundo tirou ${pc(-d)} da classe <b>${c.nome}</b> — não há outro fundo dessa classe no cadastro com folga para receber. A alocação mudou de categoria. <b>Cadastre um segundo fundo de ${c.nome}</b> no editor para preservar a classe.`]);
  });
  fgcEstouro.forEach(f => alerts.push(['err',
    `<b>Não foi possível respeitar o FGC.</b> O grupo emissor <b>${esc(f.emissor)}</b> projeta ${brl(f.proj)} no vencimento — ${brl(f.sobra)} acima do limite de ${brl(state.fgcLim)} — e nenhum outro produto compatível com os filtros tem folga para receber o excedente. Cadastre mais emissores bancários, relaxe a liquidez ou aceite exposição sem cobertura do FGC de forma consciente.`]));
  if(vivos.length===1 && vivos[0].ve==='Renda Fixa Bancária')
    alerts.push(['warn','A carteira ficou concentrada em um único emissor bancário. Com liquidez D+0 o cadastro só oferece o CDB de liquidez diária — o Tesouro Selic liquida em D+1. Se D+1 for aceitável, relaxe o filtro de liquidez.']);
  remocoes.forEach(r => alerts.push(['warn',
    `<b>${esc(r.nome)}</b> (${pc(r.peso)}) removido: ${r.motivo}. Peso realocado em <b>${r.dest}</b>.`]));
  cortes.forEach(c => alerts.push(['info',
    `<b>${esc(c.nome)}</b> (${pc(c.peso)}) ficaria em ${brl(c.peso*investivel)}, abaixo do mínimo de ${brl(c.minimo)}. Peso realocado em <b>${c.dest}</b>.`]));
  itens.filter(i=>i.on && pisoInsoluveis.has(i.id)).forEach(i => alerts.push(['warn',
    `<b>${esc(i.nome)}</b> ficou em ${brl(i.w*investivel)}, abaixo do piso de ${brl(state.piso)}. Não havia destino com folga para esse valor sem violar o teto de concentração, o FGC ou o teto de classe de outra posição — preferi manter esse resíduo pequeno a forçar através de outro limite. Reduza o piso ou relaxe algum filtro para eliminar essa posição pequena.`]));
  violacoesClassePorPiso.forEach(v => alerts.push(['err',
    `<b>O piso por posição não deixou espaço para respeitar o teto da classe ${esc(v.classe)}.</b> Depois de cortar as posições abaixo de ${brl(state.piso)}, não sobrou nenhum outro produto elegível para segurar o excesso, e a classe ficou em ${pc(v.pesoFinal)} — acima do teto de ${pc(v.cap/100)} das Diretrizes. Reduza o piso por posição ou relaxe os filtros (volatilidade, liquidez, enquadramento) para caber mais produtos na carteira.`]));

  return {reserva, investivel, naoAlocado, somaBolsoes, bolsoes, vivos, alerts, remocoes, cortes, tetos, tetosClasse, violacoesClassePorPiso, fgc, fgcEstouro};
}

/* ---------------- objetivos ---------------- */
/* Regra de horizonte: quanto menor o prazo, menor a volatilidade e a liquidez aceitas. */
function regraObjetivo(anos){
  if(anos <= 1)  return {teto:0, liq:30,  nome:'Caixa'};
  if(anos <= 3)  return {teto:3, liq:180, nome:'Curto prazo'};
  if(anos <= 5)  return {teto:6, liq:365, nome:'Médio prazo'};
  return {teto:10, liq:99999, nome:'Longo prazo'};
}
function sugerirObjetivo(o){
  const r = regraObjetivo(o.anos);
  const dias = Math.max(Math.round(o.anos*365), 1);
  const cands = PROD.filter(p => !p.emerg && state.ve[p.ve] && p.vol10<=r.teto
                              && (!p.qual || state.qual)
                              && p.liq <= Math.min(r.liq, dias))
                    .sort((a,b)=> a.vol10-b.vol10 || a.liq-b.liq);
  const escolhidos = cands.slice(0,3);
  const pesos = [0.5,0.3,0.2].slice(0,escolhidos.length);
  const s = pesos.reduce((a,b)=>a+b,0);
  return {regra:r, linhas: escolhidos.map((p,i)=>({p, w:pesos[i]/s, valor: Math.round((o.valor||0)*pesos[i]/s*100)/100}))};
}

/* ---------------- simulação come-cotas ---------------- */
/* Fundo de RF longo prazo: come-cotas semestral a 15%; no resgate, 15% sobre o
   ganho desde a última tributação (alíquota final igual à do come-cotas → sem
   complemento). ETF de RF: sem come-cotas; alíquota única no resgate.
   Modelo determinístico, CDI constante. Não é histórico e não é promessa. */
function simComeCotas(V0, cdiAA, anos, aliqEtf){
  const iSem = Math.pow(1+cdiAA, 0.5) - 1;
  const nSem = Math.max(Math.round(anos*2), 1);
  let n = 1, c = V0, cref = V0, pago = 0;
  const serie = [{t:0, fundo:V0, etf:V0}];
  for(let s=1; s<=nSem; s++){
    c *= (1+iSem);
    const ganho = n*(c - cref);
    const imp = 0.15*ganho;
    pago += imp;
    n -= imp/c;
    cref = c;
    serie.push({t:s/2, fundo:n*c, etf:V0*Math.pow(1+cdiAA, s/2)});
  }
  const brutoEtf = V0*Math.pow(1+cdiAA, nSem/2);
  return {
    serie,
    fundoBruto: n*c,                       // já descontado o come-cotas
    fundoLiquido: n*c,                     // resgate logo após come-cotas → sem imposto adicional
    impostoComeCotas: pago,
    etfBruto: brutoEtf,
    etfLiquido: V0 + (brutoEtf - V0)*(1 - aliqEtf/100),
    impostoEtf: (brutoEtf - V0)*(aliqEtf/100),
  };
}

if(typeof module !== 'undefined') module.exports = {calcular, state, PROD, PADRAO, simComeCotas, sugerirObjetivo, CLASSES, CM, rotuloVol, VEICULOS};
