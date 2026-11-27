# Content Explorer for Bricks — project notes

## Identity and distribution

- Plugin / requested slug: Uplink Content Explorer for Bricks / `uplink-content-explorer-for-bricks`. Previous pending slug: `content-explorer-for-bricks`; reviewer allocation of the new slug is pending.
- Author: Stephen Walker; contributor: `stphnwlkr`.
- Author URL: https://profiles.wordpress.org/stphnwlkr/
- Plugin URL and public source: https://github.com/stphnwlkr/content-explorer-for-bricks
- Donation URL: https://buymeacoffee.com/mjdwdceq0j
- Current code: 0.9.8 (Uplink name and directory identity); original submission: 0.9.0; WordPress 7.0 minimum, PHP 8.4 minimum, tested up to WordPress 7.2.
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
- Submitted version 0.9.0 to WordPress.org on Nov. 25, 2026, through the authenticated Edge account after explicit user confirmation of the upload and required declarations.
- WordPress.org confirmed receipt, reported “Results of Automated Plugin Scanning: Pass,” and showed “Awaiting Review.” Initial assigned slug: `content-explorer-for-bricks` (subject to manual review).
- Submitted ZIP SHA-256: `fb77a1bdf22f96ad33fb0ddfe0ce2e4755146f7ca34733bd5e9ac3a99111bf9f`.
- Manual approval, SVN commit, directory screenshots upload, stable tag, and public stable release remain pending. Watch for the WordPress.org review email; update the existing submission if fixes are requested.
- After approval, confirm the assigned slug and SVN URL before publishing. Do not store passwords, tokens, or site databases in this repository or these notes.

## Behavior and outstanding coverage

- Follow native Bricks theme surfaces and controls. Retain distinct original map colors, full-strength text, visible carets, centered icons, and distinct hover backgrounds.
- Resolve the active editing document rather than preview content when mapping header/footer templates.
- Maps index saved literal references. Bricks components and archive/popup/password-protection template assignments are not inferred; dynamic code, loops, and unsaved changes are not executed.
- Backend checks covered PHP 8.4 and SQLite on WordPress 7.0.1, 7.1.5, and 7.2-RC3. Bricks smoke coverage used 2.5-beta.
- MySQL, multisite, additional Bricks versions, forced colors, and a formal screen-reader audit remain further coverage. Recheck against WordPress 7.2 final when available.

## 0.9.1 Quick edit correction

WordPress type-selector input backgrounds overrode the previous low-specificity explorer rule. The scoped field rule now keeps text/background colors paired. Reproduced on WP admin, verified after installing 0.9.1 in admin and Bricks; see `docs/release-0.9.1.md`. Superseded by the 0.9.4 review upload below.

## 0.9.2 Caret spacing

Single-line dropdowns use a local theme-aware chevron, 12px from the inline end with 36px text clearance. Native select interactions remain. See `docs/release-0.9.2.md`; Superseded by the 0.9.4 review upload below.

## 0.9.3 Button interaction states

Follow native Bricks panel accent/inverse colors for default control hover, focus, and active states. Clear WP admin link-focus colors/shadows only inside the explorer; preserve saved custom colors and danger semantics. Native button and explorer focus colors matched live on Bricks 2.5-beta. See `docs/release-0.9.3.md`.

## 0.9.4 Map search

The map search wrapper owns its background, border, and focus indicator; the inner input stays transparent. Verified in WP admin and Bricks. See `docs/release-0.9.4.md`. Superseded by the 0.9.4 review upload below.

## WordPress.org review replacement — Nov. 25, 2026

Replaced the pending review package with `content-explorer-for-bricks-0.9.4.zip` through authenticated Edge at the user’s request. WordPress.org displayed “New version of Content Explorer for Bricks uploaded for review” and listed 0.9.4 as the latest submitted file. Status remains Awaiting Review; 0.9.0 remains in submission history.

Uploaded SHA-256: `a73e7b87f0a63302cbb7a5052270909618f4516aa35ea3025ab444e7d288dcfb`. No SVN commit or public stable release has occurred.

## 0.9.5 Hierarchy and navigation menu connections

Item maps now show WordPress parent and direct-child relationships in separate groups. These are structural relationships, not fabricated content links. Hierarchical custom post types use Parent item / Child items labels. Results remain permission-filtered, exclude unsupported statuses, and show at most 500 direct children. Site maps already included parent edges.

Bricks Nav Menu elements with a saved numeric menu ID index post-type menu items and local custom URLs. External links, taxonomy menu items, archives, dynamically selected menus, and dynamically generated menu entries are outside this adapter. Menu edits/removal/membership changes reset the bounded index cursor; index schema 3 forces a rebuild on upgrade.

Validation: 62 assertions per WordPress version (7.0.1, 7.1.5, 7.2-RC3), full production-package Plugin Check with no findings, syntax and color checks. Installed on localhost:8889; verified parent/child groups and restoration after a temporary local reparent, plus native Bricks map opening. See docs/release-0.9.5.md. Live NCHV installation and WordPress.org replacement have not been performed for this candidate.

## 0.9.6 Singular template mapping

Bricks' native find_template_id resolves published singular content/header/footer templates in a temporary post query context, restored in finally. Native condition ranking, exclusions, post IDs/descendants, post types, assigned terms, front page, and default header/footer selection apply. Page/body header/footer disable settings suppress those assignments. No frontend requests or content rendering are used. Archive/posts-page, popup, password-protection, and visitor-specific rendering overrides remain outside this mapping.

