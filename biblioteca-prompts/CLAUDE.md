# CLAUDE.md — Biblioteca de Prompts
**v1.0 · 29/09/2026 · Alexandre Welter**

> Memória canônica do subprojeto. Toda sessão começa aqui e depois lê o `INDEX.md`. Regras novas entram aqui primeiro.

## Identidade
Acervo de prompts reutilizáveis (análise financeira, conciliação, BI, planejamento). Vive em `biblioteca-prompts/` dentro do repositório `test`, isolado do SSID Portfolio Manager (ver DECISOES D-01).

## Regras
1. **Um prompt = um arquivo** em `prompts/`, nome `Pnn-slug.md`, numerado em sequência. Os IDs nunca são reaproveitados.
2. **Texto original é intocável.** O bloco "Prompt" guarda a transcrição fiel da fonte. Melhorias ficam em "Dicas de uso", marcadas como nota do curador, ou viram uma variante `Pnn-v2` com changelog próprio.
3. **Origem declarada.** Todo prompt registra de onde veio. Se não houver autor conhecido, escreva "não identificado". Nunca invente autoria.
4. **Catálogo único:** a tabela do `README.md` lista todos os prompts; o `INDEX.md` guarda as versões.
5. Todo arquivo novo ou alterado ganha versão e uma linha no `CHANGELOG.md`.

## Mapa
```
biblioteca-prompts/
├── CLAUDE.md INDEX.md CHANGELOG.md BACKLOG.md ERROR-LOG.md DECISOES.md README.md
└── prompts/   # P01…Pnn
```
