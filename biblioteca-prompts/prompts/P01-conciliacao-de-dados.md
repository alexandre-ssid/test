# P01 — Conciliação de dados
**v1.0 · 29/09/2026** · Categoria: **Conciliação** · Persona: Especialista em conciliação e análise de dados
**Origem:** imagem enviada pelo Alexandre (lote 1). Autor original não identificado.

## Quando usar
Dois arquivos com registros que deveriam bater (ex.: extrato bancário × razão contábil, boleta × nota de corretagem).

## Prompt (transcrito sem alterações)
```text
Você é um especialista em conciliação e análise de dados. Compare os dois arquivos enviados e relacione os registros correspondentes.

Identifique:
• Correspondências exatas
• Registros sem par
• Datas diferentes
• Duplicidades
• Possíveis erros de lançamento

No final, apresente uma tabela com: conciliado, divergente e pendente.
```

## Dicas de uso *(nota do curador — não faz parte do prompt original)*
- Diga qual campo é a chave de cruzamento (valor, data, documento, CPF/CNPJ) e qual tolerância de data aceitar (ex.: D+2).
- Peça que o modelo liste os critérios usados para classificar cada registro, para você auditar.
- Anexe os arquivos junto com o prompt. Confira os números da resposta na fonte antes de usar com cliente ou diretoria.
