# SPEC — Motor de alocação (`calcular()`)
**status: MATERIALIZADA — v1.1, 16/07/2026, atualizada a partir do código e da suíte de testes em produção**

Este documento faz o que o `CLAUDE.md` §7 já exigia: transforma as regras do motor em critérios de aceite verificáveis, para que uma sessão nova entenda o "pronto" sem precisar ler `core.js` linha a linha. A fonte de verdade continua sendo o código — este documento é o mapa dele, e deve ser atualizado sempre que uma etapa mudar. **B-11 fechado por esta versão** (a v1.0 tinha sido escrita antes do teto por classe entrar em produção — ver histórico).

---

## 1. Entradas e saídas

**Entrada:** `state` (cliente, patrimônio, perfil, filtros) + `PROD` (cadastro de produtos, 36 no padrão).
**Saída de `calcular()`:** `{reserva, investivel, naoAlocado, somaBolsoes, bolsoes, vivos, alerts, remocoes, cortes, tetos, tetosClasse, violacoesClassePorPiso, fgc, fgcEstouro}`.

`vivos` é a carteira final: lista de produtos com `w` (peso, soma 1 quando `investivel>0`) e `valor` (R$).

---

## 2. Ordem das etapas (não reordenar sem re-testar)

| # | Etapa | O que faz | Por que essa ordem |
|---|---|---|---|
| 0 | Reserva + bolsões | Retira reserva de emergência e objetivos (`carve:true`) do topo do patrimônio | Eles não seguem a lógica de perfil; têm de sair antes de qualquer peso ser calculado |
| 1 | Exclusão por restrição | Remove produtos que violam veículo desativado, `vol10 > teto`, qualificação, liquidez. Marca `w0` (peso original) antes de zerar, para reportar corretamente | Reportar peso/motivo originais evita o efeito cascata (ver ERROR-LOG E-01) |
| 1b | Rede de segurança | Se ninguém sobrevive, força o produto mais líquido/menos volátil compatível | Patrimônio nunca fica com carteira vazia se existir QUALQUER produto compatível |
| 2a | **Teto por classe (Diretrizes)** | Nenhum grupo de classes (`grupoDe`) passa do teto do perfil em `CAP_CLASSE`; checado **antes** do teto por fundo, por ser a restrição mais ampla. Pós-fixado não tem teto — é a válvula de segurança no fim de toda cadeia de fallback (D-22) | Sem teto por classe, a primeira classe com capacidade "infinita" absorve tudo de uma vez (causou o E-11) |
| 2b | Teto de concentração por fundo | Nenhum fundo/FIDC/previdência (se ativado) passa de `capFundo`%; o excesso procura primeiro a mesma classe+veículo, depois a mesma classe, depois a cadeia de fallback, depois qualquer sobrevivente | ETFs ficam de fora do teto por decisão explícita (D-06) |
| 3 | Teto do FGC por grupo emissor | Nenhum grupo emissor bancário projeta, no vencimento, mais que `fgcLim` (padrão R$250 mil). Verificação final independente reconfere todos os emissores depois do loop, não confia que o loop convergiu (E-14) | Usa o **valor projetado**, não o aplicado hoje (D-07) — ver §4 |
| 4 | Piso por posição | Produtos que ficariam abaixo do piso (ou do mínimo do próprio produto) são cortados e redistribuídos. Se ninguém tem folga para receber tudo, o produto é religado com o resto (nunca descartado — E-13) | Evita linhas de R$300 numa carteira pequena, sem deixar peso desaparecer |
| 4b | Checagem final de classe pós-piso | Depois do piso, reconfere se alguma classe ficou acima do próprio teto por falta de alternativa (o piso pode reduzir a carteira a poucos sobreviventes) | Não é erro de cálculo — é o piso vencendo o teto por escassez de produtos — mas vira alerta `err`, nunca silêncio |
| 5 | Valores e resíduo | Converte peso final em R$; sobra de arredondamento vai para a maior posição | Garante fechamento exato (soma = investível) |

**Regra central (E-07, estendida em D-22/E-12):** as etapas 2a, 2b, 3 e 4 usam a **mesma função de folga** (`folgaGeral`), que é o mínimo entre três restrições — folga de concentração por fundo, folga de FGC e folga de teto de classe. Nunca usar uma folga isolada.

**Regra de insolvência (E-12):** quando uma classe ou produto não tem nenhum destino com folga, o excesso não coube é devolvido ao próprio item (dinheiro nunca desaparece) e a classe/produto entra num conjunto de "insolúveis" — para não ficar travando no mesmo item sem progresso, mas **sem impedir** que as outras restrições continuem sendo checadas no mesmo loop.

---

## 3. Critérios de aceite (verificáveis por teste)

