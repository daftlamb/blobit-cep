# Blob It for Adobe Illustrator

Blob It is an Adobe Illustrator CEP extension for turning ordinary Illustrator paths into organic, blobby vector strokes. Draw with Illustrator's Pencil, Brush, or Pen tool, select the path, and use the panel to generate editable organic shapes.

This CEP version follows the interaction model of the original Blob It web app, adapted for Illustrator's extension environment.

## Features

- Organicize selected Illustrator paths into filled vector shapes
- Works with open and closed paths
- Keeps closed-path holes as compound/even-odd shapes when possible
- Radius, Loose, Noise, Smooth, and Detail controls
- Fill color, stroke color, and stroke width controls
- Optional source-path preservation
- Auto update for the currently selected source path
- Symmetry modes: None, X, Y, and XY
- Warp presets: Bulge Left, Bulge Right, Pinch, and Explode
- Manual warp control circles that can be moved or scaled on the artboard

## Installation

1. Download or clone this repository.
2. Copy the whole extension folder to your user CEP extensions directory:

   ```text
   Windows: %APPDATA%\Adobe\CEP\extensions\com.daftlamb.blobit
   macOS: ~/Library/Application Support/Adobe/CEP/extensions/com.daftlamb.blobit
   ```

3. Enable unsigned CEP extensions for your Illustrator/CEP version.

   On Windows, add `PlayerDebugMode=1` under the matching `HKCU\Software\Adobe\CSXS.*` registry key.

4. Restart Illustrator.
5. Open the panel from `Window > Extensions > Blob It`.

## Basic Use

1. Draw a path in Illustrator with Pencil, Brush, or Pen.
2. Select the path.
3. Adjust the Organic Brush controls.
4. Click `Organicize Selected`.

If `Keep original paths` is enabled, Blob It keeps the source path selected after generation. This makes `Auto update current result` work on the current source path instead of affecting every generated shape in the document.

## Warp

Blob It has two warp workflows.

### Presets

Select a source path, adjust `Strength`, then click one of:

- `Bulge Left`
- `Bulge Right`
- `Pinch`
- `Explode`

Preset warp is the most stable workflow inside CEP because it does not rely on Illustrator artboard drag events.

### Manual Control Circles

1. Select a source path.
2. Click `Add Blob Point` or `Add Explode Point`.
3. Move or scale the dashed control circle on the artboard.
4. Re-select the source path.
5. Click `Organicize Selected` or adjust a parameter with auto update enabled.

The control circle is an Illustrator helper object, not a native Illustrator overlay. CEP cannot reliably listen to every drag or transform event on the artboard, so manual warp updates happen when the panel triggers generation.

## Development Notes

Important files:

- `CSXS/manifest.xml` registers the CEP panel.
- `index.html` defines the panel UI.
- `css/style.css` styles the panel.
- `js/csinterface.js` provides the CEP bridge.
- `js/panel.js` handles UI events and calls ExtendScript.
- `jsx/host.jsx` runs inside Illustrator and creates the vector geometry.

The host script avoids `JSON.parse` because some Illustrator ExtendScript environments do not provide native JSON. Panel parameters are serialized as key-value pairs and decoded by `parseParams()` in `host.jsx`.

## Limitations

- CEP panels cannot draw true native temporary overlays on the Illustrator canvas.
- Moving a manual warp control circle does not automatically fire a reliable CEP callback.
- Very high Detail values on complex paths can still be slower because the organic shape is generated from a marching-squares field.

For the smoothest experience, use preset warp for quick shaping and manual warp circles only when you need more positional control.
