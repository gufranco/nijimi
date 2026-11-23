# nijimi behavior spec (as of 2026-11-23)

The observable behavior of the page. How it is built is in the README and REFERENCE.md; this file states only what a user can see or do.

### Requirement: Image input

The page MUST accept a PNG through a file picker, drag and drop onto the CRT set, and clipboard paste, and MUST reject other formats and images above 1024 by 1024 native pixels with a message naming the reason and the limit.

#### Scenario: picker loads a PNG

- GIVEN the page is open with no image
- WHEN the user picks a 256x224 PNG
- THEN the CRT set shows that image through the default connection within 500 ms

#### Scenario: drag and drop loads a PNG

- GIVEN the page is open
- WHEN the user drops a PNG on the CRT set
- THEN the CRT set shows that image

#### Scenario: paste loads a PNG

- GIVEN the page is focused
- WHEN the user pastes a PNG from the clipboard
- THEN the CRT set shows that image

#### Scenario: a JPEG is rejected

- GIVEN the page is open
- WHEN the user drops a JPEG
- THEN the page shows "Only PNG files are supported" and the previous image stays

#### Scenario: an oversize PNG is rejected

- GIVEN the page is open
- WHEN the user drops a 2048x2048 PNG with no integer upscale
- THEN the page names the 1024 by 1024 native limit and keeps the previous image

#### Scenario: a corrupt PNG is rejected

- GIVEN the page is open
- WHEN the user drops a file with a PNG name and invalid bytes
- THEN the page says the file could not be decoded

### Requirement: Upscale recovery

The page MUST detect art exported at an integer scale of 2 to 8 and process it at native resolution, and SHOULD let the user override the detected scale.

#### Scenario: a 4x export is recovered

- GIVEN a 1024x896 PNG where every 4x4 block is one color
- WHEN it loads
- THEN processing runs at 256x224 and the UI shows "Detected 4x scale"

#### Scenario: art with no clean scale is kept

- GIVEN a PNG with one 4x4 block containing two colors
- WHEN it loads
- THEN processing runs at the file's own size

### Requirement: Connection types

The page MUST offer RF, composite, S-Video, component, and RGB, each producing the signal behavior in the Approach table.

#### Scenario: RGB keeps column dither apart

- GIVEN 1-pixel alternating columns of two colors at the Genesis H40 dot clock
- WHEN rendered through RGB
- THEN each column keeps its own color within delta E 2000 of 2 before the display stage

#### Scenario: composite blends column dither

- GIVEN the same input
- WHEN rendered through composite with a notch decoder
- THEN adjacent columns differ by less than 20 percent of their input difference

#### Scenario: S-Video shows no cross-color on gray stripes

- GIVEN 1-pixel black and white columns
- WHEN rendered through S-Video
- THEN mean chroma magnitude stays below 1 percent of full scale

#### Scenario: composite shows cross-color on gray stripes

- GIVEN the same input at a dot clock whose stripe frequency falls within 0.5 MHz of the subcarrier
- WHEN rendered through composite with a notch decoder
- THEN mean chroma magnitude exceeds 5 percent of full scale

### Requirement: Video standards

The page MUST offer NTSC, PAL-B/G and PAL-M, using each standard's subcarrier frequency and luma bandwidth from the cited specifications.

#### Scenario: PAL delay line cancels hue error

- GIVEN a flat color field and a 10 degree subcarrier phase error
- WHEN decoded with the PAL delay-line decoder
- THEN the output hue error is below 1 degree, while NTSC decoding of the same signal shows the 10 degree error

### Requirement: Console presets

The page MUST offer presets that set dot clock, pixel aspect ratio, chroma phase sequence, and line mode for NES, SNES 256 and 512, Genesis H32 and H40, Master System, PlayStation 256 and 320, and a Custom entry with editable values.

#### Scenario: Genesis H40 applies its aspect ratio

- GIVEN a 320x224 image and the Genesis H40 preset
- WHEN rendered
- THEN output width over height equals 320 times 32/35 over 224 within one output pixel

#### Scenario: NES dot crawl repeats every 3 lines

- GIVEN a flat mid-saturation field and the NES preset in single-frame view
- WHEN rendered through composite with a notch decoder
- THEN the residual chroma pattern repeats with a period of 3 lines

### Requirement: Display controls

The page MUST expose scanline strength, mask type, bloom, curvature, and gamma, with defaults per preset, and MUST update the preview within 100 ms of a control change for a 320x240 image on a desktop browser.

#### Scenario: mask change

- GIVEN an image is shown
- WHEN the user selects slot mask
- THEN the preview redraws with the slot mask

### Requirement: Compare and export

The page MUST offer a split view of the source against the CRT preview, direct zoom and pan by mouse, wheel, touch and keyboard, full screen, and a PNG export of the preview at the current output scale.

#### Scenario: zoom at the cursor

- GIVEN an image is shown
- WHEN the user right-clicks the screen
- THEN the view zooms 2x around that point, and a left drag pans it

