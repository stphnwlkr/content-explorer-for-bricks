# Preview verification — 0.1.0-beta.1

Verified Nov. 25, 2026. No stable release or WordPress.org submission has been made.

## Completed

- Installed and activated on the requested localhost:8889 test site. The site updated from WordPress 7.2-RC2 to 7.2-RC3 during this session; final browser checks used RC3.
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
