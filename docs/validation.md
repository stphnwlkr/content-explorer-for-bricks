# 0.9.6 Assigned singular template mapping

See [release-0.9.6.md](release-0.9.6.md). 78 backend assertions per WordPress 7.0.1, 7.1.5, and 7.2-RC3 (PHP 8.4 / SQLite), all default Plugin Check categories, PHP/JavaScript syntax, and color regressions passed. Installed exact ZIP on NCHV; verified seven outgoing links, seven children, three assigned templates on About Us, reverse usage on its template, and native Bricks toolbar mapping. WordPress.org accepted the replacement 0.9.6 upload on Nov. 25, 2026; status remains Awaiting Review.

# 0.9.5 Hierarchy and menu connections

See [release-0.9.5.md](release-0.9.5.md). Parent/direct-child groups and assigned navigation menu links passed 62 backend assertions per tested WordPress version, all default production-package Plugin Check categories with no findings, syntax and color regression checks. Exact ZIP installed on localhost:8889; parent/child navigation and reparent restoration verified in WP admin, and map loading verified inside Bricks. No live NCHV update or new WordPress.org upload for this candidate.

# 0.9.4 Map search styling

See [release-0.9.4.md](release-0.9.4.md) for the installed-package checks. PHP/JavaScript syntax, 128 color-pair regressions, 37 REST/permission assertions, and full production-package Plugin Check passed.

# 0.9.3 Native button states

See [release-0.9.3.md](release-0.9.3.md) for native comparison, focus verification, and test results.

# 0.9.2 Dropdown caret spacing

See [release-0.9.2.md](release-0.9.2.md) for installed-package spacing checks and coverage limits.

# 0.9.1 Quick edit correction

See [release-0.9.1.md](release-0.9.1.md) for the reproduced WordPress form-style conflict and installed-package checks.

# Submission verification — 0.9.0

Verified Nov. 25, 2026 without Pressship. See [release-0.9.0.md](release-0.9.0.md) for final metadata, package hash, exact warning dispositions, runtime matrix, smoke tests, and publishing status.

Official readme validation completed in Edge with two optional notes. The production package completed all default Plugin Check categories with no reported findings after caching improvements and narrowly justified annotations. PHP/JavaScript syntax, color regressions, and 47 backend assertions per tested WordPress version (7.0.1, 7.1.5, 7.2-RC3; PHP 8.4 / SQLite) passed. The ZIP was installed and smoke-tested in Bricks on localhost:8889.

The earlier failed Pressship workflow is retained in [pressship-0.9.0.md](pressship-0.9.0.md) as history. No WordPress.org upload, SVN release, or public release tag has occurred. The older preview notes and gates below describe their original point in development; the current status and remaining coverage are in release-0.9.0.md.

# Previous preview — 0.1.0-beta.6

Verified Nov. 25, 2026 on localhost:8889, WordPress 7.2-RC3 and Bricks 2.5-beta. Detailed measurements and limits: [contrast-audit.md](contrast-audit.md).

- Restored the original distinct graph hues after review. Descriptions now use full-strength text; controls have slightly lighter backgrounds and distinct hover/active backgrounds.
- Verified normal, selected, keyboard-focus, primary-action hover, and toggled-off filter states in native dark/light modes and a warm custom palette. The reported selected card and primary hover were reproduced and corrected.
- Light-mode form labels and dialog Save styling were corrected. All six settings sections measured above 4.5:1 for enabled text in dark and light modes.
- Checked graph marker/control contrast in the color tests; revealed graph lines remain opaque and focused graph nodes have a shape outline plus underlined label.
- Restored the native Bricks b preview, explicit pagination/saved-action preview masks, and centered the collapse caret. Confirmed visually.
- Restored and saved original dark mode and empty custom CSS after testing.
- Color regression tests passed, PHP/application JavaScript syntax passed, isolated integration: **37 assertions passed**.
- Full Plugin Check, all five categories, errors/warnings enabled, no exclusions: **0 errors, 16 inherited database warnings**. Remaining release gates below still apply.

# Previous preview — 0.1.0-beta.5

Verified Nov. 25, 2026 on localhost:8889, WordPress 7.2-RC3 and Bricks 2.5-beta.

- Reproduced instant navigation from Sample Page (2) to Main Header (19) leaving the map centered on Sample Page under beta.4.
- Current document resolution now uses Bricks' live loadData.postId before initial configuration. It deliberately ignores template preview content IDs.
- Installed beta.5; repeated the native template Edit action without a page reload. Toolbar map showed Main Header / Current item ID 19, and site graph's current marker was Main Header.
- Navigated back using native Pages; sidebar Current item mapped Sample Page / ID 2. Both navigation directions follow the active document.
- PHP/application JavaScript syntax checks passed; isolated REST integration: **37 assertions passed**.
- Full Plugin Check, all five categories, errors/warnings enabled, no exclusions: **0 errors, 16 inherited database warnings**. Remaining release gates below still apply.

# Previous preview — 0.1.0-beta.4

Verified Nov. 25, 2026 on localhost:8889, WordPress 7.2-RC3 and Bricks 2.5-beta.

