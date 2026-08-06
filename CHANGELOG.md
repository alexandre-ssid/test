# CHANGELOG — SSID Portfolio Manager (ex-Guia de Alocação PG)
Formato: `vX.Y — DATA — título`. O mais recente no topo. O *porquê* fica no `DECISOES.md`; os *tropeços*, no `ERROR-LOG.md`.

---

## v3.5.1 — 05/08/2026 — B-38: teto de fundo silencioso na etapa 4b, corrigido
- **Causa raiz isolada** (achada ao validar o B-37, ver E-20): na etapa 4b (B-26, limite de quantidade de ativos), quando `derramar()` só conseguia distribuir PARTE do peso removido antes de esgotar a folga (`resto>1e-9`), essa parte parcial já tinha sido somada aos destinos — via `folgaContagem`, que de propósito não olha o teto de fundo (B-26 tem precedência) — **antes** do `break` que devolve o item de origem. A checagem que marca `fundoRelaxado=true` só rodava no branch de sucesso, então essa violação parcial nunca virava alerta.
- Não era uma violação nova do teto de fundo (isso já é esperado/intencional do B-26) — era a mesma violação de sempre, só **sem o aviso correspondente**, tornando-a silenciosa. Reproduzido com o `state` exato de uma falha do fuzz, tracing o peso do produto violado etapa por etapa — mostrou o salto acontecendo dentro do 4b, num item que nem aparecia entre os `cortesQtd` registrados.
- **Corrigido**: a checagem de `fundoRelaxado` agora roda incondicionalmente logo após toda chamada a `derramar()` em 4b, sucesso ou falha parcial.
- Confirmado que o bug já existia na v3.4.0 (pré-B-37) — reproduzido na baseline sem nenhuma mudança de hoje, então não era regressão do B-37.
- Testes: fuzz 20.000/0 (era 1/20.000) + 150.000/0 de confirmação (a falha original só aparecia a cada 100–200 mil cenários). Arquivo: `ssid-portfolio-manager-v3.5.1.html`.

## v3.5.0 — 05/08/2026 — B-37: 5 features da evolução paralela do Bruno (v1.41.0) portadas
- Alexandre recebeu um `ssid-portfolio-manager-v1.41.0.html` do Bruno — evolução paralela que parte da mesma base v1.36, mas não tinha nenhuma das nossas melhorias B-24→B-36. Avaliadas e portadas 5 features, preservando 100% do que já existia.
- **Questionário** — 4 perguntas novas: idade (4 faixas etárias, com teto de volatilidade travado acima de 50 anos), situação financeira (renda vs. despesas/dívidas), tolerância a risco de crédito (FGC vs. crédito privado/FIDC — seta `state.tetoCredito`, critério **próprio**, não combinado com `teto`) e um quiz de conhecimento de risco (separado de experiência declarada). Reordenadas para agrupar idade/horizonte/patrimônio, depois capacidade financeira/crédito, depois reação a perda/experiência/quiz.
- **Cadastro** — campo `credito` (0–10) em 28 dos 36 produtos (Tesouro, FIDCs, fundos de crédito, previdência, CDB/LCI/LCA, ETF de crédito global HGBR11), separando risco de inadimplência de emissor/estrutura da volatilidade de mercado (`vol10`). Nova `rotuloCredito()`. **Todo valor marcado `[CRÉDITO] ... NÃO confirmado por Alexandre`** no campo `ver` — dado herdado do Bruno, não validado (D-40).
- **Motor** — 3 mudanças em `calcular()`: (a) nova condição de exclusão por risco de crédito na Etapa 1, reposição (`REPOS`) estendida para cobri-la (D-42); (b) nova etapa 1c — giro de peso por ciclo macro (Corte/Estável/Alta) entre produtos de duration diferente dentro da mesma classe, preservando o total da classe; (c) nova etapa 1d — teto de pulverização por emissor (50% do peso da classe, hoje no-op). 1c/1d rodam antes do bloco de tetos (2a/2b/3/4/4b) por decisão documentada (D-38, `SPEC-motor.md` v1.2) — preservam o total da classe, não competem pela mesma `folgaGeral`.
- **Interface** — painel "Cenário macro" (Corte/Estável/Alta, default **Estável** — diverge de propósito do default `'corte'` do Bruno, D-39) + controle de tolerância a crédito, ambos na aba Carteira; seção estática "Janela móvel" (CDI/Ibovespa, janelas de 3/5 anos, 2000–2024) na aba Evidências Científicas.
- **Não portado:** `q4` com `multi:true` do v1.41 (mudaria o comportamento da pergunta de experiência para múltipla escolha — fora do pedido, não assimilado sem confirmação).
- **Achado ao validar (não causado pelo B-37):** fuzz estendido (20.000 cenários com `tetoCredito`/`macroCiclo`) encontrou 1 falha no invariante de teto de fundo. Reproduzida a mesma falha rodando o mesmo fuzz contra a v3.4.0 sem nenhuma mudança do B-37 (200.000 cenários) — confirma bug pré-existente, não regressão. Registrado em ERROR-LOG E-20 e BACKLOG B-38 (pausado, baixa frequência).
- Testes: novo `codigo-fonte/verificar-credito-macro-emissor.js` (9 checks — os 3 filtros/etapas do motor + presença da Janela Móvel). `verificar-monolito.js` e `verificar-ordens.js` (B-36) revalidados sem regressão. Arquivo: `ssid-portfolio-manager-v3.5.0.html`.

## 03/08/2026 — B-22: projeto migrado para este ambiente (Claude Code / Cowork)
- Confirmado por Alexandre: migração concluída, fim do ciclo zip-upload-rezip entre sessões. Sem mudança de versão do app (não altera o HTML) — item de workflow/governança, registrado aqui e fechado no `BACKLOG.md`/`INDEX.md`.

