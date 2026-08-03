# SPEC — Carteira atual / aportadores (B-12, item #2)
**status: OS 3 MODOS IMPLEMENTADOS com motor + UI e testados — 20/07/2026. B-12 fechado.**

## Entrada: formato real da Posição Consolidada (XP Hub)

Lida a partir do arquivo real enviado por Alexandre (`04-insumos/Posição_Consolidada_-_5568413.xlsx`). Não é uma tabela única — é um export "de tela", com blocos por categoria, cada um com seu próprio cabeçalho de colunas:

```
XP | Conta: NNNNN | data
Este é o seu patrimônio | Total investido | Saldo Disponível | Saldo projetado
{valores}
9,49%|Ações | R$ 40.336,60                                  ← cabeçalho de categoria (nome + total)
Ativo | Qtd. Disponivel | ... | Posição                     ← cabeçalho de colunas da categoria
CSNA3 | 100,00 | ... | R$ 520,00                             ← linha de item
...
47,4%|Renda Fixa | R$ 200.819,68                             ← categoria
16,00%|Prefixada | Aplicação | Carência | ... | Valor líquido ← SUB-categoria + colunas na MESMA linha
CDB BANCO ANDBANK ... | 08/07/2025 | ... | R$ 23.431,35       ← item
19,50%|Pós-Fixada | Aplicação | ...                          ← outra sub-categoria (mesmo padrão)
...
37,2%|Fundos de Investimento | R$ 158.033,81
36,00%|Fundos de Renda Fixa Pós-Fixado | Data cota | ...
...
0,04%|Proventos | R$ 190,34
Ativo | Indexador | ... | Provisionado
...
Custódia remunerada | R$ 0,00
5,84%|Saldo projetado | R$ 24.830,41
Saldo Disponível | Garantia | ... | Saldo Projetado (D > 3)
{valores}
```

Regra de leitura: a primeira célula de cada linha decide o que ela é.
- Casa com `NN,NN%|Nome` e `Nome` é uma das 5 categorias-mãe (Ações, Renda Fixa, Fundos de Investimento, Proventos, Saldo projetado) → **fronteira de categoria**; guarda nome e total declarado.
- Casa com `NN,NN%|Nome` mas não é categoria-mãe → **sub-categoria** (ex.: Prefixada, Pós-Fixada, Inflação, Fundos de Renda Fixa Pós-Fixado, Fundos Multimercados). O resto da linha são os **cabeçalhos de coluna** válidos até a próxima fronteira.
- É exatamente `Ativo`/`Aplicação`/`Data cota` na primeira célula → cabeçalho de colunas puro (sem sub-categoria nova).
- Nenhum dos dois, e há uma categoria/sub-categoria ativa → **linha de item**. Colunas lidas pelo cabeçalho vigente (posição do valor muda: "Posição" para Ações/Fundos, "Valor líquido" para Renda Fixa/Fundos, "Provisionado" para Proventos).
- `Custódia remunerada` e a linha final de saldo projetado são tratadas como caixa, não como posição de produto.

## Entrada no app: colar como texto, não upload de `.xlsx`

Decisão: o app não vai ganhar um leitor de `.xlsx` binário. Um `.xlsx` real (do Excel/XP Hub) normalmente é comprimido com DEFLATE, e implementar um descompressor em JS puro, sem biblioteca, para manter o arquivo único e offline, é desproporcional ao valor do recurso. **O caminho é colar o texto copiado do Excel** (Ctrl+C na área "Carteira Distribuída" → Ctrl+V numa caixa de texto do app) — isso já vem tab-separado e o parser acima lida com ele igual a como leria o arquivo. Zero dependência nova, consistente com D-01/D-10.

## Matching contra o cadastro

Cada item parseado tenta casar com um produto de `PROD` por:
1. Nome idêntico (normalizado: minúsculas, sem acento) → confiança alta.
2. Sobreposição de palavras-chave (emissor + tipo + indexador) → confiança média, **sempre exposta para confirmação manual**, nunca aplicada em silêncio.
3. Sem candidato razoável → "não mapeado". Entra no total do patrimônio, mas fora do cálculo por classe até o usuário apontar manualmente ou o produto ser cadastrado.

Nenhum item vira dinheiro que "sumiu": todo item parseado soma no patrimônio total mostrado, mapeado ou não.

## Os três modos (ordem de implementação)

