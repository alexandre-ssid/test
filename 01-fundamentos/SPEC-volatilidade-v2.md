# SPEC — Metodologia de volatilidade em escala 0–10
**status: PROPOSTA — aguardando dados (BACKLOG B-13) · não implementada no motor**

Registra a metodologia pedida por Alexandre para substituir a escala atual (`vol`, 0–3, discreta e por categoria) por uma escala contínua de 0 a 10, com regra de cálculo própria por tipo de ativo. Nenhum produto do cadastro teve seu `vol` alterado por este documento — ele é a especificação, não a aplicação.

---

## Regra por tipo de ativo

| Tipo de ativo | Regra | Fonte do dado | Tenho o dado? |
|---|---|---|---|
| Tesouro Selic | fixo = **0** | — | ✅ (constante) |
| Título bancário (CDB/LCI/LCA/LCD) | fixo = **1** | — | ✅ (constante) |
| FIDC | fixo = **3** | — | ✅ (constante) |
| Fundos (multimercado, long-short, etc.) | derivado do **drawdown** (máxima queda histórica) | Guia de Fundos XP | ❌ **não tenho acesso** |
| ETF e ações | média da **volatilidade (VOL)** histórica, transformada em % e mapeada para 0–10 | Histórico de preços / dado de mercado | ❌ **não tenho fonte confiável para todos os tickers** |
| Crédito privado, Tesouro Prefixado, Tesouro IPCA+ | 0 a 10 conforme **duration** | Calculável a partir do vencimento e da estrutura do papel | 🟡 **calculável**, mas a fórmula de conversão duration→0-10 precisa de um teto de referência (ver abaixo) |
| Demais ativos (alternativos, previdência, etc.) | normalizar entre 0 e 10 por critério próprio | A definir | ❌ |

## O que falta para implementar (por linha da tabela)

1. **Fundos por drawdown** — preciso do drawdown máximo (ou um período de referência, ex. 5 anos) de cada fundo do cadastro, extraído do Guia de Fundos XP. Não tenho acesso a essa base. **Ação: Alexandre extrai e envia por fundo.**
2. **ETF/ação por VOL histórica** — preciso da volatilidade anualizada (ou o "VOL" que a XP usa nas fichas) de cada ticker do cadastro (LFTB11, HGBR11, SPXR11, DIVO11, GOLX11, BCOM39, HASH11, BILF39...). Não tenho fonte para puxar isso de forma confiável e homogênea para todos. **Ação: Alexandre extrai e envia por ticker, ou aponta a fonte que devo usar.**
3. **Duration → 0–10** — esta eu calculo, mas preciso de uma âncora: qual duration mapeia para 10 (o teto da escala)? Proposta a validar: usar a duration do ativo de maior prazo do cadastro hoje (Tesouro IPCA+ 2050 / Educa+, ~24 anos) como referência de 10, e escalar linearmente os demais. **Decisão pendente de confirmação do Alexandre.**
4. **Demais ativos** — nenhum critério definido ainda. **Ação: Alexandre define o critério, ou aceita a proposta de usar volatilidade histórica quando existir preço de mercado, e um piso conservador (ex. 6) para o que não tem preço de mercado (previdência, FIDC de nicho).**

## Decisão de migração (ver DECISOES D-14)

Proposta: criar um campo `vol10` **paralelo** ao `vol` (0–3) atual. O motor continua operando sobre `vol` até que:
(a) todos os produtos tenham `vol10` populado com dado real (não estimado por mim), e
(b) uma sessão dedicada reescreva o filtro de teto, a UI (radios N0–N3 viram um slider ou 11 níveis), e a regra de objetivo por prazo, e
(c) o fuzz e o e2e passem de novo com a escala nova.

Migrar em big-bang, na mesma sessão em que os dados chegarem, é desaconselhado: é troca de fundação do motor, não ajuste de cadastro.

---

## Histórico
- v0.1 — 14/07/2026 — Especificação aberta a partir do item #8 da lista de pendências de Alexandre. Nenhum dado de drawdown ou volatilidade histórica foi inventado; os campos marcados ❌ aguardam fonte.

---

## Atualização — 14/07/2026 — MIGRADO (ver DECISOES D-15, D-16, D-17)

