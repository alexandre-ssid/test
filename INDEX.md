# INDEX.md — Estado vivo do projeto SSID Portfolio Manager (ex-Guia de Alocação PG)
**Função:** mapa de estado do repositório. **Atualizar a cada mudança** (ver `CLAUDE.md` → Protocolo de Auto-Atualização).
**Versão do app:** v3.5.1 · **INDEX:** 05/08/2026
**⚠️ REBASE + evolução (31/07/2026):** produto renomeado **SSID Portfolio Manager**; base v2.0 = melhorias do **Bruno** (PGBL como bolsão, aba Estrutura/simulações fiscais, rebrand) + B-33 + B-35. **v3.0 = lote de 5 melhorias** (B-28 visualização por estratégia/classe · B-29 aceitar matches em lote · B-30 e-mail de ordens · B-31 incluir/excluir ativo com rebalanceamento · B-32 resumo simples). **v3.1 = B-26** (limite de quantidade de produtos). **v3.2 = B-27** (não usar ETF nos Filtros) **+ B-24** (coluna recolhível) **+ B-25** (feedback com origem). **v3.3 = B-34** (previdência opcional — toggle mestre carteira+PGBL, D-36). **v3.4 = B-36** (e-mail de ordens reescrito — o mailto único do B-30 falhava silenciosamente quando não havia cliente de e-mail padrão no SO; substituído por um modelo de compliance por produto, conforme o PDF "Modelos de Ordem — Todos os Produtos" da XP, sempre copiável/baixável). **Fonte de verdade agora é o HTML único** `80-producao/ssid-portfolio-manager-v3.4.0.html`; módulos `codigo-fonte/` congelados (linha antiga até v1.23). Ver CLAUDE.md v1.1 e CHANGELOG.
**Fase atual (linha antiga, herdada):** B-21, B-02, B-11, B-12 (3 modos) e **B-19 fechados.** B-03/04/05/06/07/08 fechados. B-09 decidido (D-27). B-10 redigido. **B-19: 32 de 36 produtos com dado real/calculado** — 5 previdências (D-28), DEBB11/DIVO11/HASH11 (D-29), SPXR11/GOLX11/BILF39/BCOM39/HGBR11 (D-30), XP Deb CDI CP/AlphaKey via dados abertos da CVM (D-32). Só 4 exceções documentadas por decisão (D-31): LFTB11 (×2), NLFA11, LFIN11, MARG11.
**E-16 revisado: a rota de rede para Yahoo Finance é dado genuíno**, não sintético — o alarme da rodada anterior era falso, corrigido após reteste com referências conhecidas (S&P 500, Ibovespa, Bitcoin, Apple, Vale3, ILF, LQD — datas de crash batendo com eventos reais conhecidos).
**Não há mais nenhuma pendência aberta que dependa só de código.** Tudo que resta depende de dado/decisão do Alexandre ou de terceiros (Bruno).
**Estado geral:** 7 abas, boleta xlsx, motor principal com 20.000 cenários de fuzz (incluindo o invariante de teto de classe) + e2e completo, zero falhas. **32 de 36 produtos com dado de volatilidade real/calculado** (era 16 no início da sessão de hoje). Achado no caminho: Brave e Trend IMA-B 5+ estavam com `qual:false` mas são restritas a qualificado — corrigido; XP Deb e AlphaKey resolvidos via portal de dados abertos da CVM (não Yahoo, não Guia de Fundos).

---

## 1. Versões correntes (FONTE ÚNICA DE VERSÕES)

### governança (raiz)
| Arquivo | Versão | Estado |
|---|---|---|
| `CLAUDE.md` | v1.0 | canônico |
| `DECISOES.md` | v1.0 | ativo |
| `BACKLOG.md` | v1.0 | ativo |
| `ERROR-LOG.md` | v1.0 | ativo |
| `CHANGELOG.md` | v1.0 | ativo |

