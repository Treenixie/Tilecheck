# TILECHECK user guide

[Launch app](https://tilecheck.pages.dev/) · [Help & FAQ](https://tilecheck.pages.dev/help.html) · [Report an issue](https://github.com/Treenixie/Tilecheck/issues)

## Import
Drop an image into the inspector or use Choose Image. PNG, JPEG, WebP and AVIF are supported where the browser can decode them. Maximum file size: 25 MB; maximum dimensions: 24 megapixels. Reset restores the generated example.

## Modes

- **Tile:** Display a 2×2 to 6×6 repeat; adjust zoom and boundary guides.
- **Offset:** Shift opposite image edges into view using horizontal and vertical wrapping.
- **Mirror:** Compare alternately flipped tiles with normal repeating.
- **Seam Map:** Highlight strong RGB differences between opposite border pixels.
- **Original:** Show the unchanged source.

## Understanding the seam score

The Left ↔ Right and Top ↔ Bottom values are mean absolute per-channel RGB differences on a 0–255 scale. Alpha is composited on a fixed dark background before comparison.

A low value is not a guarantee of seamlessness. Filtering, repeated motifs, normal maps and UVs can affect the result. Always inspect visually.

## Export

- **Export Preview:** PNG of the current preview.
- **Export Offset:** wrapped PNG at original source resolution. It does not repair seams.

All inspection and PNG export happen in your browser without uploading images.

## Running locally

Download the repository and open index.html, or run python -m http.server 8080 in the repository root and open http://localhost:8080.

## Reporting a bug

Use [GitHub Issues](https://github.com/Treenixie/Tilecheck/issues) and include browser details, texture type/dimensions, mode and steps to reproduce. Do not attach confidential textures.
