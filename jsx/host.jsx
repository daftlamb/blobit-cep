// Blob It host functions. Runs inside Illustrator via CSInterface.evalScript().

function blobitPing(paramsJSON) {
  return 'ok:Host script ready.';
}

function addWarpControl(paramsJSON) {
  try {
    if (app.documents.length === 0) return 'Open a document first.';
    var params = parseParams(paramsJSON);
    var doc = app.activeDocument;
    var layer = doc.activeLayer;
    var selectedSources = [];
    collectPathItems(doc.selection, selectedSources);
    var center = getSelectionOrArtboardCenter(doc);
    var radius = controlRadiusForSelection(selectedSources);
    var circle = layer.pathItems.ellipse(center.y + radius, center.x - radius, radius * 2, radius * 2);
    circle.filled = false;
    circle.stroked = true;
    circle.strokeWidth = 1;
    circle.strokeColor = rgbColor(params.type === 'explode' ? '#ff6b3a' : '#4f7cff');
    try { circle.strokeDashes = [7, 5]; } catch (e1) {}
    try { circle.opacity = 45; } catch (e2) {}
    circle.name = params.type === 'explode' ? 'Blob It Explode Point' : 'Blob It Warp Point';
    circle.note = 'blobit-warp;type=' + (params.type || 'blob') + ';strength=' + ((Number(params.strength) || 60) / 100);
    try { circle.hidden = false; circle.locked = false; } catch (e) {}
    if (selectedSources.length) restoreSelection(selectedSources);
    else {
      doc.selection = null;
      circle.selected = true;
    }
    return 'ok:Added ' + (params.type === 'explode' ? 'explode' : 'blob') + ' control.';
  } catch (err) {
    return describeError(err);
  }
}

function clearWarpControls(paramsJSON) {
  try {
    if (app.documents.length === 0) return 'Open a document first.';
    var count = removeWarpControls(app.activeDocument);
    return 'ok:Removed ' + count + ' warp control' + (count === 1 ? '' : 's') + '.';
  } catch (err) {
    return describeError(err);
  }
}

function organicizeSelection(paramsJSON) {
  try {
    if (app.documents.length === 0) return 'Open a document first.';
    var params = parseParams(paramsJSON);
    return organicizeWithParams(params);
  } catch (err) {
    return describeError(err);
  }
}

function applyWarpPreset(paramsJSON) {
  try {
    if (app.documents.length === 0) return 'Open a document first.';
    var params = parseParams(paramsJSON);
    params.update = true;
    params.keep = true;
    return organicizeWithParams(params);
  } catch (err) {
    return describeError(err);
  }
}

function organicizeWithParams(params) {
    var doc = app.activeDocument;
    var paths = [];
    collectPathItems(doc.selection, paths);
    if (!paths.length) return 'Select one or more Illustrator paths first.';

    var strokes = [];
    var originals = [];
    for (var i = 0; i < paths.length; i++) {
      var stroke = pathItemToStroke(paths[i]);
      if (stroke.pts.length > 1) {
        strokes.push(stroke);
        originals.push(paths[i]);
      }
    }
    if (!strokes.length) return 'Selected paths do not contain enough points.';

    applySymmetry(strokes, params.symmetry || 'none');
    var sourceId = markSources(originals);
    params._sourceId = sourceId;
    if (params.update) removeGeneratedForSource(doc.activeLayer, sourceId);
    var made = createOrganicFromStrokes(strokes, params, doc.activeLayer);
    if (!params.keep) {
      for (var r = 0; r < originals.length; r++) {
        try { originals[r].remove(); } catch (e) {}
      }
    } else {
      restoreSelection(originals);
    }
    if (made < 1) return 'No organic shape created. Try a larger Radius or Loose value.';
    return 'ok:Created ' + made + ' organic shape' + (made === 1 ? '' : 's') + '.';
}

