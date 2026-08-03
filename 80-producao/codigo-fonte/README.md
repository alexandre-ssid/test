# Código-fonte — SSID Portfolio Manager (ex-Guia de Alocação PG)

> **⚠️ 31/07/2026 — os módulos `*.js` + `build.js` desta pasta estão CONGELADOS.** Refletem a linha modular antiga (até v1.23). Depois do rebase sobre a base externa **SSID Portfolio Manager v1.36**, a fonte de verdade passou a ser o **HTML único** em `../ssid-portfolio-manager-v{versão}.html` (ver `CLAUDE.md` v1.1). **Não edite os módulos antigos esperando que virem produção** — eles não são mais compilados. O que continua vivo desta pasta são os **testes portados para o monólito**:
> - `fuzz-monolito.js` — fuzz do motor sobre o HTML único via jsdom (20.000 cenários, invariantes incl. PGBL). Rodar: `node fuzz-monolito.js ../ssid-portfolio-manager-v1.37.0.html`
> - `verificar-monolito.js` — checagem rápida (PGBL conserva valor, B-33 renderiza, versão no rodapé). Rodar: `node verificar-monolito.js ../ssid-portfolio-manager-v1.37.0.html`
> - `e2e2.js` ainda aponta para a estrutura de abas antiga — **precisa ser reapontado** para o monólito e para os novos ids de aba (Diagnóstico+Objetivos fundidos, aba Estrutura nova) antes de valer de novo. Pendência de workflow.

O texto abaixo é histórico da era modular (build.js), mantido como referência.

---

Esta pasta é nova (15/07/2026): até aqui, todo o desenvolvimento aconteceu em chat, e só o `.html` já compilado ia para o `.zip` do projeto. Os arquivos-fonte abaixo nunca tinham sido entregues separadamente. Se você (Claude Code) está lendo isso pela primeira vez, comece por `CLAUDE.md` e `INDEX.md` na raiz do projeto — este README só cobre a mecânica de build/teste.

## Arquivos

| Arquivo | Papel |
|---|---|
| `core.js` | O motor: cadastro de 36 produtos (`PADRAO`), a função `calcular()`, o teto por classe (`CAP_CLASSE`), a escala de volatilidade (`vol10`/`rotuloVol`), o simulador de come-cotas. **Fonte de verdade do cadastro e das regras de negócio.** |
| `export.js` | Geração da boleta `.xlsx` (escritor de ZIP/XLSX em JS puro, sem biblioteca), CSV, resumo WhatsApp. |
| `ui.js` | Toda a interface: as 7 abas, o questionário de diagnóstico, o editor de produtos, a composição, a apresentação (incl. as bandas de alocação). |
| `carteira.js` | Parser da Posição Consolidada (XP Hub), matcher contra o cadastro, calculadora do aportador esporádico (B-12). |
| `cliente-ui.js` | Liga a aba "Carteira Atual" (07) ao `carteira.js`. |
| `boot.js` | Inicialização — roda por último, depois que tudo mais já foi definido. |
| `shell.html` | O HTML/CSS completo, com 5 marcadores (`/*__CORE__*/` etc.) onde os arquivos acima são injetados. |
| `build.js` | Monta `../guia-alocacao.html` a partir de tudo isso. |
| `fuzz.js` | Suíte de fuzz do motor: milhares de cenários aleatórios contra os invariantes (conservação de valor/peso, nenhum produto/classe/emissor violado). |
| `fuzz-carteira.js` | Fuzz do motor de revisão de carteira (B-12 modo 2): carteiras sintéticas contra os invariantes de `SPEC-carteira-atual.md` §Modo 2 — nunca vende fundo/previdência, conservação do caixa de rebalanceamento, determinismo. |
| `atualizar-volatilidade.js` | Refaz a busca de drawdown no Yahoo Finance para os ETFs do cadastro (próprio ativo ou proxy internacional, B-19/D-30) e imprime um relatório comparando com o `vol10` atual do `core.js`. **Nunca escreve no cadastro sozinho** — aplicar uma mudança é sempre manual, para não virar automação cega (mesmo princípio do B-22). Rodar: `npm run atualizar-volatilidade`. |
| `e2e2.js` | Teste end-to-end num DOM real (via `jsdom`): navega pelas 7 abas, clica nos botões de verdade, confere exportações. |

## Como montar o entregável

```bash
node build.js
```

Isso escreve **dois arquivos** em `80-producao/`: `guia-alocacao.html` (nome fixo, é o que outros documentos do projeto referenciam) e `guia-alocacao-v{versão}.html` (cópia idêntica, nome com a versão — para entregar/testar sem ambiguidade de qual build é qual). A versão vem de `package.json` (`"version"`), a **fonte única** — suba-a a cada mudança relevante, junto do `INDEX.md`. O rodapé da própria interface também mostra a versão e a data do build (marcadores `__APP_VERSION__`/`__APP_BUILD_DATE__` no `shell.html`). **Nunca edite os arquivos gerados diretamente** — edite os arquivos desta pasta e rode `build.js` de novo.

⚠️ **Armadilha já vivida (15/07/2026):** `String.prototype.replace()` do JavaScript interpreta `$&`, `$1` etc. como padrões especiais quando o segundo argumento é uma *string* — e o `export.js` tem `"R$"` no meio da definição do XLSX, que colidiu com esse padrão e corrompeu o build silenciosamente. O `build.js` já usa uma *função* de substituição (`.replace(marcador, () => conteudo)`) para evitar isso — **não troque de volta para uma string**, ou o bug volta.

## Como testar

```bash
# instalar a única dependência de teste (jsdom, para o e2e rodar num DOM real)
npm install

# motor: milhares de cenários aleatórios contra os invariantes
node fuzz.js

# interface: navega as 7 abas, clica nos botões, confere exportações
node build.js && node e2e2.js
```

`fuzz.js` deve sempre terminar em `falhas=0`. `e2e2.js` deve terminar sem nenhuma linha `❌` que não seja `scrollTo` (o `jsdom` não implementa `window.scrollTo` — é a única falha esperada e inofensiva, o navegador de verdade não tem esse problema).

**Antes de qualquer entrega, sempre**: editar → `node build.js` → `node fuzz.js` (zero falhas) → `node e2e2.js` (sem `❌` real) → só então copiar `../guia-alocacao.html` para onde precisar ir. Pular essa sequência já causou incidentes reais — ver `ERROR-LOG.md` na raiz (E-03, E-07, E-08, E-09, E-10, E-12 foram todos pegos por essa disciplina, nunca por revisão manual).

## Convenção dos marcadores

`shell.html` tem 5 comentários-marcador dentro de uma única tag `<script>`:
```html
<script>
/*__CORE__*/
/*__EXPORT__*/
/*__UI__*/
/*__CLIENTE_UI__*/
/*__BOOT__*/
</script>
```
`build.js` substitui cada um pelo conteúdo do arquivo correspondente (com `carteira.js` e `cliente-ui.js` juntos no marcador `__CLIENTE_UI__`, nessa ordem, porque um depende do outro). A ordem dos marcadores importa: `core.js` define tudo que os demais usam; `boot.js` roda por último.

## Histórico
- v1.0 — 15/07/2026 — Pasta criada para permitir a continuidade do projeto fora do chat (migração para Claude Code / Cowork, ver BACKLOG B-22). Todo o código já existia; o que é novo é ele estar entregue como arquivos separados, com `build.js` reproduzindo exatamente o `guia-alocacao.html` publicado até aqui (validado por diff, fuzz e e2e).
