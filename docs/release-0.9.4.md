# Unified map search control — 0.9.4

Prepared Nov. 25, 2026, on `release/0.9.4`.

The general field-background rule was painting the inner map-search input, producing a second rounded surface inside its bordered wrapper. The map search now gives its wrapper the native input surface, readable foreground, border, and focus-within outline. The inner search input is transparent, square, borderless, and shadowless. Keyboard focus remains visible around the composite control.

## Validation

- Installed the exact ZIP on localhost:8889.
- WP administration: computed inner background transparent, border 0, radius 0, outline none, shadow none; wrapper native input background RGB(17,17,19), 2px theme-accent focus outline.
- Bricks: transparent inner input and native wrapper background RGB(35,41,47). Screenshot confirms one unified control.
- Typed “Sample” and cleared it successfully in the Bricks site map.
- One administration map-browser inspection timed out after typing; a fresh builder test completed successfully. No JavaScript or backend behavior was changed.
- PHP/application JavaScript syntax, color regressions, REST permission integration, and full production-package Plugin Check results are recorded in the validation log.
- Live light/custom and forced-colors checks were not repeated in this focused correction; theme tokens and forced-colors focus fallback remain.

ZIP: `content-explorer-for-bricks-0.9.4.zip`.
SHA-256: `a73e7b87f0a63302cbb7a5052270909618f4516aa35ea3025ab444e7d288dcfb`.
WordPress.org remains on the original 0.9.0 submission awaiting review.
