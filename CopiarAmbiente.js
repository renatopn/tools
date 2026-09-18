/**
 * CopiarAmbiente.js
 *
 * Uso: dentro de um servico ja aberto na tela "Visualizar ambiente" (o 3D do ambiente, ex:
 * https://marceneiro.cortecloud.com.br/#/hellomobweb/22955734/environment/BanheiroMaster),
 * abra o Console do DevTools (F12 > Console) e cole todo o conteudo deste arquivo, depois Enter.
 * Vai aparecer um popup mostrando o servico/ambiente de origem (detectados automaticamente pela
 * URL atual) e pedindo apenas o numero do servico de DESTINO. Ao clicar em "Copiar", o script:
 *  - copia as dimensoes do ambiente (altura/largura/profundidade) e a textura customizada
 *    (chao/teto/parede), se houver;
 *  - copia a posicao/rotacao 3D de cada modulo deste ambiente para o modulo de MESMO NOME no
 *    servico de destino, incluindo se ele esta habilitado para visualizacao (o mesmo estado
 *    controlado manualmente pelo botao "Projeto" da tela de Visualizar ambiente);
 *  - copia decoracoes deste ambiente, se houver.
 *
 * Pre-requisito: os modulos deste ambiente ja devem existir no servico de destino, com os
 * mesmos nomes (por exemplo, ja copiados com o script CopiarModulos.js). Este script NAO cria
 * modulos novos, apenas aplica posicao/configuracao do ambiente sobre modulos ja existentes.
 *
 * So funciona colado dentro da propria aba da Cortecloud (acessa o AngularJS da pagina).
 */