Migração aplicada ao motor: campo `vol` (0–3) substituído por `vol10` (0–10) em todo o cadastro, no motor (`state.teto`, filtros, alertas) e na UI (input numérico + atalhos, substituindo os 4 rádios N0–N3). 12.000 cenários de fuzz + e2e, zero falhas.

### Cobertura real por produto (36 no total)

| Fonte | Qtde | Produtos | Confiança |
|---|---|---|---|
| **Fixo** | 8 | Tesouro Selic ×2 (=0), título bancário ×4 (=1), FIDC ×2 (=3) | ✅ alta — regra explícita do Alexandre |
| **Duration** (calculada) | 6 | B30, B35, B50, Educa+, LTN29, LTN32 | 🟡 média — cálculo é exato (anos até o vencimento, papéis "Principal"/LTN são zero-coupon), mas a **âncora** (20 anos = 10) é uma escolha a confirmar |
| **Drawdown real** (Guia de Fundos 06/2026) | 2 | Plural Deb. Incentivadas Hedge 30 (dd −2,53% → 0,5), AZ Quest Bayes (dd −24,62% → 4,9) | 🟢 alta — nome do fundo bate exatamente com o do cadastro |
| **Provisório** (ponte da escala antiga, aguardando dado) | 20 | Todos os ETFs/ações (LFTB11, NLFA11, LFIN11, MARG11, DEBB11, HGBR11, SPXR11, BILF39, DIVO11, GOLX11, BCOM39, HASH11), as 5 previdências (Bradesco, Brave, Trend, Kapitalo, Arca Grão), e XP Deb CDI 30 e AlphaKey (matches inconclusivos no guia) | 🔴 nenhuma — número existe só para o motor funcionar, marcado `volFonte:'provisorio'` e com nota em `ver` |

### Por que 20 de 36 continuam provisórios

1. **ETFs e ações (12 produtos) — ✅ 3 RESOLVIDOS, 9 pendentes por histórico curto (20/07/2026).** A rota de rede para `query1.finance.yahoo.com` funciona (via `curl`/`fetch` com header `User-Agent`). Uma primeira tentativa (mesma sessão) suspeitou de dado sintético (ver ERROR-LOG E-16, revisado) por evidência fraca; um reteste com 4 referências mundialmente conhecidas (Ibovespa, Bitcoin, Apple, Vale3, 5 anos de histórico) confirmou preços plausíveis e coincidências específicas (drawdown do DIVO11 batendo exatamente com o crash da COVID; drawdown do HASH11 com o inverno cripto de 2021-22) — **conclusão: o dado é genuíno**, não fabricado.
   - **Resolvidos com drawdown real:** DEBB11 (dd −1,23%, vol10 0,25), DIVO11 (dd −40,10%, vol10 8,02), HASH11 (dd −78,08%, vol10 10 — teto).
   - **Resolvidos por proxy (5):** SPXR11 (proxy S&P 500/^GSPC, dd −33,92%, vol10 6,78), GOLX11 (proxy ouro/GC=F, dd −25,06%, vol10 5,01), BILF39 (proxy iShares Latin America 40/ILF, dd −60,41%, vol10 10 teto), BCOM39 (proxy iShares Commodity Dynamic Roll/COMT — match por nome, não confirmado por CNPJ, dd −48,95%, vol10 9,79), HGBR11 (proxy LQD/iBoxx IG — proxy imperfeito, HGBR11 é "hedge carry", dd −29,37%, vol10 5,87). Metodologia (D-30) confirmada por Alexandre em 20/07/2026: quando o próprio ETF tem histórico curto demais na B3 pra medir drawdown com confiança, usar o índice/ativo internacional que ele replica.
   - **Mantidos provisórios por decisão (D-31): LFTB11 (×2 registros), NLFA11, LFIN11, MARG11.** São ETFs de renda fixa/DI especificamente brasileiros (letras financeiras, debêntures DI) sem índice internacional líquido equivalente no Yahoo Finance. Alexandre confirmou manter o valor-ponte em vez de forçar um proxy sem base.
   - **Resolvidos via dados abertos da CVM (2): XP Debêntures Incentivadas CDI CP** (CNPJ 26.803.233/0001-16, dd −1,61%, vol10 0,32) **e AlphaKey LS FIF em Cotas FIM** (CNPJ 52.304.477/0001-64, dd −0,92%, vol10 0,18). Alexandre confirmou o nome/CNPJ oficial em 20/07/2026 (resolvendo a ambiguidade de match anterior); nenhum dos dois está na planilha de previdências nem tem ticker no Yahoo Finance (não são negociados em bolsa), mas ambos são fundos registrados na CVM — o portal **dados.cvm.gov.br** publica a cota diária (`VL_QUOTA`) de todo fundo registrado no Brasil, por CNPJ, em arquivos mensais desde 2021 (e anuais antes disso). Baixei 66 meses e filtrei pelos 2 CNPJs (2.093 linhas). **B-19 fecha com esses dois.**
   - **Manutenção:** `codigo-fonte/atualizar-volatilidade.js` (`npm run atualizar-volatilidade`) refaz a busca dos 8 ETFs com dado real/proxy via Yahoo Finance e compara com o `core.js`, sem escrever automaticamente. Não cobre XP Deb/AlphaKey (fonte CVM, processo manual — baixar os meses novos de dados.cvm.gov.br e refiltrar pelos 2 CNPJs).

