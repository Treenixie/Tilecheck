# Contributing to Tilecheck

Thanks for supporting this free, dependency-free texture inspector.

## Issues
Before opening an issue, check existing reports. Include the browser, OS, image format/resolution, mode, and steps to reproduce. Do not post proprietary assets in public issues.

## Development
Clone the repository and open index.html or run python -m http.server 8080 from the project root. The browser logic is in assets/main.js and styles in assets/styles.css. No build step is required.

## Pull requests
- Keep changes focused, and describe the problem addressed.
- Test image loading, all three inspection modes, the preview PNG export, and the Reset state.
- Check responsive behavior when changing UI.
- Update docs/USAGE.md when visible behavior changes.
- Discuss major features through GitHub Issues first.

Contributions are made under the project's [MIT License](LICENSE).
