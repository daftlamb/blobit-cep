window.onerror = function (message, source, lineno) {
  var status = document.getElementById('status');
  if (status) status.textContent = 'Panel JS error: ' + message + ' @ ' + lineno;
};

var cs = new CSInterface();
var LICENSE_PRODUCT = 'blobit';
var LICENSE_SECRET = 'daftlamb-cep-license-v1';
var LICENSE_KEY = 'blobit-license-v1';

function el(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  var status = el('status');
  if (status) status.textContent = text;
}

function normalizeEmail(email) {
  return String(email || '').replace(/^\s+|\s+$/g, '').toLowerCase();
}

function licenseHash(input) {
  var h1 = 0x811c9dc5;
  var h2 = 0x45d9f3b;
  for (var i = 0; i < input.length; i++) {
    var c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= c + i;
    h2 = Math.imul(h2, 2246822519) >>> 0;
  }
  var mixed = (h1.toString(36) + h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  while (mixed.length < 16) mixed += mixed;
  return mixed.substring(0, 16).replace(/(.{4})(?=.)/g, '$1-');
}

function makeLicenseCode(email) {
  return licenseHash(normalizeEmail(email) + '|' + LICENSE_PRODUCT + '|' + LICENSE_SECRET);
}

function validateLicense(email, code) {
  var normalized = normalizeEmail(email);
  var cleaned = String(code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  var expected = makeLicenseCode(normalized).replace(/-/g, '');
  return normalized.indexOf('@') > 0 && cleaned === expected;
}

function getSavedLicense() {
  try {
    var raw = localStorage.getItem(LICENSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function saveLicense(email, code) {
  localStorage.setItem(LICENSE_KEY, JSON.stringify({
    email: normalizeEmail(email),
    code: String(code || '').toUpperCase(),
    product: LICENSE_PRODUCT,
    activatedAt: new Date().toISOString()
  }));
}

function isLicensed() {
  var saved = getSavedLicense();
  return !!(saved && validateLicense(saved.email, saved.code));
}

function setLockedState(locked) {
  var ids = [
    'btn-organicize', 'btn-warp-blob', 'btn-warp-explode', 'btn-warp-clear',
    'btn-preset-left', 'btn-preset-right', 'btn-preset-pinch', 'btn-preset-explode'
  ];
  for (var i = 0; i < ids.length; i++) {
    var node = el(ids[i]);
    if (node) node.disabled = locked;
  }
}

function updateLicenseUI() {
  var licensed = isLicensed();
  var section = el('license-section');
  var hint = el('license-hint');
  if (section) section.className = section.className.replace(/\s*licensed/g, '') + (licensed ? ' licensed' : '');
  if (hint) {
    var saved = getSavedLicense();
    hint.textContent = licensed
      ? 'Activated for ' + saved.email + '.'
      : 'Enter the email and license code used for purchase.';
  }
  setLockedState(!licensed);
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
  if (!isLicensed()) {
    setStatus('License required. Please activate Blob It first.');
    return;
  }
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
  initLicense();
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

  setStatus('Ready');
  updateLicenseUI();
}

function initLicense() {
  var saved = getSavedLicense();
  if (saved) {
    if (el('license-email')) el('license-email').value = saved.email || '';
    if (el('license-code')) el('license-code').value = saved.code || '';
  }
  el('btn-license-activate').addEventListener('click', function () {
    var email = el('license-email').value;
    var code = el('license-code').value;
    if (validateLicense(email, code)) {
      saveLicense(email, code);
      updateLicenseUI();
      setStatus('License activated.');
    } else {
      setStatus('Invalid license code.');
    }
  });
  el('btn-license-clear').addEventListener('click', function () {
    localStorage.removeItem(LICENSE_KEY);
    updateLicenseUI();
    setStatus('License cleared.');
  });
}

window.BlobItLicense = {
  generate: makeLicenseCode,
  validate: validateLicense,
  clear: function () {
    localStorage.removeItem(LICENSE_KEY);
    updateLicenseUI();
  }
};

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
