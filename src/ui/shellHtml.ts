const range = (name: string, label: string, min: number, max: number, step: number): string => `
  <label class="field field-range" for="control-${name}">
    <span class="field-label"><span data-i18n="${label}"></span><output id="output-${name}" for="control-${name}"></output></span>
    <input type="range" id="control-${name}" name="${name}" min="${String(min)}" max="${String(max)}" step="${String(step)}">
  </label>`;

const select = (name: string, label: string, extra = ''): string => `
  <label class="field" for="control-${name}" ${extra}>
    <span class="field-label" data-i18n="${label}"></span>
    <select id="control-${name}" name="${name}"></select>
  </label>`;

const CONNECTIONS = [
  ['rf', 'connectionRf'],
  ['composite', 'connectionComposite'],
  ['svideo', 'connectionSvideo'],
  ['component', 'connectionComponent'],
  ['rgb', 'connectionRgb']
] as const;

const connectionRadios = CONNECTIONS.map(
  ([value, label]) => `
      <label class="segment"><input type="radio" name="c" value="${value}"><span data-i18n="${label}"></span></label>`
).join('');

const zoomRadios = [1, 2, 4]
  .map(
    (level) =>
      `<label class="segment"><input type="radio" name="zoom" value="${String(level)}"${level === 1 ? ' checked' : ''}><span>${String(level)}x</span></label>`
  )
  .join('');

export const SHELL_HTML = `
<a class="skip-link" href="#controls" data-i18n="skipToControls"></a>
<header class="masthead">
  <h1 class="brand">nijimi</h1>
  <p class="tagline" data-i18n="tagline"></p>
  <form class="language" id="language-form">
    <label for="language" data-i18n="language"></label>
    <select id="language" name="l">
      <option value="en">English</option>
      <option value="pt-BR">Português (Brasil)</option>
    </select>
  </form>
</header>
<main class="layout">
  <section class="stage" aria-labelledby="screen-heading">
    <h2 id="screen-heading" class="visually-hidden" data-i18n="crtScreenLabel"></h2>
    <div class="tv">
      <div class="tv-body">
        <div class="tv-bezel">
          <div class="tv-screen" id="screen" tabindex="0" role="region" data-i18n-label="sectionScreen">
            <div class="canvas-wrap" id="canvas-wrap" data-zoom="1">
              <canvas id="crt-canvas" class="crt-canvas"></canvas>
              <canvas id="source-canvas" class="source-canvas" hidden></canvas>
            </div>
            <div class="empty-state" id="empty-state">
              <p class="empty-title" data-i18n="dropHint"></p>
              <button type="button" class="button button-primary" id="choose-button" data-i18n="choosePng"></button>
              <p class="hint" data-i18n="pasteHint"></p>
            </div>
            <p class="busy" id="busy" hidden data-i18n="rendering"></p>
          </div>
        </div>
        <div class="tv-panel" aria-hidden="true">
          <span class="knob"></span>
          <span class="knob knob-small"></span>
          <span class="grille"></span>
        </div>
      </div>
      <div class="tv-feet" aria-hidden="true"><span></span><span></span></div>
    </div>
    <div class="toolbar">
      <label class="toggle" for="compare-toggle">
        <input type="checkbox" id="compare-toggle">
        <span data-i18n="compare"></span>
      </label>
      <label class="field field-inline" for="compare-split" id="split-field" hidden>
        <span class="field-label" data-i18n="compareSplit"></span>
        <input type="range" id="compare-split" min="0" max="100" step="1" value="50">
      </label>
      <fieldset class="segmented">
        <legend data-i18n="zoom"></legend>
        ${zoomRadios}
      </fieldset>
      <button type="button" class="button" id="export-button" data-i18n="exportPng" disabled></button>
      <button type="button" class="button" id="copy-link-button" data-i18n="copyLink"></button>
    </div>
    <p class="notice" id="notice" role="status" aria-live="polite"></p>
    <p class="source-info" id="source-info"></p>
  </section>
  <form class="controls" id="controls" data-i18n-label="controls" novalidate>
    <fieldset class="group">
      <legend data-i18n="sectionSignal"></legend>
      <fieldset class="segmented segmented-wide">
        <legend data-i18n="connection"></legend>
        ${connectionRadios}
      </fieldset>
      ${select('s', 'standard')}
      ${select('p', 'console')}
      <div class="custom-timing" id="custom-timing">
        <label class="field" for="control-cd">
          <span class="field-label" data-i18n="customDotClock"></span>
          <input type="number" id="control-cd" name="cd" min="3000000" max="14000000" step="1">
        </label>
        <label class="field" for="control-cl">
          <span class="field-label" data-i18n="customCycles"></span>
          <input type="number" id="control-cl" name="cl" min="200" max="300" step="0.001">
        </label>
      </div>
      ${select('sep', 'separation', 'id="separation-field"')}
      ${select('pal', 'palDecoding', 'id="pal-field"')}
    </fieldset>
    <fieldset class="group">
      <legend data-i18n="sectionPicture"></legend>
      <div id="hue-field">${range('hue', 'hue', -45, 45, 1)}</div>
      <div id="saturation-field">${range('sat', 'saturation', 0, 2, 0.05)}</div>
      ${range('g', 'gamma', 2, 3, 0.05)}
    </fieldset>
    <fieldset class="group" id="rf-group">
      <legend data-i18n="sectionRf"></legend>
      ${range('rn', 'rfNoise', 0, 1, 0.05)}
      ${range('rg', 'rfGhost', 0, 1, 0.05)}
      ${range('rb', 'rfBeat', 0, 1, 0.05)}
    </fieldset>
    <fieldset class="group">
      <legend data-i18n="sectionScreen"></legend>
      ${range('sl', 'scanlines', 0, 1, 0.05)}
      ${select('m', 'mask')}
      ${range('ms', 'maskStrength', 0, 1, 0.05)}
      ${range('b', 'bloom', 0, 1, 0.05)}
      ${range('cv', 'curvature', 0, 1, 0.05)}
      <label class="toggle" for="control-os">
        <input type="checkbox" id="control-os" name="os" value="1">
        <span data-i18n="overscan"></span>
      </label>
    </fieldset>
    <fieldset class="group">
      <legend data-i18n="sectionFrames"></legend>
      ${select('view', 'frameView')}
      <div id="frame-field">${range('f', 'frameIndex', 0, 11, 1)}</div>
      ${select('scan', 'scan')}
      <div class="flicker">
        <button type="button" class="button" id="flicker-button" data-i18n="addFlickerFrame"></button>
        <button type="button" class="button" id="flicker-remove-button" data-i18n="removeFlickerFrame" hidden></button>
      </div>
    </fieldset>
    <fieldset class="group">
      <legend data-i18n="sectionSource"></legend>
      ${select('x', 'scale')}
    </fieldset>
  </form>
</main>
<footer class="footer">
  <p data-i18n="privacyNote"></p>
  <p><a href="https://github.com/gufranco/nijimi" data-i18n="sourceCode"></a></p>
</footer>
<input type="file" id="file-input" accept="image/png" hidden>
<input type="file" id="flicker-input" accept="image/png" hidden>
`;