function createOrganicTestStroke(paramsJSON) {
  try {
    if (app.documents.length === 0) return 'Open a document first.';
    var params = parseParams(paramsJSON);
    var doc = app.activeDocument;
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var left = ab[0], top = ab[1], right = ab[2], bottom = ab[3];
    var cx = (left + right) / 2;
    var cy = (top + bottom) / 2;
    var width = Math.abs(right - left) * 0.42;
    var pts = [];
    for (var i = 0; i < 42; i++) {
      var t = i / 41;
      var x = cx - width / 2 + width * t;
      var y = cy + Math.sin(t * Math.PI * 2.4) * 45 + Math.sin(t * Math.PI * 8) * 12;
      pts.push({ x: x, y: y });
    }
    var made = createOrganicFromStrokes([{ pts: pts, closed: false }], params, doc.activeLayer);
    if (made < 1) return 'No test shape created. Try a larger Radius or Loose value.';
    return 'ok:Created test organic shape.';
  } catch (err) {
    return describeError(err);
  }
}

function parseParams(encoded) {
  var raw = decodeURIComponent(encoded || '');
  var obj = {};
  if (!raw) return obj;
  var parts = raw.split(';');
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i].split('=');
    if (pair.length < 2) continue;
    var key = pair[0];
    var value = pair.slice(1).join('=');
    if (value === 'true') obj[key] = true;
    else if (value === 'false') obj[key] = false;
    else if (/^#/.test(value)) obj[key] = value;
    else {
      var n = Number(value);
      obj[key] = isNaN(n) ? value : n;
    }
  }
  return obj;
}

function describeError(err) {
  var msg = 'Error: ' + err;
  try {
    if (err && err.line) msg += ' line ' + err.line;
  } catch (e) {}
  return msg;
}

function collectPathItems(selection, out) {
  if (!selection) return;
  for (var i = 0; i < selection.length; i++) {
    collectOne(selection[i], out);
  }
}

function collectOne(item, out) {
  if (!item) return;
  if (item.typename === 'PathItem') {
    if (!item.guides && !item.clipping && !isGenerated(item) && !isWarpControl(item)) out.push(item);
    return;
  }
  if (item.typename === 'GroupItem') {
    for (var i = 0; i < item.pageItems.length; i++) collectOne(item.pageItems[i], out);
    return;
  }
  if (item.typename === 'CompoundPathItem') {
    for (var j = 0; j < item.pathItems.length; j++) collectOne(item.pathItems[j], out);
  }
}

function isGenerated(item) {
  try {
    return item.name === 'Blob It Organic Stroke' || String(item.note || '').indexOf('blobit-generated') === 0;
  } catch (e) {
    return false;
  }
}

function isWarpControl(item) {
  try {
    return String(item.note || '').indexOf('blobit-warp') === 0;
  } catch (e) {
    return false;
  }
}

function isSource(item) {
  try {
    return String(item.note || '').indexOf('blobit-source') === 0;
  } catch (e) {
    return false;
  }
}

function markSources(items) {
  var id = '';
  for (var i = 0; i < items.length; i++) {
    if (!id) id = getMetaValue(items[i].note, 'id');
  }
  if (!id) id = makeSourceId();
  for (var j = 0; j < items.length; j++) {
    try { items[j].note = 'blobit-source;id=' + id; } catch (e) {}
  }
  return id;
}

function collectSourceItems(container, out) {
  if (!container || !container.pageItems) return;
  for (var i = 0; i < container.pageItems.length; i++) {
    var item = container.pageItems[i];
    try {
      if (item.typename === 'PathItem' && isSource(item) && !isGenerated(item)) out.push(item);
      else if (item.typename === 'GroupItem') collectSourceItems(item, out);
      else if (item.typename === 'CompoundPathItem') {
        for (var j = 0; j < item.pathItems.length; j++) {
          if (isSource(item.pathItems[j])) out.push(item.pathItems[j]);
        }
      }
    } catch (e) {}
  }
}

function restoreSelection(items) {
  try {
    app.activeDocument.selection = null;
    for (var i = 0; i < items.length; i++) {
      try { items[i].selected = true; } catch (e) {}
    }
  } catch (err) {}
}

function removeGenerated(layer) {
  for (var i = layer.pageItems.length - 1; i >= 0; i--) {
    var item = layer.pageItems[i];
    try {
      if (item.typename === 'PathItem' && isGenerated(item)) item.remove();
      else if (item.typename === 'CompoundPathItem' && isGenerated(item)) item.remove();
      else if (item.typename === 'GroupItem') removeGenerated(item);
    } catch (e) {}
  }
}

