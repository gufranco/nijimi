# nijimi

See your pixel art the way a CRT showed it: through RF, composite, S-Video, component or RGB, from the console and TV standard you pick. It runs entirely in your browser, and your image never leaves the page.

Open it at <https://gufranco.github.io/nijimi/>.

## Use it

1. Choose a PNG, drop one on the screen, or paste one.
2. Pick the connection, the video standard and the console whose timing you want.
3. Adjust the picture and the screen, then compare with the original or export the result as a PNG.

The address bar keeps every setting, so a link reproduces the same preview for anyone who opens it with the same image.

Art exported at an integer scale, such as 4x, is detected and processed at its native size. The native size limit is 1024 x 1024.

## What it simulates

| Connection | What you see                                                                              |
| ---------- | ----------------------------------------------------------------------------------------- |
| RGB        | Sharp pixels, the reference                                                               |
| Component  | Sharp luma, color at half the detail                                                      |
| S-Video    | Soft color edges, no rainbow artifacts                                                    |
| Composite  | Dither blended into solid color, artifact color on fine stripes, dot crawl at color edges |
| RF         | Composite plus a softer picture, optional noise, ghosting and the sound beat              |

Standards: NTSC, PAL-B/G and PAL-M. Console timing: NES, SNES in 256 and 512 modes, Genesis H32 and H40, Master System, PlayStation 256 and 320, or a custom dot clock.

The screen adds gamma, scanlines whose width follows brightness, an aperture grille, slot mask or shadow mask, bloom, curvature and overscan. Without WebGL2 the page still shows the signal, without those screen effects.

How the signal is modeled, and the numbers behind it, are in [`REFERENCE.md`](REFERENCE.md).

## Run it locally

Everything runs inside Docker, so the only tools you need are Docker, git and make.

```sh
make dev
```

Then open <http://localhost:5173/nijimi/>.

To run every check the CI runs, which covers formatting, lint, types, unit and browser tests with coverage, the build and the end-to-end tests:

```sh
make ci
```

## License

MIT. See [`LICENSE`](LICENSE).