**B-19 fechado em 20/07/2026 — 32 de 36 produtos com dado real/calculado.** Só os 4 ETFs de renda fixa/DI brasileira (LFTB11×2, NLFA11, LFIN11, MARG11) seguem provisórios, por decisão documentada (D-31), não por falta de tentativa.
2. **Previdência (5 produtos) — ✅ RESOLVIDO em 20/07/2026.** Alexandre enviou a planilha "Guia-de-Previdência_Julho26_Externo-3.xlsm" (aba Prev XPCS), que cobre previdência (o Guia de Fundos comum não cobre). Coluna "Volatilidade" traz o dado real (desde o início do fundo, valor absoluto — não mensal, não % do CDI apesar do rótulo ambíguo). Fórmula de conversão confirmada por Alexandre (D-28): **`vol10 = min(10, volatilidade_decimal × 10)`** — equivalente a dizer que 100% de volatilidade = vol10 10. Os 5 produtos foram atualizados no `core.js` com `volFonte:'volatilidade'`: Bradesco Ultra (0,20%→0,0), Brave (0,07%→0,0), Arca Grão Advisory FIC FIM (5,42%→0,5), Trend IMA-B 5+ (5,88%→0,6), Kapitalo K10 Global (9,22%→0,9). Dois matches exigiram confirmação por haver variantes parecidas na planilha (Arca Grão tinha uma versão de Renda Fixa e uma de Multiestratégia; Kapitalo tinha uma versão fechada via Icatu e uma aberta via XP Seg) — Alexandre confirmou as corretas.
3. **XP Deb CDI 30 e AlphaKey — match inconclusivo.** Encontrei fundos com nome parecido no guia (Imab5/Imab para o XP Deb, "Ações" em vez de "Long Short" para o AlphaKey), mas o indexador ou a estratégia não batem com o que está descrito no nosso cadastro. Prefiro deixar provisório a aplicar um número que pode ser de outro fundo.

### Fórmulas aplicadas
- **Duration → 0–10:** `vol10 = min(10, anos_até_vencimento / 20 * 10)`
- **Drawdown → 0–10:** `vol10 = min(10, |drawdown| / 0.50 * 10)`
- **Volatilidade (previdência) → 0–10:** `vol10 = min(10, volatilidade_decimal * 10)` — confirmada por Alexandre em 20/07/2026 (D-28), a partir da coluna "Volatilidade desde o início" da planilha Guia-de-Previdência
- **Ponte provisória (bridge):** antigo 0→0, 1→2,0, 2→5,0, 3→8,0 (linear grosseiro, só para não travar o motor) — ainda em uso nos 15 produtos que seguem provisórios (12 ETFs/ações + 2 fundos de match inconclusivo)

Nenhum valor de ETF/ação, previdência, ou dos dois fundos de match inconclusivo deve ser tratado como definitivo. Todos carregam `volFonte:'provisorio'` e aparecem sinalizados no editor (aba Produtos, coluna "Fonte Vol.") e na boleta exportada.