function removeGeneratedForSource(layer, sourceId) {
  if (!sourceId) return;
  for (var i = layer.pageItems.length - 1; i >= 0; i--) {
    var item = layer.pageItems[i];
    try {
      if (isGenerated(item) && getMetaValue(item.note, 'source') === sourceId) item.remove();
      else if (item.typename === 'GroupItem') removeGeneratedForSource(item, sourceId);
    } catch (e) {}
  }
}

function getMetaValue(note, key) {
  var parts = String(note || '').split(';');
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i].split('=');
    if (pair.length > 1 && pair[0] === key) return pair.slice(1).join('=');
  }
  return '';
}

function makeSourceId() {
  return 's' + (new Date().getTime()) + '-' + Math.floor(Math.random() * 100000);
}

function removeWarpControls(container) {
  var count = 0;
  if (!container || !container.pageItems) return count;
  for (var i = container.pageItems.length - 1; i >= 0; i--) {
    var item = container.pageItems[i];
    try {
      if (item.typename === 'PathItem' && isWarpControl(item)) {
        item.remove();
        count++;
      } else if (item.typename === 'GroupItem') {
        count += removeWarpControls(item);
      }
    } catch (e) {}
  }
  return count;
}

function getSelectionOrArtboardCenter(doc) {
  var b = null;
  try {
    var paths = [];
    collectPathItems(doc.selection, paths);
    if (paths.length) b = itemsBounds(paths);
  } catch (e) {}
  if (b) return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
  return { x: (ab[0] + ab[2]) / 2, y: (ab[1] + ab[3]) / 2 };
}

function controlRadiusForSelection(items) {
  if (!items || !items.length) return 100;
  var b = itemsBounds(items);
  var w = Math.abs(b.maxX - b.minX);
  var h = Math.abs(b.maxY - b.minY);
  return Math.max(55, Math.min(180, Math.max(w, h) * 0.32));
}

function itemsBounds(items) {
  var b = { minX: 999999999, minY: 999999999, maxX: -999999999, maxY: -999999999 };
  for (var i = 0; i < items.length; i++) {
    var gb = items[i].geometricBounds;
    if (gb[0] < b.minX) b.minX = gb[0];
    if (gb[2] > b.maxX) b.maxX = gb[2];
    if (gb[3] < b.minY) b.minY = gb[3];
    if (gb[1] > b.maxY) b.maxY = gb[1];
  }
  return b;
}

function pathItemToStroke(pathItem) {
  var pts = [];
  var count = pathItem.pathPoints.length;
  if (count < 2) return { pts: pts, closed: false };
  var limit = pathItem.closed ? count : count - 1;
  for (var i = 0; i < limit; i++) {
    var cur = pathItem.pathPoints[i];
    var next = pathItem.pathPoints[(i + 1) % count];
    var p0 = arrPoint(cur.anchor);
    var c1 = arrPoint(cur.rightDirection);
    var c2 = arrPoint(next.leftDirection);
    var p3 = arrPoint(next.anchor);
    var approx = Math.max(3, Math.ceil(distance(p0, p3) / 8));
    if (i === 0) pts.push(p0);
    for (var s = 1; s <= approx; s++) {
      pts.push(cubicPoint(p0, c1, c2, p3, s / approx));
    }
  }
  return { pts: resample(pts, 4), closed: pathItem.closed };
}

function arrPoint(a) {
  return { x: a[0], y: a[1] };
}

function distance(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function cubicPoint(p0, c1, c2, p3, t) {
  var mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p3.y
  };
}