### 80-producao
| Arquivo | Versão | Estado |
|---|---|---|
| `ssid-portfolio-manager-v3.5.1.html` | v3.5.1 — **FONTE DE VERDADE atual (HTML único, editar direto)** | OK, em produção. + B-38 (v3.5.1, teto de fundo silencioso corrigido) — B-37 (v3.5.0, evolução paralela do Bruno assimilada) — B-36 (v3.4) — B-27/B-24/B-25 (v3.2) + B-34 (v3.3) |
| `ssid-portfolio-manager-v3.5.0.html` | v3.5.0 | histórica — preservada, superada pela v3.5.1 (tinha o bug E-20/B-38) |
| `ssid-portfolio-manager-v3.4.0.html` | v3.4.0 | histórica — preservada |
| `ssid-portfolio-manager-v3.3.0.html` | v3.3.0 | histórica — preservada |
| `ssid-portfolio-manager-v1.36.0.html` | v1.36 | recebido original do Bruno (pristino), preservado como referência do rebase |
| `ssid-portfolio-manager-v1.41.0.html` | v1.41.0 (Bruno) | **externo, NÃO fonte de verdade** — evolução paralela recebida em 05/08/2026, 5 features avaliadas e portadas para a v3.5.0 via B-37. Não copiado para `80-producao/` (é referência, não produção); mantido como upload de sessão |
| `guia-alocacao.html` + `codigo-fonte/*.js` + `build.js` | v1.23 | **CONGELADOS** — linha modular antiga, histórica; não é mais a fonte de verdade (ver rebase) |
| `apresentacoes/brave-lookthrough/brave-lookthrough-set26-v1.0.pptx` | v1.0 (02/10/2026) | Material lateral (não é o app): look-through dos 5 fundos Brave (lâmina set/26 + CDA/Informe FIDC da CVM). Fonte e dados em `apresentacoes/brave-lookthrough/fonte/`. Brave 30 sem lista pública de FIDCs → `[verificar]` (D-43) |
| `codigo-fonte/fuzz-monolito.js` · `verificar-monolito.js` · `verificar-ordens.js` · `verificar-credito-macro-emissor.js` | ativos | testes que rodam sobre o HTML único via jsdom (fuzz 20.000/0 + confirmação em 150.000/0 após o fix do B-38; `verificar-ordens.js` cobre B-36; `verificar-credito-macro-emissor.js` cobre B-37) |

### 04-insumos
| Arquivo | Versão | Estado |
|---|---|---|
| `Alocação_PG_v2.xlsx` | v2 | recebida; **não fecha** (ver ERROR-LOG E-04) |
| `Alocação_PG.xlsx` (v1) | v1 | histórica |

### 01-fundamentos
| Arquivo | Versão | Estado |
|---|---|---|
| `SPEC-motor.md` | v1.1 | ativa — reescrita para bater com o `core.js` atual (B-11 fechado; v1.0 tinha ficado desatualizada desde o teto por classe) |
| `SPEC-carteira-atual.md` | v1.3 | ativa — os 3 modos implementados e testados (B-12 fechado) |
| `SPEC-volatilidade-v2.md` | v0.1 + nota 20/07 | ativa — fórmula previdências (D-28) documentada; ETFs seguem sem fonte confiável |

---

## 2. Estado das fases
| Marco | Responsável | Estado |
|---|---|---|
| Fase 0 — triagem (categoria A, projeto de pasta) | Claude | ✅ |
| Fase 1 — decisões irreversíveis travadas | Alexandre | ✅ (D-01, D-11, hospedagem) |
| Fase 2 — estado vivo materializado (Kit de Governança) | Claude | ✅ |
| Fase 3 — execução incremental sobre pendências P0 | Alexandre + Claude | 🟡 próxima |
| SPEC do motor escrita (critérios de aceite) | Claude | ✅ v1.1 — 16/07/2026 (B-11 fechado; v1.0 tinha ficado desatualizada) |

---

