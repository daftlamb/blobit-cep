# Blob It for Adobe Illustrator

Blob It is an Adobe Illustrator CEP extension for turning ordinary Illustrator paths into organic, blobby vector strokes. Draw with Illustrator's Pencil, Brush, or Pen tool, select the path, and use the panel to generate editable organic shapes.

Blob It 是一个 Adobe Illustrator CEP 扩展，可以把普通的 Illustrator 路径转换成有机、柔软、blob 风格的矢量笔触。你可以用 Illustrator 自带的 Pencil、Brush 或 Pen 工具先画线，再选中路径并通过面板生成可编辑的 organic shape。

This CEP version follows the interaction model of the original Blob It web app, adapted for Illustrator's extension environment.

这个 CEP 版本参考了原始 Blob It 网页版的交互逻辑，但针对 Illustrator 的扩展环境做了调整。

## Features / 功能

- Organicize selected Illustrator paths into filled vector shapes
  将选中的 Illustrator 路径转换成填充的有机矢量形状
- Works with open and closed paths
  支持开放路径和闭合路径
- Keeps closed-path holes as compound/even-odd shapes when possible
  尽可能保留闭合路径中间的洞，使用 compound / even-odd 方式处理
- Radius, Loose, Noise, Smooth, and Detail controls
  支持 Radius、Loose、Noise、Smooth、Detail 参数调节
- Fill color, stroke color, and stroke width controls
  支持填充色、描边色和描边宽度
- Optional source-path preservation
  可以选择保留原始路径
- Auto update for the currently selected source path
  Auto update 只更新当前选中的源路径对应的生成结果
- Symmetry modes: None, X, Y, and XY
  支持 None、X、Y、XY 对称模式
- Warp presets: Bulge Left, Bulge Right, Pinch, and Explode
  支持 Bulge Left、Bulge Right、Pinch、Explode 预设变形
- Manual warp control circles that can be moved or scaled on the artboard
  支持可移动、可缩放的手动 warp 控制圆

## Installation / 安装

1. Download or clone this repository.
   下载或克隆这个仓库。

2. Copy the whole extension folder to your user CEP extensions directory.
   将整个扩展文件夹复制到用户级 CEP 扩展目录。

   ```text
   Windows: %APPDATA%\Adobe\CEP\extensions\com.daftlamb.blobit
   macOS: ~/Library/Application Support/Adobe/CEP/extensions/com.daftlamb.blobit
   ```

3. Enable unsigned CEP extensions for your Illustrator/CEP version.
   为当前 Illustrator / CEP 版本开启未签名扩展支持。

   On Windows, add `PlayerDebugMode=1` under the matching `HKCU\Software\Adobe\CSXS.*` registry key.
   在 Windows 上，需要在对应的 `HKCU\Software\Adobe\CSXS.*` 注册表项下添加 `PlayerDebugMode=1`。

4. Restart Illustrator.
   重启 Illustrator。

5. Open the panel from `Window > Extensions > Blob It`.
   在 `Window > Extensions > Blob It` 中打开面板。

## Basic Use / 基本使用

1. Draw a path in Illustrator with Pencil, Brush, or Pen.
   用 Illustrator 自带的 Pencil、Brush 或 Pen 工具画一条路径。

2. Select the path.
   选中这条路径。

3. Adjust the Organic Brush controls.
   调整 Organic Brush 区域的参数。

4. Click `Organicize Selected`.
   点击 `Organicize Selected`。

If `Keep original paths` is enabled, Blob It keeps the source path selected after generation. This makes `Auto update current result` work on the current source path instead of affecting every generated shape in the document.

如果开启了 `Keep original paths`，生成后 Blob It 会继续保持源路径被选中。这样 `Auto update current result` 只会更新当前选中的这条源路径，不会影响文档里之前已经生成的其他结果。

Recommended workflow: draw one path, select it, generate it, then draw the next path. When you want to adjust an older result, select that result's original source path and change the parameters.

推荐工作流：画一条路径，选中它，生成效果，然后再画下一条。如果想回头调整某个旧结果，选中它对应的原始路径，再修改参数。

## Organic Brush Controls / 笔触参数

- `Radius`: controls the thickness or body size of the organic stroke.
  控制 organic 笔触的整体粗细和体量。
- `Loose`: controls how loosely nearby stroke samples merge together.
  控制相邻采样点之间融合的松散程度。
- `Noise`: adds irregular organic variation.
  增加自然、不规则的边缘变化。
- `Smooth`: smooths the generated outline.
  平滑生成后的轮廓。
- `Detail`: controls field resolution. Higher values can produce more detail but may be slower on complex paths.
  控制计算细节。数值越高细节越多，但复杂路径上可能更慢。