function createOrganicFromStrokes(strokes, params, layer) {
  var radius = Math.max(2, Number(params.radius) || 24);
  var bounds = strokeBounds(strokes);
  var controls = getWarpControls(app.activeDocument);
  var presets = getPresetWarpControls(params.warpPreset, bounds, params);
  for (var pc = 0; pc < presets.length; pc++) controls.push(presets[pc]);
  controls = filterWarpControls(controls, bounds);
  params._warpActive = controls.length > 0;
  expandBoundsForControls(bounds, controls);
  var pad = radius * 3;
  bounds.minX -= pad; bounds.maxX += pad; bounds.minY -= pad; bounds.maxY += pad;

  var detail = Math.max(20, Math.min(86, Number(params.detail) || 60));
  var step = Math.max(3.2, radius * (0.45 - detail * 0.0026));
  if (controls.length) step = Math.max(step, radius * 0.36);
  var cols = Math.ceil((bounds.maxX - bounds.minX) / step) + 2;
  var rows = Math.ceil((bounds.maxY - bounds.minY) / step) + 2;
  if (cols * rows > 95000) return 0;

  var allPts = [];
  for (var s = 0; s < strokes.length; s++) {
    var rp = resample(getStrokePts(strokes[s]), Math.max(2, radius * 0.35));
    for (var p = 0; p < rp.length; p++) allPts.push(rp[p]);
  }
  var grid = buildField(allPts, bounds, cols, rows, step, radius, Number(params.noise) || 0);
  var maxVal = 0;
  for (var i = 0; i < grid.length; i++) if (grid[i] > maxVal) maxVal = grid[i];
  if (maxVal <= 0.0001 && controls.length) maxVal = 1;
  if (maxVal <= 0.0001) return 0;

  var loose = Math.max(0, Math.min(100, Number(params.loose) || 42)) / 100;
  var threshold = maxVal * (0.34 - loose * 0.18);
  var chains = chainSegments(march(grid, cols, rows, step, threshold, bounds));

  var made = 0;
  var created = [];
  for (var c = 0; c < chains.length; c++) {
    var chain = smoothChain(chains[c], Math.round((Number(params.smooth) || 0) / 28));
    if (controls.length) {
      chain = limitPointCount(chain, 260);
      chain = applyWarpToPoints(chain, controls);
      chain = limitPointCount(chain, 260);
    }
    if (chain.length < 6 || polygonArea(chain) < radius * radius * 0.55) continue;
    var item = createIllustratorPath(layer, chain, params);
    if (item) {
      created.push(item);
      made++;
    }
  }
  makeGeneratedCompound(created, params);
  return made;
}

function strokeBounds(strokes) {
  var b = { minX: 999999999, minY: 999999999, maxX: -999999999, maxY: -999999999 };
  for (var i = 0; i < strokes.length; i++) {
    var pts = getStrokePts(strokes[i]);
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j];
      if (p.x < b.minX) b.minX = p.x;
      if (p.x > b.maxX) b.maxX = p.x;
      if (p.y < b.minY) b.minY = p.y;
      if (p.y > b.maxY) b.maxY = p.y;
    }
  }
  return b;
}

function getStrokePts(stroke) {
  return stroke.pts ? stroke.pts : stroke;
}

function applySymmetry(strokes, mode) {
  if (!mode || mode === 'none' || !strokes.length) return;
  var b = strokeBounds(strokes);
  var cx = (b.minX + b.maxX) / 2;
  var cy = (b.minY + b.maxY) / 2;
  var originals = strokes.slice(0);
  for (var i = 0; i < originals.length; i++) {
    if (mode === 'x' || mode === 'xy') strokes.push(mirrorStroke(originals[i], cx, cy, 'x'));
    if (mode === 'y' || mode === 'xy') strokes.push(mirrorStroke(originals[i], cx, cy, 'y'));
    if (mode === 'xy') strokes.push(mirrorStroke(mirrorStroke(originals[i], cx, cy, 'x'), cx, cy, 'y'));
  }
}

function mirrorStroke(stroke, cx, cy, axis) {
  var pts = getStrokePts(stroke);
  var out = [];
  for (var i = 0; i < pts.length; i++) {
    out.push({
      x: axis === 'x' ? 2 * cx - pts[i].x : pts[i].x,
      y: axis === 'y' ? 2 * cy - pts[i].y : pts[i].y
    });
  }
  return { pts: out, closed: stroke.closed };
}

function resample(pts, spacing) {
  if (pts.length < 2) return pts.slice(0);
  var out = [{ x: pts[0].x, y: pts[0].y }];
  var carry = 0;
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i - 1], b = pts[i];
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len <= 0.001) continue;
    var dist = spacing - carry;
    while (dist <= len) {
      var t = dist / len;
      out.push({ x: a.x + dx * t, y: a.y + dy * t });
      dist += spacing;
    }
    carry = len - (dist - spacing);
  }
  var last = pts[pts.length - 1];
  out.push({ x: last.x, y: last.y });
  return out;
}