Assigned templates contribute Uses edges. Their saved links, including nested explicit resources (cycle protected, 100-resource cap), contribute outgoing and reverse links. Template/meta/global settings/term changes invalidate the bounded index. Index schema 4 triggers an upgrade rebuild. One narrow Plugin Check annotation documents restoration of core query globals.

Installed 0.9.6 on nchv.flyingw.dev through authenticated Edge on Nov. 25, 2026. Verified About Us ID 193: Links to 7, Child pages 7, Uses 3 (About pages, Main Header, Footer), Linked from 41 after inheritance. About pages template ID 213: Used by 6. Verified identical counts through the native Bricks Current item connections toolbar. No page/template save or publish action performed. The review package was subsequently replaced with 0.9.6; see the upload record below.

78 backend assertions per tested WP version and full production-package Plugin Check passed. See docs/release-0.9.6.md.

## WordPress.org review replacement — 0.9.6

At the user's request, replaced the pending review package through authenticated Edge on Nov. 25, 2026. WordPress.org confirmed “New version of Content Explorer for Bricks uploaded for review” and listed content-explorer-for-bricks-0.9.6.zip / Version 0.9.6 as the latest submission. Status remains Awaiting Review. Versions 0.9.4 and 0.9.0 remain historical uploads.

Uploaded SHA-256: bf4416c749463b7e53fd90cb91a1c43526ffdaba6ca0be01313343f84b6b7745. No SVN commit or stable release tag.

## 0.9.7 Active map item blue

The active/current item card now uses original Etch blue (#3858e9), blended 26% into the native panel surface. Its blue border is adjusted to at least 3.1:1 against both panel and tinted card; full-strength text normalization includes the blue surface at 4.6:1. Native Bricks control accent remains independent. Installed on NCHV and visually confirmed in its About map; user approved the result (“much better”). Full Plugin Check, changed PHP/JS syntax, 37 REST/permission assertions, and color regressions passed. WP.org latest review upload remains 0.9.6.

## WordPress.org review replacement — 0.9.7

Uploaded the user-approved 0.9.7 ZIP at the user’s request on Nov. 25, 2026, through authenticated Edge. WordPress.org confirmed “New version of Content Explorer for Bricks uploaded for review” and listed content-explorer-for-bricks-0.9.7.zip as the latest file. Status remains Awaiting Review. SHA-256: 8e9633366224a626a959d76f84b9b5c792951b2f1ca51557bc9d134e7fb7b9db. No SVN commit or public stable release.

## GitHub Actions PHP mismatch — Nov. 26, 2026

Validate run 45701047138 (1241bfb), re-run job 140020300094, failed before Plugin Check scanned anything: wp-env CLI reported PHP 8.3.37 and refused plugin activation because the plugin requires 8.4. The syntax job used setup-php 8.4 but that setting does not configure wp-env containers.

Set WP_ENV_PHP_VERSION=8.4 on the Plugin Check job using wp-env's documented environment setting. Keep all default checks and findings enabled. Update checkout to v6 and upload-artifact to v7 (Node 24) to remove the Node 20 warning. This is a CI-only fix; the submitted plugin ZIP/version remains 0.9.7. Verified fresh Validate run 45852714914 on commit 1335dcb: syntax and plugin-check both succeeded. Logs confirm PHP 8.4.28, Plugin Check 2.2.0, successful plugin activation, and “Success: Checks complete. No errors found.” Historical failed runs remain as records; rerunning an old commit retains its old workflow.

## WordPress.org naming review — Nov. 27, 2026

Review of 0.9.7 raised one issue: distinctive display name/slug. User approved Uplink Content Explorer for Bricks / uplink-content-explorer-for-bricks. Search of the full proposed name and WordPress.org directory found no indexed exact-name matches; this does not guarantee reservation.

0.9.8 updates plugin/readme names, text domains, main file, package folder, script handles, admin page slug, and CI package paths. GitHub repository URL remains https://github.com/stphnwlkr/content-explorer-for-bricks. Existing ceb_hub_* options, REST namespace, and browser preference keys remain. New settings exports use the new identity; both import validators accept the previous identity too. Deactivate a pre-directory old-name installation before installing/activating the new folder to avoid two copies of the same implementation. No automatic deletion of the old copy.

Full production-package Plugin Check, syntax, color regressions, and 84 backend assertions per WP 7.0.1/7.1.5/7.2-RC3 passed. Exact ZIP installed/activated on localhost:8889 after deactivating old 0.9.5; admin list and Bricks current-item map loaded correctly. No builder save performed. WordPress.org accepted the renamed 0.9.8 ZIP through authenticated Edge on Nov. 27, 2026, confirming “New version of Uplink Content Explorer for Bricks uploaded for review.” The latest file/version is uplink-content-explorer-for-bricks-0.9.8.zip / 0.9.8. Status remains Being Reviewed, waiting on action from the submitter. The assigned slug remains the old slug; a reply to the existing review email requesting the new slug is still required and has not been sent. GitHub Validate run 45999639478 on commit 0d88166 passed both syntax and plugin-check jobs.

ZIP SHA-256: 8f03312099197bb988140966354ca30ce6f93d62e0db831f7ed17b32c8c41d57. Reviewer requires replying in the existing review email thread explicitly requesting the new slug; do not assume a code rename reserves it.
