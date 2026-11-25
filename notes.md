# Content Explorer for Bricks — project notes

## Identity and distribution

- Plugin / proposed slug: Content Explorer for Bricks / `content-explorer-for-bricks`.
- Author: Stephen Walker; contributor: `stphnwlkr`.
- Author URL: https://profiles.wordpress.org/stphnwlkr/
- Plugin URL and public source: https://github.com/stphnwlkr/content-explorer-for-bricks
- Donation URL: https://buymeacoffee.com/mjdwdceq0j
- Current submission candidate: 0.9.0; WordPress 7.0 minimum, PHP 8.4 minimum, tested up to WordPress 7.2.
- Retain GPL-3.0-or-later and third-party notices inherited from Content Explorer for Etch 2.2.2 (baseline commit `10391f183507da71d51f58ac44b4963f47deab68`).
- No external updater, telemetry, remote fonts, or bundled Bricks theme code.

## Readme and screenshots

`readme.txt` is the canonical WordPress.org description. Its Description section must match the marked description in GitHub's `README.md` exactly. Run `python3 scripts/sync-readme.py` to synchronize, or add `--check` to detect drift without writing.

Real screenshots captured Nov. 25, 2026, on the localhost Bricks test site are tracked in `docs/screenshots/`:

1. `screenshot-1.jpg`: content list and search in the builder.
2. `screenshot-2.jpg`: Quick edit dialog.
3. `screenshot-3.jpg`: site connections map.

The numbering matches `readme.txt`. After directory approval, copy these files to the SVN repository's top-level `assets/` directory, outside `trunk` and `tags`. Keep directory screenshots outside the installable ZIP. Do not confuse this directory with the plugin's runtime `assets/` folder. Review screenshots for private data and refresh them when the interface changes.

## Release workflow

- Use `release/<version>` for every release-worthy change; keep plugin header, enqueue versions, and Stable tag aligned.
- Build using `python3 scripts/package.py <output.zip>`; development notes, docs, screenshots, scripts, and tests stay outside the runtime package.
- Run all default Plugin Check categories on the extracted production package, plus PHP/JS syntax, permissions/integration, cache, color, and Bricks browser checks as appropriate.
- Read `docs/release-0.9.0.md` and `docs/validation.md` for evidence and narrowly documented query-analyzer exceptions.
- Final preparation was performed without Pressship. Earlier failed attempts are historical, not successful verify/dry-run evidence.
- New directory submission is pending. No WordPress.org upload, required declarations, SVN commit, stable tag, or public stable release has been completed.
- After approval, confirm the assigned slug and SVN URL before publishing. Do not store passwords, tokens, or site databases in this repository or these notes.

## Behavior and outstanding coverage

- Follow native Bricks theme surfaces and controls. Retain distinct original map colors, full-strength text, visible carets, centered icons, and distinct hover backgrounds.
- Resolve the active editing document rather than preview content when mapping header/footer templates.
- Maps index saved literal references. Bricks components and condition-based template assignments are not inferred; dynamic code, loops, and unsaved changes are not executed.
- Backend checks covered PHP 8.4 and SQLite on WordPress 7.0.1, 7.1.5, and 7.2-RC3. Bricks smoke coverage used 2.5-beta.
- MySQL, multisite, additional Bricks versions, forced colors, and a formal screen-reader audit remain further coverage. Recheck against WordPress 7.2 final when available.
