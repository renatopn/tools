/**
 * CopiarModulos.js
 *
 * Uso: abra a Cortecloud (pagina "Meus servicos", https://marceneiro.cortecloud.com.br/#/plans),
 * abra o Console do DevTools (F12 > Console) e cole todo o conteudo deste arquivo, depois Enter.
 * Vai aparecer um popup pedindo o numero do servico de ORIGEM e o de DESTINO. Ao clicar em
 * "Copiar", o script navega ate o servico de origem, le todos os modulos, navega ate o servico
 * de destino e insere copias limpas de cada modulo la, salvando ao final.
 *
 * Importante:
 * - Isso usa exatamente o mesmo mecanismo interno que o botao nativo "duplicar modulo" da
 *   Cortecloud usa (copia o objeto do modulo, remove posicao/uuid/timestamps, e salva).
 * - Servicos de "centrais" (empresas/lojas) diferentes podem ter catalogos de chapa/fita
 *   diferentes. Modulos que usam uma chapa/fita que nao existe na central de destino serao
 *   copiados normalmente, mas podem precisar de ajuste manual de material depois. Revise o
 *   resultado antes de gerar pecas.
 * - O script so funciona colado dentro da propria aba da Cortecloud (ele acessa o AngularJS
 *   da pagina). Nao funciona fora dela.
 */
