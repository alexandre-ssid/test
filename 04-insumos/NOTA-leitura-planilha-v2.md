# Nota de leitura — Alocação_PG_v2.xlsx
**14/07/2026 · [RECONSTRUÍDO da análise da sessão 3]**

Três problemas na planilha v2 (detalhe em `ERROR-LOG.md` E-04):

1. **Conservador soma 105%.** Coluna de classe fecha 100%; produtos somam 105%. Quatro classes (Inflação, Prefixado, RV Global, Fundos Listados) têm produtos a 1,25× a classe — valores idênticos aos da v1, não atualizados. Contorno no HTML: escala 0,8 nesses blocos.
2. **Célula de ETFs da aba COMPOSIÇÃO quebrada.** Fórmula com lista fixa de células não acompanhou as 3 linhas novas do Pós-fixado. Subestima ETFs em 15pp: diz 29,8%/31,5% (M/A), correto é 44,8%/46,5%.
3. **Linha C/M/A não reconcilia.** Na v1, solver achava atribuição por produto com erro 0. Na v2, erro mínimo 7pp. São constantes digitadas desatualizadas.

**Tesouro Direto, Previdência e Fundos conferem** nos três perfis. Só ETFs e a linha C/M/A estão erradas.
