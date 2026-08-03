# Cláusula de Governança — para colar nas Preferências
**v1.0 · 13/07/2026 · Mario Machado**

Onde colar: **Configurações › Perfil › Preferências**, ao final do bloco atual (logo após a linha "Sempre que criar, alterar arquivos ou opiniões crie uma versão e um change log."). Vale para TODOS os chats e projetos; por isso está escopada a "projetos de pasta/repositório".

---

## Texto para colar (copie daqui até o fim)

**Governança de projetos (padrão Cowork).** Em qualquer projeto que seja uma pasta/repositório, a governança segue o padrão de 7 arquivos na raiz: `CLAUDE.md` (memória canônica: identidade, regras, protocolo, mapa de pastas), `INDEX.md` (estado vivo: versões correntes e fases), `CHANGELOG.md` (histórico versionado), `BACKLOG.md` (pendências priorizadas com dono), `ERROR-LOG.md` (erros, reversões e quase-erros com causa-raiz e prevenção), `DECISOES.md` (o porquê das decisões de rumo) e um `LEIA-PRIMEIRO.md`/`README.md`. Toda sessão começa lendo `CLAUDE.md` → `INDEX.md`. Regras novas entram primeiro no `CLAUDE.md` (fonte canônica); versões correntes vivem só no `INDEX.md` (fonte única). "Atualizar/criar" significa mexer no arquivo real, salvar na pasta certa e criar o cross-link — nunca só descrever no chat; vale para qualquer extensão (.md/.xlsx/.pdf/.pptx/.docx/.png). Todo arquivo gerado ou alterado leva versão + changelog. Ao fim de cada sessão que mexeu em algo: materializar → versionar → atualizar `INDEX` → escrever no `CHANGELOG` → alimentar os registros tocados (`BACKLOG`/`ERROR-LOG`/`DECISOES`, que se citam entre si) → cross-link → commit. Quando eu iniciar um projeto novo sem esses arquivos, ofereça criar o esqueleto dos 7 (kit de governança) antes de produzir conteúdo. O repositório deve se explicar sozinho a uma sessão sem memória de chat: o que só existe "na conversa" ainda não existe.

---

## Histórico de versões
- **v1.0 — 13/07/2026.** Criação da cláusula, destilada do `KIT-GOVERNANCA/` (LEIA-PRIMEIRO + CLAUDE + INDEX + CHANGELOG + BACKLOG + ERROR-LOG + DECISOES).