## v3.4.0 — 03/08/2026 — B-36: e-mail de ordens reescrito (compliance, um modelo por produto)
- **Bug reportado por Alexandre:** o botão "Enviar por e-mail" (B-30) sempre mostrava o toast de sucesso, mas o cliente de e-mail nunca abria. Causa: `window.location.href = 'mailto:...'` depende de haver um cliente de e-mail padrão configurado no sistema operacional — sem isso, o navegador não faz nada, sem erro algum, e o toast era um falso positivo.
- **Substituído — não remendado** (regra §7 do CLAUDE.md): em vez de um único `mailto:` com o resumo inteiro da carteira, o app agora gera **uma ordem por produto**, no modelo exato do PDF interno "Modelos de Ordem — Todos os Produtos" (Supervisão de Agentes Autônomos, XP Investimentos) fornecido por Alexandre.
- Modal "Ordens por e-mail" (`#ord-overlay`): um card por posição viva da carteira (incluindo a reserva, via `state.resprod`), cada um com o texto do modelo, botão "Copiar" e "Abrir e-mail" (mailto individual — bem mais curto, funciona mesmo quando o único mailto grande falhava). Botões globais "Copiar todas" e "Baixar .txt" garantem uma saída que nunca depende só do cliente de e-mail do SO.
- Quatro modelos implementados por veículo (`MODELOS_ORDEM`): **Tesouro Direto** (indexador pela classe, vencimento aproximado do nome do produto), **ETF** (compra a mercado, quantidade a calcular pela cotação do dia), **Fundo** (aplicação — reusado por **FIDC**, mesmo fluxo de cotização, sem campo Emissor), **Renda Fixa Bancária** (aplicação, com emissor do cadastro e taxa sempre marcada `[conferir]` — nunca apresentada como definitiva, §0). **Previdência não tem modelo no PDF**: o sistema avisa que o fluxo é outro (plataforma de seguros) em vez de inventar um texto de ordem.
- Todo campo que depende de cotação/data ao vivo (taxa, carência, vencimento exato, quantidade de ETF) fica marcado `[a confirmar]` no texto gerado — nunca preenchido com um número que o motor não pode garantir.
- Testes: novo `codigo-fonte/verificar-ordens.js` (9 checks — os 4 modelos, o aviso de Previdência sem modelo, a reposição em Renda Fixa Bancária sob cenário restritivo, e a renderização do modal). `verificar-monolito.js` revalidado. Fuzz 20.000/0 (motor de alocação inalterado). Arquivo: `ssid-portfolio-manager-v3.4.0.html`.

## v3.3.0 — 03/08/2026 — B-34: previdência opcional (toggle mestre)
- Previdência redefinida como **opcional** (D-36): toggle "Usar previdência na carteira" nos Filtros, ligado por padrão. Desligado, zera **tudo** — a previdência da carteira e o bolsão do PGBL.
- Implementado reusando `state.ve['Previdência']`: a etapa 1 do `calcular()` já excluía o veículo; `pgblSugerido()` agora retorna 0 quando o veículo está desligado (antes era sempre 12% da renda).
- Toggle sincronizado com o de Previdência da Composição, nos dois sentidos, a cada `render()` — a mesma correção também resolveu uma limitação latente no toggle de ETF do B-27 (o checkbox não refletia mudanças feitas na Composição).
- Testes: prev ON → pgbl=36k; prev OFF → pgbl=0 e sem previdência na carteira; checkbox sincroniza. Fuzz 20.000/0. Arquivo: `ssid-portfolio-manager-v3.3.0.html`.

## v3.2.0 — 31/07/2026 — B-27 + B-24 + B-25 (lote de UX)
- **B-27** — checkbox "Não usar ETF na carteira" nos Filtros da aba Carteira, sincronizado com o toggle de veículo da Composição (mesmo `state.ve['ETF']`). Para clientes que a XP não libera para bolsa ou que preferem evitar ETF. Escopo: só o toggle acessível (sem preset amplo).
- **B-24** — coluna de parâmetros da aba Carteira recolhível ("« Recolher / » Expandir parâmetros"), dando largura total à tabela. Resolve o aperto de espaço reportado, via a ideia proposta pelo Alexandre. `.grid.rail-oculta`.
- **B-25** — botão flutuante "Feedback" com painel: salva no `localStorage` com origem (aba atual) + data + versão; "Exportar todos" baixa `.txt`. Offline, sem servidor. Persistência: acumular no navegador + exportar.
- Testes: verificador OK, teste dirigido dos 3 (ETF sai da carteira; recolher/expandir; feedback salvo com origem "03 Composição"), fuzz 20.000/0, zero erros de console. Arquivo: `ssid-portfolio-manager-v3.2.0.html`.

## v3.1.0 — 31/07/2026 — B-26: limite de quantidade de produtos na carteira
- Novo campo "Máximo de produtos na carteira" nos Filtros (0 = sem limite). Simplifica a carteira para clientes leigos / que não querem muitas linhas.
- Nova etapa **4b** no `calcular()` (depois do piso): remove a menor posição e derrama o peso nas maiores da mesma classe, repetindo até caber no limite. Concentra nas maiores (D-35).
- **Precedência:** o limite passa por cima do teto de fundo (`capFundo`) com alerta — concentrar em menos linhas é o pedido — mas nunca por cima do FGC nem do teto de classe; se estes bloqueiam, para e avisa que não chegou ao número.
- Fuzz: novo invariante (nunca mais linhas que o teto, salvo aviso) + tolerância à concentração deliberada no teto de fundo (`r.fundoRelaxado`). 20.000/0.
- Teste dirigido: maxAtivos=5 numa carteira Arrojada leva de 20 → 5 linhas, conservando valor. Arquivo: `ssid-portfolio-manager-v3.1.0.html`.

