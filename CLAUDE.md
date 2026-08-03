# CLAUDE.md — Memória canônica do projeto SSID Portfolio Manager (ex-Guia de Alocação PG)
**v1.1 · 31/07/2026 · Alexandre Welter (assessor A72671, InvestSmart/XP)**

> **Fonte canônica de governança.** Toda sessão começa lendo este arquivo, depois `INDEX.md`. Regras novas entram **aqui primeiro**; qualquer outro documento de instruções é derivado (para evitar drift). Mudou uma regra? Suba a versão deste arquivo e registre no `CHANGELOG.md`.

> **⚠️ REBASE de 31/07/2026 — leia antes de mexer no código.** O produto foi renomeado para **SSID Portfolio Manager** e evoluiu num ambiente externo até a **v1.36** (PGBL como bolsão, aba "Estrutura, planejamento e performance" com simulações fiscais, abas Diagnóstico+Objetivos fundidas, "Apresentação"→"Evidências Científicas", novo rebrand visual). Essa v1.36 chegou como **HTML único compilado, sem código-fonte modular** — e trazia a nossa linhagem até ~v1.21 (todo o B-19), faltando só o B-33. Reaplicado o B-33 e adicionado o B-35, o produto foi promovido a **v2.0.0** (o bump MAJOR marca as melhorias do Bruno); em seguida vários itens de backlog (B-28/29/30/31/32, B-26, B-27/B-24/B-25, B-34) levaram a novas versões. **Arquivo atual: `80-producao/ssid-portfolio-manager-v3.3.0.html` (sempre o de maior número; confira o `ls` da pasta 80-producao).** **Consequência de workflow:** a partir daqui a **fonte de verdade é o HTML único**, NÃO mais os módulos `codigo-fonte/*.js` + `build.js` (que refletem a linha antiga até v1.23 e estão congelados como histórico). Os testes foram portados para rodar sobre o monólito via jsdom: `codigo-fonte/fuzz-monolito.js` e `codigo-fonte/verificar-monolito.js`. Ver CHANGELOG v2.0.0 e §8.

---

## §0 — PRECEDÊNCIA (tem prioridade sobre tudo)

**O guia não é recomendação de investimento e não substitui o suitability oficial.** É ferramenta de trabalho para estruturar a conversa com o cliente. Nenhum número, peso, taxa, liquidez ou tributação sai para um cliente sem conferência na lâmina/regulamento do produto. Dado inferido ou estimado é marcado, nunca apresentado como confirmado. Se uma mudança introduz risco de o guia afirmar como certo algo que não foi verificado, ela viola esta regra e não entra.

Detalhe operacional dessa regra: todo produto com dado não confirmado carrega o campo `ver` (texto de conferência), que aparece como `!` na interface e migra para a coluna "Observação" da boleta exportada — de modo que a pendência viaja junto com o arquivo até o ponto de uso.

---

## §1 — Identidade e objetivo
Ferramenta HTML única e offline que ajuda o assessor a montar, em reunião, a alocação de um cliente a partir da planilha Alocação PG. O usuário responde um diagnóstico (ou ajusta filtros direto), e o guia seleciona os produtos elegíveis, respeita tetos de concentração e FGC, separa reserva e objetivos de curto prazo, e gera boleta em `.xlsx`. Dono e único operador: Alexandre. Público final indireto: clientes e prospects do escritório, e outros assessores da mesa que recebam o arquivo.

## §2 — Posicionamento / tese central
O que a planilha faz de forma estática (percentuais fixos para um patrimônio-exemplo), o guia faz de forma condicional e personalizada — reserva como valor e não como percentual, volatilidade em quatro níveis e não binária, piso por posição, tetos de concentração. **É** um tradutor da política de alocação PG em carteira individual. **Não é** um otimizador de retorno, um robô de recomendação, nem um substituto do processo regulatório de suitability.

## §3 — Frentes / canais / módulos
Seis abas, todas ativas: (01) Diagnóstico — questionário que vira filtros; (02) Objetivos — bolsões de curto prazo fora da reserva e do perfil; (03) Carteira — montagem e boleta; (04) Composição — toggles de veículo e o modelo por perfil; (05) Apresentação — argumentação técnico-comercial, incl. simulador de come-cotas; (06) Produtos — editor do cadastro (fonte de verdade), export/import JSON.

## §4 — Estratégia / método (Pareto)
O motor de cálculo (`calcular()`) concentra o valor do projeto. A ordem das etapas é deliberada e não deve ser reordenada sem re-testar: (1) reserva + bolsões saem do topo; (2) exclusão por restrição — volatilidade, enquadramento, liquidez, veículo — com realocação determinística por cadeia de fallback; (3) teto de concentração por fundo; (4) teto do FGC por grupo emissor sobre valor projetado no vencimento; (5) piso por posição; (6) valores e resíduo de arredondamento. Verificação por fuzz (milhares de cenários aleatórios contra invariantes) + e2e no DOM.

## §5 — Vocabulário e taxonomias
- **Perfis:** C (Conservador), M (Moderado), A (Arrojado).
- **Sub-perfil (`sub`):** classificação C/M/A por produto, herdada da aba COMPOSIÇÃO da planilha. Fonte única da classificação; recuperada por otimização inteira na v1.
- **Classes (10):** pos (Pós-fixado), inf (Inflação), pre (Prefixado), rfg (RF Global), mm (Multimercados), fli (Fundos Listados), rvb (RV Brasil), rval (RV América Latina), rvg (RV Global), alt (Alternativos).
- **Volatilidade (`vol`, 0–3):** N0 sem marcação a mercado · N1 crédito e pós · N2 juros e global · N3 RV, multimercado e alternativos.
- **Veículos:** Tesouro Direto, ETF, Fundo, FIDC, Previdência, Renda Fixa Bancária. Na aba COMPOSIÇÃO, FIDC conta dentro de "Fundos de Investimentos".
- **Reposição (`receber`/`wr`):** produto com peso zero no perfil que só entra quando a exclusão foi por volatilidade ou liquidez (modo `auto`).
- **`ver`:** texto de conferência de um produto (dado inferido/estimado). Vira `!` na UI e "Observação" na boleta.

