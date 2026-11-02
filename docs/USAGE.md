# TILECHECK user guide

[Launch app](https://tilecheck.pages.dev/) · [Help & FAQ](https://tilecheck.pages.dev/help.html) · [Report an issue](https://github.com/Treenixie/Tilecheck/issues)

## Import
Drop an image into the inspector, click the upload icon to choose a file, or paste an image from your clipboard using Ctrl+V (Cmd+V on macOS). PNG, JPEG, WebP and AVIF are supported where the browser can decode them. Maximum file size: 25 MB; maximum resolution: 24 megapixels. Inspection controls remain disabled until an image is loaded. Reset clears the image, restores the 3 × 3 grid, 100% zoom, Tile mode and hidden boundaries, and disables the controls again.

## Modes

- **Tile:** Display a 2×2 to 6×6 repeat; adjust zoom and boundary guides.
- **Mirror:** Compare alternately flipped tiles with normal repeating.
- **Seam Map:** Highlight strong RGB differences between opposite border pixels.

## Original preview

The unchanged source texture remains visible in the sidebar, regardless of the selected inspection mode.

## Understanding the Seam Map

The Seam Map highlights average per-channel RGB differences between opposing edges. Alpha is composited on a fixed dark background before comparison. A weak highlight does not guarantee seamlessness. Filtering, repeated motifs, normal maps and UVs can affect the result. Always inspect visually.

## Export

- **Export preview:** Saves a PNG of the selected tiled or mirrored pattern. In Seam map mode, the seam highlights are included.
- **Preview-only settings:** Zoom and tile-boundary guides change the on-screen view but are not included in the PNG. The checkerboard background is also excluded.
- **Export size:** The output keeps the original tile resolution when possible, but is scaled down if it would exceed 8192 pixels on either side or 24 megapixels.

All inspection and PNG export happen locally in your browser without uploading images.

## Running locally

Download the repository and open index.html, or run python -m http.server 8080 in the repository root and open http://localhost:8080.

## Reporting a bug

Use [GitHub Issues](https://github.com/Treenixie/Tilecheck/issues) and include browser details, texture type/dimensions, mode and steps to reproduce. Do not attach confidential textures.