## Symmetry / 对称

Use the Symmetry section to mirror the selected source path before generating the organic shape.

可以在 Symmetry 区域选择对称模式，插件会在生成 organic shape 前对源路径做镜像。

- `None`: no symmetry
  不使用对称
- `X`: mirror horizontally around the selected path bounds
  基于选区范围做横向镜像
- `Y`: mirror vertically around the selected path bounds
  基于选区范围做纵向镜像
- `XY`: mirror both horizontally and vertically
  同时做横向和纵向镜像

## Warp / 变形

Blob It has two warp workflows.

Blob It 提供两种 warp 使用方式。

### Presets / 预设变形

Select a source path, adjust `Strength`, then click one of:

选中源路径，调整 `Strength`，然后点击：

- `Bulge Left`
- `Bulge Right`
- `Pinch`
- `Explode`

Preset warp is the most stable workflow inside CEP because it does not rely on Illustrator artboard drag events.

预设变形是 CEP 里最稳定的方式，因为它不依赖 Illustrator 画板对象的拖拽事件监听。

### Manual Control Circles / 手动控制圆

1. Select a source path.
   选中源路径。

2. Click `Add Blob Point` or `Add Explode Point`.
   点击 `Add Blob Point` 或 `Add Explode Point`。

3. Move or scale the dashed control circle on the artboard.
   在画板上移动或缩放虚线控制圆。

4. Re-select the source path.
   重新选中源路径。

5. Click `Organicize Selected` or adjust a parameter with auto update enabled.
   点击 `Organicize Selected`，或者在开启 auto update 的情况下调整参数。

The control circle is an Illustrator helper object, not a native Illustrator overlay. CEP cannot reliably listen to every drag or transform event on the artboard, so manual warp updates happen when the panel triggers generation.

控制圆是一个 Illustrator 辅助对象，不是 Illustrator 原生工具那种临时 overlay。CEP 无法可靠监听画板上每一次拖动或变换，所以手动 warp 需要在面板触发生成时才会更新。

For the smoothest experience, use preset warp for quick shaping and manual warp circles only when you need more positional control.

如果想要更流畅的使用体验，建议优先使用 preset warp；只有在需要更精确控制变形位置时，再使用手动控制圆。

## Development Notes / 开发说明

Important files:

主要文件：

- `CSXS/manifest.xml` registers the CEP panel.
  注册 CEP 面板
- `index.html` defines the panel UI.
  定义面板 UI
- `css/style.css` styles the panel.
  面板样式
- `js/csinterface.js` provides the CEP bridge.
  CEP 通信桥接
- `js/panel.js` handles UI events and calls ExtendScript.
  处理面板交互，并调用 ExtendScript
- `jsx/host.jsx` runs inside Illustrator and creates the vector geometry.
  在 Illustrator 内部运行，负责生成矢量几何

The host script avoids `JSON.parse` because some Illustrator ExtendScript environments do not provide native JSON. Panel parameters are serialized as key-value pairs and decoded by `parseParams()` in `host.jsx`.

host 脚本没有使用 `JSON.parse`，因为部分 Illustrator ExtendScript 环境没有原生 JSON。面板参数会被序列化成 key-value 字符串，再由 `host.jsx` 里的 `parseParams()` 解析。

## Limitations / 限制

- CEP panels cannot draw true native temporary overlays on the Illustrator canvas.
  CEP 面板无法在 Illustrator 画板上绘制真正的原生临时 overlay。
- Moving a manual warp control circle does not automatically fire a reliable CEP callback.
  移动手动 warp 控制圆时，CEP 不能稳定收到实时回调。
- Very high Detail values on complex paths can still be slower because the organic shape is generated from a marching-squares field.
  复杂路径上如果 Detail 很高，仍然可能较慢，因为 organic shape 是通过 marching-squares 场计算生成的。

## Related / 相关项目

The original web app version lives here:

原始网页版项目在这里：

[daftlamb/blobit](https://github.com/daftlamb/blobit)

## License Prototype

This version includes a first-pass offline license gate for testing paid-plugin workflows.

- Users enter an email address and a license code in the panel.
- The panel stores the activated license in local CEP `localStorage`.
- Core action buttons stay disabled until activation succeeds.
- This is useful for testing the purchase / activation flow, but it is not a strong anti-crack system because CEP front-end code is visible on the user's machine.

To generate a test code in the panel console:

```js
BlobItLicense.generate('buyer@example.com')
```

Then enter the same email and generated code in the License section.

For a production paid version, move validation to an online license server and keep the secret off the client.