1. **Aportador esporádico** (implementado nesta rodada) — dinheiro novo, só compra (D-13). Calcula o quanto cada classe está abaixo do peso ideal do perfil e distribui o aporte para fechar essas diferenças, sem tocar em nenhuma posição existente.
2. **Revisão de carteira completa** (não implementado) — pode sugerir venda. Precisa de uma camada extra que hoje não existe: custo de saída (IR sobre ganho de capital, carência/multa, corretagem) para decidir se vale a pena vender. Sem isso, uma sugestão de venda pode recomendar destruir valor.
3. **Aportador de novo cliente** (não implementado) — mesma mecânica da revisão completa, mas o objetivo pode ser "chegar à alocação ideal" em vez de "manter e ajustar"; a diferença é mais de enquadramento da conversa do que de matemática.

## Critério de aceite do aportador esporádico

- Nunca reduz nenhuma posição existente (todas ficam com o mesmo valor ou maior).
- A soma do aporte sugerido é exatamente o valor informado (sem sobra, sem furo).
- Respeita os mesmos filtros do motor principal: volatilidade (`teto`), liquidez, enquadramento, veículo ativo, teto de concentração e FGC — reaproveita as mesmas funções (`folgaGeral`, `capIndividual`, `fatorFuturo`), não duplica a lógica.
- Itens "não mapeados" da carteira atual não recebem aporte (não sabemos a classe deles) mas continuam contando no patrimônio total exibido.

---

---

## Resultado da implementação (14/07/2026)

**Parser** testado contra o extrato real de Alexandre (`04-insumos/Posição_Consolidada_-_5568413.xlsx`): as 5 categorias de nível 1 (Ações, Renda Fixa, Fundos de Investimento, Proventos, Saldo projetado) batem exatamente com a soma dos itens lidos em cada uma. Diferença de ~R$645 (0,16%) entre o "Total investido" do topo do extrato e a soma das categorias — mostrada na interface como aviso, não escondida ou forçada a fechar.

**Matcher** (E-09): a primeira versão dava falso-positivo — termos financeiros genéricos ("cdb", "banco", "xp", "cdi", nomes de mês) faziam produtos de emissores diferentes parecerem o mesmo. Corrigido com uma lista de termos que não contam como identidade do produto. Depois da correção, o matcher é honesto: dos 24 itens do extrato real, só 2 casaram com confiança (um CDB PicPay e um fundo Jive, ambos por semelhança real de nome) — o resto corretamente "não mapeado", porque são produtos que genuinamente não estão no cadastro de 36 produtos do guia (Sparta, Legacy Capital, SulAmérica, Valora Vanguard, ações individuais). Isso é o comportamento correto, não uma falha do matcher.

**Aportador esporádico**: 2.000 cenários de fuzz dedicado, zero falhas, depois de corrigir um "dinheiro sumindo" quando nenhum produto elegível existe (mesma classe do E-03 do motor principal — ver ERROR-LOG E-10).

## Modo 2 — Revisão de carteira completa (design, 16/07/2026)

**Premissa que trava tudo:** a Posição Consolidada da XP não traz custo de aplicação (valor aportado original) para fundos, FIDC e previdência — só para Renda Fixa (`Valor aplicado`) e, indiretamente, Ações (`Preço Médio`). Sem custo de aplicação não dá para calcular ganho, e sem ganho não dá para calcular IR. **Decisão (confirmada por Alexandre em 16/07/2026): o MVP só sugere venda de RF bancária/títulos e Ações. Fundos, FIDC e Previdência nunca são sugeridos para venda nesta versão** — aparecem no diagnóstico da carteira atual, mantidos como estão, com o motivo explícito (falta de dado, não indiferença).

### Elegibilidade e custo de saída, por tipo
- **RF bancária/títulos:** elegível se a `Carência` já foi atingida (data ≤ hoje) e há quantidade `Disponível` > 0. O custo de saída **não precisa ser calculado** — a XP já entrega o `Valor líquido` (pós-IR projetado) ao lado do `Valor aplicado`; a diferença entre `Posição` (bruto) e `Valor líquido` já é o IR. Se a carência ainda não foi atingida, o item nunca aparece como sugestão — é bloqueio contratual, não custo.
- **Ações:** sempre elegível (mercado à vista, sem carência). Ganho de capital = `max((Última Cotação − Preço Médio) × Qtd, 0)`, IR = ganho × 15% (regra simplificada e marcada com `ver`: **não considera** a isenção mensal de R$20.000 em vendas nem a compensação de prejuízos de outras operações — precisa ser conferido produto a produto antes de qualquer execução real). Corretagem tratada como R$0 (a maioria dos planos XP não cobra) — também marcada como simplificação.
- **Fundos / FIDC / Previdência / Proventos / Caixa:** nunca elegíveis para venda. Entram no patrimônio total e no diagnóstico, mas o motor não sugere mexer neles.

