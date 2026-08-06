# BACKLOG — Guia de Alocação PG
**Função:** pendências priorizadas com dono. O `INDEX.md` espelha os ativos da fase.
**Atualizar:** ao abrir/fechar pendência.

---

## P0 — bloqueiam uso real com cliente

*(nenhuma aberta no momento — B-01 e B-02 da rodada anterior foram tratados nesta sessão, ver Concluído)*

| B-21 | **Teto por classe de alocação — FECHADO em 15/07/2026.** Implementado a partir da imagem "Bandas de Alocação por Classe de Ativo" (limite superior de cada banda, por perfil). Pós-fixado sem teto (classe "livre de risco", D-22); RV América Latina compartilha o teto de RV Global (D-23); Alternativos no Conservador = 0% (confirmado). Mesma disciplina do E-07: uma única `folgaGeral` agora combina TRÊS restrições (concentração de fundo, FGC, teto de classe). Achou e corrigiu um bug real no caminho (E-12: uma classe sem destino travava a checagem de teto de fundo). 12.000 cenários de fuzz com o novo invariante, zero falhas. | — | ✅ fechado |

| B-22 | **✅ FECHADO em 03/08/2026.** Projeto migrado para este ambiente (Claude Code / Cowork), apontando para esta pasta — fim do ciclo zip-upload-rezip entre sessões, confirmado por Alexandre. `CLAUDE.md`/`INDEX.md` seguem fazendo o papel de instruções/estado, sem precisar de adaptação. Atenção que continua valendo (não é bloqueio, é lembrete operacional): tarefa agendada que toca arquivo local exige o ambiente ativo na hora; e atualizar o cadastro a partir de planilha nova continua exigindo confirmação humana — nenhuma das planilhas recebidas até hoje fechou sem ajuste. | Alexandre migrou | ✅ fechado |
| B-23 | **Fusão com o Portfolio Management System** — adiada por decisão do Alexandre em 15/07/2026 (D-24). Retomar quando B-19 e os 2 modos restantes do B-12 estiverem prontos aqui, e o PMS tiver amadurecido o suficiente para consumir o motor como módulo. | Alexandre revisita quando os dois lados estiverem prontos | ⏸ pausado por decisão |

## P1 — motores novos, alto valor, exigem escopo próprio antes de codar

