#!/usr/bin/env node
/* =========================================================================
   build.js — monta guia-alocacao.html a partir do código-fonte modular.
   Uso:  node build.js
   Lê os arquivos desta pasta (core.js, export.js, ui.js, carteira.js,
   cliente-ui.js, boot.js, shell.html) e escreve o bundle em:
     ../guia-alocacao.html   (o entregável, ao lado desta pasta)
   Este é o MESMO processo que era feito manualmente (via script Python
   inline) durante o desenvolvimento em chat — agora reproduzível sem isso.
   ========================================================================= */
const fs = require('fs');
const path = require('path');

const AQUI = __dirname;
const SAIDA = path.join(AQUI, '..', 'guia-alocacao.html');
const VERSAO = require('./package.json').version; // fonte única — suba junto do INDEX.md
const SAIDA_VERSIONADA = path.join(AQUI, '..', `guia-alocacao-v${VERSAO}.html`);

function lerSemExports(nome){
  let s = fs.readFileSync(path.join(AQUI, nome), 'utf8');
  // remove a linha de module.exports usada só para os testes em Node;
  // no navegador as funções ficam soltas no escopo do <script> do bundle.
  s = s.replace(/^if\(typeof module !== 'undefined'\) module\.exports = \{[^}]*\};\s*$/m, '');
  return s;
}

const core     = lerSemExports('core.js');
const carteira = lerSemExports('carteira.js');
const exportJs = fs.readFileSync(path.join(AQUI, 'export.js'), 'utf8');
const ui       = fs.readFileSync(path.join(AQUI, 'ui.js'), 'utf8');
const clienteUi= fs.readFileSync(path.join(AQUI, 'cliente-ui.js'), 'utf8');
const boot     = fs.readFileSync(path.join(AQUI, 'boot.js'), 'utf8');
const shell    = fs.readFileSync(path.join(AQUI, 'shell.html'), 'utf8');

const dataBuild = new Date().toLocaleDateString('pt-BR');
const out = shell
  .replace('/*__CORE__*/', () => core)
  .replace('/*__EXPORT__*/', () => exportJs)
  .replace('/*__UI__*/', () => ui)
  .replace('/*__CLIENTE_UI__*/', () => carteira + '\n' + clienteUi)
  .replace('/*__BOOT__*/', () => boot)
  .replace('__APP_VERSION__', () => VERSAO)
  .replace('__APP_BUILD_DATE__', () => dataBuild);

fs.writeFileSync(SAIDA, out);
fs.writeFileSync(SAIDA_VERSIONADA, out);
console.log(`OK — v${VERSAO} — ${out.length} bytes escritos em:`);
console.log(`  ${SAIDA}`);
console.log(`  ${SAIDA_VERSIONADA}`);
