window.onerror = function (message, source, lineno) {
  var status = document.getElementById('status');
  if (status) status.textContent = 'Panel JS error: ' + message + ' @ ' + lineno;
};

var cs = new CSInterface();

function el(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  var status = el('status');
  if (status) status.textContent = text;
}

function getParams() {
  return {
    radius: Number(el('sl-radius').value),
    loose: Number(el('sl-loose').value),
    noise: Number(el('sl-noise').value),
    smooth: Number(el('sl-smooth').value),
    detail: Number(el('sl-detail').value),
    symmetry: getActiveSegment('symmetry'),
    warp: Number(el('sl-warp').value),
    warpPreset: '',
    fill: el('cl-fill').value,
    stroke: el('cl-stroke').value,
    sw: Number(el('sl-sw').value),
    keep: el('ck-keep').checked,
    update: false
  };
}

function bindSlider(name) {
  var slider = el('sl-' + name);
  var value = el('val-' + name);
  if (!slider || !value) return;
  slider.addEventListener('input', function () {
    value.textContent = slider.value;
    scheduleAutoUpdate();
  });
}

function runHost(fnName, params) {
  setStatus('Working...');
  try {
    var payload = encodeURIComponent(serializeParams(params || getParams()));
    cs.evalScript(fnName + '("' + payload + '")', function (result) {
      if (result && result.indexOf('ok:') === 0) {
        setStatus(result.substring(3));
      } else {
        setStatus(result || 'No response from Illustrator.');
      }
    });
  } catch (err) {
    setStatus('Panel error: ' + err.message);
  }
}

function serializeParams(params) {
  var out = [];
  for (var key in params) {
    if (params.hasOwnProperty(key)) out.push(key + '=' + params[key]);
  }
  return out.join(';');
}

function initPanel() {
  bindSlider('radius');
  bindSlider('loose');
  bindSlider('noise');
  bindSlider('smooth');
  bindSlider('detail');
  bindSlider('warp');
  bindSlider('sw');
  bindSegments('symmetry');

  el('btn-organicize').addEventListener('click', function () {
    var params = getParams();
    params.update = false;
    runHost('organicizeSelection', params);
  });
  el('cl-fill').addEventListener('input', scheduleAutoUpdate);
  el('cl-stroke').addEventListener('input', scheduleAutoUpdate);
  el('btn-warp-blob').addEventListener('click', function () {
    runHost('addWarpControl', { type: 'blob', strength: Number(el('sl-warp').value) });
  });
  el('btn-warp-explode').addEventListener('click', function () {
    runHost('addWarpControl', { type: 'explode', strength: Number(el('sl-warp').value) });
  });
  bindPreset('btn-preset-left', 'bulge-left');
  bindPreset('btn-preset-right', 'bulge-right');
  bindPreset('btn-preset-pinch', 'pinch');
  bindPreset('btn-preset-explode', 'explode');
  el('btn-warp-clear').addEventListener('click', function () {
    runHost('clearWarpControls', {});
  });
  el('ck-auto').addEventListener('change', function () {
    if (el('ck-auto').checked) scheduleAutoUpdate();
  });
  bindSupportModal();

  setStatus('Ready');
}

function bindSupportModal() {
  var open = el('btn-support');
  var modal = el('support-modal');
  var close = el('support-close');
  if (!open || !modal || !close) return;
  open.addEventListener('click', function () {
    modal.style.display = 'flex';
  });
  close.addEventListener('click', function () {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', function (evt) {
    if (evt.target === modal) modal.style.display = 'none';
  });
}

function bindPreset(id, preset) {
  var button = el(id);
  if (!button) return;
  button.addEventListener('click', function () {
    var params = getParams();
    params.warpPreset = preset;
    params.update = true;
    params.keep = true;
    runHost('applyWarpPreset', params);
  });
}

function bindSegments(id) {
  var root = el(id);
  if (!root) return;
  var buttons = root.getElementsByTagName('button');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      for (var j = 0; j < buttons.length; j++) buttons[j].className = buttons[j].className.replace(/\s*active/g, '');
      this.className += ' active';
      scheduleAutoUpdate();
    });
  }
}

function getActiveSegment(id) {
  var root = el(id);
  if (!root) return 'none';
  var buttons = root.getElementsByTagName('button');
  for (var i = 0; i < buttons.length; i++) {
    if (/\bactive\b/.test(buttons[i].className)) return buttons[i].getAttribute('data-value') || 'none';
  }
  return 'none';
}

var autoTimer = null;
function scheduleAutoUpdate() {
  if (!el('ck-auto') || !el('ck-auto').checked) return;
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(function () {
    var params = getParams();
    params.update = true;
    params.keep = true;
    runHost('organicizeSelection', params);
  }, 450);
}

initPanel();
