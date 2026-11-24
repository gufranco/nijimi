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

const confirmSelect = (name: string, label: string): string => `
  <label class="field" for="confirm-${name}">
    <span class="field-label" data-i18n="${label}"></span>
    <select id="confirm-${name}" name="${name}"></select>
  </label>`;

const CONFIRM_DIALOG = `
<dialog class="confirm" id="confirm-dialog" aria-labelledby="confirm-title">
  <form class="confirm-form" id="confirm-form" method="dialog">
    <h2 class="confirm-title" id="confirm-title" data-i18n="confirmTitle"></h2>
    <p class="hint" data-i18n="confirmHint"></p>
    <div class="confirm-body">
      <canvas class="confirm-canvas" id="confirm-canvas" role="img" data-i18n-label="confirmPreview"></canvas>
      <div class="confirm-fields">
        <p class="source-info" id="confirm-info"></p>
        ${confirmSelect('p', 'console')}
        ${confirmSelect('s', 'standard')}
        ${confirmSelect('c', 'connection')}
        ${confirmSelect('x', 'scale')}
      </div>
    </div>
    <ul class="console-check-list" id="confirm-check"></ul>
    <div class="confirm-actions">
      <button type="button" class="button" id="confirm-cancel" data-i18n="confirmCancel"></button>
      <button type="submit" class="button button-primary" id="confirm-render" value="render" data-i18n="confirmRender"></button>
    </div>
  </form>
</dialog>`;

const deckButton = (id: string, icon: string, label: string): string => `
      <button type="button" class="vcr-button" id="vcr-${id}" data-icon="${icon}" data-i18n-label="${label}" disabled></button>`;

const VCR_DECK = `
        <div class="vcr-deck" id="vcr-deck" role="group" data-i18n-label="deckLabel">
          <div class="vcr-slot" aria-hidden="true"><span class="vcr-flap"></span></div>
          <output class="vcr-counter" id="vcr-counter">-:--:--</output>
          <label class="visually-hidden" for="vcr-seek" data-i18n="deckSeek"></label>
          <input type="range" class="vcr-seek" id="vcr-seek" min="0" max="0" step="1" value="0" aria-valuetext="-:--:--" disabled>
          <div class="vcr-buttons">${deckButton('stop', 'stop', 'deckStop')}${deckButton('rewind', 'rewind', 'deckRewind')}${deckButton('back', 'back', 'deckBack')}${deckButton('play', 'play', 'deckPlay')}${deckButton('forward', 'forward', 'deckForward')}${deckButton('fast-forward', 'fast-forward', 'deckFastForward')}
          </div>
        </div>`;

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
      <option value="ja" lang="ja">日本語</option>
    </select>
  </form>
</header>
<main class="layout">
  <section class="stage" aria-labelledby="screen-heading">
    <h2 id="screen-heading" class="visually-hidden" data-i18n="crtScreenLabel"></h2>
    <div class="tv" id="tv">
      <div class="tv-body">
        <div class="tv-bezel">
          <div class="tv-screen" id="screen" tabindex="0" role="region" data-i18n-label="sectionScreen">
            <div class="canvas-wrap" id="canvas-wrap">
              <canvas id="crt-canvas" class="crt-canvas"></canvas>
              <canvas id="source-canvas" class="source-canvas" hidden></canvas>
            </div>
            <div class="empty-state" id="empty-state">
              <p class="empty-title" data-i18n="dropHint"></p>
              <div class="empty-actions">
                <button type="button" class="button button-primary" id="choose-button" data-i18n="choosePng"></button>
                <button type="button" class="button" id="clip-button" data-i18n="chooseClip"></button>
              </div>
              <p class="hint" data-i18n="pasteHint"></p>
            </div>
          </div>
        </div>
        <div class="tv-panel" aria-hidden="true">
          <span class="knob"></span>
          <span class="knob knob-small"></span>
          <span class="grille"></span>
        </div>${VCR_DECK}
      </div>
      <div class="tv-feet" aria-hidden="true"><span></span><span></span></div>
    </div>
    <div class="toolbar">
      <p class="busy" id="busy" hidden><span class="busy-dot" aria-hidden="true"></span><span data-i18n="rendering"></span> <span id="busy-progress"></span></p>
      <label class="toggle" for="compare-toggle">
        <input type="checkbox" id="compare-toggle">
        <span data-i18n="compare"></span>
      </label>
      <label class="field field-inline" for="compare-split" id="split-field" hidden>
        <span class="field-label" data-i18n="compareSplit"></span>
        <input type="range" id="compare-split" min="0" max="100" step="1" value="50">
      </label>
      <div class="zoom-controls" role="group" data-i18n-label="zoom">
        <button type="button" class="button button-icon" id="zoom-out-button" data-i18n-label="zoomOut">-</button>
        <output class="zoom-readout" id="zoom-readout" aria-live="polite">1.0x</output>
        <button type="button" class="button button-icon" id="zoom-in-button" data-i18n-label="zoomIn">+</button>
        <button type="button" class="button" id="reset-view-button" data-i18n="resetView"></button>
      </div>
      <button type="button" class="button" id="fullscreen-button" data-i18n="fullscreen"></button>
      <button type="button" class="button" id="export-button" data-i18n="exportPng" hidden></button>
      <button type="button" class="button" id="export-video-button" data-i18n="exportVideo" hidden></button>
      <button type="button" class="button" id="copy-link-button" data-i18n="copyLink"></button>
    </div>
    <p class="view-hint" data-i18n="viewHint"></p>
    <p class="notice" id="notice" role="status" aria-live="polite"></p>
    <p class="source-info" id="source-info"></p>
    <section class="console-check" id="console-check" aria-labelledby="console-check-heading" hidden>
      <h3 id="console-check-heading" class="console-check-title" data-i18n="consoleCheck"></h3>
      <ul class="console-check-list" id="console-check-list"></ul>
    </section>
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
      ${select('t', 'crtModel')}
      ${range('sl', 'scanlines', 0, 1, 0.05)}
      ${select('m', 'mask')}
      ${range('ms', 'maskStrength', 0, 1, 0.05)}
      ${range('mp', 'maskPitch', 1, 4, 1)}
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
${CONFIRM_DIALOG}
<input type="file" id="file-input" accept="image/png" hidden>
<input type="file" id="flicker-input" accept="image/png" hidden>
<input type="file" id="clip-input" accept="video/webm,video/mp4,image/gif,image/apng,.apng,.png" hidden>
`;
