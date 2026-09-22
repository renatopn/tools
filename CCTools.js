/**
 * CCTools.js
 *
 * Uso: dentro de qualquer tela da Cortecloud (marceneiro.cortecloud.com.br), abra o Console
 * do DevTools (F12 > Console), cole todo o conteudo deste arquivo e pressione Enter. Vai
 * aparecer um botao flutuante no canto inferior direito da tela com um menu de ferramentas:
 *
 *  1. Copiar modulos entre servicos   (substitui CopiarModulos.js; escolha "Todos os modulos"
 *                                      ou um modulo especifico da origem para copiar - util
 *                                      para atualizar so um modulo sem recopiar tudo. Antes de
 *                                      copiar, valida cada chapa/fita do modulo contra o
 *                                      catalogo da central de destino - a que nao existir la e
 *                                      deixada em branco no modulo copiado, em vez de manter um
 *                                      id invalido que trava o carregamento do modulo depois; o
 *                                      relatorio da copia lista modulo, slot e id removido)
 *  2. Copiar configuracao de ambiente (substitui CopiarAmbiente.js)
 *  3. Pecas do modulo atual           (novo - lista as pecas do modulo aberto para edicao,
 *                                      calculadas localmente a partir da geometria do modulo)
 *  4. Trocar chapa e fita          (novo - copia a chapa/fita escolhida numa aplicacao do
 *                                      modulo atual, ex. Corpo, para todas as outras aplicacoes.
 *                                      Escopo "Do modulo" (padrao) afeta so o modulo aberto - a
 *                                      alteracao fica so na sessao, o usuario confere e salva
 *                                      manualmente pelo botao "Salvar" do proprio modulo.
 *                                      Escopo "Do ambiente" aplica em todos os modulos do mesmo
 *                                      ambiente, abrindo cada um automaticamente; so depois que
 *                                      TODAS as chapas/fitas daquele modulo ja foram alteradas
 *                                      (com o digest do Angular forcado nesse ponto) e o botao
 *                                      "Salvar" real fica habilitado - aguardando se preciso -
 *                                      ele e clicado antes de seguir para o proximo modulo,
 *                                      necessario porque a alteracao nao persiste se o modulo
 *                                      nao for salvo antes de trocar de modulo)
 *  5. Limpar modulos do servico       (novo - apaga todos os modulos de um servico escolhido,
 *                                      com confirmacao mostrando quantos serao removidos - util
 *                                      antes de recopiar tudo depois de ajustar a origem)
 *
 * Todos os popups compartilham a mesma identidade visual: cabecalho com titulo e um botao
 * "x" no canto superior direito para fechar, e uma alca no canto inferior esquerdo que pode
 * ser arrastada para redimensionar o popup.
 *
 * Sobre a ferramenta "Pecas do modulo atual": ela le module.hash.children (a arvore de
 * geometria do modulo, recalculada 100% no navegador toda vez que voce muda largura/altura/
 * profundidade). Por isso funciona mesmo com o servico ainda em "Projetando" e reflete
 * edicoes ainda nao salvas - diferente da tela "Lista de pecas" da Cortecloud, que so mostra
 * dados depois que os modulos sao finalizados. Em troca, ela mostra uma tabela simples
 * (C, L, funcao, lados com fita) em vez do popup nativo com desenho, ja que os dados dessa
 * arvore nao tem o mesmo formato exigido pelo popup nativo.
 *
 * So funciona colado dentro da propria aba da Cortecloud (acessa o AngularJS da pagina).
 */
