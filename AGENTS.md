# AGENTS.md

Rules for anyone changing nijimi. The product is described in [`README.md`](README.md); the signal model and every constant's source are in [`REFERENCE.md`](REFERENCE.md).

## Hard rules

### Console facts

- Every console or video-standard number in code must quote its source in REFERENCE.md before code depends on it: the standard itself, the manufacturer's document, or a community hardware reference built from measurements, such as nesdev, fullsnes, plutiedev, SMS Power or psx-spx. An encyclopedia, a forum post or a summary never confirms a number. Enforced by [`consoleCapabilities.test.ts`](src/signal/consoleCapabilities.test.ts), which fails when a preset has no row in the Console check table.
- A value a source states as a tolerance or a mask is implemented and tested at every point of the mask, never rounded to one figure. Enforced by the BT.470 mask cases in [`standards.test.ts`](src/signal/standards.test.ts).
- A number no source states is labelled derived, with its derivation, or model, in the REFERENCE.md Sources table.

### Imported pictures

- Every imported picture is checked against the selected console preset: native size after integer-scale detection against the preset's display modes, colors on screen against the hardware limit, and levels per RGB channel against the palette depth. Each check passes, names the hardware mode it needs, or fails; a failing size names the presets that draw it. Enforced by [`checkImage.test.ts`](src/signal/checkImage.test.ts), [`startApp.test.ts`](src/ui/startApp.test.ts) and [`consoleCheck.spec.ts`](tests/e2e/consoleCheck.spec.ts).
- The check reruns when the preset or the standard changes, without reloading the file. Enforced by `startApp.test.ts`.
- A new preset is not done until it has an entry in [`consoleCapabilities.ts`](src/signal/consoleCapabilities.ts), a sourced row in REFERENCE.md, and passes the technique and dither matrix. The type check fails when an entry is missing.
- PNG loading and color counting run on the page, not in a Web Worker: Firefox's content process segfaulted in about half of the E2E runs whenever either ran in a worker, and never on the page. Color counting is a single pass with a presence bitmap, about 3 ms at 320x240 and 30 ms at 1024x1024; keep it that cheap.

### Every change

- Everything runs in the Docker image through the [`Makefile`](Makefile); the host needs Docker, git and make only.
- `make ci` passes before a commit: format, lint with zero warnings, type check, every unit and browser test at 100 percent per-file coverage with no exclusion, and E2E on Chromium, Firefox, WebKit, a 320 px phone and Chromium without WebGL.
- New user-facing text ships in English, Brazilian Portuguese and Japanese. Enforced by the catalog tests in [`src/i18n/`](src/i18n/).
- The page makes no network request after load. Enforced by the CSP `connect-src 'none'` and an E2E test.
- An E2E wait must wait for evidence the action landed, such as the loaded picture's native size or the expected text, never only for an idle state. An idle check passes before asynchronous work starts and turns a broken path into a passing test.
- A timing assertion never runs on a software-rendered GPU; it measures the runner. Assert the mechanism in E2E, such as a screen-only change not rerunning the signal, and measure time on real hardware.
- A clip is processed whole. Frames and fields live in the origin private file system under a per-tab folder held by a Web Lock, swept when no tab holds the lock, and in memory where that storage is refused, as in Playwright's WebKit.
- The CSP allows media only from `blob:` URLs. A clip plays from an object URL, and `default-src 'none'` alone blocks it in every engine.
- The container runs with `--ipc=host`. With Docker's default 64 MB shared memory, browsers crash under parallel E2E load and report `Page crashed`.
