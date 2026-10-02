# brave-lookthrough — fonte do deck (v1.0 · 02/10/2026)
Gera `../brave-lookthrough-set26-v1.0.pptx` (8 slides: capa, 1 por fundo Brave, sobreposição de FIDCs, fontes).

Ordem: baixar da CVM `cda_fi_202606.zip`, `cda_fi_202608.zip` (dados/FI/DOC/CDA/DADOS) e `inf_mensal_fidc_202606/08.zip` (dados/FIDC/DOC/INF_MENSAL/DADOS), descompactar em `cda2026MM/` e `fidcMM/` → `python3 ext.py` → `python3 build_data.py` → `python3 prep.py` → `node deck.js deck.pptx` (pptxgenjs; `apply_theme.js` da skill pptx).
`slides.json` = dados finais usados no deck (auditáveis sem rodar nada).
Níveis: 1 fundo · 2 classes da lâmina set/26 · 3 ativos da CDA (Brave 90/180/Prev FIC em 31/08/26; Iron/FIFE em 30/06/26, agosto em sigilo até 29/11/26) · 4 lastro = rateio do Informe Mensal FIDC de cada FIDC investido (aproximação).