(function () {
  'use strict';

  if (typeof angular === 'undefined') {
    window.alert('Nao encontrei o AngularJS nesta pagina. Abra a Cortecloud (marceneiro.cortecloud.com.br) e tente novamente.');
    return;
  }

  var NS = 'cct';
  var HASH_PREFIX = '#/hellomobweb/';

  // ==========================================================================
  // Estilos compartilhados (identidade visual unica para todos os popups)
  // ==========================================================================

  if (!document.getElementById(NS + '-style')) {
    var style = document.createElement('style');
    style.id = NS + '-style';
    style.textContent =
      '.' + NS + '-launcher{position:fixed;bottom:24px;left:96px;z-index:999990;font-family:Arial,Helvetica,sans-serif;}' +
      '.' + NS + '-launcher-btn{height:40px;padding:0 18px;border-radius:20px;background:#2f6fa8;color:#fff;' +
        'border:none;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;font-size:13px;font-weight:bold;' +
        'letter-spacing:.02em;white-space:nowrap;}' +
      '.' + NS + '-launcher-btn:hover{background:#265a89;}' +
      '.' + NS + '-menu{position:absolute;bottom:62px;left:0;background:#fff;border-radius:8px;' +
        'box-shadow:0 8px 30px rgba(0,0,0,.3);min-width:240px;overflow:hidden;display:none;}' +
      '.' + NS + '-menu.' + NS + '-open{display:block;}' +
      '.' + NS + '-menu-item{padding:12px 16px;font-size:13px;color:#243746;cursor:pointer;border-bottom:1px solid #eef1f2;}' +
      '.' + NS + '-menu-item:last-child{border-bottom:none;}' +
      '.' + NS + '-menu-item:hover{background:#f4f6f7;}' +
      '.' + NS + '-menu-title{padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;' +
        'color:#8a99a3;background:#f8f9fa;}' +

      '.' + NS + '-panel{position:fixed;background:#fff;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.35);' +
        'font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#243746;display:flex;flex-direction:column;' +
        'z-index:999995;min-width:320px;min-height:160px;max-width:92vw;max-height:85vh;}' +
      '.' + NS + '-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;' +
        'border-bottom:1px solid #eef1f2;cursor:default;flex:0 0 auto;}' +
      '.' + NS + '-title{font-size:15px;font-weight:bold;color:#243746;margin:0;}' +
      '.' + NS + '-close{border:none;background:none;font-size:20px;line-height:1;color:#8a99a3;cursor:pointer;padding:0 4px;}' +
      '.' + NS + '-close:hover{color:#b3261e;}' +
      '.' + NS + '-body{padding:14px;overflow:auto;flex:1 1 auto;min-height:0;}' +
      '.' + NS + '-resize{position:absolute;width:16px;height:16px;}' +
      '.' + NS + '-resize-bl{left:0;bottom:0;cursor:sw-resize;}' +
      '.' + NS + '-resize-bl::before{content:"";position:absolute;left:4px;bottom:4px;width:8px;height:8px;' +
        'border-left:2px solid #cfd8dc;border-bottom:2px solid #cfd8dc;}' +
      '.' + NS + '-resize-tl{left:0;top:0;cursor:nwse-resize;}' +
      '.' + NS + '-resize-tl::before{content:"";position:absolute;left:4px;top:4px;width:8px;height:8px;' +
        'border-left:2px solid #cfd8dc;border-top:2px solid #cfd8dc;}' +

      '.' + NS + '-sub{margin:0 0 12px;font-size:12px;color:#6b7a85;}' +
      '.' + NS + '-field{display:block;font-size:12px;color:#3a4a54;margin:10px 0 4px;}' +
      '.' + NS + '-input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cfd8dc;border-radius:4px;font-size:14px;}' +
      '.' + NS + '-input-wrap{position:relative;margin-top:10px;}' +
      '.' + NS + '-input-wrap .' + NS + '-input{padding-right:28px;}' +
      '.' + NS + '-input-clear{position:absolute;right:4px;top:50%;transform:translateY(-50%);border:none;' +
        'background:none;color:#8a99a3;font-size:16px;line-height:1;cursor:pointer;padding:4px 6px;}' +
      '.' + NS + '-input-clear:hover{color:#b3261e;}' +
      '.' + NS + '-btn{margin-top:14px;width:100%;padding:10px;border:none;border-radius:4px;background:#2f6fa8;' +
        'color:#fff;font-size:14px;cursor:pointer;}' +
      '.' + NS + '-btn:disabled{background:#9db6c7;cursor:default;}' +
      '.' + NS + '-info{background:#f4f6f7;border:1px solid #e1e6e8;border-radius:4px;padding:8px 10px;' +
        'font-size:13px;color:#243746;margin-bottom:14px;}' +
      '.' + NS + '-info b{color:#2f6fa8;}' +
      '.' + NS + '-log{margin-top:14px;max-height:220px;overflow-y:auto;background:#f4f6f7;border:1px solid #e1e6e8;' +
        'border-radius:4px;padding:8px 10px;font-size:12px;color:#3a4a54;white-space:pre-wrap;display:none;}' +
      '.' + NS + '-log.' + NS + '-visible{display:block;}' +
      '.' + NS + '-warn{color:#a15c00;}' +
      '.' + NS + '-err{color:#b3261e;}' +
      '.' + NS + '-ok{color:#1e7a34;}' +

      '.' + NS + '-table{width:100%;border-collapse:collapse;font-size:12px;}' +
      '.' + NS + '-table th{text-align:left;border-bottom:1px solid #ddd;padding:5px 6px;color:#6b7a85;font-weight:normal;}' +
      '.' + NS + '-table td{padding:5px 6px;border-bottom:1px solid #f0f0f0;}';
    document.head.appendChild(style);
  }

  // ==========================================================================
  // Utilidades gerais
  // ==========================================================================

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function findScopeByHeadingText(texts) {
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length === 0 && texts.indexOf(el.textContent.trim()) !== -1) {
        var scope = angular.element(el).scope();
        if (scope) return scope;
      }
    }
    return null;
  }

  function findProjectListScope() {
    var s = findScopeByHeadingText(['Módulos neste projeto', 'Modulos neste projeto']);
    if (s && s.project && Array.isArray(s.project.modules)) return s;
    return null;
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

  function findActiveModuloScope() {
    // O painel de edicao do modulo guarda o modulo atual em "module" (ingles), diferente
    // do item da lista de modulos, que usa "modulo" (portugues).
    var s = findScopeByHeadingText(['Dimensões', 'Dimensoes']);
    while (s && !s.module) s = s.$parent;
    return (s && s.module) ? s : null;
  }

  function gotoHash(hash, readyCheck, timeoutMs) {
    timeoutMs = timeoutMs || 20000;
    window.location.hash = hash;
    var start = Date.now();
    return sleep(700).then(function poll() {
      var result = readyCheck();
      if (result) return result;
      if (Date.now() - start > timeoutMs) {
        throw new Error('Tempo esgotado esperando carregar "' + hash + '".');
      }
      return sleep(300).then(poll);
    });
  }

  // ==========================================================================
  // Shell de popup compartilhado
  // ==========================================================================

  var openPanels = {};

  function createPopup(opts) {
    opts = opts || {};
    var key = opts.key || ('p' + Math.random().toString(36).slice(2));
    var existing = openPanels[key];
    if (existing && existing.el && existing.el.parentNode) existing.el.remove();

    var cascade = Object.keys(openPanels).length % 6;
    var panel = document.createElement('div');
    panel.className = NS + '-panel';
    panel.style.width = (opts.width || 420) + 'px';
    panel.style.height = (opts.height || 'auto');
    panel.style.top = (70 + cascade * 24) + 'px';
    panel.style.right = (24 + cascade * 24) + 'px';

    panel.innerHTML =
      '<div class="' + NS + '-header">' +
      '  <div class="' + NS + '-title">' + (opts.title || '') + '</div>' +
      '  <button type="button" class="' + NS + '-close">&times;</button>' +
      '</div>' +
      '<div class="' + NS + '-body"></div>' +
      '<div class="' + NS + '-resize ' + NS + '-resize-tl" title="Arraste para redimensionar"></div>' +
      '<div class="' + NS + '-resize ' + NS + '-resize-bl" title="Arraste para redimensionar"></div>';
    document.body.appendChild(panel);

    var body = panel.querySelector('.' + NS + '-body');
    var closeBtn = panel.querySelector('.' + NS + '-close');

    function close() {
      panel.remove();
      delete openPanels[key];
    }
    closeBtn.addEventListener('click', close);

    // Redimensionar arrastando um dos cantos esquerdos: a largura sempre cresce para
    // a esquerda (o lado direito do popup fica fixo). Pelo canto inferior esquerdo a
    // altura cresce para baixo (topo fixo); pelo canto superior esquerdo a altura
    // cresce para cima (o topo sobe, o rodape fica fixo) - util quando o canto
    // inferior fica fora da tela e nao da pra arrasta-lo. O tamanho fica limitado ao
    // espaco visivel da janela para o popup nunca ficar inacessivel.
    function attachResize(handle, growUp) {
      handle.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
        var startX = ev.clientX;
        var startY = ev.clientY;
        var startWidth = panel.offsetWidth;
        var startHeight = panel.offsetHeight;
        var startTop = panel.offsetTop;
        var maxWidth = window.innerWidth - 16;
        var maxHeight = window.innerHeight - 16;

        function onMove(e) {
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          var newWidth = Math.min(maxWidth, Math.max(320, startWidth - dx));
          var rawHeight = growUp ? (startHeight - dy) : (startHeight + dy);
          var newHeight = Math.min(maxHeight, Math.max(160, rawHeight));
          panel.style.width = newWidth + 'px';
          panel.style.height = newHeight + 'px';
          panel.style.maxHeight = 'none';
          if (growUp) {
            panel.style.top = Math.max(8, startTop - (newHeight - startHeight)) + 'px';
          }
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }
    attachResize(panel.querySelector('.' + NS + '-resize-tl'), true);
    attachResize(panel.querySelector('.' + NS + '-resize-bl'), false);

    var api = { el: panel, body: body, close: close, key: key };
    openPanels[key] = api;
    return api;
  }

  function setupLog(body) {
    var log = document.createElement('div');
    log.className = NS + '-log';
    body.appendChild(log);
    return function (msg, cls) {
      log.classList.add(NS + '-visible');
      var line = document.createElement('div');
      if (cls) line.className = cls;
      line.textContent = msg;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
      console.log('[CortecloudTools]', msg);
    };
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Lista "Meus servicos" do usuario, igual a tela #/plans - funciona de qualquer
  // pagina, sem precisar navegar ate la primeiro.
  function fetchServicesList() {
    var injector = angular.element(document.body).injector();
    var $http = injector.get('$http');
    return $http.get('https://api.cortecloud.com.br/api-servicos-carpenter/services/list')
      .then(function (r) { return r.data; });
  }

  function serviceOptionLabel(s) {
    var cliente = s.client ? s.client : '(sem cliente)';
    if (cliente.length > 55) cliente = cliente.slice(0, 52) + '...';
    return '#' + s.service + ' — ' + cliente + ' — ' + s.company;
  }

  function buildServiceOptionsHtml(list) {
    return list.map(function (s) {
      return '<option value="' + s.service + '">' + escapeHtml(serviceOptionLabel(s)) + '</option>';
    }).join('');
  }

  // ==========================================================================
  // Ferramenta 1: Copiar modulos entre servicos
  // ==========================================================================

  var FIELDS_TO_STRIP_MODULE = [
    'uuid', 'visible', 'exported', 'x', 'y', 'z',
    'rotx', 'roty', 'rotz', 'createdAt', 'updatedAt', '$$hashKey'
  ];

  function cleanModuleForCopy(modulo) {
    var clone = angular.copy(modulo);
    FIELDS_TO_STRIP_MODULE.forEach(function (k) { delete clone[k]; });
    return clone;
  }

  function fetchCompanyCatalog(companyId) {
    var injector = angular.element(document.body).injector();
    var $http = injector.get('$http');
    return Promise.all([
      $http.get('https://next.cortecloud.com.br/api/core/boards/companies/' + companyId).then(function (r) { return r.data; }),
      $http.get('https://next.cortecloud.com.br/api/core/edges/companies/' + companyId).then(function (r) { return r.data; })
    ]).then(function (results) {
      return {
        boardIds: results[0].reduce(function (set, b) { set[b.id] = true; return set; }, {}),
        edgeIds: results[1].reduce(function (set, e) { set[e.id] = true; return set; }, {})
      };
    });
  }

  // A Cortecloud resolve a descricao de cada chapa/fita a partir de
  // module.preferences.c/f[chave].id (nao de hash.attributes, que e so um cache
  // derivado) - um id que nao exista no catalogo da central atual trava o carregamento
  // do modulo com "Cannot read properties of undefined (reading 'description')".
  // module.preferences.c/f tem um slot por aplicacao do modulo (corpo, fundo, travessas,
  // divisoria, tamponamento, e em modulos com gaveta tambem gavetas, frentes,
  // frentesgavetas, fundogavetas, molduraprovencal) - a lista varia por tipo de modulo,
  // entao percorremos todas as chaves realmente presentes em vez de uma lista fixa.
  //
  // Remove do modulo clonado qualquer chapa/fita cujo id nao exista no catalogo da
  // central de destino, deixando o slot vazio (mesmo padrao que a Cortecloud ja usa
  // para slots nao definidos) em vez de deixar um id invalido que trava o carregamento
  // do modulo. Retorna a lista de avisos gerados para este modulo.
  function validarMateriaisModulo(modulo, catalog) {
    var avisos = [];
    var attrs = modulo.hash && modulo.hash.attributes;

    ['c', 'f'].forEach(function (tipo) {
      var pref = modulo.preferences && modulo.preferences[tipo];
      if (!pref) return;
      var catalogMap = tipo === 'c' ? catalog.boardIds : catalog.edgeIds;

      Object.keys(pref).forEach(function (chave) {
        var entry = pref[chave];
        if (!entry || !entry.id) return;
        if (catalogMap[entry.id]) return;

        avisos.push({ modulo: modulo.name, tipo: tipo === 'c' ? 'chapa' : 'fita', slot: chave, id: entry.id });

        entry.id = null;
        entry.textura = null;
        entry.descricao = null;
        entry.tag = null;

        var attrKey = (tipo === 'c' ? 'chapa_' : 'fita_') + chave;
        if (attrs && attrs[attrKey] !== undefined) attrs[attrKey] = '';
      });
    });

    return avisos;
  }

  var COPIAR_TODOS = '__todos__';

  function toolCopiarModulos() {
    var popup = createPopup({ key: 'copiar-modulos', title: 'Copiar módulos entre serviços', width: 460 });
    popup.body.innerHTML = '<p class="' + NS + '-sub">Carregando lista de serviços...</p>';

    fetchServicesList().then(function (lista) {
      var optionsHtml = '<option value="">Selecione um serviço...</option>' + buildServiceOptionsHtml(lista);

      popup.body.innerHTML =
        '<p class="' + NS + '-sub">Copia módulos de um serviço já configurado para outro serviço.</p>' +
        '<label class="' + NS + '-field">Serviço de ORIGEM (já tem os módulos)</label>' +
        '<select class="' + NS + '-input" id="cct-cm-origem">' + optionsHtml + '</select>' +
        '<label class="' + NS + '-field">Módulo a copiar</label>' +
        '<select class="' + NS + '-input" id="cct-cm-modulo" disabled><option value="">Selecione a origem primeiro...</option></select>' +
        '<label class="' + NS + '-field">Serviço de DESTINO (vai receber o(s) módulo(s))</label>' +
        '<select class="' + NS + '-input" id="cct-cm-destino">' + optionsHtml + '</select>' +
        '<button type="button" class="' + NS + '-btn" id="cct-cm-run">Copiar</button>';

      var log = setupLog(popup.body);
      var $origem = popup.body.querySelector('#cct-cm-origem');
      var $modulo = popup.body.querySelector('#cct-cm-modulo');
      var $destino = popup.body.querySelector('#cct-cm-destino');
      var $run = popup.body.querySelector('#cct-cm-run');
      var busy = false, completed = false;

      function setBusy(value, label) {
        busy = value;
        $run.disabled = value;
        $origem.disabled = value;
        $modulo.disabled = value;
        $destino.disabled = value;
        $run.textContent = label || (value ? 'Copiando...' : 'Copiar');
      }

      $origem.addEventListener('change', function () {
        var origemId = $origem.value;
        if (!origemId) {
          $modulo.innerHTML = '<option value="">Selecione a origem primeiro...</option>';
          $modulo.disabled = true;
          return;
        }
        $modulo.innerHTML = '<option value="">Carregando módulos...</option>';
        $modulo.disabled = true;
        gotoHash(HASH_PREFIX + origemId, findProjectListScope).then(function (origemScope) {
          var modulos = origemScope.project.modules;
          if (!modulos.length) {
            $modulo.innerHTML = '<option value="">Este serviço não tem módulos</option>';
            return;
          }
          var opts = '<option value="' + COPIAR_TODOS + '">Todos os módulos (' + modulos.length + ')</option>' +
            modulos.map(function (mm) {
              return '<option value="' + mm.uuid + '">' + escapeHtml(mm.name) +
                (mm.furniture ? ' (' + escapeHtml(mm.furniture) + ')' : '') + '</option>';
            }).join('');
          $modulo.innerHTML = opts;
          $modulo.disabled = false;
        }).catch(function (err) {
          $modulo.innerHTML = '<option value="">Erro ao carregar módulos</option>';
          log('Erro ao carregar módulos da origem: ' + (err && err.message ? err.message : err), NS + '-err');
        });
      });

      function run(origemId, moduloId, destinoId) {
        log('Abrindo serviço de origem #' + origemId + '...');
        return gotoHash(HASH_PREFIX + origemId, findProjectListScope).then(function (origemScope) {
          var modulos = origemScope.project.modules;
          if (moduloId !== COPIAR_TODOS) {
            modulos = modulos.filter(function (mm) { return mm.uuid === moduloId; });
            if (!modulos.length) throw new Error('O módulo selecionado não foi encontrado na origem (pode ter sido removido ou renomeado).');
          }
          if (!modulos.length) throw new Error('O serviço de origem #' + origemId + ' não tem nenhum módulo.');
          log('Encontrados ' + modulos.length + ' módulo(s) para copiar.');
          var copias = modulos.map(cleanModuleForCopy);

          log('Abrindo serviço de destino #' + destinoId + '...');
          return gotoHash(HASH_PREFIX + destinoId, findProjectListScope).then(function (destinoScope) {
            var companyId = destinoScope.project.companyId;
            log('Consultando catálogo de chapas/fitas da central de destino (empresa #' + companyId + ')...');

            return fetchCompanyCatalog(companyId).then(function (catalog) {
              var avisos = [];
              copias.forEach(function (dados) {
                avisos = avisos.concat(validarMateriaisModulo(dados, catalog));
              });

              var injector = angular.element(document.body).injector();
              var Modulo = injector.get('Modulo');
              copias.forEach(function (dados, i) {
                destinoScope.project.modules.push(new Modulo(dados));
                log('  + [' + (i + 1) + '/' + copias.length + '] ' + (dados.name || dados.id) +
                  (dados.furniture ? ' (' + dados.furniture + ')' : ''));
              });
              log('Salvando serviço de destino #' + destinoId + '...');
              return Promise.resolve(destinoScope.save({ generate: false })).then(function () {
                return { total: copias.length, avisos: avisos };
              });
            });
          });
        });
      }

      $run.addEventListener('click', function () {
        if (busy) return;
        if (completed) { popup.close(); return; }

        var origemId = $origem.value;
        var moduloId = $modulo.value;
        var destinoId = $destino.value;
        if (!origemId || !destinoId) { log('Selecione o serviço de origem e o de destino.', NS + '-err'); return; }
        if (!moduloId) { log('Selecione qual módulo copiar (ou "Todos os módulos").', NS + '-err'); return; }
        if (origemId === destinoId) { log('Origem e destino precisam ser serviços diferentes.', NS + '-err'); return; }

        setBusy(true);
        log('Iniciando cópia de #' + origemId + ' para #' + destinoId + '...');
        run(origemId, moduloId, destinoId).then(function (resultado) {
          log(resultado.total + ' módulo(s) copiado(s) com sucesso para o serviço #' + destinoId + '.', NS + '-ok');
          if (resultado.avisos.length) {
            log(resultado.avisos.length + ' material(is) não existiam na central de destino e foram deixados em branco para reatribuição manual:', NS + '-warn');
            resultado.avisos.forEach(function (a) {
              log('  ! ' + a.modulo + ': ' + a.tipo + ' "' + a.slot + '" (id ' + a.id + ' indisponível nesta central)', NS + '-warn');
            });
          } else {
            log('Todos os materiais dos módulos copiados existem na central de destino.', NS + '-ok');
          }
          completed = true;
          setBusy(false, 'Concluído (clique para fechar)');
        }).catch(function (err) {
          log('Erro: ' + (err && err.message ? err.message : err), NS + '-err');
          setBusy(false, 'Tentar novamente');
        });
      });
    }).catch(function (err) {
      popup.body.innerHTML = '<p class="' + NS + '-sub ' + NS + '-err">Não consegui carregar a lista de serviços: ' +
        escapeHtml(err && err.message ? err.message : err) + '</p>';
    });
  }

  // ==========================================================================
  // Ferramenta 2: Copiar configuracao de ambiente
  // ==========================================================================

  var MODULE_POS_FIELDS = [
    'x', 'y', 'z', 'rotx', 'roty', 'rotz',
    'xTranslate', 'yTranslate', 'zTranslate',
    'rotxTranslate', 'rotyTranslate', 'rotzTranslate'
  ];
  var MODULE_STATE_FIELDS = ['visible', 'desativar'];
  var MODULE_COPY_FIELDS = MODULE_POS_FIELDS.concat(MODULE_STATE_FIELDS);

  function toolCopiarAmbiente() {
    var m = window.location.hash.match(/#\/hellomobweb\/(\d+)\/environment\/([^\/?]+)/);
    var popup = createPopup({ key: 'copiar-ambiente', title: 'Copiar configuração do ambiente', width: 420 });

    if (!m) {
      popup.body.innerHTML = '<p class="' + NS + '-sub ' + NS + '-err">Abra a tela "Visualizar ambiente" de um serviço antes de usar esta ferramenta.</p>';
      return;
    }
    var ORIGEM_ID = m[1];
    var AMBIENTE = decodeURIComponent(m[2]);

    popup.body.innerHTML = '<p class="' + NS + '-sub">Carregando lista de serviços...</p>';

    var log, $destino, $run, busy = false, completed = false;

    function setBusy(value, label) {
      busy = value;
      $run.disabled = value;
      $destino.disabled = value;
      $run.textContent = label || (value ? 'Copiando...' : 'Copiar');
    }

    function extractOrigemData() {
      var envScope = findEnvironmentScope();
      if (!envScope) throw new Error('Não encontrei os dados do ambiente nesta página. Recarregue a tela "Visualizar ambiente" e tente novamente.');
      var project = envScope.project;
      var dimension = project.dimension && project.dimension[AMBIENTE] ? angular.copy(project.dimension[AMBIENTE]) : null;
      var textures = project.textures && project.textures[AMBIENTE] ? angular.copy(project.textures[AMBIENTE]) : null;

      var positions = {};
      project.modules.filter(function (mod) { return mod.furniture === AMBIENTE; }).forEach(function (mod) {
        var pos = {};
        MODULE_COPY_FIELDS.forEach(function (k) { pos[k] = mod[k]; });
        positions[mod.name] = pos;
      });

      var decorations = (project.decorations || []).filter(function (d) { return d.furniture === AMBIENTE; }).map(function (d) {
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
        log('Dimensões do ambiente aplicadas (altura ' + origemData.dimension.altura + 'mm, largura ' +
          origemData.dimension.largura + 'mm, profundidade ' + origemData.dimension.profundidade + 'mm).');
      } else {
        log('Origem não tinha dimensão customizada para "' + AMBIENTE + '"; mantendo padrão no destino.', NS + '-warn');
      }

      if (origemData.textures) {
        project.textures = project.textures || {};
        project.textures[AMBIENTE] = origemData.textures;
        log('Texturas de chão/teto/parede aplicadas.');
      }

      var destinoModulos = project.modules.filter(function (mod) { return mod.furniture === AMBIENTE; });
      if (!destinoModulos.length) log('Nenhum módulo do ambiente "' + AMBIENTE + '" encontrado no destino. Copie os módulos primeiro.', NS + '-err');
      var aplicados = 0;
      destinoModulos.forEach(function (mod) {
        var pos = origemData.positions[mod.name];
        if (!pos) { log('  ! sem posição de origem para "' + mod.name + '" (não aplicado).', NS + '-warn'); return; }
        MODULE_COPY_FIELDS.forEach(function (k) { mod[k] = pos[k]; });
        aplicados++;
        log('  + posição e visualização aplicadas: ' + mod.name);
      });
      log(aplicados + ' de ' + destinoModulos.length + ' módulo(s) do ambiente posicionados e habilitados para visualização.');

      if (origemData.decorations.length) {
        project.decorations = project.decorations || [];
        origemData.decorations.forEach(function (d) { project.decorations.push(d); });
        log(origemData.decorations.length + ' decoração(ões) copiada(s).');
      }
    }

    function run(destinoId) {
      log('Lendo configuração do ambiente "' + AMBIENTE + '" no serviço #' + ORIGEM_ID + '...');
      var origemData = extractOrigemData();
      log('Encontrados ' + Object.keys(origemData.positions).length + ' módulo(s) posicionados na origem.');
      log('Abrindo serviço de destino #' + destinoId + '...');
      return gotoHash(HASH_PREFIX + destinoId, findProjectListScope).then(function (destinoScope) {
        applyToDestino(destinoScope, origemData);
        log('Salvando serviço de destino #' + destinoId + '...');
        return Promise.resolve(destinoScope.save({ generate: false }));
      });
    }

    fetchServicesList().then(function (lista) {
      var optionsHtml = '<option value="">Selecione um serviço...</option>' +
        buildServiceOptionsHtml(lista.filter(function (s) { return String(s.service) !== String(ORIGEM_ID); }));

      popup.body.innerHTML =
        '<p class="' + NS + '-sub">Copia dimensões, texturas e posição/visualização dos módulos deste ambiente para outro serviço.</p>' +
        '<div class="' + NS + '-info">Origem: serviço <b>#' + ORIGEM_ID + '</b> &mdash; ambiente <b>' + AMBIENTE + '</b></div>' +
        '<label class="' + NS + '-field">Serviço de DESTINO (módulos já copiados para lá)</label>' +
        '<select class="' + NS + '-input" id="cct-ca-destino">' + optionsHtml + '</select>' +
        '<button type="button" class="' + NS + '-btn" id="cct-ca-run">Copiar</button>';

      log = setupLog(popup.body);
      $destino = popup.body.querySelector('#cct-ca-destino');
      $run = popup.body.querySelector('#cct-ca-run');

      $run.addEventListener('click', function () {
        if (busy) return;
        if (completed) { popup.close(); return; }

        var destinoId = $destino.value;
        if (!destinoId) { log('Selecione o serviço de destino.', NS + '-err'); return; }
        if (destinoId === ORIGEM_ID) { log('Origem e destino precisam ser serviços diferentes.', NS + '-err'); return; }

        setBusy(true);
        log('Iniciando cópia do ambiente "' + AMBIENTE + '" de #' + ORIGEM_ID + ' para #' + destinoId + '...');
        run(destinoId).then(function () {
          log('Ambiente copiado com sucesso para o serviço #' + destinoId + '.', NS + '-ok');
          completed = true;
          setBusy(false, 'Concluído (clique para fechar)');
        }).catch(function (err) {
          log('Erro: ' + (err && err.message ? err.message : err), NS + '-err');
          setBusy(false, 'Tentar novamente');
        });
      });
    }).catch(function (err) {
      popup.body.innerHTML = '<p class="' + NS + '-sub ' + NS + '-err">Não consegui carregar a lista de serviços: ' +
        escapeHtml(err && err.message ? err.message : err) + '</p>';
    });
  }

  // ==========================================================================
  // Ferramenta 3: Pecas do modulo atual
  // ==========================================================================
  //
  // Le as pecas diretamente da arvore de geometria do modulo (module.hash.children),
  // que e recalculada 100% no navegador (sem chamada ao servidor) toda vez que voce
  // muda largura/altura/profundidade. Por isso funciona mesmo com o servico ainda em
  // "Projetando" e reflete edicoes ainda nao salvas - diferente da tela "Lista de
  // pecas", que so existe depois que os modulos sao finalizados.
  //
  // Cada no da arvore tem attributes.lenx/leny/lenz (as 3 dimensoes) e
  // attributes.produzir (so os nos com produzir "verdadeiro" viram peca de fato; o
  // resto sao ramos alternativos nao usados). O eixo cujo valor bate com
  // attributes.espessura e a chapa (descartado); dos outros dois, o maior vira "C" e
  // o menor vira "L" - validado contra os valores reais da tela "Lista de pecas".

  function extractPecasDoModulo(modulo) {
    var children = (modulo.hash && modulo.hash.children) || [];
    return children
      .filter(function (c) { return c.attributes && c.attributes.produzir; })
      .map(function (c) {
        var a = c.attributes;
        var axes = [a.lenx, a.leny, a.lenz];
        var espIdx = axes.indexOf(a.espessura);
        if (espIdx === -1) espIdx = axes.indexOf(Math.min.apply(null, axes));
        var remaining = axes.filter(function (v, i) { return i !== espIdx; });

        var fitas = [];
        if (a.fita_afrente) fitas.push('frente');
        if (a.fita_atras) fitas.push('atrás');
        if (a.fita_abaixo) fitas.push('abaixo');
        if (a.fita_acima) fitas.push('acima');
        if (a.fita_direita) fitas.push('direita');
        if (a.fita_esquerda) fitas.push('esquerda');

        return {
          name: c.name,
          c: Math.max(remaining[0], remaining[1]),
          l: Math.min(remaining[0], remaining[1]),
          espessura: a.espessura,
          fitas: fitas.length ? fitas.join(', ') : '—'
        };
      });
  }

  function toolPecasDoModulo() {
    var popup = createPopup({ key: 'pecas-modulo', title: 'Peças do módulo', width: 460 });

    var moduloScope = findActiveModuloScope();
    if (!moduloScope) {
      popup.body.innerHTML = '<p class="' + NS + '-sub ' + NS + '-err">Abra um módulo para edição (clique nele na tela do serviço) antes de usar esta ferramenta.</p>';
      return;
    }
    var modulo = moduloScope.module;

    popup.body.innerHTML =
      '<div class="' + NS + '-info">Módulo: <b>' + modulo.name + '</b></div>' +
      '<p class="' + NS + '-sub">Calculado a partir da geometria atual do módulo (inclui alterações ainda não salvas).</p>' +
      '<button type="button" class="' + NS + '-btn" id="cct-pm-run">Atualizar peças</button>' +
      '<div class="' + NS + '-input-wrap">' +
      '  <input type="text" class="' + NS + '-input" id="cct-pm-filter" placeholder="Filtrar por função...">' +
      '  <button type="button" class="' + NS + '-input-clear" id="cct-pm-filter-clear" title="Limpar filtro">&times;</button>' +
      '</div>' +
      '<div id="cct-pm-table"></div>';

    var $run = popup.body.querySelector('#cct-pm-run');
    var $table = popup.body.querySelector('#cct-pm-table');
    var $filter = popup.body.querySelector('#cct-pm-filter');
    var $filterClear = popup.body.querySelector('#cct-pm-filter-clear');
    var pecasAtuais = [];

    function renderTable(pecas) {
      $table.innerHTML = '';

      var info = document.createElement('div');
      info.className = NS + '-sub';
      info.textContent = pecas.length + ' peça(s).';
      $table.appendChild(info);

      var table = document.createElement('table');
      table.className = NS + '-table';
      table.innerHTML = '<thead><tr><th>#</th><th>C</th><th>L</th><th>Função</th><th>Fitas</th></tr></thead><tbody></tbody>';
      $table.appendChild(table);
      var tbody = table.querySelector('tbody');

      pecas.forEach(function (p, i) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + p.c + '</td><td>' + p.l + '</td><td>' + p.name + '</td><td>' + p.fitas + '</td>';
        tbody.appendChild(tr);
      });
    }

    function applyFilter() {
      var termo = $filter.value.trim().toLowerCase();
      if (!termo) { renderTable(pecasAtuais); return; }
      renderTable(pecasAtuais.filter(function (p) { return p.name.toLowerCase().indexOf(termo) !== -1; }));
    }

    function buscar() {
      pecasAtuais = extractPecasDoModulo(modulo);
      applyFilter();
    }

    $run.addEventListener('click', buscar);
    $filter.addEventListener('input', applyFilter);
    $filterClear.addEventListener('click', function () {
      $filter.value = '';
      applyFilter();
      $filter.focus();
    });

    buscar();
  }

  // ==========================================================================
  // Ferramenta 4: Trocar chapa e fita do modulo
  // ==========================================================================
  //
  // Chapas e fitas disponiveis variam por servico/central, entao a ferramenta nao
  // busca um catalogo proprio: o usuario escolhe a chapa e a fita desejadas usando o
  // seletor nativo da Cortecloud (painel "Chapas e fitas") em UMA aplicacao do
  // modulo (ex: Corpo), e esta ferramenta copia essa escolha para todas as outras
  // aplicacoes do modulo (Fundo, Divisoria, Tamponamento), usando as mesmas funcoes
  // internas (definirChapa/definirFita) que o seletor nativo usa - inclusive o
  // recalculo automatico da geometria. Aplicacoes cuja espessura de chapa/fita
  // permitida (module.recipe) nao bate com a escolhida sao puladas com aviso, para
  // nao forcar uma combinacao estruturalmente invalida.

  function toRawMaterial(m) {
    if (!m || !m.id) return null;
    return { id: m.id, texture: m.textura, thickness: m.espessura, description: m.descricao, color: m.tag };
  }

  // Aplica chapaRaw/fitaRaw a todas as aplicacoes de UM modulo ja aberto para
  // edicao (moduloScope precisa ter aplicacoes/recipe/definirChapa/definirFita).
  // skipKey, se informado, pula essa aplicacao (usado para nao reaplicar na
  // propria aplicacao de onde o material foi lido).
  function aplicarMaterialEmModulo(moduloScope, chapaRaw, fitaRaw, skipKey, log, moduloLabel) {
    var recipeC = moduloScope.recipe && moduloScope.recipe.c;
    var recipeF = moduloScope.recipe && moduloScope.recipe.f;

    Object.keys(moduloScope.aplicacoes).forEach(function (chave) {
      var aplicacao = moduloScope.aplicacoes[chave];
      var nome = moduloLabel + ' — ' + (aplicacao.nome ? aplicacao.nome.pt : chave);
      if (chave === skipKey) { log(nome + ': origem, mantido.'); return; }

      var regraC = recipeC && recipeC[chave];
      if (!chapaRaw) {
        // sem chapa escolhida, nada a fazer
      } else if (!regraC) {
        log(nome + ': chapa não se aplica a esta seção.');
      } else if (regraC.espessuras && regraC.espessuras.mm && regraC.espessuras.mm.indexOf(chapaRaw.thickness) !== -1) {
        moduloScope.definirChapa(chave, aplicacao, chapaRaw, false);
        log(nome + ': chapa aplicada.', NS + '-ok');
      } else {
        log(nome + ': chapa NÃO aplicada (espessura ' + chapaRaw.thickness + 'mm incompatível com esta seção).', NS + '-warn');
      }

      var regraF = recipeF && recipeF[chave];
      if (!fitaRaw) {
        // sem fita escolhida, nada a fazer
      } else if (!regraF) {
        log(nome + ': fita não se aplica a esta seção.');
      } else if (regraF.espessuras && regraF.espessuras.indexOf(fitaRaw.thickness) !== -1) {
        moduloScope.definirFita(chave, aplicacao, fitaRaw, false);
        log(nome + ': fita aplicada.', NS + '-ok');
      } else {
        log(nome + ': fita NÃO aplicada (espessura ' + fitaRaw.thickness + 'mm incompatível com esta seção).', NS + '-warn');
      }
    });

    // definirChapa/definirFita sao chamadas diretamente aqui, fora de um clique
    // real do usuario (sem passar pelo ng-click nativo), entao o Angular so
    // atualizaria a interface - inclusive o estado habilitado/desabilitado do
    // botao "Salvar" - no proximo digest espontaneo. Forcamos esse digest uma
    // unica vez, depois que TODAS as aplicacoes do modulo ja foram processadas,
    // para garantir que o botao so seja considerado (e clicado) depois que a
    // troca de chapa/fita estiver de fato refletida no estado do modulo.
    var root = moduloScope.$root;
    if (root && !root.$$phase) { root.$digest(); }
  }

  function findModuloScopeByUuid(uuid) {
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var texto = el.children.length === 0 ? el.textContent.trim() : '';
      if (texto === 'Dimensões' || texto === 'Dimensoes') {
        var s = angular.element(el).scope();
        while (s && !s.module) s = s.$parent;
        if (s && s.module && s.module.uuid === uuid) return s;
      }
    }
    return null;
  }

  // Abre um modulo para edicao clicando na sua linha da lista (se ainda nao
  // estiver aberto) e aguarda o painel de edicao (com aplicacoes/definirChapa)
  // ficar disponivel para aquele modulo especifico.
  function openModuloParaEdicao(uuid, timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    var jaAberto = findModuloScopeByUuid(uuid);
    if (jaAberto) return Promise.resolve(jaAberto);

    var row = Array.from(document.querySelectorAll('.modulo')).find(function (el) {
      var s = angular.element(el).scope();
      return s && s.modulo && s.modulo.uuid === uuid;
    });
    if (!row) return Promise.reject(new Error('Não encontrei a linha deste módulo na lista.'));
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    var start = Date.now();
    return sleep(500).then(function poll() {
      var s = findModuloScopeByUuid(uuid);
      if (s) return s;
      if (Date.now() - start > timeoutMs) throw new Error('Tempo esgotado abrindo o módulo para edição.');
      return sleep(300).then(poll);
    });
  }

  function findSalvarButtonForUuid(uuid) {
    return Array.from(document.querySelectorAll('button')).find(function (b) {
      if (b.textContent.trim() !== 'Salvar') return false;
      var s = angular.element(b).scope();
      return s && s.module && s.module.uuid === uuid;
    });
  }

  // Clica no botao "Salvar" real do painel de edicao do modulo (nao chama a
  // funcao direto, porque ela abre um modal de aviso em alguns casos, e clicar
  // no botao de verdade segue o mesmo caminho que um clique manual). Sem isso,
  // a troca de chapa/fita fica so na sessao e nao e persistida ao abrir o
  // proximo modulo. O botao tambem fecha o painel ao terminar, o que evita
  // acumular paineis de modulos diferentes abertos ao mesmo tempo.
  function salvarEFecharModulo(scope, timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    if (scope.module.necessarioAtualizar) {
      return Promise.reject(new Error('módulo "' + scope.module.name + '" está desatualizado; abra-o manualmente e atualize antes de usar esta ferramenta.'));
    }
    var uuid = scope.module.uuid;

    // O botao "Salvar" fica desabilitado enquanto o Angular ainda esta
    // processando a mudanca (ex. logo apos definirChapa/definirFita). Em vez
    // de falhar na hora, aguarda ele ficar habilitado ate o timeout.
    var esperaHabilitarStart = Date.now();
    function aguardarBotaoHabilitado() {
      var btn = findSalvarButtonForUuid(uuid);
      if (!btn) return Promise.reject(new Error('não encontrei o botão "Salvar" deste módulo.'));
      if (!btn.disabled) return Promise.resolve(btn);
      if (Date.now() - esperaHabilitarStart > timeoutMs) {
        return Promise.reject(new Error('tempo esgotado aguardando o botão "Salvar" deste módulo ficar habilitado.'));
      }
      return sleep(300).then(aguardarBotaoHabilitado);
    }

    return aguardarBotaoHabilitado().then(function (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      var fecharStart = Date.now();
      return sleep(500).then(function poll() {
        if (!findModuloScopeByUuid(uuid)) return true;
        if (Date.now() - fecharStart > timeoutMs) throw new Error('tempo esgotado esperando salvar/fechar o módulo.');
        return sleep(300).then(poll);
      });
    });
  }

  function toolTrocarMaterial() {
    var popup = createPopup({ key: 'trocar-material', title: 'Trocar chapa e fita', width: 460 });

    var moduloScope = findActiveModuloScope();
    if (!moduloScope || !moduloScope.aplicacoes || typeof moduloScope.definirChapa !== 'function') {
      popup.body.innerHTML = '<p class="' + NS + '-sub ' + NS + '-err">Abra um módulo para edição (clique nele na tela do serviço) antes de usar esta ferramenta.</p>';
      return;
    }

    var aplicacoesKeys = Object.keys(moduloScope.aplicacoes);
    var origemOptions = aplicacoesKeys.map(function (k) {
      var aplicacao = moduloScope.aplicacoes[k];
      var nome = aplicacao.nome ? aplicacao.nome.pt : k;
      return '<option value="' + k + '">' + nome + '</option>';
    }).join('');

    var projScope = findProjectListScope();
    var ambienteAtual = moduloScope.module.furniture;
    var ambientesOptions = '';
    if (projScope) {
      var vistos = {};
      var ambientes = [];
      projScope.project.modules.forEach(function (m) {
        if (m.furniture && !vistos[m.furniture]) { vistos[m.furniture] = true; ambientes.push(m.furniture); }
      });
      ambientesOptions = ambientes.map(function (a) {
        return '<option value="' + escapeHtml(a) + '"' + (a === ambienteAtual ? ' selected' : '') + '>' + escapeHtml(a) + '</option>';
      }).join('');
    }

    popup.body.innerHTML =
      '<p class="' + NS + '-sub">1. No painel "Chapas e fitas" da direita, escolha a chapa e a fita desejadas em uma das aplicações do módulo atual.<br>2. Escolha o escopo e clique em Aplicar.</p>' +
      '<label class="' + NS + '-field">Copiar chapa/fita de</label>' +
      '<select class="' + NS + '-input" id="cct-tm-origem">' + origemOptions + '</select>' +
      '<label class="' + NS + '-field">Aplicar em</label>' +
      '<select class="' + NS + '-input" id="cct-tm-escopo">' +
      '  <option value="modulo">Do módulo (só este módulo)</option>' +
      '  <option value="ambiente">Do ambiente (todos os módulos do ambiente)</option>' +
      '</select>' +
      '<div id="cct-tm-ambiente-wrap" style="display:none;">' +
      '  <label class="' + NS + '-field">Ambiente</label>' +
      '  <select class="' + NS + '-input" id="cct-tm-ambiente">' + ambientesOptions + '</select>' +
      '</div>' +
      '<button type="button" class="' + NS + '-btn" id="cct-tm-run">Aplicar</button>';

    var log = setupLog(popup.body);
    var $origem = popup.body.querySelector('#cct-tm-origem');
    var $escopo = popup.body.querySelector('#cct-tm-escopo');
    var $ambienteWrap = popup.body.querySelector('#cct-tm-ambiente-wrap');
    var $ambiente = popup.body.querySelector('#cct-tm-ambiente');
    var $run = popup.body.querySelector('#cct-tm-run');
    var busy = false;

    $escopo.addEventListener('change', function () {
      $ambienteWrap.style.display = $escopo.value === 'ambiente' ? 'block' : 'none';
    });

    $run.addEventListener('click', function () {
      if (busy) return;

      var origemKey = $origem.value;
      var origem = moduloScope.aplicacoes[origemKey];
      var nomeOrigem = origem.nome ? origem.nome.pt : origemKey;
      var chapaRaw = toRawMaterial(origem.c);
      var fitaRaw = toRawMaterial(origem.f);

      if (!chapaRaw && !fitaRaw) {
        log('A aplicação "' + nomeOrigem + '" ainda não tem chapa nem fita definidas.', NS + '-err');
        return;
      }

      if ($escopo.value === 'modulo') {
        aplicarMaterialEmModulo(moduloScope, chapaRaw, fitaRaw, origemKey, log, moduloScope.module.name);
        log('Concluído. Confira o resultado e clique em "Salvar" no serviço.', NS + '-ok');
        return;
      }

      // Escopo "ambiente": aplica em todos os modulos daquele ambiente, abrindo
      // cada um para edicao (um de cada vez) e salvando tudo ao final em uma
      // unica chamada de save do projeto.
      var ambienteSelecionado = $ambiente.value;
      if (!ambienteSelecionado) { log('Selecione o ambiente.', NS + '-err'); return; }
      if (!projScope) { log('Não encontrei a lista de módulos deste serviço.', NS + '-err'); return; }

      var currentUuid = moduloScope.module.uuid;
      var modulosDoAmbiente = projScope.project.modules.filter(function (m) { return m.furniture === ambienteSelecionado; });
      if (!modulosDoAmbiente.length) { log('Nenhum módulo encontrado no ambiente "' + ambienteSelecionado + '".', NS + '-err'); return; }

      busy = true;
      $run.disabled = true;
      $run.textContent = 'Aplicando...';
      log('Aplicando a ' + modulosDoAmbiente.length + ' módulo(s) do ambiente "' + ambienteSelecionado + '"...');

      modulosDoAmbiente.reduce(function (promise, m) {
        return promise.then(function () {
          var ehAtual = m.uuid === currentUuid;
          var scopePromise = ehAtual ? Promise.resolve(moduloScope) : openModuloParaEdicao(m.uuid);
          return scopePromise.then(function (scope) {
            aplicarMaterialEmModulo(scope, chapaRaw, fitaRaw, ehAtual ? origemKey : null, log, m.name);
            log('Salvando módulo "' + m.name + '"...');
            return salvarEFecharModulo(scope);
          }).catch(function (err) {
            log(m.name + ': ' + (err && err.message ? err.message : err), NS + '-err');
          });
        });
      }, Promise.resolve()).then(function () {
        log('Salvando o serviço...');
        return Promise.resolve(projScope.save({ generate: false }));
      }).then(function () {
        log('Concluído: material aplicado e salvo em todos os módulos do ambiente "' + ambienteSelecionado + '".', NS + '-ok');
        busy = false;
        $run.disabled = false;
        $run.textContent = 'Aplicar';
      }).catch(function (err) {
        log('Erro: ' + (err && err.message ? err.message : err), NS + '-err');
        busy = false;
        $run.disabled = false;
        $run.textContent = 'Aplicar';
      });
    });
  }

  // ==========================================================================
  // Ferramenta 5: Limpar modulos do servico
  // ==========================================================================
  //
  // Apaga todos os modulos de um servico. Util para atualizar um servico: apaga
  // tudo, ajusta a origem, e copia de novo com a ferramenta "Copiar modulos".
  // Pede confirmacao explicita (mostrando quantos modulos serao removidos) antes
  // de executar, ja que e uma acao dificil de reverter.

  function toolLimparModulos() {
    var popup = createPopup({ key: 'limpar-modulos', title: 'Limpar módulos do serviço', width: 440 });
    popup.body.innerHTML = '<p class="' + NS + '-sub">Carregando lista de serviços...</p>';

    fetchServicesList().then(function (lista) {
      var optionsHtml = '<option value="">Selecione um serviço...</option>' + buildServiceOptionsHtml(lista);

      popup.body.innerHTML =
        '<p class="' + NS + '-sub ' + NS + '-warn">Remove TODOS os módulos do serviço selecionado. Use antes de recopiar tudo depois de um ajuste na origem.</p>' +
        '<label class="' + NS + '-field">Serviço</label>' +
        '<select class="' + NS + '-input" id="cct-lm-servico">' + optionsHtml + '</select>' +
        '<button type="button" class="' + NS + '-btn" id="cct-lm-check">Verificar módulos</button>' +
        '<div id="cct-lm-confirm"></div>';

      var log = setupLog(popup.body);
      var $servico = popup.body.querySelector('#cct-lm-servico');
      var $check = popup.body.querySelector('#cct-lm-check');
      var $confirmArea = popup.body.querySelector('#cct-lm-confirm');
      var busy = false;

      $check.addEventListener('click', function () {
        if (busy) return;
        var servicoId = $servico.value;
        if (!servicoId) { log('Selecione um serviço.', NS + '-err'); return; }

        busy = true;
        $check.disabled = true;
        $servico.disabled = true;
        $confirmArea.innerHTML = '';
        log('Abrindo serviço #' + servicoId + '...');

        gotoHash(HASH_PREFIX + servicoId, findProjectListScope).then(function (scope) {
          busy = false;
          $check.disabled = false;
          $servico.disabled = false;

          var total = scope.project.modules.length;
          if (!total) {
            log('O serviço #' + servicoId + ' já não tem módulos.', NS + '-ok');
            return;
          }
          log(total + ' módulo(s) encontrado(s) no serviço #' + servicoId + '.', NS + '-warn');

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = NS + '-btn';
          btn.style.background = '#b3261e';
          btn.textContent = 'Apagar ' + total + ' módulo(s) deste serviço';
          $confirmArea.appendChild(btn);

          btn.addEventListener('click', function () {
            btn.disabled = true;
            $servico.disabled = true;
            btn.textContent = 'Apagando...';
            scope.project.modules.splice(0, scope.project.modules.length);
            Promise.resolve(scope.save({ generate: false })).then(function () {
              log('Todos os módulos do serviço #' + servicoId + ' foram removidos e salvos.', NS + '-ok');
              $confirmArea.innerHTML = '';
              $servico.disabled = false;
            }).catch(function (err) {
              log('Erro ao salvar: ' + (err && err.message ? err.message : err), NS + '-err');
              btn.disabled = false;
              $servico.disabled = false;
              btn.textContent = 'Tentar novamente';
            });
          });
        }).catch(function (err) {
          busy = false;
          $check.disabled = false;
          $servico.disabled = false;
          log('Erro: ' + (err && err.message ? err.message : err), NS + '-err');
        });
      });
    }).catch(function (err) {
      popup.body.innerHTML = '<p class="' + NS + '-sub ' + NS + '-err">Não consegui carregar a lista de serviços: ' +
        escapeHtml(err && err.message ? err.message : err) + '</p>';
    });
  }

  // ==========================================================================
  // Menu flutuante (launcher)
  // ==========================================================================

  var oldLauncher = document.querySelector('.' + NS + '-launcher');
  if (oldLauncher) oldLauncher.remove();

  var launcher = document.createElement('div');
  launcher.className = NS + '-launcher';
  launcher.innerHTML =
    '<div class="' + NS + '-menu">' +
    '  <div class="' + NS + '-menu-title">Ferramentas Cortecloud</div>' +
    '  <div class="' + NS + '-menu-item" data-tool="modulos">Copiar módulos entre serviços</div>' +
    '  <div class="' + NS + '-menu-item" data-tool="ambiente">Copiar configuração de ambiente</div>' +
    '  <div class="' + NS + '-menu-item" data-tool="pecas">Peças do módulo atual</div>' +
    '  <div class="' + NS + '-menu-item" data-tool="material">Trocar chapa e fita</div>' +
    '  <div class="' + NS + '-menu-item" data-tool="limpar">Limpar módulos do serviço</div>' +
    '</div>' +
    '<button type="button" class="' + NS + '-launcher-btn" title="Ferramentas Cortecloud">Tools Menu</button>';
  document.body.appendChild(launcher);

  var menu = launcher.querySelector('.' + NS + '-menu');
  var btn = launcher.querySelector('.' + NS + '-launcher-btn');

  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    menu.classList.toggle(NS + '-open');
  });
  document.addEventListener('click', function (ev) {
    if (!launcher.contains(ev.target)) menu.classList.remove(NS + '-open');
  });

  var TOOLS = { modulos: toolCopiarModulos, ambiente: toolCopiarAmbiente, pecas: toolPecasDoModulo, material: toolTrocarMaterial, limpar: toolLimparModulos };
  menu.querySelectorAll('.' + NS + '-menu-item').forEach(function (item) {
    item.addEventListener('click', function () {
      menu.classList.remove(NS + '-open');
      TOOLS[item.getAttribute('data-tool')]();
    });
  });
})();
