# Biblioteca de Prompts
**v1.1 · 29/09/2026** · Porta de entrada. Leia `CLAUDE.md` e depois `INDEX.md`.

Coleção de prompts prontos para análise financeira e de dados. Cada prompt fica num arquivo próprio em `prompts/`, com o texto original transcrito sem alterações e, separadas dele, dicas de uso.

## Catálogo
| ID | Prompt | Categoria | Entrada esperada |
|---|---|---|---|
| [P01](prompts/P01-conciliacao-de-dados.md) | Conciliação de dados | Conciliação | 2 arquivos a cruzar |
| [P02](prompts/P02-visao-executiva-planilha.md) | Visão executiva de planilha | Análise financeira | Planilha do negócio |
| [P03](prompts/P03-analise-dre-cfo.md) | Análise de DRE (visão CFO) | Análise financeira | DRE multi-período |
| [P04](prompts/P04-dashboard-executivo-bi.md) | Dashboard executivo (BI) | Business Intelligence | Planilha com séries |
| [P05](prompts/P05-projecao-fluxo-caixa-30-60-90.md) | Projeção de caixa 30/60/90 dias | Planejamento financeiro | Histórico de caixa |
| [P06](prompts/P06-gargalos-comerciais.md) | Gargalos comerciais | Comercial | Planilha de vendas/CRM |
| [P07](prompts/P07-eficiencia-operacional.md) | Diagnóstico de eficiência operacional | Gestão / Operações | Dados, relatórios e processos |

## Como usar
1. Escolha o prompt pelo catálogo.
2. Copie o bloco "Prompt" e cole numa conversa com o Claude, anexando os arquivos.
3. Aplique as "Dicas de uso" para dar o contexto que falta (período, unidade, tolerâncias).