## v3.0.0 — 31/07/2026 — Lote de 5 melhorias (B-28/29/30/31/32)
- **B-28** — toggle "Por estratégia / Por classe de ativo" na aba Carteira: agrupa por classe do motor ou por veículo. Cabeçalho e a tag do item acompanham o modo. `state.cartView`.
- **B-29** — aba Carteira Atual: botão "Aceitar todas as sugestões automáticas" (lote de alta/média confiança) + filtro "só os que precisam de atenção". Corta o casamento linha a linha em carteiras grandes.
- **B-30** — botão "Enviar por e-mail" (`mailto:` com o resumo no corpo, sem servidor). Resumo extraído para `resumoCarteira()`, compartilhado com o "Copiar resumo".
- **B-31** — "×" por produto na aba Carteira remove o ativo e o motor rebalanceia (`state.excluidosManuais` → motivo de exclusão na etapa 1 do `calcular()`, reusando a redistribuição). Área "Removidos" reinclui. Escopo D-34. Fuzz 20.000/0 exercitando exclusões manuais.
- **B-32** — bloco "Resumo" em linguagem simples no topo da revisão de carteira e do aportador: explica o que muda e por quê, reusando os dados do motor.
- **MAJOR bump (2.0→3.0)** por serem 5 itens juntos. B-34 mantido no backlog (já há módulo de previdência do Bruno).
- Validação v3.0.0: fuzz 20.000/0 (com exclusão manual + cartView), verificador OK, teste dirigido dos 5 recursos OK, zero erros de console. Arquivo: `ssid-portfolio-manager-v3.0.0.html`.

## v2.0.0 — 31/07/2026 — Marco: melhorias do Bruno (base v1.36) + B-33 + B-35
- **A atualização para a versão 2.0 foi após as melhorias que o Bruno implementou.** "Melhorias do Bruno" = todo o delta entre a nossa última linha na memória deste projeto (v1.23) e o HTML v1.36 que o Alexandre trouxe: PGBL como bolsão separado, aba "Estrutura, planejamento e performance" com simulações fiscais (come-cotas, taxa adm, VGBL regressiva, diferimento PGBL×VGBL, gross-up de isentos, marcação a mercado por duration), abas Diagnóstico+Objetivos fundidas, "Apresentação"→"Evidências Científicas", rebrand visual completo, Critérios Derivados mostrando Objetivos. Por serem uma evolução ampla (várias frentes de uma vez), justificam o bump MAJOR para 2.0.
- **Sobre essa base, reaplicados/adicionados nesta sessão:**
  - **B-33** — agregado "Renda Variável" (RV Brasil + Am. Latina + Global + FIIs) na aba Composição (era a única coisa nossa que faltava na v1.36).
  - **B-35** — alerta "Verificar se está no mycapital" disparado sempre que a carteira sugerida tem qualquer posição de Renda Variável. `RV_CLASSES` promovida a constante global única (usada por B-33 e B-35).
- **Workflow (ver CLAUDE.md v1.1, D-33):** fonte de verdade é o HTML único `ssid-portfolio-manager-v2.0.0.html`; módulos `codigo-fonte/*.js`+`build.js` congelados. Testes no monólito via jsdom: `fuzz-monolito.js` (20.000/0, com PGBL) + `verificar-monolito.js`.
- Validação da v2.0.0: fuzz 20.000/0 (PGBL em 13.316), verificador OK, alerta mycapital dispara só com RV presente (testado Arrojado=sim / Conservador teto0=não), zero erros de console.
- *(As etiquetas internas v1.37/v1.38 desta sessão foram consolidadas nesta v2.0.0 — nunca foram entregues como arquivo final.)*

## v1.37.0 — 31/07/2026 — REBASE: adoção da base externa SSID Portfolio Manager v1.36 + B-33 reaplicado
- **Chegou uma v1.36 evoluída em ambiente externo**, como HTML único compilado (`ssid-portfolio-manager-v1.36.0.html`), sem código-fonte modular. Assimilada como a nova base. Contém a nossa linhagem até ~v1.21 (todo o B-19 de volatilidade, notas `ver`, convenção de rodapé versionado da v1.21) + evoluções novas:
  - **PGBL como bolsão separado** (igual à reserva): `investivel = total − reserva − pgbl − somaBolsoes`; `alvoPGBL()` distribui 12% da renda tributável (`state.rendaTributavel`) entre os produtos de Previdência elegíveis. `calcular()` agora retorna `pgbl`/`pgblInfo`. Nova linha "Previdência Privada — PGBL" na aba Carteira.
  - **Nova aba "Estrutura, planejamento e performance"** com simulações fiscais (`simPrevidencia`, `simPgblDiferimento`, `simTaxaAdm`, gross-up de isentos, marcação a mercado por duration modificada) — calculadoras puras, não tocam o motor de alocação.
  - Abas Diagnóstico+Objetivos fundidas; "Apresentação"→"Evidências Científicas"; rebrand visual completo; Critérios Derivados agora mostra Objetivos.
- **B-33 reaplicado** sobre a v1.36 (a única coisa nossa que faltava): agregado "Renda Variável" (rvb+rval+rvg+fli) na aba Composição — gera a **v1.37**.
- **Mudança de workflow (ver CLAUDE.md v1.1):** a fonte de verdade passa a ser o HTML único; os módulos `codigo-fonte/*.js`+`build.js` ficam congelados como histórico (linha antiga até v1.23). Testes portados para o monólito via jsdom: novos `fuzz-monolito.js` (20.000 cenários, agora com invariante de conservação incluindo PGBL) e `verificar-monolito.js`.
- Validação: motor com PGBL conserva valor (fuzz-monolito 20.000/0, PGBL exercitado em 13.311); B-33 renderiza nos 3 perfis + painel; zero erros de console. Corrigido no caminho um bug do próprio fuzz (invariante recompondo contra o total em vez de contra o investível — bolsões podem exceder o patrimônio em cenários-lixo; ver ERROR-LOG).