| # | Pendência | Dono | Estado |
|---|---|---|---|
| B-13 | **Reclassificação de volatilidade em escala 0–10** (item #8) — **MIGRADO em 14/07/2026.** Motor e UI inteiros passaram de `vol` (0–3) para `vol10` (0–10). 8 produtos com fonte fixa (Tesouro Selic=0, bancário=1, FIDC=3), 6 por duration calculada (B30/B35/B50/Educa+/LTN29/LTN32), 2 por drawdown real do Guia de Fundos 06/2026 (Plural Deb. Hedge 30, AZ Quest Bayes). **20 produtos seguem provisórios** (`volFonte:'provisorio'`): todos os ETFs/ações (falta série de preços B3/Yahoo — sem acesso programático confirmado, ver SPEC), as 5 previdências (guia não cobre produtos com wrapper de seguro), e XP Deb CDI 30 + AlphaKey (match inconclusivo no guia). Detalhe completo em `01-fundamentos/SPEC-volatilidade-v2.md`. | Alexandre fornece os dados que faltam · Claude aplica | 🟡 parcialmente fechado (16 de 36 confirmados) |
| B-19 | **Preencher os 20 produtos com `volFonte:'provisorio'`** — ✅ **PRATICAMENTE FECHADO em 20/07/2026: 32 de 36 produtos com dado real/calculado.** 17 produtos resolvidos nesta sessão: 5 previdências (planilha, D-28) + DEBB11/DIVO11/HASH11 (drawdown próprio, D-29) + SPXR11/GOLX11/BILF39/BCOM39/HGBR11 (drawdown do índice/ativo replicado, D-30) + XP Deb CDI CP/AlphaKey (drawdown real via dados abertos da CVM, D-32). **Restam só 4, mantidos provisórios por decisão** (D-31): LFTB11 (×2 registros), NLFA11, LFIN11, MARG11 — ETFs de renda fixa/DI brasileira sem índice internacional replicável. | — | ✅ fechado (4 exceções documentadas por decisão) |
| B-20 | **Confirmar as âncoras da conversão para 0–10** (D-16): duration 20 anos=10, drawdown 50%=10. São escolhas redondas documentadas, não convenção oficial da XP. | Alexandre | ⏳ P2 |

## P2 — UX / layout

| # | Pendência | Dono | Estado |
|---|---|---|---|
| B-24 | **✅ FECHADO (v3.2.0, 31/07/2026).** Coluna de parâmetros da aba Carteira agora é **recolhível** (botão "« Recolher / » Expandir parâmetros"): recolhe a `.rail` e dá largura total à tabela, resolvendo o aperto de espaço. Implementada a ideia que o Alexandre propôs, em vez de caçar o mecanismo exato da sobreposição — a navegação já reseta o scroll ao trocar de aba, e o controle de espaço fica com o usuário. `.grid.rail-oculta`. | Claude | ✅ |
| B-26 | **✅ FECHADO (v3.1.0, 31/07/2026).** Limite de quantidade de produtos na carteira (campo "Máximo de produtos na carteira" nos Filtros; 0 = sem limite). Nova etapa 4b no `calcular()` (depois do piso): remove a menor posição e derrama o peso nas maiores da mesma classe, repetindo até caber no limite. **Regras (D-35, confirmadas por Alexandre):** teto sobre a carteira inteira (bolsões fora); concentra nas maiores; tem precedência sobre o teto de FUNDO (com alerta), nunca sobre FGC/teto de classe (se estes bloquearem, para e avisa). Fuzz 20.000/0 com o novo invariante (nunca mais linhas que o teto, salvo aviso). | Claude | ✅ |
| B-27 | **✅ FECHADO (v3.2.0, 31/07/2026).** Checkbox "Não usar ETF na carteira" nos Filtros da aba Carteira — atalho acessível para o mesmo `state.ve['ETF']` do toggle da Composição, os dois sincronizados (o `render()` reflete um no outro). Escopo confirmado por Alexandre: só o toggle acessível, sem o preset amplo. | Claude | ✅ |
| B-25 | **✅ FECHADO (v3.2.0).** Botão flutuante "Feedback" (canto inferior direito) abre um painel com textarea; ao salvar, grava no `localStorage` (chave `ssid_feedbacks`) com a **origem = aba atual**, data e versão do app. "Exportar todos" baixa um `.txt` com o histórico. Offline, sem servidor (D-01/D-10). Persistência confirmada por Alexandre: acumular no navegador + exportar. | Claude | ✅ |

## P2 — itens da reunião de 21/07/2026

*(item "limitar quantidade de produtos" não entra aqui — é duplicado do B-26, já registrado antes desta reunião.)*
*(B-28, B-29, B-30, B-31, B-32 fechados na v3.0.0 em 31/07/2026. B-33 e B-35 já fechados antes. B-34 mantido no backlog por decisão do Alexandre — já existe módulo de previdência do Bruno.)*

| # | Pendência | Dono | Estado |
|---|---|---|---|
| B-28 | **✅ FECHADO (v3.0.0, 31/07/2026).** Toggle "Por estratégia / Por classe de ativo" na aba Carteira: agrupa a carteira por classe do motor (Pós, Inflação, Prefixado...) ou por veículo (Tesouro, ETF, Fundo, Previdência, RF Bancária). Cabeçalho da coluna e a "outra dimensão" (tag no item) acompanham o modo. `state.cartView`. | Claude | ✅ |
| B-29 | **✅ FECHADO (v3.0.0).** Aba Carteira Atual ganhou botão "Aceitar todas as sugestões automáticas" (marca de uma vez todos os matches de alta/média confiança como confirmados) + filtro "Mostrar só os que precisam de atenção" (esconde os já resolvidos). Reduz o casamento linha a linha em carteiras grandes. | Claude | ✅ |
| B-30 | **✅ FECHADO (v3.0.0).** Botão "Enviar por e-mail" no cabeçalho: abre `mailto:` com o resumo da carteira no corpo (assunto + corpo prontos; assessor preenche destinatário e anexa a boleta .xlsx). Sem servidor, coerente com D-01/D-10. Texto do resumo extraído para `resumoCarteira()`, compartilhado com o "Copiar resumo" do WhatsApp. | Claude | ✅ |
| B-31 | **✅ FECHADO (v3.0.0).** Botão "×" por produto na aba Carteira remove o ativo e o motor rebalanceia (nova via na etapa 1 do `calcular()`: `state.excluidosManuais` vira motivo de exclusão "removido manualmente", reusando a redistribuição existente). Área "Removidos" permite reincluir. **Escopo (D-34):** excluir + reincluir produtos do modelo; forçar produto que não está no modelo fica como extensão futura. Fuzz 20.000/0 exercitando exclusões manuais. | Claude | ✅ |
| B-32 | **✅ FECHADO (v3.0.0).** Bloco "Resumo" em linguagem simples adicionado no topo do resultado da revisão de carteira **e** do aportador esporádico (aba Carteira Atual): explica em frases o que está sendo vendido/desmontado, para onde o caixa vai, e por quê (classes acima/abaixo do ideal). Reaproveita os dados que o motor já calcula (`vendas`/`alocacao`/`excessos`/`deficits`), sem recalcular. | Claude | ✅ |
| B-33 | **✅ FECHADO em 21/07/2026.** Classe agregada "Renda Variável" (soma RV Brasil + RV América Latina + RV Global **+ Fundos Listados/FIIs**) incluída na aba 04 Composição: linha "Renda Variável (total)" na tabela por perfil (`comp-perfis`) e novo painel "Carteira do cliente · Renda Variável" (`comp-real-rv`). **Decisão de escopo revisada por Alexandre em 21/07:** FIIs (classe `fli`) entram no agregado; só Alternativos (`alt`) ficam de fora. Constante `RV_CLASSES=['rvb','rval','rvg','fli']`. Nota: incluir `fli` não muda os números hoje porque a classe Fundos Listados está vazia (B-09) — mas assim que um FII for cadastrado, entra automaticamente no agregado. Valores atuais: Conservador 4,8% → Moderado 9,8% → Arrojado 23,6%. | Claude implementou | ✅ fechado |
| B-34 | **✅ FECHADO (v3.3.0, 03/08/2026).** Redefinido por Alexandre: previdência é **opcional** (toggle mestre, ligado por padrão). Desligado, o cliente fica sem previdência **em qualquer forma** — nem na carteira de longo prazo, nem no bolsão do PGBL. Implementado reusando `state.ve['Previdência']`: a etapa 1 já exclui o veículo da carteira, e `pgblSugerido()` agora retorna 0 quando o veículo está desligado. Toggle "Usar previdência na carteira" nos Filtros (default marcado), sincronizado com o toggle da Composição (nos dois sentidos, a cada render — de brinde consertou a mesma limitação latente no toggle de ETF do B-27). Ver D-36. Fuzz 20.000/0. **Nota:** quando ligada, a "regra" é os pesos do modelo atual; uma banda-alvo específica por perfil/idade fica como item futuro se Alexandre quiser. | Claude | ✅ |
| B-35 | **✅ FECHADO em 31/07/2026 (v2.0.0).** Alerta "Verificar se está no mycapital" (texto exato confirmado por Alexandre) disparado sempre que a carteira sugerida tem qualquer posição de Renda Variável (`RV_CLASSES` = rvb+rval+rvg+fli — "toda RV", confirmado). Implementado como `alerts.push(['warn',...])` no `calcular()`, reusando a constante global `RV_CLASSES`. Testado: dispara com RV presente, não dispara sem. | Claude implementou | ✅ fechado |
| B-36 | **✅ FECHADO (v3.4.0, 03/08/2026).** Bug reportado por Alexandre: o botão de e-mail de ordens (B-30) mostrava o aviso de sucesso mas não abria nada — o `mailto:` único com o resumo inteiro da carteira depende de haver um cliente de e-mail padrão configurado no sistema operacional; sem isso, o navegador não faz nada e o toast era um falso positivo (ver ERROR-LOG). **Substituído — não remendado** — por um gerador de ordens por produto, no modelo exato do PDF "Modelos de Ordem — Todos os Produtos" (Supervisão de Agentes Autônomos, XP): um card por posição da carteira (Tesouro Direto, ETF/compra, Fundo/FIDC/aplicação, Renda Fixa Bancária/aplicação — reposição), cada um com "Copiar", "Abrir e-mail" (mailto individual, curto) e botões globais "Copiar todas"/"Baixar .txt" como saída sempre garantida. Campos que dependem de cotação/data ao vivo (taxa, carência, vencimento exato, quantidade de ETF) ficam marcados `[a confirmar]` — nunca preenchidos com número que o motor não pode garantir (§0). Previdência não tem modelo no PDF: em vez de inventar um, o sistema avisa e não gera texto de ordem. Novo teste dedicado `codigo-fonte/verificar-ordens.js` (9 checks, inclui os 4 modelos + aviso de Previdência) + fuzz 20.000/0 revalidado. | Claude | ✅ fechado |

## P2 — evolução paralela do Bruno (v1.41.0)

| # | Pendência | Dono | Estado |
|---|---|---|---|
| B-37 | **✅ FECHADO (v3.5.0, 05/08/2026).** Alexandre recebeu um `ssid-portfolio-manager-v1.41.0.html` de Bruno — evolução paralela que parte da mesma base v1.36, mas não tem nenhuma das nossas melhorias B-24→B-36. Avaliadas e portadas 5 features: (1) questionário estendido — perguntas novas de idade, situação financeira, tolerância a risco de crédito e quiz de conhecimento, reordenadas; (2) campo `credito` (0–10) em 28/36 produtos, separando risco de emissor/estrutura da volatilidade de mercado; (3) motor — nova etapa de exclusão por crédito (dentro da Etapa 1), giro de peso por ciclo macro (Corte/Estável/Alta, etapa 1c) entre produtos de duration diferente na mesma classe, teto de pulverização por emissor (etapa 1d, hoje no-op); (4) painel "Cenário macro" + controle de tolerância a crédito na aba Carteira; (5) seção estática "Janela móvel" (CDI/Ibovespa, janelas de 3/5 anos, 2000-2024) na aba Evidências Científicas. **Não portado:** `q4` com `multi:true` do v1.41 (mudaria o comportamento da pergunta de experiência para múltipla escolha — não fazia parte do pedido, decisão de não assimilar sem confirmação). Todo dado herdado do Bruno (campo `credito`, números da janela móvel) marcado `[CRÉDITO]`/nota explícita como NÃO confirmado por Alexandre (D-40). Decisões de ordem das etapas novas em D-36 a D-39. Testes: novo `codigo-fonte/verificar-credito-macro-emissor.js` (9 checks), fuzz estendido (tetoCredito/macroCiclo nos cenários + 2 invariantes novos), `verificar-monolito.js` e `verificar-ordens.js` (B-36) revalidados sem regressão. | Claude | ✅ fechado |
| B-38 | **✅ FECHADO (v3.5.0, 05/08/2026).** Teto de fundo violado silenciosamente em ~1/100–200 mil cenários quando `maxAtivos` (B-26) está ativo. **Causa raiz isolada:** na etapa 4b, quando `derramar()` só consegue distribuir PARTE do peso antes de esgotar a folga (`resto>1e-9`), essa parte parcial já tinha sido somada aos destinos (via `folgaContagem`, que não olha o teto de fundo de propósito — B-26 tem precedência) **antes** do `break` — mas a checagem que marca `fundoRelaxado=true` só rodava no branch de sucesso (`resto<=1e-9`), então essa violação parcial nunca virava alerta nem entrava em `cortesQtd`. Não era um novo teto sendo violado (isso já é esperado/intencional do B-26) — era a mesma violação de sempre, só que **sem o aviso correspondente**. Corrigido movendo a checagem de `fundoRelaxado` para rodar incondicionalmente logo após toda chamada a `derramar()` em 4b, sucesso ou não. Fuzz 20.000/0 (era 1/20.000) + 150.000 cenários de confirmação (a falha original só aparecia a cada 100–200 mil). | Claude | ✅ fechado |

## P2 — dependem de terceiros (Bruno)

| # | Pendência | Dono | Estado |
|---|---|---|---|
| B-14 | **Montar as carteiras de ETF BR e ETF USA** (item #5). **Atualizado em 03/08/2026 por Alexandre: a parte de ETF BR já foi feita na evolução para a v3.** Falta só ETF USA. | Bruno (ETF USA) | 🟡 parcial — ETF BR feito, falta ETF USA |
| B-15 | **Montar os discursos comercial e técnico das alocações** (item #6) — alimenta a aba Apresentação. **Atualizado em 03/08/2026 por Alexandre: finalizado na evolução para a v3.** | Bruno | ✅ fechado |
| B-16 | **Botão de segmentação por patrimônio: <R$300k → ETFs dolarizados; ≥R$300k → XP International/UCITS** (item #3). Critério **confirmado**: R$300k é do patrimônio total do cliente, não da fatia em dólar. **Atualizado em 03/08/2026: segue bloqueado** — falta especificamente a carteira de ETF USA do B-14 (o lado BR já existe, mas o botão precisa dos dois lados prontos). | Bruno entrega ETF USA · Claude implementa | ⏳ critério travado, aguardando conclusão do B-14 |

## P3 — roadmap de longo prazo, sem definição ainda

| # | Pendência | Dono | Estado |
|---|---|---|---|
| B-17 | **Unificar com o "Portfolio Mgmt Sys"** (item #1). Alexandre confirmou: mantido em aberto de propósito, sem definição por enquanto. | Alexandre | ⏸ aberto por decisão do Alexandre |

## P1 (bloqueiam uso real) — herdadas da rodada anterior

*(B-03, B-04, B-05, B-06, B-07, B-08 todos fechados. Ver Concluído.)*

## Pausado (retomar quando priorizado)

| # | Pendência | Dono | Estado |
|---|---|---|---|
| B-18 | **Bloqueio de edição para admins** (item #4). Iniciado e revertido nesta sessão para não deixar campo morto no motor (`pinHash`/`locked` foram adicionados ao `state` e removidos). É um freio contra edição casual da mesa — client-side, hash SHA-256, **não é segurança real** (qualquer um com F12 aberto contorna). Escopo: travar a aba Produtos + o painel "Regras de concentração" da aba Composição; deixar livres os filtros de uso em reunião (perfil, volatilidade, liquidez, toggles de veículo). | Alexandre confirma o escopo · Claude implementa | ⏸ pausado, retomar quando chegar a vez |
| B-09 | **Repovoar a classe Fundos Listados** (ficou sem produto após saída do XFIX11). **Decisão do Alexandre em 20/07/2026: deixar vazia por enquanto** — não é falta de resposta, é escolha consciente de não forçar um produto só para preencher a classe. Revisitar se/quando aparecer um FII elegível. Ver DECISOES D-27. | Alexandre revisita se houver produto | ⏸ decidido — vazio por escolha |

---

## Concluído em 21/07/2026
- ✅ **B-33 fechado.** Classe agregada "Renda Variável" na aba 04 Composição (soma rvb+rval+rvg+fli; só Alternativos de fora). Linha na tabela por perfil + painel na composição real do cliente. Progressão validada no navegador (4,8%/9,8%/23,6% nos 3 perfis). Suíte completa verde. **v1.21 → v1.22** (implementação inicial, FIIs de fora) **→ v1.23** (Alexandre pediu para incluir FIIs no agregado). Incluir `fli` não altera os números hoje porque a classe está vazia (B-09), mas passa a somar automaticamente quando um FII for cadastrado.

## Concluído em 20/07/2026 (rodada 3)
- ✅ **B-07 fechado.** Alexandre enviou a planilha "Guia-de-Previdência_Julho26_Externo-3.xlsm" (aba Prev XPCS). Liquidez total, aporte mínimo e público-alvo atualizados nos 5 produtos de previdência do cadastro — com uma correção real encontrada no caminho: Brave e Trend IMA-B 5+ estavam com `qual:false`, mas são restritas a investidor qualificado.
- ✅ **B-19 parcial: as 5 previdências fechadas** (15 produtos ETF/fundo seguem provisórios). Fórmula `vol10=min(10,vol×10)` confirmada por Alexandre (D-28) a partir da coluna "Volatilidade" (desde o início, não mensal — corrigi um erro meu de anualização no caminho, ver ERROR-LOG E-17). Matches ambíguos de Arca Grão e Kapitalo confirmados por Alexandre entre variantes parecidas na planilha.
- Suíte revalidada: fuzz 20.000/0, fuzz-carteira 20.000/0, e2e sem `❌` real.

## Concluído em 20/07/2026 (rodada 2)
- ✅ **B-03 fechado.** Alexandre confirmou: LFTB11 tributado a 15% flat sobre o ganho na venda, sem come-cotas (regra padrão de ETF). BILF39 já estava coberto pelo B-06 (regime de BDR/ação). Anotação `[TRIBUTAÇÃO]` adicionada a `lftb` e `lftb_estrat` em `core.js`. Rebuild + fuzz (20.000/0) + e2e: zero falhas.
- ✅ **B-04, B-05, B-06, B-08 — limpeza de bookkeeping.** Conferido por leitura direta do `core.js`: os 4 já estavam confirmados desde 14/07/2026 (notas `[SUB]` em azbayes/alphakey, `[CLASSE]` em divo, `[TRIBUTAÇÃO]` em bilf, `[ISENÇÃO]` em plural/xpdeb/lci/lca). A tabela "P1 herdadas da rodada anterior" estava desatualizada — não eram pendências reais, só texto não sincronizado com o cadastro. Nenhuma mudança de código.
- ✅ **B-09 — decisão registrada (não fechamento de dado).** Ver seção Pausado — Alexandre decidiu deixar a classe Fundos Listados vazia por ora.
- ✅ **B-10 — resumo técnico redigido.** Texto pronto para o Alexandre encaminhar a quem mantém a planilha Alocação PG, cobrindo as 2 quebras da v2 (E-04). Entregue diretamente na conversa, não como arquivo novo no projeto.

## Concluído em 20/07/2026 (rodada 1)
- ✅ **B-12 FECHADO INTEGRALMENTE (3 modos).** Modo 3 (aportador de novo cliente) entregue como seletor de modo no painel de revisão, reaproveitando `calcularRevisaoCompleta()` — a matemática é a mesma do modo 2, muda o enquadramento (título, KPIs e cabeçalhos: "desmontar"/"montar o alvo" em vez de "vender"/"rebalancear"). Decisão consciente de **não** duplicar o motor só para trocar rótulo. e2e cobre os dois modos. Suíte completa verde (fuzz 20.000/0, fuzz-carteira 20.000/0, e2e limpo). Era a última P1 que não dependia de dado externo.

## Concluído nesta sessão (16/07/2026)
- ✅ **B-11 fechado de verdade.** A SPEC do motor (`01-fundamentos/SPEC-motor.md`) dizia "MATERIALIZADA" desde 14/07/2026, mas ficou desatualizada assim que o teto por classe (B-21) entrou em produção em 15/07 — não documentava a etapa 2a (teto por classe), a 3ª restrição na `folgaGeral`, nem os mecanismos dos bugs E-12/E-13/E-14. Reescrita v1.1 para bater com o `core.js` atual. Nenhuma mudança de comportamento, só descrição — mas expõe um risco: documento marcado "pronto" sem processo de revisão vira drift silencioso. Sugestão registrada: quando uma etapa do motor mudar, checar se a SPEC precisa acompanhar, como parte do próprio PR/sessão que muda a etapa.
- ✅ **B-02 fechado.** Alexandre confirmou que a escala ×0,8 aplicada aos 7 produtos do Conservador (B30, B35, Previdência Trend, LTN 2029, LTN 2032, SPXR11, DIVO11) é a correção definitiva, não um ajuste provisório. Anotações `ver` desses produtos atualizadas de "CONFIRMAR" para "[PESO] Confirmado" (nota de volatilidade, quando existia, permanece separada e pendente). Ver DECISOES D-25. Rebuild + fuzz (20.000 cenários) + e2e: zero falhas.

## Concluído nesta sessão (14/07/2026)
- ✅ **B-01 fechado de verdade.** Os 4 títulos bancários deixaram de ser placeholder: CDB Banco XP (101% CDI, brAAA, D+1), CDB PicPay (106,75% CDI, AA-.br, 5 anos), LCI CEF (91% CDI, brAAA, D+119), LCA Sicoob (88% CDI, AAA, D+571). Fonte: vitrine de renda fixa bancária de 14/07/2026, enviada pelo Alexandre. Rating incluído no cadastro (campo informativo). Ressalva registrada em cada produto: "Qtd Mín." da planilha é lotes de emissão, não R$ — mínimo em reais segue não confirmado.
- ✅ **Item #7 verificado, não era bug.** Testei numericamente com R$2M e teto de volatilidade zero: os 4 emissores recebem hoje um valor tal que, capitalizado até o próprio prazo de cada título, fecha exatamente em R$250.000 no vencimento (PicPay, com 5 anos, recebe só R$150k hoje por capitalizar mais tempo). O FGC já considerava a rentabilidade futura desde a sessão anterior (D-07). Ver ERROR-LOG (não é incidente, é confirmação).
- ✅ Cadastro re-testado após a troca: 2.000 cenários aleatórios, zero falhas; 3 perfis somam 100%.

## Concluído (sessões anteriores)
- ✅ Guia v1 completo, motor com fallback, 13 cenários testados.
- ✅ Boleta `.xlsx` com gerador próprio, validada em openpyxl + LibreOffice.
- ✅ Questionário de diagnóstico, objetivos/bolsões, composição com toggles, apresentação com simulador de come-cotas.
- ✅ Teto de fundo 5% + FGC sobre valor projetado (implementação original).
- ✅ Cadastro migrado para a planilha v2; 3 perfis fecham 100%.
- ✅ Linha "Não alocado" (bug do fuzz).

---

## Histórico
- **v2.1 — 31/07/2026.** B-28/B-29/B-30/B-31/B-32 fechados juntos na v3.0.0 do app (visualização por estratégia/classe, aceitar matches em lote, e-mail de ordens, incluir/excluir ativo com rebalanceamento, resumo simples). B-34 mantido no backlog por decisão. D-34 registra o escopo do B-31.
- **v1.9 — 21/07/2026.** 9 itens levantados em reunião confrontados com o backlog: 1 duplicado (limitar quantidade de produtos = B-26, já existia) e 8 novos abertos (B-28 a B-35) — visualização por estratégia/classe, produtividade do match, e-mail de ordens, incluir/excluir ativo manual com rebalanceamento, resumo simples de rebalanceamento, classe RV agregada na Composição, distribuição de previdência, alerta mycapital. Nenhum código alterado.
- **v1.8 — 21/07/2026.** B-26 e B-27 abertas: quantidade máxima de ativos na carteira (exige nova etapa no motor, SPEC própria) e botão para não usar ETF (parcialmente já existe via toggle de veículo na aba Composição — falta decidir se é só torná-lo mais visível ou algo adicional). Nenhum código alterado.
- **v1.7 — 21/07/2026.** B-25 aberta: botão de feedback em toda tela/feature, com origem rastreada automaticamente. Registrada com 3 pontos de desenho a decidir antes de codar (onde persiste, como identificar a origem, formato da UI) — sem escopo fechado nem código alterado.
- **v1.6 — 21/07/2026.** B-24 aberta: sobreposição visual entre a aba Diagnóstico e a coluna esquerda da aba Carteira, reportada por Alexandre. Registrada com a ideia de coluna expansível/recolhível para explorar depois — sem investigação de causa raiz nem código alterado.
- **v1.5 — 15/07/2026.** B-22 (migração para Cowork Project) e B-23 (fusão com PMS, pausada) registradas.
- **v1.4 — 15/07/2026.** B-21 aberta: teto por classe (Inflação/Multimercado/etc.), confirmado variável por classe, bloqueada até Alexandre enviar o arquivo de Diretrizes.
- **v1.3 — 14/07/2026.** B-04/B-05/B-06/B-08 aplicados (confirmações do Alexandre). B-11 fechado (SPEC-motor.md). B-12: v1 implementado (aportador esporádico), 2 modos restantes registrados como trabalho futuro.
- **v1.2 — 14/07/2026.** B-13 migrado (escala 0-10 aplicada ao motor inteiro); B-19/B-20 abertas para os dados que faltam; B-16 com critério confirmado (patrimônio total); B-17 confirmado como aberto por decisão do Alexandre; B-12 com formato de entrada confirmado (Posição Consolidada XP Hub), motor ainda não iniciado.
- **v1.1 — 14/07/2026.** B-01 fechado com dados reais; #7 verificado (sem correção necessária); 8 novas pendências decompostas e priorizadas (B-12 a B-18); B-18 (bloqueio de edição) pausado a meio caminho, sem deixar código morto.
- **v1.0 — 14/07/2026.** Backlog aberto: 11 pendências ativas (2 P0, 6 P1, 3 P2), 9 itens concluídos das sessões prévias.