### Algoritmo
1. Classifica cada item da carteira parseada por tipo (RF/Ação/mantido) e por classe — a classe de RF vem direto da sub-categoria do extrato (Prefixada→`pre`, Pós-Fixada→`pos`, Inflação→`inf`), não do casamento com o cadastro de 36 produtos (a maioria dos títulos do cliente não está lá). Ações → `rvb`.
2. Calcula peso atual por classe sobre o patrimônio TOTAL da carteira (incluindo itens mantidos, que contam no total mas não têm classe endereçável).
3. Calcula peso ideal por classe a partir do cadastro filtrado pelo perfil/restrições — mesma função usada no aportador esporádico.
4. Compara: classes com peso atual > ideal viram **excesso**; peso atual < ideal vira **déficit**.
5. Dentro de cada classe em excesso, ordena os candidatos elegíveis por maior fração líquida recebida por real vendido (`valorLíquido/valor`, do maior para o menor — vende primeiro quem "perde menos" no processo) e vende o necessário para fechar o excesso, nunca além do valor da posição nem além do que existe elegível.
6. Se não há candidato elegível suficiente numa classe em excesso (ex.: a classe só tem fundo ou título ainda em carência), o excesso que sobra é reportado como **excesso residual** — nunca escondido, nunca forçado.
7. O valor líquido de todas as vendas vira um "caixa de rebalanceamento", redistribuído pelos déficits na proporção de cada um (sobra, se houver, distribuída pelo peso ideal entre os déficits). Se não há déficit nenhum para receber, o caixa fica marcado como **não rebalanceado** (segue líquido na conta do cliente, decisão fica com o assessor).

### Critérios de aceite
- Nunca sugere vender Fundo, FIDC ou Previdência.
- Nunca sugere vender RF ainda em carência ou sem quantidade disponível.
- `Σ custo das vendas` é sempre ≥ 0 e nunca escondido — é a diferença real entre o bruto vendido e o líquido recebido.
- `Σ líquido recebido das vendas = caixa de rebalanceamento = Σ alocação nos déficits + não rebalanceado` (conservação exata, tolerância R$0,02).
- Determinismo: mesma carteira + mesmo perfil/filtros → mesma sugestão.
- Todo ganho de ação usado no IR é sempre ≥ 0 (nunca "ganho negativo" reduzindo o IR de outro ativo — sem compensação de prejuízo nesta versão, por design, não por bug).

### Modo 3 — Aportador de novo cliente (implementado 20/07/2026)
Mesma mecânica do modo 2 (a carteira atual de um cliente novo também pode ter excessos/déficits vs. o perfil ideal), mudando só o enquadramento da conversa — "montar do zero para o ideal" em vez de "ajustar o que já existe". Reaproveita a mesma função; não é motor separado.

**Implementação:** um seletor "Cliente atual / Novo cliente" no painel de revisão. `calcularRevisaoCompleta()` é chamada exatamente igual nos dois modos; o que muda é uma tabela de rótulos escolhida pelo modo:

| Elemento | Modo 2 (cliente atual) | Modo 3 (novo cliente) |
|---|---|---|
| Título | Revisão de carteira completa | Enquadramento de novo cliente — da carteira que ele traz até o alvo |
| KPI patrimônio | Patrimônio total | Patrimônio que entra |
| KPI venda | Sugerido vender (bruto) | A desmontar (bruto) |
| KPI caixa | Caixa p/ rebalancear | Caixa p/ montar o alvo |
| Tabela de vendas | Sugestões de venda | Posições a desmontar para chegar ao alvo |
| Tabela de destino | Para onde levar o caixa das vendas | Composição-alvo a montar com o caixa |

**Decisão de desenho:** não foi criado motor, arquivo nem painel separado. A matemática é comprovadamente a mesma, e duplicá-la para trocar rótulo criaria dois caminhos de código que podem divergir silenciosamente — exatamente o tipo de drift que o E-08 já custou caro neste projeto.

## Histórico
- v1.3 — 20/07/2026 — **B-12 fechado.** Modo 3 implementado como seletor de modo sobre a mesma função (tabela de rótulos documentada acima), sem motor separado. e2e cobre os dois modos.
- v1.2 — 16/07/2026 — Design do modo 2 (revisão completa) registrado antes da implementação: escopo confirmado com Alexandre (só RF bancária + Ações elegíveis para venda; fundos/FIDC/previdência excluídos por falta de custo de aplicação no extrato). Modo 3 esclarecido como reaproveitamento da mesma função.
- v1.1 — 14/07/2026 — Implementação registrada: parser + matcher + aportador esporádico prontos e testados. Revisão completa e aportador de novo cliente seguem em `BACKLOG.md` B-12.
- v1.0 — 14/07/2026 — Desenho registrado antes da implementação.