## v1.0 — 14/07/2026 — Governança montada sobre projeto existente
- Kit de Governança de 7 registros criado na raiz, sob a skill construtor-software.
- Projeto enquadrado como categoria A (artefato único), tratado como projeto de pasta.
- 3 decisões irreversíveis travadas: modelo de dados, persistência (JSON manual — D-11), hospedagem (arquivo único).
- 12 decisões retroativas registradas em `DECISOES.md`; 5 incidentes em `ERROR-LOG.md`; 11 pendências abertas em `BACKLOG.md` (2 P0).
- Nenhuma alteração no `guia-alocacao.html` nesta sessão — só formalização.

## Sessões prévias (consolidadas, pré-governança)
- **Sessão 3 — atualização para planilha v2.** Cadastro migrado; classe RV América Latina (BILF39) adicionada; XFIX11 removido; 3 perfis fecham 100%. Detectadas e contornadas 3 quebras da planilha (E-04). Fuzz de 2.000 cenários verde.
- **Sessão 2 — melhorias maiores.** Questionário de diagnóstico, objetivos/bolsões, aba de composição com toggles, apresentação técnico-comercial com simulador de come-cotas, teto de fundo 5%, FGC sobre valor projetado, títulos bancários por reposição. Bug "dinheiro sumindo" pego no fuzz (E-03).
- **Sessão 1 — guia base + boleta.** Guia v1 com 6 critérios e motor de realocação; recuperação da coluna C/M/A por otimização; boleta .xlsx com gerador próprio (ZIP+CRC32), validada em openpyxl e LibreOffice.

---
- **v1.0 — 14/07/2026.** Changelog aberto.

## v1.1 — 14/07/2026 — Dados reais dos títulos bancários; 8 pendências decompostas
- B-01 fechado: os 4 títulos bancários passaram de placeholder para dados reais da vitrine de renda fixa bancária (14/07/2026) — CDB Banco XP, CDB PicPay, LCI CEF, LCA Sicoob. Campo `rating` adicionado ao cadastro.
- Item #7 verificado (não era bug): FGC já considera valor projetado no vencimento. Ver ERROR-LOG E-06.
- 8 pendências novas do Alexandre decompostas e priorizadas: B-12 a B-18 (backlog), D-13/D-14 (decisões), SPEC-volatilidade-v2.md (fundamentos).
- Item #4 (bloqueio de edição) iniciado e revertido na mesma sessão — sem código morto no motor. Pausado como B-18.
- Rebuild + refuzz (2.000 cenários) + e2e: zero falhas.

## v1.2 — 14/07/2026 — Correção de bug real do FGC (E-07)
- Ao revalidar antes de fechar a sessão (não fazia parte do pedido do dia), o fuzz reprovou 1 em 2.000 cenários: a etapa de piso podia reabrir espaço num CDB que o teto de FGC já tinha fechado, projetando valor acima do limite sem alerta.
- Corrigido com `folgaGeral()` — folga unificada (concentração + FGC) usada nas 3 etapas de redistribuição, em vez de 3 funções isoladas.
- 12.000 cenários depois da correção: zero falhas. e2e revalidado.
- Ver `ERROR-LOG.md` E-07 e `CLAUDE.md` §7 (regra nova: restrições concorrentes usam folga combinada).

