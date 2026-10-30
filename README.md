# TILECHECK

A small, privacy-friendly texture inspection studio for game developers and artists. Runs entirely in your browser: no server, account, upload, cookies, tracking, or external dependencies.

## Features

- **Tile**: preview the texture as a 2×2 to 6×6 grid at adjustable zoom.
- **Offset**: move opposite edges toward the center with independently adjustable X/Y wrap offsets.
- **Mirror**: alternate horizontal and vertical flips to inspect mirrored repetition.
- **Seam map**: highlight where opposite texture borders have strong per-pixel RGB differences.
- **Original**: inspect the source without transformations.
- **Edge metrics**: mean per-channel absolute color difference across left/right and top/bottom border pixels, on a 0–255 scale.
- **Export**: download a PNG of the current preview, or an offset copy at the **original texture resolution**.
- **Local processing**: imported images never leave the browser.

Supports PNG, JPG/JPEG, WEBP, and AVIF (when the browser can decode the format). Import limit: 25 MB and 24 megapixels to limit memory use. The demo texture is generated locally.

> **Interpreting edge metrics:** low border mismatch is not proof of seamlessness and high mismatch is not a definitive defect. Repeating motifs, filtering, UVs, normal maps, and alpha can change the perceived result. The metric compares RGB after compositing alpha against a fixed dark background, rather than measuring perceptual similarity or automatically repairing textures.

## Run locally

No install or build step is needed. You can double-click `index.html` to run the app, or start a local HTTP server from the project root:

```sh
python -m http.server 8080
```

Then open http://localhost:8080. You can also use VS Code Live Server.

## Deploy on Cloudflare Pages

1. Create a public GitHub repository named `Tilecheck` under `Treenixie` and upload the project files **to the repository root**.
2. In Cloudflare: **Workers & Pages → Create application → Pages → Connect to Git** (the exact labels can change).
3. Select the `Treenixie/Tilecheck` repository, use the `dev` branch (current repository default).
4. Select **None** for framework preset, set **Build command** to `exit 0` (or leave it empty), and **Build output directory** to `.` (the repository root).
5. Deploy and confirm the assigned `*.pages.dev` URL. The proposed `tilecheck.pages.dev` name is not guaranteed available.

Cloudflare serves `index.html`, `main.js`, `styles.css`, and `favicon.svg` directly. You can change the publishing workflow later without changing the app.

## Project layout

```text
index.html      UI and accessible controls
styles.css      responsive dark visual system
main.js         local loading, tiling, edge analysis, offsets and export
favicon.svg     app icon
_headers        privacy-minded response headers for Cloudflare
README.md       project details and setup
LICENSE         MIT license
```

## Scope

Version 0.1 is a **texture inspector**, not an image repair tool or an authoritative PBR validator. Normal maps, roughness maps and 3D material previews are possible future modules.

MIT licensed. Made by Treenixie.