#### Scenario: export

- GIVEN an image is shown through composite
- WHEN the user clicks Export
- THEN a PNG downloads whose pixels match the on-screen canvas

### Requirement: Shareable settings

The page MUST store every setting in the URL hash and MUST restore it on load; an invalid hash MUST fall back to defaults and say so.

#### Scenario: restore

- GIVEN a URL with `#c=svideo&s=palm&p=genesis-h40`
- WHEN the page loads and an image is added
- THEN S-Video, PAL-M and Genesis H40 are selected

#### Scenario: invalid hash

- GIVEN a URL with `#c=scart`
- WHEN the page loads
- THEN defaults apply and a notice names the invalid value

### Requirement: Privacy

The page MUST NOT send the image or any request after the initial load.

#### Scenario: no network

- GIVEN the page has loaded
- WHEN the user loads, renders and exports an image
- THEN the browser records zero network requests and the meta CSP carries `connect-src 'none'`

### Requirement: Graceful degradation

The page MUST show the signal-stage result without CRT optics when WebGL2 is unavailable, and say so.

#### Scenario: no WebGL2

- GIVEN a browser context with WebGL2 disabled
- WHEN an image loads
- THEN the signal-stage result appears scaled by nearest neighbour and a notice says CRT optics need WebGL2

### Requirement: Accessibility and layout

The page MUST meet WCAG 2.2 AA, MUST work by keyboard alone, and MUST lay out without horizontal scroll from 320 px wide.

#### Scenario: keyboard load

- GIVEN keyboard-only use
- WHEN the user tabs to "Choose PNG" and presses Enter
- THEN the file picker opens

#### Scenario: axe clean

- GIVEN each page state: empty, loaded, error
- WHEN axe runs at 320 px and 1440 px
- THEN zero violations

### Requirement: Locales

Every user-facing string MUST exist in English, Brazilian Portuguese and Japanese, chosen from the browser language with a manual switch.

#### Scenario: Brazilian browser

- GIVEN `navigator.language` is `pt-BR`
- WHEN the page loads
- THEN every visible string is the pt-BR text

#### Scenario: Japanese browser

- GIVEN `navigator.language` is `ja`
- WHEN the page loads
- THEN every visible string is the Japanese text

### Requirement: Console check

Every imported picture MUST be checked against the selected preset for native size, colors on screen and levels per channel, each passing, naming the hardware mode it needs, or failing, and a failing size MUST name the presets that draw it.

#### Scenario: size another preset draws

- GIVEN the Genesis H40 preset
- WHEN a 256x224 picture loads
- THEN the check fails the size and names the 256-wide presets

#### Scenario: preset change

- GIVEN a loaded picture
- WHEN the user picks another preset
- THEN the check reruns without reloading the file

### Requirement: Screen models

The page MUST offer screen models that set the mask, mask pitch, mask strength, scanlines, bloom and curvature together, and moving any of those controls MUST switch the model to custom.

#### Scenario: pick a model

- GIVEN the default screen
- WHEN the user picks the professional monitor model
- THEN the linked controls move to that model's values and the link carries the model

### Requirement: Handhelds

Picking a handheld preset MUST switch the connection to RGB and the screen to the handheld LCD model.

#### Scenario: Game Boy

- GIVEN the composite connection
- WHEN the user picks the Game Boy preset
- THEN RGB and the LCD grid are selected

### Requirement: Clip input

The page MUST accept a WebM, MP4, animated GIF or animated PNG clip, sample it at the field rate of the selected console and standard, render every field through the signal stage, and play the result in a loop. The whole clip MUST be processed, whatever its length. A browser that can record MUST offer one loop as a video download.

#### Scenario: a GIF plays at the field rate

- GIVEN the Genesis H40 preset on NTSC
- WHEN the user picks a 0.2 second animated GIF as a clip
- THEN the source line reads `11 fields at 59.92 Hz` and the screen plays it

#### Scenario: a long clip is kept whole

- GIVEN the Genesis H40 preset on NTSC
- WHEN the user picks an 8 second clip
- THEN all 479 fields are rendered and no notice appears

#### Scenario: an undecodable file is refused

- GIVEN any preset
- WHEN the user picks a file no decoder in the browser accepts
- THEN the notice names the supported formats and the screen stays empty

#### Scenario: video export

- GIVEN a loaded clip in a browser with MediaRecorder
- WHEN the user chooses Export video
- THEN one loop downloads as `nijimi-crt.webm`; without MediaRecorder the button is hidden

### Requirement: Deployment

Every push to `main` that passes format, lint, type check, tests, coverage and build MUST deploy to `https://gufranco.github.io/<repo>/`; a failing gate MUST NOT deploy.

#### Scenario: failing gate

- GIVEN a commit that fails a unit test
- WHEN pushed to main
- THEN the deploy job does not run

Access: the page has no accounts and no server, so every visitor can trigger every requirement; there is no caller who may not.