## v1.3 — 14/07/2026 — Migração da escala de volatilidade 0–3 → 0–10
- Motor, cadastro (36 produtos) e UI migrados de `vol`(0–3) para `vol10`(0–10), a pedido explícito do Alexandre (reverte a cautela do D-14; ver D-15).
- Dados reais aplicados: 8 produtos por regra fixa (Selic=0, bancário=1, FIDC=3), 6 por duration calculada, 2 por drawdown real do Guia de Fundos 06/2026 (Plural Deb. Hedge 30, AZ Quest Bayes).
- 20 produtos seguem provisórios (ETFs/ações sem série de preços acessível, previdências fora do guia, 2 matches inconclusivos) — marcados `volFonte:'provisorio'`, nunca silenciosos. Ver SPEC-volatilidade-v2.md e BACKLOG B-19/B-20.
- E-08: bug na exportação (VOL[] antigo sobrevivendo em export.js) pego pelo e2e, corrigido.
- 12.000 cenários de fuzz + e2e completo (incluindo clique real nos botões de exportação): zero falhas. Boleta reconferida, fecha em R$800.000,00.
- BACKLOG: B-16 (item #3) com critério confirmado (patrimônio total); B-17 (item #1) confirmado aberto por decisão do Alexandre; B-12 (item #2) com formato de entrada confirmado (Posição Consolidada XP Hub), motor ainda não iniciado.

## v1.4 — 14/07/2026 — B-04/05/06/08 confirmados; B-11 e B-12 (v1) fechados
- Cadastro atualizado com as confirmações do Alexandre: AZ Quest Bayes e AlphaKey → sub-perfil Moderado (D-18); DIVO11 confirmado RV Brasil; BILF39 confirmado tributação de BDR; Plural/XP Deb/LCI/LCA confirmados isentos de IR.
- B-11 fechado: `01-fundamentos/SPEC-motor.md` — critérios de aceite do motor de alocação materializados a partir do código e da suíte de testes.
- B-12 (v1): nova aba "07 · Carteira Atual" — cola o texto da Posição Consolidada do XP Hub, casa os itens com o cadastro (com confirmação manual sempre visível) e calcula onde alocar um aporte esporádico (só compra, nunca vende — D-13).
- E-09: matcher corrigido (termos genéricos como "cdb"/"banco"/"xp"/"cdi" davam falso-positivo).
- E-10: mesmo bug de "dinheiro sumindo" do E-03, agora no aportador esporádico — corrigido com o mesmo padrão (`naoAlocado` + aviso).
- Testes: 6.000 cenários do motor principal (zero falhas) + 2.000 do aportador esporádico (zero falhas) + e2e completo incluindo a aba nova com o extrato real.

## v1.5 — 15/07/2026 — Teto por classe (Diretrizes do escritório)
- Implementado o teto de alocação por classe, a partir da imagem "Bandas de Alocação por Classe de Ativo" enviada por Alexandre. Pós-fixado fica sem teto (classe "livre de risco", D-22) — é agora a válvula de segurança no fim de toda cadeia de fallback. RV América Latina soma junto com RV Global contra um único teto (D-23). Alternativos no Conservador = 0% (confirmado).
- `folgaGeral` passa a combinar três restrições (concentração de fundo, FGC, teto de classe), mesma disciplina do E-07 — nunca uma isolada.
- E-12: bug achado pelo fuzz — quando uma classe não tinha destino para o excesso, o loop abortava inteiro, deixando violações de teto de fundo sem checar. Corrigido com lista de "insolúveis" por restrição, sem abortar o processo inteiro.
- Resolve a distorção reportada por Alexandre (E-11: 46% de uma carteira Moderada em Tesouro IPCA+) — o mesmo cenário agora fecha em Inflação=27,5% (no teto) e o excedente vai para Pós-fixado.
- 12.000 cenários de fuzz com o novo invariante (nenhuma classe acima do próprio teto) + e2e completo: zero falhas.

## v1.6 — 15/07/2026 — Bandas de alocação na aba Apresentação
- Nova seção na aba Apresentação: "Controle de alocação — bandas da casa". Mostra, para o perfil do cliente montado, cada classe com peso na carteira contra o teto (e o piso, onde confirmado) das Diretrizes — mesmos números do B-21.
- Texto comercial explicando o conceito para uso em reunião: banda institucional, não escolha do assessor; limite existe mas há flexibilidade dentro dele.
- Pós-fixado marcado visualmente como "livre de risco" — pode aparecer acima do que a faixa mostra, por design (D-22), sem soar como inconsistência.
- RV América Latina exibida somada a RV Global, coerente com D-23.
- Corrigido um bug de contaminação entre testes do e2e (objetivo de teste anterior não limpo, mascarava o resultado do cenário de bandas) — não é bug do app, mas do arquivo de teste.

## v1.7 — 15/07/2026 — Decisões de roadmap: Cowork e fusão com PMS
- D-24: fusão com o Portfolio Management System adiada — nenhum dos dois lados maduro o bastante. Arquitetura provável fica registrada (motor deste guia como módulo consumido pelo PMS, não fusão de código).
- B-22 e B-23 abertas no backlog para dar sequência quando fizer sentido.
- Nenhuma mudança no `guia-alocacao.html` nesta sessão — só governança.

## v1.23.0 — 21/07/2026 — B-33 ajuste: FIIs incluídos no agregado de Renda Variável
- Alexandre pediu para incluir Fundos Listados (FIIs) no agregado "Renda Variável". Constante passou de `['rvb','rval','rvg']` para `['rvb','rval','rvg','fli']`; só Alternativos (`alt`) ficam de fora agora. Textos da interface atualizados nos dois pontos.
- Sem efeito numérico imediato: a classe Fundos Listados está vazia hoje (B-09), então nenhum produto `fli` existe para somar — mas o agregado passa a incluí-los automaticamente assim que um FII for cadastrado.
- Suíte revalidada: fuzz 20.000/0, e2e sem `❌` real.

## v1.22.0 — 21/07/2026 — B-33: classe "Renda Variável" agregada na aba Composição
- Nova linha "Renda Variável (total)" na tabela por perfil da aba 04 Composição e novo painel "Carteira do cliente · Renda Variável" na composição realizada — soma das classes RV Brasil + RV América Latina + RV Global.
- Constante `RV_CLASSES` em `ui.js`, reusada nos dois pontos de exibição. Nenhuma mudança no motor (`calcular()`) — é só agregação de exibição.
- Validado no navegador: RV cresce 4,8% (Conservador) → 9,8% (Moderado) → 23,6% (Arrojado). Suíte completa verde (fuzz 20.000/0, fuzz-carteira 20.000/0, e2e limpo).
- Primeiro fechamento sob a convenção de versão MAJOR.MINOR: v1.21 → v1.22 (MINOR, 1 item de backlog).

## v1.21.0 — 20/07/2026 — Versão passa a aparecer no nome do arquivo e na interface
- Pedido do Alexandre: todo arquivo do sistema entregue para teste deve ter a versão no nome e visível na tela, para facilitar comunicação/identificação entre builds.
- `package.json` ganhou o campo `"version"` (fonte única, `1.21.0`). `build.js` agora escreve dois arquivos: `guia-alocacao.html` (nome fixo, mantido por compatibilidade com o resto da documentação) e `guia-alocacao-v{versão}.html` (cópia idêntica, nome versionado).
- Rodapé da interface ganhou uma linha discreta: "Guia de Alocação PG — v{versão} — gerado em {data}" (marcadores `__APP_VERSION__`/`__APP_BUILD_DATE__` no `shell.html`).
- A partir de agora, toda entrega de build deve subir o campo `version` do `package.json` junto do `INDEX.md`, para os dois nunca dessincronizarem.
- Suíte revalidada: fuzz 20.000/0, fuzz-carteira 20.000/0, e2e sem `❌` real.

## v1.21 — 20/07/2026 — B-19 FECHADO: XP Deb e AlphaKey via dados abertos da CVM
- Alexandre confirmou CNPJ/nome oficial dos 2 últimos fundos pendentes. Não estavam na planilha de previdências (não são previdência) nem no Yahoo Finance (não são negociados em bolsa) — encontrei os dois no **portal de dados abertos da CVM** (dados.cvm.gov.br), que publica a cota diária de todo fundo registrado no Brasil.
- Baixei 66 arquivos mensais (jan/2021–jul/2026, ~9MB cada) e filtrei pelos 2 CNPJs — 2.093 linhas de cota diária. Lidei com uma mudança de layout do CSV da própria CVM no meio do período (9 colunas até ~2023, 10 depois, por causa da adição de subclasse de cotas).
- **XP Debêntures Incentivadas CDI CP**: drawdown real −1,61% (5,5 anos de dado) → vol10 0,32.
- **AlphaKey LS FIF em Cotas FIM**: drawdown real −0,92% (2,8 anos de dado) → vol10 0,18. Confirma que o "AlphaKey Ações" usado como candidato em sessões anteriores era mesmo outro fundo — o valor real por CNPJ é bem diferente do −52,38% daquele candidato.
- **B-19 fecha com 32 de 36 produtos com dado real/calculado** (era 16 no início do dia). Os 4 restantes (LFTB11×2, NLFA11, LFIN11, MARG11) continuam provisórios por decisão documentada (D-31), não por falta de tentativa.
- Suíte revalidada: fuzz 20.000/0, fuzz-carteira 20.000/0, e2e sem `❌` real.

## v1.20 — 20/07/2026 — B-19 quase fechado; script de manutenção de volatilidade
- LFTB11 (×2), NLFA11, LFIN11, MARG11 confirmados por Alexandre como sem proxy internacional viável — mantidos provisórios por decisão explícita (D-31), não por falta de tentativa. Anotações `ver` atualizadas para refletir a busca feita.
- XP Deb CDI 30 e AlphaKey: Alexandre confirmou nome oficial e CNPJ dos fundos certos (26.803.233/0001-16 e 52.304.477/0001-64). Busquei nos ~300 fundos da planilha de previdências — não encontrados (esperado, não são previdência). Falta uma fonte de drawdown; ficam como as 2 últimas pendências reais do B-19.
- **Novo `atualizar-volatilidade.js`**: refaz a busca de drawdown no Yahoo Finance (próprio ativo ou proxy) para os 8 ETFs já fechados e imprime um relatório comparando com o `core.js` — nunca escreve sozinho no cadastro, aplicar é sempre manual. Adicionado ao `package.json` (`npm run atualizar-volatilidade`) e documentado no README.
- Suíte revalidada: fuzz 20.000/0, fuzz-carteira 20.000/0, e2e sem `❌` real.

## v1.19 — 20/07/2026 — B-19: mais 5 ETFs via drawdown do índice/ativo replicado
- SPXR11 (proxy S&P 500, vol10 6,78), GOLX11 (proxy ouro, vol10 5,01), BILF39 (proxy iShares Latin America 40, vol10 10 teto), BCOM39 (proxy iShares Commodity Dynamic Roll — match por nome, não por CNPJ, vol10 9,79) e HGBR11 (proxy LQD/iBoxx IG — proxy imperfeito, HGBR11 é "hedge carry", vol10 5,87) fechados com drawdown do ativo/índice que cada ETF replica, já que o próprio ETF tem histórico curto demais na B3 (D-30).
- Autenticidade do dado reforçada de novo: drawdown do S&P 500 bateu as datas exatas do crash da COVID; drawdown do ILF bateu a crise latino-americana de 2018-2020.
- **30 de 36 produtos agora com dado real/calculado** (era 16 no início da sessão de hoje). Restam 6: LFTB11 (×2), NLFA11, LFIN11, MARG11 (sem proxy internacional óbvio) e XP Deb CDI 30 + AlphaKey (match de fundo pendente).
- Suíte revalidada: fuzz 20.000/0, fuzz-carteira 20.000/0, e2e sem `❌` real.

## v1.18 — 20/07/2026 — E-16 revisado (falso alarme); B-19 avança com 3 ETFs reais
- **Reavaliei o E-16 e revertei a conclusão.** A suspeita de dado sintético do Yahoo Finance se apoiava em evidência fraca (presunções não confirmadas sobre idade de ETFs de nicho, e uma coincidência de data que é comportamento normal de qualquer feed ao vivo). Reteste com 4 referências conhecidas (Ibovespa, Bitcoin, Apple, Vale3, 5 anos de histórico) confirmou preços plausíveis; o drawdown do DIVO11 bateu exatamente com o crash da COVID (pico 23/01/2020, vale 23/03/2020) e o do HASH11 com o inverno cripto de 2021-22 — coincidências específicas demais para serem fabricadas.
- **DEBB11 (vol10 0,25), DIVO11 (8,02) e HASH11 (10, teto) fechados** com drawdown real via Yahoo Finance, mesma fórmula já usada nos fundos.
- **24 de 36 produtos agora com dado real/calculado** (era 16 no início da sessão de hoje).
- Restam 12 provisórios: 9 ETFs com menos de 1 ano de histórico (drawdown-até-agora não é confiável pra eles — decisão pendente de como tratar), 2 recém-listados sem dado nenhum (BILF39, BCOM39), e XP Deb CDI 30 + AlphaKey (match de fundo pendente).
- Suíte revalidada: fuzz 20.000/0, fuzz-carteira 20.000/0, e2e sem `❌` real.

## v1.17 — 20/07/2026 — B-07 fechado; B-19 parcial (5 previdências com dado real)
- Alexandre enviou a planilha "Guia-de-Previdência_Julho26_Externo-3.xlsm" (aba Prev XPCS, ~300 fundos de previdência da XP com liquidez, aporte mínimo, público-alvo e volatilidade real).
- **B-07 fechado.** Os 5 produtos de previdência do cadastro (`prev_brad`, `prev_brave`, `prev_trend`, `prev_kap`, `prev_arca`) ganharam liquidez real (6/21/2/9/9 dias), aporte mínimo real (R$100 em todos) e público-alvo confirmado.
- **Correção real encontrada:** Brave e Trend IMA-B 5+ estavam cadastradas com `qual:false`, mas a planilha confirma `Participantes: Qualificados` para ambas — corrigido, produto não deve mais aparecer para cliente não qualificado.
- **B-19 avançou: as 5 previdências saem da lista de provisórios** (15 restam — 12 ETFs/ações + XP Deb CDI 30 + AlphaKey). Fórmula de conversão `vol10=min(10,vol×10)` confirmada por Alexandre (D-28), aplicada sobre a coluna "Volatilidade desde o início" (não mensal — corrigi um erro meu de anualização no processo, registrado em ERROR-LOG E-17). Matches ambíguos de Arca Grão e Kapitalo (cada um com 2+ variantes parecidas na planilha) confirmados por Alexandre.
- Vol10 resultante ficou baixo (0,0–0,9) mesmo para o Kapitalo, que a própria planilha classifica "Macro Alta Vol" — Alexandre confirmou a fórmula ciente disso; documentado no `ver` de cada produto.
- Instalado Python 3.12 + openpyxl/pandas/markitdown nesta máquina (não estavam presentes) para ler o `.xlsm`.
- Suíte completa revalidada: fuzz 20.000/0, fuzz-carteira 20.000/0, build OK, e2e sem `❌` real.

## v1.16 — 20/07/2026 — Lote de confirmações: B-03 fechado, B-04/05/06/08 limpos, B-09 decidido, B-10 redigido
- **B-03 fechado.** Alexandre confirmou tributação do LFTB11: 15% flat sobre o ganho na venda, sem come-cotas (regra padrão de ETF). BILF39 já coberto pelo B-06. Anotação `[TRIBUTAÇÃO]` adicionada em `core.js` (`lftb`, `lftb_estrat`).
- **B-04/B-05/B-06/B-08 — bookkeeping corrigido.** Os 4 já estavam confirmados desde 14/07/2026 direto no cadastro; a tabela do BACKLOG só não tinha sido sincronizada. Nenhuma mudança de código, só limpeza de documento.
- **B-09 — decisão registrada (D-27):** Fundos Listados fica vazia por enquanto, por escolha, não por pendência.
- **B-10 — resumo técnico redigido** para Alexandre encaminhar a quem mantém a planilha Alocação PG (E-04: Conservador somando 105% em 4 classes, célula de ETFs da COMPOSIÇÃO quebrada, reconciliação C/M/A com erro mínimo de 7pp).
- Suíte revalidada: fuzz 20.000/0, build OK, e2e sem `❌` real.

## v1.15 — 20/07/2026 — B-19 investigado e não fechado: dado de rede não confiável neste ambiente
- Tentei fechar B-19 (volatilidade dos 12 ETFs) puxando histórico de preços do Yahoo Finance por rede. A rota funciona neste ambiente (`curl`/`fetch` com `User-Agent`) — diferente do que a SPEC registrava antes. Mas um teste de controle com PETR4 mostrou fortes indícios de que a resposta é sintética/mockada pelo sandbox, não o Yahoo real (ver ERROR-LOG E-16).
- **Nenhum `vol10` foi alterado no `core.js`.** B-19 continua exatamente como estava — 20 produtos provisórios, sem mudança. `SPEC-volatilidade-v2.md` atualizada com o achado, para a próxima sessão não repetir o mesmo caminho sem desconfiar.
- Nenhuma mudança de comportamento nem de dado no motor. Sessão de investigação, não de implementação.

## v1.14 — 20/07/2026 — B-12 FECHADO: modo 3 (novo cliente) entregue
- Modo 3 (aportador de novo cliente) implementado como **seletor de modo no painel de revisão**, não como motor separado: a matemática é idêntica à do modo 2 (SPEC §Modo 3 já previa isso), muda o enquadramento da conversa. Duplicar o motor só para trocar rótulo seria inchaço — registrado como decisão consciente.
- Toggle "Cliente atual / Novo cliente" adapta título, KPIs e cabeçalhos: "Sugerido vender" → "A desmontar", "Caixa p/ rebalancear" → "Caixa p/ montar o alvo", "Para onde levar o caixa" → "Composição-alvo a montar". Zero lógica duplicada — uma tabela de rótulos `L` escolhida pelo modo.
- e2e estendido para os dois modos: clica no toggle, confirma que o título muda, reanalisa e confere que os rótulos do modo 3 aparecem. Invariantes seguem checados (nunca vende fundo/previdência/caixa; caixa = soma dos líquidos).
- Suíte completa verde: fuzz principal 20.000/0, fuzz-carteira 20.000/0, build OK, e2e sem `❌` real.
- **B-12 fechado integralmente** (3 modos). Era a última pendência P1 que não dependia de dado externo.

## v1.13 — 16/07/2026 — B-12 modo 2: UI da revisão de carteira ligada
- Ligado o motor da revisão completa à aba "07 · Carteira Atual" (`shell.html` + `cliente-ui.js`): novo painel "Revisão de carteira completa — pode sugerir venda", com seletor de perfil próprio, botão "Analisar revisão da carteira", KPIs (patrimônio total, bruto a vender, custo de IR, caixa a rebalancear), tabela de sugestões de venda (com `!` de conferência no IR de ações) e tabela de "para onde levar o caixa".
- Avisos honestos na tela: excesso residual quando uma classe não tem posição vendável, sobra não-rebalanceada, e contagem de posições mantidas (fundo/previdência) que não entram na venda por falta de custo de aplicação no extrato.
- Pequena correção no motor: item de caixa/custódia ganhou ramo próprio em `classificarItemCarteira()` (antes caía no ramo genérico com mensagem sobre "valor aportado", imprecisa para caixa).
- e2e estendido: clica de verdade no botão novo e checa os invariantes (nunca vende mantido/caixa; caixa = soma dos líquidos). Suíte completa verde: fuzz-carteira 20.000/0, fuzz principal 20.000/0, e2e sem `❌` real.
- **B-12 modo 2 fechado. Modo 3 (aportador de novo cliente)** reaproveita a mesma função — falta só o enquadramento na UI, deixado como item pequeno no BACKLOG.

## v1.12 — 16/07/2026 — B-12 modo 2: motor da revisão de carteira completa (ainda sem UI)
- Implementado o **motor** do modo 2 do B-12 (revisão de carteira completa) em `carteira.js`: `classificarItemCarteira()` (classe + elegibilidade de venda + custo de saída por tipo) e `calcularRevisaoCompleta()` (excesso/déficit por classe → sugestão de venda → caixa de rebalanceamento → realocação nos déficits).
- **Escopo confirmado por Alexandre (D-26):** só RF bancária/títulos (fora de carência, com qtd disponível) e Ações (ganho de capital a 15% flat, marcado com `ver` por não considerar isenção de R$20k/mês nem compensação de prejuízo) são elegíveis para venda. Fundos, FIDC e Previdência **nunca** são sugeridos para venda — o extrato da XP não traz o valor aportado original, sem o qual não há ganho/IR calculável. Aparecem no diagnóstico, mantidos, com o motivo explícito.
- Novo `fuzz-carteira.js`: 20.000 carteiras sintéticas (RF/Ações/Fundos/Previdência) contra os invariantes do SPEC — nunca vende o que não pode, conservação exata do caixa (líquido vendido = alocado + não-rebalanceado), determinismo. Zero falhas. Adicionado ao `npm test`.
- **Pendente (não entregue nesta rodada):** a ligação com a UI (`cliente-ui.js`) — o motor existe e está testado, mas ainda não há botão/seletor de modo na aba "07 · Carteira Atual" para o assessor usá-lo. Modo 3 (aportador de novo cliente) reaproveita a mesma função, também sem UI ainda.
- Suíte completa revalidada: build OK, fuzz principal 20.000/0, e2e sem `❌` real.

## v1.11 — 16/07/2026 — B-11 fechado de verdade: SPEC do motor atualizada
- `01-fundamentos/SPEC-motor.md` estava marcada "MATERIALIZADA" desde 14/07/2026, mas ficou desatualizada assim que o teto por classe (B-21) entrou em produção em 15/07 — não documentava a etapa 2a (teto por classe), a 3ª restrição da `folgaGeral`, nem os mecanismos de E-12 (insolúveis), E-13 (piso preserva resto) e E-14 (checagem final do FGC).
- Reescrita para v1.1, batendo com o `core.js` atual: ordem de etapas corrigida (2a/2b/3/4/4b/5), critérios de aceite expandidos (nenhuma classe acima do próprio teto; resto de redistribuição nunca descartado), saída de `calcular()` atualizada (`tetosClasse`, `violacoesClassePorPiso`).
- Nenhuma mudança de comportamento do motor — só documentação. `INDEX.md`/`BACKLOG.md` atualizados para fechar B-11 e remover a nota de drift.

## v1.10 — 16/07/2026 — B-02 fechado: pesos do Conservador confirmados
- Alexandre confirmou que a escala ×0,8 aplicada aos 7 produtos do Conservador (B30, B35, Previdência Trend, LTN 2029, LTN 2032, SPXR11, DIVO11) é a correção definitiva — não um ajuste provisório nem uma alternativa como cortar Pós-fixado (D-25).
- Anotação `ver` desses 7 produtos atualizada de "CONFIRMAR" para "[PESO] Confirmado por Alexandre em 16/07/2026"; notas de volatilidade pendente (`[VOL]`), quando existiam no mesmo produto, permanecem intactas e ainda marcadas.
- Nenhum peso numérico mudou — só a marcação de confiança do dado. Rebuild + fuzz (20.000 cenários) + e2e: zero falhas.

## v1.9 — 16/07/2026 — Primeira sessão no Claude Code: Node instalado, suíte completa validada
- Migração de máquina: Node.js LTS não estava instalado neste computador; instalado via winget para poder rodar `npm install`, `build.js`, `fuzz.js` e `e2e2.js` localmente.
- E-15: `e2e2.js` gravava a boleta de teste em `/tmp/boleta2.xlsx` (caminho Unix hardcoded) — travava no Windows com `ENOENT`. Corrigido para `path.join(os.tmpdir(), 'boleta2.xlsx')`.
- Sequência completa revalidada nesta máquina: `build.js` OK · `fuzz.js` 20.000 cenários, zero falhas · `e2e2.js` sem `❌` real (só os 14 `scrollTo` esperados, documentados no README).
- Nenhuma mudança de regra de negócio nesta sessão — só arnês de teste e ambiente.

## v1.8 — 15/07/2026 — Dois bugs reais achados ao empacotar para o Claude Code
- Ao montar `80-producao/codigo-fonte/` com `build.js` e testar em volume 16x maior que o padrão (200.000 cenários vs. 12.000), achei e corrigi 2 bugs reais que nunca tinham aparecido antes:
  - E-13: o piso por posição descartava o resto quando não achava destino, e a normalização final inflava proporcionalmente todas as classes — inclusive as que já estavam exatamente no próprio teto. Corrigido: piso nunca descarta o resto.
  - E-14: o FGC podia oscilar entre dois emissores sem convergir (quando Tesouro Direto está desligado, sem válvula de segurança), nunca disparando o alerta de estouro. Corrigido: verificação final independente do caminho do loop.
- Também corrigido um bug de build: `String.prototype.replace()` do JS interpreta `$&` como padrão especial quando o 2º argumento é string — `export.js` tem `"R$"` que colidia com isso. `build.js` usa função de substituição, não string.
- 200.000 cenários depois das correções: zero falhas.
