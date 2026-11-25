# Contrast verification — 0.1.0-beta.6

Tested Nov. 25, 2026 on localhost:8889, WordPress 7.2-RC3, PHP 8.4, and Bricks 2.5-beta.

## Final appearance

The original eight distinct graph hues are retained. Color markers are adjusted only when necessary for graphical contrast against the native canvas and control backgrounds. The earlier proposal to group all content into blue and all taxonomies into amber was removed following review.

Descriptions use the same foreground strength as other text. Control backgrounds mix 4% native foreground into Bricks' secondary surface; hover/active use 12%. Primary actions have a separate darker hover background and a foreground checked against both states. Saved custom button pairs retain their colors and receive a hover background that maintains or improves contrast.

Native panel surfaces, theme radius, fonts, and native palette remain the source. A local contrast helper resolves CSS colors through the browser, composites transparency, and checks derived foregrounds against normal, raised, input, control-hover, and selected-card backgrounds. No network service or saved palette snapshot is used.

## Standards and scope

- [WCAG 2.2 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): at least 4.5:1 for normal text. The helper targets 4.6:1 to leave a rounding margin.
- [WCAG 2.2 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): at least 3:1 for meaningful graphics, controls, and state indicators. The helper targets 3.1:1.
- Disabled controls and purely decorative halos/grid patterns are exempt. A toggled-off map filter remains an enabled control, so its text stays fully opaque; strike-through and pressed state distinguish it.
- Hidden graph connections remain hidden until their normal selection/hover behavior reveals them. Revealed connections are opaque. Keyboard-focused nodes have a contrasting outline on their shape and an underlined label.
- Focus rings use contrasting inner/outer colors. Native selects retain visible platform carets. Forced-color overrides are included; an OS forced-colors session was not available for this run.

These checks cover the plugin's interface, not the rest of Bricks or arbitrary content rendered in its canvas. They are not a certification of every possible custom palette. Custom themes with opposite extreme surface colors may require separate foregrounds per surface and should be checked after applying them.

## Browser measurements

Measurements used computed colors and composited ancestor backgrounds, including CSS `color(srgb ...)` values, transparency, and element opacity. Direct text and form values were measured. Hidden and disabled items were excluded; the counts may include mounted controls outside the scrolled viewport.

| Theme / view | Text samples | Lowest measured ratio | Failures below 4.5:1 |
| --- | ---: | ---: | ---: |
| Dark list | 279 | 6.98 | 0 |
| Dark quick edit | 335 | 6.98 | 0 |
| Dark reported selected item #2894, primary hover | 38 | 6.99 | 0 |
| Dark site map | 49 | 10.54 | 0 |
| Dark toggled-off filter while hovered | 48 | 8.40 | 0 |
| Light list | 279 | 6.04 | 0 |
| Light quick edit | 335 | 5.53 | 0 |
| Light quick-edit Save hover | 335 | 6.04 | 0 |
| Light settings, all six sections | 26–95 per section | 5.42 | 0 |
| Dark settings, all six sections | 26–95 per section | 5.42 | 0 |
| Warm custom palette, list | 279 | 4.61 | 0 |
| Warm custom palette, selected card/primary hover | 38 | 7.26 | 0 |

Custom testing used cream surfaces, green text/accent, a deliberately faint description token, and a low-contrast native border. The plugin corrected its own derived colors. Original dark mode and the original empty custom CSS were restored and saved afterward.

The original reported card subtitle, initially checked with a muted foreground at 4.65:1, was subsequently changed to full-strength text along with all descriptions. The final dark selected-card check above uses that full-strength foreground.

Actual hover checks used a secondary-button click to move the pointer without triggering navigation. Primary background changed from `rgb(255, 213, 77)` to `rgb(224, 187, 68)`. Filter hover changed from approximately `rgb(43, 49, 54)` to `rgb(58, 64, 69)`. Keyboard focus and graph selection were exercised through Tab and Enter.

## Other fixes and automated checks

- Open in Builder preview renders Bricks' installed `b.svg`. The asset URI now falls back to the parent theme asset directory when the Bricks asset constant is unavailable.
- Pagination and saved-action previews have explicit representative icons instead of unmasked squares.
- Sidebar collapse caret is centered on both axes.
- Graph marker palette, normal/hover text surfaces, primary inverse labels, custom hover contrast, borders, and normalization stability are covered in `tests/colors.cjs` (128 base color pairs plus state and palette assertions).
- PHP/application JavaScript syntax checks passed. REST/permission integration: 37 assertions passed.
- Full Plugin Check, all five categories, errors and warnings enabled, no exclusions: 0 errors, 16 inherited database warnings. The broader release gates in validation.md remain open.