## 3. Pendências priorizadas (espelha o BACKLOG)
| # | Pendência | Estado |
|---|---|---|
| B-19 | Só 4 exceções documentadas restam provisórias: LFTB11×2/NLFA11/LFIN11/MARG11 (D-31, sem proxy viável) | ✅ fechado |
| B-20 | Confirmar as âncoras da escala 0–10 (duration 20a=10; drawdown 50%=10; volatilidade previdência 100%=10 já confirmada em D-28) | ⏳ P2 — dono: Alexandre |
| B-24 | Coluna de parâmetros da Carteira recolhível | ✅ fechado (v3.2.0) |
| B-25 | Botão de feedback com origem rastreada (localStorage + exportar) | ✅ fechado (v3.2.0) |
| B-26 | Quantidade máxima de ativos na carteira | ✅ fechado (v3.1.0, D-35) |
| B-27 | Toggle "não usar ETF" acessível nos Filtros | ✅ fechado (v3.2.0) |
| B-28 | Visualizar carteira por estratégia ou por classe de ativo | ✅ fechado (v3.0.0) |
| B-29 | Match de produtos mais produtivo (aceitar em lote + filtro) | ✅ fechado (v3.0.0) |
| B-30 | E-mail de ordens (mailto com resumo) | ✅ fechado (v3.0.0) — implementação **substituída pelo B-36** (v3.4.0): mailto único falhava silenciosamente |
| B-36 | E-mail de ordens por produto, no modelo de compliance do PDF "Modelos de Ordem" | ✅ fechado (v3.4.0) |
| B-37 | 5 features da evolução paralela do Bruno (v1.41.0) portadas — questionário estendido, risco de crédito, giro por ciclo macro, teto de emissor, janela móvel | ✅ fechado (v3.5.0) |
| B-38 | Teto de fundo violado silenciosamente (~1/100–200 mil cenários) quando `maxAtivos` está ativo — achado ao validar B-37, mas pré-existente (E-20) | ✅ fechado (v3.5.1) |
| B-31 | Incluir/excluir ativo manualmente com rebalanceamento | ✅ fechado (v3.0.0, escopo D-34) |
| B-32 | Resumo simples do rebalanceamento/aporte e o motivo | ✅ fechado (v3.0.0) |
| B-33 | Classe "Renda Variável" agregada na Composição | ✅ fechado (reaplicado na v2.0.0) |
| B-34 | Previdência opcional (toggle mestre carteira+PGBL) | ✅ fechado (v3.3.0, D-36) |
| B-35 | Alerta de RV "Verificar se está no mycapital" | ✅ fechado (v2.0.0) |
| B-22 | Migrar para Cowork Project (fim do ciclo zip-upload-rezip) | ✅ fechado (03/08/2026) |
| B-14 | Carteiras ETF BR e ETF USA (item #5) | 🟡 parcial — ETF BR feito na evolução para v3; falta só ETF USA |
| B-15 | Discursos comercial e técnico das alocações (item #6) | ✅ fechado — finalizado na evolução para v3 |
| B-16 | Botão R$300k ETF dolarizado / UCITS (item #3) | ⏳ P2 — segue bloqueado (falta a parte de ETF USA do B-14) |
| B-17/23 | Unificar com Portfolio Mgmt Sys (item #1) | ⏸ P3 — adiado por decisão (D-24) |
| B-18 | Bloqueio de edição para admins (item #4) | ⏸ pausado |
| B-09 | Fundos Listados sem produto | ⏸ decidido — vazio por escolha (D-27) |

**Fechados recentemente:** B-02, B-03, B-07, B-11, B-12 (3 modos), B-21. B-04/05/06/08 confirmados (bookkeeping corrigido). B-10 resumo redigido. B-19 parcial (5/20). Nenhuma pendência restante depende só de código.

---

## 4. Dessincronias / drift
- **Cadastro (36 produtos) vive só no HTML**, não há cópia em `.md`. É a fonte única por decisão (CLAUDE §7.4). Não é drift, é design — registrado para não confundir sessão futura.
- A planilha v2 em `04-insumos` não fecha; o HTML foi ajustado para contornar (E-04). Divergência conhecida e documentada, não silenciosa.
- **Lição do B-11:** um documento marcado "status: MATERIALIZADA" não se atualiza sozinho quando o código muda. A SPEC do motor ficou 1 dia desatualizada (teto por classe não documentado) sem ninguém notar até essa sessão. Nenhum processo novo criado para evitar recorrência — só registrado aqui como ponto de atenção para quem mexer em `calcular()` de novo.

---

## Histórico
- **v1.4 — 05/08/2026.** B-38 fechado: bug silencioso de teto de fundo na etapa 4b (B-26) corrigido (v3.5.1) — causa raiz isolada por reprodução instrumentada, fuzz 150.000/0 de confirmação.
- **v1.3 — 05/08/2026.** B-37 fechado: 5 features da evolução paralela do Bruno (v1.41.0) avaliadas e portadas para a v3.5.0 (questionário estendido, risco de crédito, giro por ciclo macro, teto de emissor, janela móvel), preservando 100% do B-24→B-36. E-20/B-38 registrados (bug pré-existente de teto de fundo achado ao validar, não causado pelo B-37).
- **v1.2 — 03/08/2026.** B-22 fechado: projeto migrado para este ambiente (Claude Code / Cowork), confirmado por Alexandre — fim do ciclo zip-upload-rezip entre sessões.
- **v1.1 — 03/08/2026.** Projeto importado para novo ambiente (zip). B-36 fechado: e-mail de ordens reescrito (v3.4.0). B-14 atualizado para parcial (ETF BR feito, falta ETF USA); B-15 fechado; B-16 segue bloqueado.
- **v1.0 — 14/07/2026.** Estado vivo aberto. Projeto formalizado; 3 sessões prévias consolidadas em governança.