- Enlarged zoom symbols to 24px and centered both axes within 36px square buttons. Fit and Reset view keep their existing text size.
- Installed preview ZIP; browser computed styles and screenshot confirmed sizing/alignment. Zoom in changed map scale from 0.688 to 0.860; zoom out remained functional.
- PHP/application JavaScript syntax passed; isolated integration suite: **37 assertions passed**.
- All five Plugin Check categories, errors/warnings enabled, no exclusions: **0 errors, 16 inherited warnings**. Remaining release gates below still apply.

# Previous preview — 0.1.0-beta.3

Verified Nov. 25, 2026 on localhost:8889, WordPress 7.2-RC3 and Bricks 2.5-beta.

- Reproduced native Manage menu opening behind Explorer. Capture listeners now close Explorer before native toolbar actions, without cancelling their events or stealing focus.
- Verified Manage > Page settings and Pages open with Explorer hidden. Enter activation of Manage also closes the site map and exposes its menu.
- Site graph filters now use 8px column and row gaps (previously 16px columns, zero rows). Browser measurement confirmed 34px buttons at row offsets 3, 45, 87, and 129, with 8px separation; screenshot confirmed wrapping.
- Installed the updated preview ZIP on the test site.
- All PHP/application JavaScript syntax checks passed; isolated integration suite: **37 assertions passed**.
- Full Plugin Check, all five categories and both result types, no exclusions: **0 errors, 16 inherited database warnings**. Previous release gates below still apply.

# Previous preview — 0.1.0-beta.2

Verified Nov. 25, 2026 on the requested localhost:8889 site, WordPress 7.2-RC3 and Bricks 2.5-beta.

- Native dark, light, and custom modes tested through Bricks Settings > Builder. Verified matching surface and text colors, accent colors, borders, corner radius, and light/dark select popup scheme.
- Custom test palette used a light warm background, dark green text and accent, and 9px corners. The explorer list and item map followed the native palette.
- Restored the original dark mode and original empty custom CSS after testing; verified both persisted.
- Dropdown caret visibility checked in the content-type, type-order, page-size, and quick-edit Status selectors. Native select appearance is restored; all explorer selectors use that rule, including settings and connection sorting.
- Confirmed list builder-action icons load Bricks' native b.svg from the installed theme; the icon is not copied into this repository. The button's navigation is unchanged.
- Re-ran all five Plugin Check categories, errors and warnings enabled, no custom exclusions: **0 errors, 16 inherited database warnings**.
- PHP and JavaScript syntax checks passed; isolated WordPress integration suite: **37 assertions passed**.
- Theme colors use live CSS variables; no palette snapshots are saved. Explicit explorer button, heading, hierarchy, and status customizations retain precedence. Native select popup scheme uses the resolved native surface, with CSS color support including OKLCH and P3.

# Previous preview — 0.1.0-beta.1

Verified Nov. 25, 2026. No stable release or WordPress.org submission has been made.

## Completed

- Installed and activated on the requested localhost:8889 test site with Bricks 2.5-beta. The site updated from WordPress 7.2-RC2 to 7.2-RC3 during this session; final browser checks used RC3.
- PHP 8.4.27 isolated integration run: **37 assertions passed**. Covers Bricks links, explicit Template element usage, index refresh/removal on metadata changes, formatted titles, page/template lists, creation, quick edit, taxonomy creation, item map data, and denial of reads/writes for anonymous users and subscribers.
- Isolated tests used a separate writable copy of the database, not the running site's data.
- All PHP files and application JavaScript passed syntax checks.
- Full Plugin Check 2.2.0 run with all five categories selected, both errors and warnings enabled, and no custom exclusions: **0 errors, 16 warnings**.
- Browser checks inside Bricks: compass and connections toolbar buttons; opening/closing the workspace; search returning two matching pages; title sorting; quick edit dialog and cancel; current item map for Sample Page; site graph with 31 entries and 11 terms; returning to List with search state retained.
- Visual check: original SVG iconography and workspace styles; 14px interface typography from the baseline's 16px design base; top and right Bricks toolbars remain accessible; CSS Studio canvas handles stay hidden while the workspace is open.
- Installable archive contains one plugin directory, production files and local third-party notices. Git metadata, tests, scripts, and development documentation are excluded.

## Plugin Check warnings requiring review

| Group | Count | Location / reason |
| --- | --- | --- |
| Prepared SQL interpolation | 4 | Connections and relationship keyset scans construct placeholder lists; values are passed through wpdb::prepare |
| Direct database access / no caching | 8 | Fresh keyset index and graph scans in connections.php and relationships.php |
| Meta query performance | 4 | Incoming usage and relationship queries on post metadata |

These warnings were retained rather than hidden with blanket exclusions. Review the need for each query, cache behavior and invalidation, and large-site measurements before directory submission. The GitHub validation workflow runs all Plugin Check categories and can fail on these warnings until they are resolved or narrowly justified.

## Remaining release gates

- Bricks components inventory and usage adapter.
- Condition-based template resolution, with context and exclusions.
- Broader toolbar orientation/version coverage, keyboard focus and screen-reader checks.
- WordPress 7.0 and 7.1 runtime coverage; MySQL and multisite coverage.
- Malformed Bricks data and large-site index stress tests.
- Translation/source-availability and license review for submission.
- Plugin Check warning disposition and final security/accessibility review.

The requested compatibility metadata is WordPress 7.0 minimum, PHP 8.4 minimum, tested up to WordPress 7.2. Metadata does not imply that every version in that range has been tested.