function buildField(points, bounds, cols, rows, step, radius, noise) {
  var grid = [];
  for (var i = 0; i < cols * rows; i++) grid[i] = 0;
  var sigma = radius * 0.58;
  var reach = radius * 2.25;
  var reachCells = Math.ceil(reach / step);
  for (var p = 0; p < points.length; p++) {
    var pt = points[p];
    var cx = Math.round((pt.x - bounds.minX) / step);
    var cy = Math.round((pt.y - bounds.minY) / step);
    for (var y = cy - reachCells; y <= cy + reachCells; y++) {
      if (y < 0 || y >= rows) continue;
      for (var x = cx - reachCells; x <= cx + reachCells; x++) {
        if (x < 0 || x >= cols) continue;
        var wx = bounds.minX + x * step;
        var wy = bounds.minY + y * step;
        var dx = wx - pt.x, dy = wy - pt.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > reach * reach) continue;
        var n = noise ? pseudoNoise(wx * 0.017, wy * 0.017) * (noise / 100) * 0.28 : 0;
        grid[y * cols + x] += Math.exp(-d2 / (2 * sigma * sigma)) * (1 + n);
      }
    }
  }
  return grid;
}

function pseudoNoise(x, y) {
  return Math.sin(x * 12.9898 + y * 78.233) * Math.sin(x * 37.719 + y * 11.135);
}

function getWarpControls(container) {
  var out = [];
  collectWarpControls(container, out);
  return out;
}

function collectWarpControls(container, out) {
  if (!container || !container.pageItems) return;
  for (var i = 0; i < container.pageItems.length; i++) {
    var item = container.pageItems[i];
    try {
      if (item.typename === 'PathItem' && isWarpControl(item)) {
        var data = parseWarpNote(item.note);
        var gb = item.geometricBounds;
        var left = Number(gb[0]), top = Number(gb[1]), right = Number(gb[2]), bottom = Number(gb[3]);
        var w = Math.abs(right - left), h = Math.abs(top - bottom);
        out.push({
          x: (left + right) / 2,
          y: (top + bottom) / 2,
          r: Math.max(8, (w + h) / 4),
          type: data.type || 'blob',
          strength: isFiniteNumber(data.strength) ? data.strength : 0.6
        });
      } else if (item.typename === 'GroupItem') {
        collectWarpControls(item, out);
      }
    } catch (e) {}
  }
}

function parseWarpNote(note) {
  var data = {};
  var parts = String(note || '').split(';');
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i].split('=');
    if (pair.length < 2) continue;
    var key = pair[0];
    var value = pair.slice(1).join('=');
    if (key === 'strength') {
      var n = Number(value);
      data[key] = isNaN(n) ? 0.6 : n;
    } else {
      data[key] = value;
    }
  }
  return data;
}

function expandBoundsForControls(bounds, controls) {
  for (var i = 0; i < controls.length; i++) {
    var c = controls[i];
    var r = c.r * 1.8;
    if (c.x - r < bounds.minX) bounds.minX = c.x - r;
    if (c.x + r > bounds.maxX) bounds.maxX = c.x + r;
    if (c.y - r < bounds.minY) bounds.minY = c.y - r;
    if (c.y + r > bounds.maxY) bounds.maxY = c.y + r;
  }
}

function filterWarpControls(controls, bounds) {
  var out = [];
  for (var i = 0; i < controls.length; i++) {
    var c = controls[i];
    var r = Math.max(8, c.r) * 1.2;
    if (c.x + r < bounds.minX || c.x - r > bounds.maxX || c.y + r < bounds.minY || c.y - r > bounds.maxY) continue;
    out.push(c);
  }
  return out;
}

function getPresetWarpControls(preset, bounds, params) {
  var out = [];
  preset = String(preset || '');
  if (!preset) return out;
  var w = Math.max(1, Math.abs(bounds.maxX - bounds.minX));
  var h = Math.max(1, Math.abs(bounds.maxY - bounds.minY));
  var cx = (bounds.minX + bounds.maxX) / 2;
  var cy = (bounds.minY + bounds.maxY) / 2;
  var r = Math.max(36, Math.max(w, h) * 0.62);
  var strength = Math.max(0.01, Math.min(1, (Number(params.warp) || 60) / 100));
  if (preset === 'bulge-left') {
    out.push({ x: bounds.minX + w * 0.18, y: cy, r: r, type: 'blob', strength: strength });
  } else if (preset === 'bulge-right') {
    out.push({ x: bounds.maxX - w * 0.18, y: cy, r: r, type: 'blob', strength: strength });
  } else if (preset === 'pinch') {
    out.push({ x: cx, y: cy, r: r * 0.92, type: 'pinch', strength: strength });
  } else if (preset === 'explode') {
    out.push({ x: cx, y: cy, r: r, type: 'explode', strength: strength });
  }
  return out;
}

