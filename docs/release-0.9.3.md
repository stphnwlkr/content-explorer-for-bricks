# Native button interaction states — 0.9.3

Prepared Nov. 25, 2026, on `release/0.9.3`.

## Change

Link-backed button actions were inheriting WordPress administration focus colors. Explorer control hover, focus, and active states now use the Bricks panel convention: theme accent background and inverse foreground, with an accent keyboard outline. Link focus shadows are cleared within the explorer. Destructive buttons retain native danger tokens; saved custom button colors are preserved. Graph nodes are excluded from control recoloring. Obsolete competing button-state rules were removed, and normal button background selector specificity reduced so state rules win consistently.

Button-state transitions are disabled to keep the foreground/background pair synchronized when focus changes. No WordPress or Bricks controls outside the plugin are restyled. No Bricks source is bundled.

## Verification

- Installed the final 0.9.3 ZIP on localhost:8889.
- WordPress administration edit-link keyboard focus: accent RGB(143,201,255), inverse RGB(16,32,30), 2px accent outline, no WordPress blue shadow. Screenshot captured after transition settled on the initial build; final build disables that transition.
- Bricks action focus: RGB(255,213,77) background and RGB(30,33,36) text, no shadow, transition none.
- Actual native Bricks Builder interface “Save as” button focus: the same RGB(255,213,77) / RGB(30,33,36) pair. Canceled interface editing without saving any preferences or content.
- Native toolbar Manage handoff still closes the explorer.
- Full production-package Plugin Check 2.2.0 in new-plugin mode: no reported findings; previously reviewed SQL annotations unchanged.
- PHP and application JavaScript syntax passed.
- 128 contrast pairs and palette/hover/inverse/border/normalization regressions passed.
- 37 REST/permission integration assertions passed on WordPress 7.2-RC3 / PHP 8.4 / SQLite.
- Focus was exercised live; hover and pressed states share the same CSS pair. A fresh live light/custom, forced-colors, and destructive-action interaction audit was not performed in this focused pass.

ZIP: `content-explorer-for-bricks-0.9.3.zip`.
SHA-256: `26c02932240593f7941bc858d11b36e8e2b840d105cbe36188f736db58baacdf`.
WordPress.org remains on the original 0.9.0 submission, awaiting manual review.
