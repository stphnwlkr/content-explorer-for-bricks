# Dropdown caret spacing — 0.9.2

Prepared Nov. 25, 2026, on `release/0.9.2`.

Native select arrows did not move inward when right padding was increased. Single-line selects now use a bundled 12px chevron positioned 12px from the inline end, with 36px of text clearance. The native select element, options, and keyboard interaction remain intact. The rule covers the explorer and dialogs, including list, settings, Quick edit, and connection-sort controls. RTL reverses the icon position. Multiple and explicit-size selects are excluded. Forced colors restore the platform indicator.

The SVG switches between dark and light strokes according to the embedding control's color scheme. Existing Bricks theme tokens and the 0.9.1 field-contrast fix remain in place.

## Verification

- Installed the exact ZIP on localhost:8889.
- Quick edit Status: computed 12px inset, 36px text clearance, local SVG loaded; visible caret confirmed in screenshot. Changed the unsaved option and canceled without saving content.
- 24 rendered dropdown elements in both WordPress administration and Bricks: correct local image and reserved spacing.
- Connection-map sort selectors share the CSS rule; the tested Sample Page had no sort dropdown, so an on-screen connection-sort check was not performed.
- PHP and application JavaScript syntax passed.
- 128 color pairs and palette/state regression assertions passed.
- 37 REST/permission integration assertions passed on WordPress 7.2-RC3 / PHP 8.4 / SQLite.
- Full Plugin Check 2.2.0, production package, new-plugin mode: no reported findings; existing reviewed SQL annotations unchanged.
- RTL, forced-colors fallback, and light-mode SVG behavior are implemented but were not separately browser tested in this pass.

ZIP: `content-explorer-for-bricks-0.9.2.zip`.
SHA-256: `eb4850a885234159434b306d469b12b21ec5438230c40458cf69f09b019b117c`.

WordPress.org still has the original 0.9.0 submission pending review. This fix is prepared for testing; no new directory upload occurred in this pass.