function applyWarpToPoints(points, controls) {
  var out = [];
  for (var i = 0; i < points.length; i++) {
    var p = { x: points[i].x, y: points[i].y };
    for (var c = 0; c < controls.length; c++) {
      p = warpOnePoint(p, controls[c]);
    }
    out.push(p);
  }
  return out;
}

function limitPointCount(points, maxPoints) {
  if (!points || points.length <= maxPoints) return points;
  var out = [];
  var stride = points.length / maxPoints;
  for (var i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * stride)]);
  return out;
}

function warpOnePoint(p, wp) {
  var dx = p.x - wp.x;
  var dy = p.y - wp.y;
  var d2 = dx * dx + dy * dy;
  var r = Math.max(8, wp.r);
  if (d2 >= r * r) return p;
  var d = Math.sqrt(d2);
  var fall = 1 - d / r;
  fall = fall * fall * (3 - 2 * fall);
  var strength = Math.max(0.01, Math.min(1, wp.strength));
  if (d < 0.001) {
    dx = 1;
    dy = 0;
    d = 1;
  }
  if (wp.type === 'explode') {
    var ang = Math.atan2(dy, dx);
    var spikes = 8 + Math.round(strength * 12);
    var ripple = 0.55 + 0.45 * Math.cos(ang * spikes);
    var push = r * 0.62 * strength * fall * ripple;
    return { x: p.x + dx / d * push, y: p.y + dy / d * push };
  }
  if (wp.type === 'pinch') {
    var pull = r * 0.42 * strength * fall;
    return { x: p.x - dx / d * pull, y: p.y - dy / d * pull };
  }
  var push = r * 0.34 * strength * fall;
  return { x: p.x + dx / d * push, y: p.y + dy / d * push };
}

function applyWarpToField(grid, cols, rows, step, controls, threshold, bounds) {
  for (var i = 0; i < controls.length; i++) {
    var wp = controls[i];
    var wr = Math.max(8, wp.r);
    var s = Math.max(0.01, Math.min(1, wp.strength));
    var cutoff2 = wr * wr;
    var c0 = Math.max(0, Math.floor((wp.x - wr - bounds.minX) / step));
    var c1 = Math.min(cols - 1, Math.ceil((wp.x + wr - bounds.minX) / step));
    var r0 = Math.max(0, Math.floor((wp.y - wr - bounds.minY) / step));
    var r1 = Math.min(rows - 1, Math.ceil((wp.y + wr - bounds.minY) / step));
    if (wp.type === 'blob') {
      applyBlobWarp(grid, cols, step, bounds, wp, s, threshold, cutoff2, c0, c1, r0, r1);
    } else {
      applyExplodeWarp(grid, cols, step, bounds, wp, s, threshold, cutoff2, c0, c1, r0, r1);
    }
  }
}

function applyBlobWarp(grid, cols, step, bounds, wp, strength, threshold, cutoff2, c0, c1, r0, r1) {
  for (var row = r0; row <= r1; row++) {
    for (var col = c0; col <= c1; col++) {
      var wx = bounds.minX + col * step;
      var wy = bounds.minY + row * step;
      var dx = wx - wp.x, dy = wy - wp.y;
      var d2 = dx * dx + dy * dy;
      if (d2 >= cutoff2) continue;
      var fall = 1 - d2 / cutoff2;
      grid[row * cols + col] += fall * fall * strength * threshold * 2.5;
    }
  }
}

function applyExplodeWarp(grid, cols, step, bounds, wp, strength, threshold, cutoff2, c0, c1, r0, r1) {
  var spikes = Math.round(8 + strength * 16);
  var spikeW = 0.18;
  for (var row = r0; row <= r1; row++) {
    for (var col = c0; col <= c1; col++) {
      var wx = bounds.minX + col * step;
      var wy = bounds.minY + row * step;
      var dx = wx - wp.x, dy = wy - wp.y;
      var d2 = dx * dx + dy * dy;
      if (d2 >= cutoff2) continue;
      var d = Math.sqrt(d2);
      var ang = Math.atan2(dy, dx);
      var sector = Math.PI * 2 / spikes;
      var nearest = Math.round(ang / sector) * sector;
      var diff = Math.abs(ang - nearest);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      var radialFall = Math.max(0, 1 - d / wp.r);
      var angularFall = Math.max(0, 1 - diff / spikeW);
      var centerCut = Math.max(0, 1 - d / (wp.r * 0.45));
      grid[row * cols + col] += radialFall * angularFall * strength * threshold * 3.2;
      grid[row * cols + col] -= centerCut * strength * threshold * 1.35;
      if (grid[row * cols + col] < 0) grid[row * cols + col] = 0;
    }
  }
}

