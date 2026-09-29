# DECISÕES — Biblioteca de Prompts
| # | Decisão | Por quê | Alternativas | Status |
|---|---|---|---|---|
| D-01 | Subpasta `biblioteca-prompts/` dentro do repo `test`, com governança própria | A sessão só tem acesso a este repositório. Isolar em subpasta evita misturar com o SSID Portfolio Manager e permite extrair depois com `git subtree split`. | Repo novo (fora do alcance desta sessão, fica no BP-02); misturar na raiz (descartado) | ✅ provisório |
| D-02 | Não é loop-apto | É um acervo de curadoria: não tem métrica objetiva nem cadência de execução medida. Sem `LOOP-*.md`. | Medir a qualidade das respostas por prompt (sem métrica objetiva clara hoje) | ✅ |
| D-03 | Texto original separado das dicas do curador | Mantém a fidelidade à fonte e deixa explícito o que foi acrescentado | Reescrever os prompts já "melhorados" | ✅ |