(function () {
  'use strict';

  var OVERLAY_ID = 'ccm-ambiente-overlay-3d7c';

  var existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  if (typeof angular === 'undefined') {
    window.alert('Nao encontrei o AngularJS nesta pagina. Abra a Cortecloud (marceneiro.cortecloud.com.br) e tente novamente.');
    return;
  }

  var HASH_PREFIX = '#/hellomobweb/';
  var MODULE_POS_FIELDS = [
    'x', 'y', 'z', 'rotx', 'roty', 'rotz',
    'xTranslate', 'yTranslate', 'zTranslate',
    'rotxTranslate', 'rotyTranslate', 'rotzTranslate'
  ];
  // Campos que controlam se o modulo aparece habilitado para visualizacao no
  // ambiente (aba "Projeto" da tela de Visualizar ambiente).
  var MODULE_STATE_FIELDS = ['visible', 'desativar'];
  var MODULE_COPY_FIELDS = MODULE_POS_FIELDS.concat(MODULE_STATE_FIELDS);

  // ---------- Detecta servico/ambiente de origem pela URL atual ----------

  var m = window.location.hash.match(/#\/hellomobweb\/(\d+)\/environment\/([^\/?]+)/);
  if (!m) {
    window.alert('Abra a tela "Visualizar ambiente" de um servico antes de rodar este script.');
    return;
  }
  var ORIGEM_ID = m[1];
  var AMBIENTE = decodeURIComponent(m[2]);

  // ---------- UI ----------

  var style = document.createElement('style');
  style.textContent =
    '#' + OVERLAY_ID + '{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;' +
    'display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;}' +
    '#' + OVERLAY_ID + ' .ccm-card{background:#fff;width:420px;max-width:92vw;border-radius:6px;' +
    'box-shadow:0 10px 40px rgba(0,0,0,.3);padding:20px 22px;position:relative;}' +
    '#' + OVERLAY_ID + ' h2{margin:0 0 4px;font-size:18px;color:#243746;}' +
    '#' + OVERLAY_ID + ' .ccm-sub{margin:0 0 16px;font-size:12px;color:#6b7a85;}' +
    '#' + OVERLAY_ID + ' .ccm-origem{background:#f4f6f7;border:1px solid #e1e6e8;border-radius:4px;' +
    'padding:8px 10px;font-size:13px;color:#243746;margin-bottom:14px;}' +
    '#' + OVERLAY_ID + ' .ccm-origem b{color:#2f6fa8;}' +
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
    '  <h2>Copiar configuracao do ambiente</h2>' +
    '  <p class="ccm-sub">Copia dimensoes, texturas e posicao dos modulos deste ambiente para outro servico.</p>' +
    '  <div class="ccm-origem">Origem: servico <b>#' + ORIGEM_ID + '</b> &mdash; ambiente <b>' + AMBIENTE + '</b></div>' +
    '  <label>Numero do servico de DESTINO (modulos ja copiados para la)</label>' +
    '  <input type="text" id="ccm-destino" placeholder="ex: 23239123" inputmode="numeric">' +
    '  <button type="button" class="ccm-btn" id="ccm-run">Copiar</button>' +
    '  <div class="ccm-log" id="ccm-log"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var $destino = overlay.querySelector('#ccm-destino');
  var $run = overlay.querySelector('#ccm-run');
  var $log = overlay.querySelector('#ccm-log');
  var busy = false;
  var completed = false;

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
    console.log('[CopiarAmbiente]', msg);
  }

  function setBusy(value, label) {
    busy = value;
    $run.disabled = value;
    $destino.disabled = value;
    $run.textContent = label || (value ? 'Copiando...' : 'Copiar');
  }

  // ---------- Logica Angular ----------

  function findProjectScope() {
    var heading = null;
    var all = document.querySelectorAll('*');
    var wanted = ['Módulos neste projeto', 'Modulos neste projeto'];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length === 0 && wanted.indexOf(el.textContent.trim()) !== -1) {
        heading = el;
        break;
      }
    }
    if (!heading) return null;
    var scope = angular.element(heading).scope();
    if (!scope || !scope.project || !Array.isArray(scope.project.modules)) return null;
    return scope;
  }

  function findEnvironmentScope() {
    var root = angular.element(document.body).scope().$root;
    var target = null;
    (function walk(scope) {
      if (!scope || target) return;
      var keys = Object.keys(scope).filter(function (k) { return k.indexOf('$') !== 0; });
      if (keys.indexOf('ambiente') !== -1 && keys.indexOf('project') !== -1) { target = scope; return; }
      var child = scope.$$childHead;
      while (child) { walk(child); if (target) return; child = child.$$nextSibling; }
    })(root);
    return target;
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

  function extractOrigemData() {
    var envScope = findEnvironmentScope();
    if (!envScope) {
      throw new Error('Nao encontrei os dados do ambiente nesta pagina. Recarregue a tela "Visualizar ambiente" e tente novamente.');
    }
    var project = envScope.project;
    var dimension = project.dimension && project.dimension[AMBIENTE]
      ? angular.copy(project.dimension[AMBIENTE]) : null;
    var textures = project.textures && project.textures[AMBIENTE]
      ? angular.copy(project.textures[AMBIENTE]) : null;

    var positions = {};
    project.modules.filter(function (mod) { return mod.furniture === AMBIENTE; })
      .forEach(function (mod) {
        var pos = {};
        MODULE_COPY_FIELDS.forEach(function (k) { pos[k] = mod[k]; });
        positions[mod.name] = pos;
      });

    var decorations = (project.decorations || [])
      .filter(function (d) { return d.furniture === AMBIENTE; })
      .map(function (d) {
        var clone = angular.copy(d);
        delete clone.uuid;
        delete clone.$$hashKey;
        return clone;
      });

    return { dimension: dimension, textures: textures, positions: positions, decorations: decorations };
  }

  function applyToDestino(destinoScope, origemData) {
    var project = destinoScope.project;

    if (origemData.dimension) {
      project.dimension = project.dimension || {};
      project.dimension[AMBIENTE] = origemData.dimension;
      log('Dimensoes do ambiente aplicadas (altura ' + origemData.dimension.altura +
        'mm, largura ' + origemData.dimension.largura + 'mm, profundidade ' + origemData.dimension.profundidade + 'mm).');
    } else {
      log('Origem nao tinha dimensao customizada para "' + AMBIENTE + '"; mantendo padrao no destino.', 'ccm-warn');
    }

    if (origemData.textures) {
      project.textures = project.textures || {};
      project.textures[AMBIENTE] = origemData.textures;
      log('Texturas de chao/teto/parede aplicadas.');
    }

    var destinoModulos = project.modules.filter(function (mod) { return mod.furniture === AMBIENTE; });
    if (!destinoModulos.length) {
      log('Nenhum modulo do ambiente "' + AMBIENTE + '" encontrado no destino. Copie os modulos primeiro (CopiarModulos.js).', 'ccm-err');
    }
    var aplicados = 0;
    destinoModulos.forEach(function (mod) {
      var pos = origemData.positions[mod.name];
      if (!pos) {
        log('  ! sem posicao de origem para "' + mod.name + '" (nao aplicado).', 'ccm-warn');
        return;
      }
      MODULE_COPY_FIELDS.forEach(function (k) { mod[k] = pos[k]; });
      aplicados++;
      log('  + posicao e visualizacao aplicadas: ' + mod.name);
    });
    log(aplicados + ' de ' + destinoModulos.length + ' modulo(s) do ambiente posicionados e habilitados para visualizacao.');

    if (origemData.decorations.length) {
      project.decorations = project.decorations || [];
      origemData.decorations.forEach(function (d) { project.decorations.push(d); });
      log(origemData.decorations.length + ' decoracao(oes) copiada(s).');
    }
  }

  function run(destinoId) {
    log('Lendo configuracao do ambiente "' + AMBIENTE + '" no servico #' + ORIGEM_ID + '...');
    var origemData = extractOrigemData();
    log('Encontrados ' + Object.keys(origemData.positions).length + ' modulo(s) posicionados na origem.');

    log('Abrindo servico de destino #' + destinoId + '...');
    return gotoService(destinoId).then(function (destinoScope) {
      applyToDestino(destinoScope, origemData);
      log('Salvando servico de destino #' + destinoId + '...');
      return Promise.resolve(destinoScope.save({ generate: false }));
    });
  }

  // ---------- Handler do botao ----------

  $run.addEventListener('click', function () {
    if (busy) return;

    if (completed) {
      overlay.remove();
      return;
    }

    var destinoId = ($destino.value || '').trim();

    if (!/^\d+$/.test(destinoId)) {
      log('Informe apenas numeros no campo de destino.', 'ccm-err');
      return;
    }
    if (destinoId === ORIGEM_ID) {
      log('Origem e destino precisam ser servicos diferentes.', 'ccm-err');
      return;
    }

    setBusy(true);
    log('Iniciando copia do ambiente "' + AMBIENTE + '" de #' + ORIGEM_ID + ' para #' + destinoId + '...');

    run(destinoId).then(function () {
      log('Ambiente copiado com sucesso para o servico #' + destinoId + '.', 'ccm-ok');
      completed = true;
      setBusy(false, 'Concluido (clique para fechar)');
    }).catch(function (err) {
      log('Erro: ' + (err && err.message ? err.message : err), 'ccm-err');
      setBusy(false, 'Tentar novamente');
    });
  });

  $destino.focus();
})();