(function () {
  'use strict';

  var OVERLAY_ID = 'ccm-overlay-8f2a';

  // Remove um popup anterior, caso o script seja colado mais de uma vez.
  var existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  if (typeof angular === 'undefined') {
    window.alert('Nao encontrei o AngularJS nesta pagina. Abra a Cortecloud (marceneiro.cortecloud.com.br) e tente novamente.');
    return;
  }

  var FIELDS_TO_STRIP = [
    'uuid', 'visible', 'exported', 'x', 'y', 'z',
    'rotx', 'roty', 'rotz', 'createdAt', 'updatedAt', '$$hashKey'
  ];

  var HASH_PREFIX = '#/hellomobweb/';

  // ---------- UI ----------

  var style = document.createElement('style');
  style.textContent =
    '#' + OVERLAY_ID + '{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;' +
    'display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;}' +
    '#' + OVERLAY_ID + ' .ccm-card{background:#fff;width:420px;max-width:92vw;border-radius:6px;' +
    'box-shadow:0 10px 40px rgba(0,0,0,.3);padding:20px 22px;position:relative;}' +
    '#' + OVERLAY_ID + ' h2{margin:0 0 4px;font-size:18px;color:#243746;}' +
    '#' + OVERLAY_ID + ' .ccm-sub{margin:0 0 16px;font-size:12px;color:#6b7a85;}' +
    '#' + OVERLAY_ID + ' label{display:block;font-size:12px;color:#3a4a54;margin:10px 0 4px;}' +
    '#' + OVERLAY_ID + ' input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cfd8dc;' +
    'border-radius:4px;font-size:14px;}' +
    '#' + OVERLAY_ID + ' .ccm-close{position:absolute;top:10px;right:12px;cursor:pointer;border:none;' +
    'background:none;font-size:18px;color:#8a99a3;line-height:1;}' +
    '#' + OVERLAY_ID + ' .ccm-btn{margin-top:16px;width:100%;padding:10px;border:none;border-radius:4px;' +
    'background:#2f6fa8;color:#fff;font-size:14px;cursor:pointer;}' +
    '#' + OVERLAY_ID + ' .ccm-btn:disabled{background:#9db6c7;cursor:default;}' +
    '#' + OVERLAY_ID + ' .ccm-log{margin-top:14px;max-height:220px;overflow-y:auto;background:#f4f6f7;' +
    'border:1px solid #e1e6e8;border-radius:4px;padding:8px 10px;font-size:12px;color:#3a4a54;' +
    'white-space:pre-wrap;display:none;}' +
    '#' + OVERLAY_ID + ' .ccm-log.ccm-visible{display:block;}' +
    '#' + OVERLAY_ID + ' .ccm-warn{color:#a15c00;}' +
    '#' + OVERLAY_ID + ' .ccm-err{color:#b3261e;}' +
    '#' + OVERLAY_ID + ' .ccm-ok{color:#1e7a34;}';
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML =
    '<div class="ccm-card">' +
    '  <button type="button" class="ccm-close" title="Fechar">&times;</button>' +
    '  <h2>Copiar modulos entre servicos</h2>' +
    '  <p class="ccm-sub">Copia todos os modulos de um servico ja configurado para outro servico.</p>' +
    '  <label>Numero do servico de ORIGEM (ja tem os modulos)</label>' +
    '  <input type="text" id="ccm-origem" placeholder="ex: 22955734" inputmode="numeric">' +
    '  <label>Numero do servico de DESTINO (vai receber os modulos)</label>' +
    '  <input type="text" id="ccm-destino" placeholder="ex: 23239123" inputmode="numeric">' +
    '  <button type="button" class="ccm-btn" id="ccm-run">Copiar</button>' +
    '  <div class="ccm-log" id="ccm-log"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var $origem = overlay.querySelector('#ccm-origem');
  var $destino = overlay.querySelector('#ccm-destino');
  var $run = overlay.querySelector('#ccm-run');
  var $log = overlay.querySelector('#ccm-log');
  var busy = false;

  overlay.querySelector('.ccm-close').addEventListener('click', function () {
    if (busy) return;
    overlay.remove();
  });

  function log(msg, cls) {
    $log.classList.add('ccm-visible');
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = msg;
    $log.appendChild(line);
    $log.scrollTop = $log.scrollHeight;
    console.log('[CopiarModulos]', msg);
  }

  function setBusy(value, label) {
    busy = value;
    $run.disabled = value;
    $origem.disabled = value;
    $destino.disabled = value;
    $run.textContent = label || (value ? 'Copiando...' : 'Copiar');
  }

  // ---------- Logica Angular ----------

  function findProjectScope() {
    var heading = null;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length === 0 && el.textContent.trim() === 'Modulos neste projeto') {
        heading = el;
        break;
      }
    }
    // acento: o texto real na tela e "Módulos neste projeto"
    if (!heading) {
      for (i = 0; i < all.length; i++) {
        el = all[i];
        if (el.children.length === 0 && el.textContent.trim() === 'Módulos neste projeto') {
          heading = el;
          break;
        }
      }
    }
    if (!heading) return null;
    var scope = angular.element(heading).scope();
    if (!scope || !scope.project || !Array.isArray(scope.project.modules)) return null;
    return scope;
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function gotoService(id, timeoutMs) {
    timeoutMs = timeoutMs || 20000;
    window.location.hash = HASH_PREFIX + id;
    var marker = '#' + id;
    var start = Date.now();
    return sleep(700).then(function poll() {
      var scope = findProjectScope();
      if (scope && document.body.textContent.indexOf(marker) !== -1) {
        return scope;
      }
      if (Date.now() - start > timeoutMs) {
        throw new Error('Tempo esgotado esperando o servico ' + id + ' carregar. Confira se o numero existe e se voce tem acesso a ele.');
      }
      return sleep(300).then(poll);
    });
  }

  function cleanModule(modulo) {
    var clone = angular.copy(modulo);
    FIELDS_TO_STRIP.forEach(function (key) { delete clone[key]; });
    return clone;
  }

  function run(origemId, destinoId) {
    log('Abrindo servico de origem #' + origemId + '...');
    return gotoService(origemId).then(function (origemScope) {
      var modulos = origemScope.project.modules;
      if (!modulos.length) {
        throw new Error('O servico de origem #' + origemId + ' nao tem nenhum modulo.');
      }
      log('Encontrados ' + modulos.length + ' modulo(s) na origem.');
      var copias = modulos.map(cleanModule);

      log('Abrindo servico de destino #' + destinoId + '...');
      return gotoService(destinoId).then(function (destinoScope) {
        var injector = angular.element(document.body).injector();
        var Modulo = injector.get('Modulo');

        copias.forEach(function (dados, i) {
          destinoScope.project.modules.push(new Modulo(dados));
          log('  + [' + (i + 1) + '/' + copias.length + '] ' + (dados.name || dados.id) +
            (dados.furniture ? ' (' + dados.furniture + ')' : ''));
        });

        log('Salvando servico de destino #' + destinoId + '...');
        return Promise.resolve(destinoScope.save({ generate: false })).then(function () {
          return copias.length;
        });
      });
    });
  }

  // ---------- Handler do botao ----------

  var completed = false;

  $run.addEventListener('click', function () {
    if (busy) return;

    if (completed) {
      overlay.remove();
      return;
    }

    var origemId = ($origem.value || '').trim();
    var destinoId = ($destino.value || '').trim();

    if (!/^\d+$/.test(origemId) || !/^\d+$/.test(destinoId)) {
      log('Informe apenas numeros nos dois campos.', 'ccm-err');
      return;
    }
    if (origemId === destinoId) {
      log('Origem e destino precisam ser servicos diferentes.', 'ccm-err');
      return;
    }

    setBusy(true);
    log('Iniciando copia de #' + origemId + ' para #' + destinoId + '...');

    run(origemId, destinoId).then(function (total) {
      log(total + ' modulo(s) copiado(s) com sucesso para o servico #' + destinoId + '.', 'ccm-ok');
      log('Revise o servico de destino: modulos com chapa/fita que nao existe na central de destino podem precisar de ajuste manual de material.', 'ccm-warn');
      completed = true;
      setBusy(false, 'Concluido (clique para fechar)');
    }).catch(function (err) {
      log('Erro: ' + (err && err.message ? err.message : err), 'ccm-err');
      setBusy(false, 'Tentar novamente');
    });
  });

  $origem.focus();
})();