function march(grid, cols, rows, step, threshold, bounds) {
  var segs = [];
  function v(c, r) { return grid[r * cols + c]; }
  function interp(ax, ay, bx, by, va, vb) {
    var t = Math.abs(vb - va) < 0.00001 ? 0.5 : (threshold - va) / (vb - va);
    return { x: bounds.minX + (ax + (bx - ax) * t) * step, y: bounds.minY + (ay + (by - ay) * t) * step };
  }
  for (var r = 0; r < rows - 1; r++) {
    for (var c = 0; c < cols - 1; c++) {
      var v00 = v(c, r), v10 = v(c + 1, r), v11 = v(c + 1, r + 1), v01 = v(c, r + 1);
      var idx = (v00 > threshold ? 8 : 0) | (v10 > threshold ? 4 : 0) | (v11 > threshold ? 2 : 0) | (v01 > threshold ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      var top = interp(c, r, c + 1, r, v00, v10);
      var right = interp(c + 1, r, c + 1, r + 1, v10, v11);
      var bottom = interp(c, r + 1, c + 1, r + 1, v01, v11);
      var left = interp(c, r, c, r + 1, v00, v01);
      addMarchSegments(segs, idx, top, right, bottom, left, (v00 + v10 + v11 + v01) / 4 > threshold);
    }
  }
  return segs;
}

function addMarchSegments(segs, idx, t, r, b, l, centerOn) {
  if (idx === 1) segs.push([b, l]);
  else if (idx === 2) segs.push([r, b]);
  else if (idx === 3) segs.push([r, l]);
  else if (idx === 4) segs.push([t, r]);
  else if (idx === 5) { if (centerOn) { segs.push([t, r]); segs.push([b, l]); } else { segs.push([t, l]); segs.push([r, b]); } }
  else if (idx === 6) segs.push([t, b]);
  else if (idx === 7) segs.push([t, l]);
  else if (idx === 8) segs.push([l, t]);
  else if (idx === 9) segs.push([t, b]);
  else if (idx === 10) { if (centerOn) { segs.push([t, l]); segs.push([r, b]); } else { segs.push([t, r]); segs.push([b, l]); } }
  else if (idx === 11) segs.push([r, t]);
  else if (idx === 12) segs.push([r, l]);
  else if (idx === 13) segs.push([b, r]);
  else if (idx === 14) segs.push([l, b]);
}

function chainSegments(segs) {
  var chains = [], used = [];
  for (var i = 0; i < segs.length; i++) used[i] = false;
  for (var s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = true;
    var chain = [segs[s][0], segs[s][1]];
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        var a = segs[i][0], b = segs[i][1];
        if (near(chain[chain.length - 1], a)) { chain.push(b); used[i] = true; changed = true; }
        else if (near(chain[chain.length - 1], b)) { chain.push(a); used[i] = true; changed = true; }
        else if (near(chain[0], a)) { chain.unshift(b); used[i] = true; changed = true; }
        else if (near(chain[0], b)) { chain.unshift(a); used[i] = true; changed = true; }
      }
    }
    if (chain.length > 3) chains.push(chain);
  }
  return chains;
}

function near(a, b) {
  return Math.abs(a.x - b.x) < 1.6 && Math.abs(a.y - b.y) < 1.6;
}