1. **Conservação de valor.** `reserva + somaBolsoes + naoAlocado + Σvalor(vivos) = patrimônio total`, sempre, com tolerância de R$0,02.
2. **Conservação de peso.** Se `investivel > 0` e há produtos vivos, `Σw(vivos) = 1` (tolerância 1e-6).
3. **Nenhum produto violado.** Todo item em `vivos` respeita: `vol10 ≤ teto`, `liq ≤ liqMax` e `liq ≥ liqMin`, veículo ativo, `!qual OR state.qual`.
4. **Nenhuma classe acima do próprio teto das Diretrizes** (`CAP_CLASSE`), exceto quando `tetosClasse[].resto > 0` ou `violacoesClassePorPiso` foi populado — nesses casos o motor avisa (`alerts` com `err`/`info`), nunca esconde.
5. **Nenhum fundo/FIDC/previdência (se ativado) acima do teto de concentração**, exceto quando `tetos[].resto > 0` (ninguém tinha folga — o motor avisa, não esconde).
6. **Nenhum grupo emissor bancário projeta acima do FGC**, exceto quando `fgcEstouro` foi populado (idem — avisa, não esconde). A checagem final (passo 3) é independente do caminho do loop.
7. **Dinheiro nunca desaparece.** Se nenhum produto sobrevive aos filtros, `naoAlocado` carrega o valor e um alerta `err` é emitido — nunca fica silenciosamente fora da soma (E-03). O mesmo vale para qualquer `resto` de redistribuição (concentração, FGC, teto de classe, piso): sempre religado ao próprio item, nunca descartado (E-13).
8. **Determinismo.** Mesma entrada, mesma saída — sem aleatoriedade em `calcular()`.

---

## 4. Regras de negócio que não estão óbvias no código

- **FGC sobre valor projetado, não aplicado.** `fatorFuturo(p) = (1 + cdiProj/100 · pctCDI/100) ^ prazoAnos`. O teto do grupo emissor é sobre `Σ w·investivel·fatorFuturo`, não sobre `Σ w·investivel`. Verificado numericamente em 14/07/2026 (item #7 do backlog): correto desde a implementação original.
- **Reposição condicional (D-08).** Produtos com `receber:true` (títulos bancários, Tesouro Selic estratégico) só entram na disputa de peso quando `REPOS=true`. `REPOS` é `true` sempre (`repos:'sempre'`), nunca (`'nunca'`), ou — no modo padrão `'auto'` — só quando alguma exclusão da etapa 1 foi por volatilidade ou liquidez (não por enquadramento). Uma exclusão por enquadramento tem destino natural na própria classe; um CDB não resolve isso.
- **Aportador esporádico só compra (D-13).** Ainda não implementado no motor de alocação por perfil — é regra do motor novo de B-12 (ver `SPEC-carteira-atual.md`).
- **Teto por classe é variável por classe, a partir das Diretrizes reais (D-21/D-22).** Não é um número único global — Inflação, Multimercado etc. têm tetos próprios por perfil. Pós-fixado não tem teto (classe "livre de risco") e funciona como válvula de segurança no fim da cadeia de fallback.
- **RV América Latina compartilha o teto de RV Global (D-23)** — soma das duas contra um único limite, não dois tetos independentes, porque as Diretrizes não têm linha própria para RV América Latina.

## 5. Escala de volatilidade (migrada 14/07/2026 — ver DECISOES D-15/D-16/D-17)

`vol10` substitui `vol` (0–3). Ver `SPEC-volatilidade-v2.md` para a metodologia completa por tipo de ativo e o inventário de quais dos 36 produtos têm dado real vs. provisório.

---

## 6. O que esta SPEC não cobre (fora do escopo de `calcular()`)

- Motor de revisão de carteira / aportadores (B-12) — parte de uma posição existente, não de zero. Ver `SPEC-carteira-atual.md`.
- Simulador de come-cotas (`simComeCotas`) — determinístico, documentado inline no código, validado contra forma fechada (erro 2,6e-10).
- Sugestão de produto por objetivo (`sugerirObjetivo`) — usa `regraObjetivo(anos)` para achar teto/liquidez por horizonte, não participa da conservação de valor da carteira principal.

---

## Histórico
- v1.0 — 14/07/2026 — Documento criado a partir do código e da suíte de testes já em produção (fecha B-11 pela primeira vez). Nenhuma mudança de comportamento — é descrição, não alteração.
- v1.1 — 16/07/2026 — **Reabertura e fechamento definitivo de B-11.** A v1.0 ficou desatualizada assim que o teto por classe (B-21/D-22) entrou em produção em 15/07/2026 — a SPEC não mencionava a etapa 2a, a 3ª restrição na `folgaGeral`, o mecanismo de insolúveis (E-12), a preservação do resto no piso (E-13), a checagem final do FGC (E-14) nem a checagem final de classe pós-piso. Documento reescrito para refletir o `core.js` atual; nenhuma mudança de comportamento nesta sessão, só descrição. Lição registrada: "status: MATERIALIZADA" sem processo de revisão associado é o tipo de coisa que gera drift silencioso — ver nota em `BACKLOG`/`INDEX`.