## §6 — Públicos / personas / stakeholders
Operador único: Alexandre. Destinatários da saída: cliente/prospect (boleta, resumo WhatsApp, apresentação). Distribuição lateral: outros assessores da mesa, que recebem o `.json` de configuração e importam para trabalhar com o mesmo cadastro.

## §7 — Protocolo de trabalho (regras do agente)
1. ✱ **Conclusão antes do argumento.** Primeiro a resposta, depois a justificativa.
2. ✱ **Versão + changelog em TUDO.** Todo arquivo criado/alterado ganha versão e uma linha no `CHANGELOG.md`.
3. ✱ **"Atualizar/criar" = mexer no arquivo real.** Editar o arquivo, salvar na pasta certa, referenciar no `INDEX.md`. Nunca deixar órfão.
4. ✱ **Uma fonte única por informação.** Versões correntes só no `INDEX.md`; regras só aqui; cadastro de produtos só na constante `PADRAO` do HTML.
5. ✱ **Questionar a premissa.** Se o pedido parte de algo frágil (ex.: uma planilha que não fecha), apontar antes de executar.
6. ✱ **Marcar o que foi reconstruído.** Conteúdo regenerado de memória leva `-R`/`[RECONSTRUÍDO]`.
7. **Domínio (fixas):**
   - **Sinalizar incerteza; nunca inventar** fonte, número, taxa, URL ou citação. Dado não confirmado → campo `ver` no produto e `[verificar]`/marca no texto.
   - **Responder em português.**
   - **Nunca deturpar rentabilidade de fundo** em material de cliente.
   - **Substituir, não remendar** ao atualizar o motor ou o cadastro: reescrever o bloco inteiro e re-testar, em vez de aplicar correções pontuais que deixam estados inconsistentes.
   - **Todo cálculo novo passa por teste** (fuzz e/ou e2e) antes de ser dado como pronto. "Pronto" sem teste é opinião.
   - **Não presumir que a planilha nova fecha.** Validar somas por perfil e a aba COMPOSIÇÃO a cada versão recebida.

## §8 — Padrão de saída (design/formato)
Arquivo `.html` único, autocontido, sem CDN em runtime crítico (fontes do Google são o único externo, e degradam para fallback). Paleta latão/tinta sobre papel. Tipografia: Bricolage Grotesque (display), Public Sans (texto), IBM Plex Mono (números). Boleta `.xlsx` escrita por gerador próprio em JS puro (ZIP store + CRC32), sem biblioteca. Exportações: boleta `.xlsx`, CSV, resumo WhatsApp, impressão/PDF, e config `.json`.

## §9 — Escopo
**Cobre:** montagem de carteira por perfil a partir da política Alocação PG; personalização por reserva, objetivos, volatilidade, liquidez, enquadramento e piso; tetos de concentração e FGC; boleta e materiais de apresentação; cadastro editável e portável.
**NÃO cobre:** execução de ordens (o guia gera boleta, não bota ordem); o suitability regulatório; a geração do Cardápio de Alocação mensal (skill `cardapio-alocacao`); cards de troca de fundos (skill `card-trocas-cliente`); dados de mercado em tempo real.

---

## Registros vivos do projeto

| Registro | Pergunta que responde | Quando escrever |
|---|---|---|
| `INDEX.md` | Onde está tudo agora? (versões, fases) | A cada mudança |
| `CHANGELOG.md` | O que mudou? | A cada sessão/commit |
| `BACKLOG.md` | O que falta fazer? (priorizado) | Ao abrir/fechar pendência |
| `ERROR-LOG.md` | O que deu errado e como evitar de novo? | A cada erro/reversão/quase-erro |
| `DECISOES.md` | Por que foi decidido assim? | A cada decisão de rumo |

## Protocolo de Auto-Atualização
Ao **fim de cada sessão** que mexeu em algo: (1) materializar o arquivo real; (2) versionar; (3) atualizar `INDEX.md`; (4) escrever no `CHANGELOG.md`; (5) alimentar `BACKLOG`/`ERROR-LOG`/`DECISOES`; (6) cross-link; (7) revisão de saúde periódica; (8) consolidar; (9) commit se em git.

> O repositório tem que se explicar sozinho para uma sessão sem memória de chat. O que só existe "na conversa" ainda não existe.

---

## Mapa de pastas
Projeto de artefato único — mapa enxuto. O entregável é um só arquivo; a governança e os insumos o cercam.

```
guia-alocacao-pg/
├── CLAUDE.md  INDEX.md  CHANGELOG.md  BACKLOG.md  ERROR-LOG.md  DECISOES.md  README.md   # governança (raiz)
├── 00-governanca/            # cláusula de preferências, _arquivo/ de versões antigas
├── 01-fundamentos/           # SPEC do motor e regras de negócio, critérios de aceite
├── 04-insumos/               # planilhas Alocação PG recebidas (v1, v2, ...) + notas de leitura
├── 80-producao/              # guia-alocacao.html (entregável corrente) + configs .json de referência
└── 90-templates/             # nenhum ainda; reservado
```

---

## Histórico de versões
- **v1.0 — 14/07/2026.** Criação da memória canônica. Projeto formalizado sob a skill construtor-software após três sessões de desenvolvimento prévias (guia v1 → boleta xlsx → guia v2 com planilha atualizada). Categoria A (artefato único), tratado como projeto de pasta.