function smoothChain(pts, passes) {
  var out = pts.slice(0);
  for (var p = 0; p < passes; p++) {
    var next = [];
    for (var i = 0; i < out.length; i++) {
      var a = out[i], b = out[(i + 1) % out.length];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out = next;
  }
  return out;
}

function polygonArea(pts) {
  var a = 0;
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

function createIllustratorPath(layer, pts, params) {
  var path = layer.pathItems.add();
  var anchors = [];
  var maxPoints = params._warpActive ? 260 : 450;
  var stride = Math.max(1, Math.ceil(pts.length / maxPoints));
  for (var i = 0; i < pts.length; i += stride) {
    var x = Number(pts[i].x);
    var y = Number(pts[i].y);
    if (isFiniteNumber(x) && isFiniteNumber(y)) anchors.push([x, y]);
  }
  if (anchors.length < 3) {
    try { path.remove(); } catch (e) {}
    return null;
  }
  path.setEntirePath(anchors);
  path.closed = true;
  try { path.evenodd = true; } catch (e) {}
  path.filled = true;
  path.fillColor = rgbColor(params.fill || '#39ff14');
  var strokeWidth = Number(params.sw);
  path.stroked = isFiniteNumber(strokeWidth) && strokeWidth > 0;
  if (path.stroked) {
    path.strokeColor = rgbColor(params.stroke || '#111111');
    path.strokeWidth = strokeWidth;
  }
  smoothPathItem(path, Math.max(0.05, Math.min(0.34, (Number(params.smooth) || 65) / 310)));
  path.name = 'Blob It Organic Stroke';
  try { path.note = 'blobit-generated;source=' + (params._sourceId || ''); } catch (e) {}
  return path;
}

function makeGeneratedCompound(items, params) {
  if (!items || items.length < 2) return;
  var doc = app.activeDocument;
  try {
    doc.selection = null;
    for (var i = 0; i < items.length; i++) {
      items[i].selected = true;
      try { items[i].evenodd = true; } catch (e) {}
    }
    app.executeMenuCommand('compoundPath');
    if (doc.selection && doc.selection.length) {
      var compound = doc.selection[0];
      try { compound.name = 'Blob It Organic Stroke'; } catch (e1) {}
      try { compound.note = 'blobit-generated;source=' + (params._sourceId || ''); } catch (e2) {}
      applyCompoundAppearance(compound, params);
    }
  } catch (err) {
    try { doc.selection = null; } catch (e3) {}
  }
}

function applyCompoundAppearance(item, params) {
  try {
    var fill = rgbColor(params.fill || '#39ff14');
    var stroke = rgbColor(params.stroke || '#111111');
    var sw = Number(params.sw);
    if (item.typename === 'CompoundPathItem') {
      for (var i = 0; i < item.pathItems.length; i++) {
        item.pathItems[i].filled = true;
        item.pathItems[i].fillColor = fill;
        item.pathItems[i].stroked = isFiniteNumber(sw) && sw > 0;
        if (item.pathItems[i].stroked) {
          item.pathItems[i].strokeColor = stroke;
          item.pathItems[i].strokeWidth = sw;
        }
        try { item.pathItems[i].evenodd = true; } catch (e) {}
      }
    }
  } catch (err) {}
}

function smoothPathItem(path, tension) {
  var n = path.pathPoints.length;
  if (n < 3) return;
  for (var i = 0; i < n; i++) {
    var prev = path.pathPoints[(i - 1 + n) % n].anchor;
    var cur = path.pathPoints[i].anchor;
    var next = path.pathPoints[(i + 1) % n].anchor;
    var lx = Number(cur[0]) - (Number(next[0]) - Number(prev[0])) * tension;
    var ly = Number(cur[1]) - (Number(next[1]) - Number(prev[1])) * tension;
    var rx = Number(cur[0]) + (Number(next[0]) - Number(prev[0])) * tension;
    var ry = Number(cur[1]) + (Number(next[1]) - Number(prev[1])) * tension;
    if (!isFiniteNumber(lx) || !isFiniteNumber(ly) || !isFiniteNumber(rx) || !isFiniteNumber(ry)) continue;
    path.pathPoints[i].leftDirection = [lx, ly];
    path.pathPoints[i].rightDirection = [rx, ry];
    path.pathPoints[i].pointType = PointType.SMOOTH;
  }
}

function rgbColor(hex) {
  var c = new RGBColor();
  var h = String(hex || '#000000').replace('#', '');
  var r = parseInt(h.substr(0, 2), 16);
  var g = parseInt(h.substr(2, 2), 16);
  var b = parseInt(h.substr(4, 2), 16);
  c.red = isFiniteNumber(r) ? r : 0;
  c.green = isFiniteNumber(g) ? g : 0;
  c.blue = isFiniteNumber(b) ? b : 0;
  return c;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}
