# Nota — vitrine de renda fixa bancária (produtos-renda-fixa-emissao-bancaria__5_.xlsx)
**14/07/2026**

130 ofertas ativas na vitrine (CDB, LCA, LCD, LCI). Campo "Risco" da planilha **não é liquidez nem duration limpa** — é um código de rating interno, correlaciona fracamente com prazo. O campo que de fato importa para o motor é **"Carência" (dias)**: para CDBs com liquidez diária ele vem baixo (1) mesmo com vencimento distante; para LCI/LCD ele é quase igual ao vencimento (sem saída antecipada). Usei "Carência" como `liq` no cadastro.

Selecionei 1 produto real por categoria (CDB liq. diária, CDB carregado, LCI, LCA), priorizando rating de grau de investimento — descartei o CDB Banco Digimais (melhor taxa da vitrine, mas rating CCC, especulativo) para não colocar um produto de risco de crédito alto como padrão do guia. Os outros 126 continuam na vitrine, não importados; se precisar de mais opções por emissor, é só pedir.

"Qtd Mín." da planilha é contagem de lotes/unidades de emissão, não valor em R$ — não consegui converter sem saber o valor de face de cada papel. Deixei `min:0` no cadastro e a ressalva no campo `ver` de cada produto.
