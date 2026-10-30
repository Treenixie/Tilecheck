<div align="center">
<img src="assets/favicon.svg" alt="TILECHECK logo" width="72" height="72">
<h1>TILECHECK</h1>
<p><strong>Texture inspection studio for game developers and artists.</strong></p>
<p>Preview repeating patterns, expose joins, inspect mirrored tiling and export PNGs.<br>No account · No build step · No image uploads</p>
<p><a href="https://tilecheck.pages.dev/"><strong>Launch app</strong></a> · <a href="https://tilecheck.pages.dev/help.html">Help & FAQ</a> · <a href="docs/USAGE.md">User guide</a> · <a href="https://github.com/Treenixie/Tilecheck/issues">Issues</a></p>
</div>

---

## Features

| Mode | Purpose |
| --- | --- |
| **Tile** | Repeat in a configurable 2×2 to 6×6 grid. |
| **Offset** | Wrap opposite image edges into view. |
| **Mirror** | Compare normal and alternately reflected tiling. |
| **Seam Map** | Highlight pixel differences across opposing borders. |
| **Original** | Show the source without modifications. |

Additional controls include preview zoom, tile boundaries, left/right and top/bottom edge metrics, and PNG exports.

**Limitations:** The seam score is an average RGB difference indicator, not proof of seamlessness. TILECHECK does not repair textures or validate PBR maps.

## Get started

**Online:** [Open TILECHECK](https://tilecheck.pages.dev/).

**Offline:** Clone or download the repository and open index.html in your browser. No dependencies required.

For a local HTTP server:

~~~sh
python -m http.server 8080
~~~

Visit http://localhost:8080.

Supports PNG, JPEG, WebP and AVIF where the browser supports them. Import limits: 25 MB and 24 megapixels.

See the [user guide](docs/USAGE.md) for detailed explanations.

## Project structure

~~~text
Tilecheck/
├── index.html                    # Inspector
├── help.html                     # Help & FAQ
├── assets/
│   ├── favicon.svg
│   ├── main.js
│   └── styles.css
├── docs/
│   └── USAGE.md
├── .github/ISSUE_TEMPLATE/       # Issue forms
├── CONTRIBUTING.md
├── _headers                      # Cloudflare headers
├── README.md
└── LICENSE
~~~

The app is a static website served directly from the repository root using Cloudflare Pages. No separate backend or build process.

## Privacy

Imported textures are decoded, analyzed and exported locally in your browser. TILECHECK contains no analytics scripts and does not upload textures. Hosting and outgoing links to GitHub are governed by their providers' policies.

## Feedback & contributions

[Report a bug](https://github.com/Treenixie/Tilecheck/issues/new/choose), request a feature or read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) · By [Treenixie](https://github.com/Treenixie).
