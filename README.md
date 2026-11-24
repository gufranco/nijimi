# nijimi

See your pixel art the way a CRT showed it: through RF, composite, S-Video, component or RGB, from the console and TV standard you pick. It runs entirely in your browser, and your image never leaves the page.

Open it at <https://gufranco.github.io/nijimi/>.

## Use it

1. Choose a PNG, drop one on the screen, or paste one. For motion, choose a clip: WebM, MP4, animated GIF or animated PNG.
2. Check the settings in the dialog that opens: the console, the video standard, the connection and the scale, with a preview of the picture or the clip's first frame and its console check. Rendering starts when you press Render, so a long clip renders once with the settings you meant.
3. Adjust the picture and the screen, then compare with the original, export the result as a PNG, or export a clip as a video.

The address bar keeps every setting, so a link reproduces the same preview for anyone who opens it with the same image.

The page follows your browser language in English, Brazilian Portuguese or Japanese, and the language menu switches it.

Art exported at an integer scale, such as 4x, is detected and processed at its native size. The native size limit is 1024 x 1024.

After loading, a console check tells you whether the art fits the console you picked: its native resolution, the number of colors on screen, and the color depth of its palette. For an MP4 or WebM clip, whose compression adds colors the art never had, the check snaps each color to the console's palette first, and finds the upscale from the sizes the console draws. When something only works in a special hardware mode, such as interlace or shadow/highlight, the check names it, and a size the console cannot draw lists the consoles that can.

A clip is read from start to end, whatever its length, and sampled at the field rate of the console and standard you picked. Each field goes through the signal once while a counter shows progress, then the clip plays in a loop. Screen changes apply while it plays; signal changes render it again, and a new standard only remaps the fields. Decoded frames and rendered fields are kept in the browser's private file storage on this device, which costs about 0.5 MB per field at 320 x 240, and are deleted when you load another clip or close the page; a browser that refuses that storage keeps them in memory, which limits the length to what memory holds. Video is decoded frame by frame with WebCodecs, so no frame is skipped, from MP4, MOV, WebM or Matroska; transparency in a WebM is ignored. A clip with sound plays it with the picture and keeps it in the exported video; such a clip waits paused until you press Play, since browsers start sound only after a click. Export video records one loop as an H.264 MP4, which macOS and most players open, with AAC sound where the browser records it, or as WebM in a browser that cannot record MP4, such as Firefox; a browser without MediaRecorder hides the button.

## What it simulates

| Connection | What you see                                                                              |
| ---------- | ----------------------------------------------------------------------------------------- |
| RGB        | Sharp pixels, the reference                                                               |
| Component  | Sharp luma, color at half the detail                                                      |
| S-Video    | Soft color edges, no rainbow artifacts                                                    |
| Composite  | Dither blended into solid color, artifact color on fine stripes, dot crawl at color edges |
| RF         | Composite plus a softer picture, optional noise, ghosting and the sound beat              |

Standards: NTSC, PAL-B/G and PAL-M. Console timing: Atari 2600, Atari 5200 and 7800 in 160 and 320 modes, Atari Jaguar at 256 and 320, NES, SNES in 256 and 512 modes, Genesis H32 and H40, Master System, SG-1000, 32X, Nintendo 64 in 320 and 640 modes, Saturn in 320, 352, 640 and 704 modes, PlayStation 256, 320, 368, 512 and 640, Game Boy, Game Boy Pocket and Light, Game Boy Color, Game Gear, or a custom dot clock. Picking a handheld switches to RGB and the handheld LCD screen, since handhelds have no TV output.

The screen adds gamma, scanlines whose width follows brightness, an aperture grille, slot mask, shadow mask or LCD grid at an adjustable pitch, bloom, curvature and overscan. A screen model sets these together to approximate a consumer TV, a professional or broadcast monitor, a PC or arcade monitor, or a handheld LCD. Without WebGL2 the page still shows the signal, without those screen effects.

How the signal is modeled, and the numbers behind it, are in [`REFERENCE.md`](REFERENCE.md).

## Run it locally

Everything runs inside Docker, so the only tools you need are Docker, git and make.

```sh
make dev
```

Then open <http://localhost:5173/nijimi/>.

To run every check the CI runs, which covers formatting, lint, types, unit and browser tests with coverage, the screen tests again in WebKit, the build and the end-to-end tests:

```sh
make ci
```

## License

MIT. See [`LICENSE`](LICENSE).
