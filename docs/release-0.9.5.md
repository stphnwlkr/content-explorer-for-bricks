# Parent/child and navigation menu connections — 0.9.5

Prepared Nov. 25, 2026, on `release/0.9.5`.

The item map previously read saved links and shared resource references but omitted WordPress hierarchy. It now displays Parent page and Child pages groups; hierarchical custom post types use Parent item and Child items. These groups preserve the distinction between a structural relationship and a saved hyperlink. Direct children are ordered by menu order, title, and ID, permission-filtered, and capped at 500 with a truncation notice. The site map already includes parent edges.

Bricks Nav Menu elements store a menu term ID rather than their links. The adapter now reads the assigned menu's saved post-type items and local custom URLs. Menu edits, deletion, and membership changes invalidate the bounded link index. Index schema 3 triggers a rebuild after upgrade, refreshing reverse connections as well as outgoing links. No menu rendering or dynamic code is executed.

## Validation

- PHP 8.4 / SQLite: WordPress 7.0.1, 7.1.5, and 7.2-RC3 each passed 37 REST/permission integration assertions, 15 hierarchy/menu assertions, and 10 graph/cache assertions: **62 per version**.
- New tests cover parent/direct-child relationships, exclusion of grandchildren/trashed pages, reparenting, absence of fabricated hyperlinks, menu page/local/external links, reverse connections, menu edits/deletion, index upgrades, and anonymous denial. Disposable fixtures are cleaned up.
- Full Plugin Check 2.2.0 on the extracted production ZIP, all default categories, strict JSON output: **no reported findings**. Existing narrowly documented SQL annotations are unchanged.
- All PHP and application JavaScript syntax checks passed. Color tests passed 128 text/surface pairs and existing palette normalization checks. GitHub/WordPress.org Description synchronization and whitespace checks passed.
- Installed the exact ZIP over 0.9.4 on localhost:8889 (WordPress 7.2-RC3, Bricks 2.5-beta).
- WP administration smoke: temporarily assigned Privacy Policy as Sample Page's child; verified Child pages 1 on Sample Page with Links to 0. Selected Privacy Policy and opened its connections; verified Parent page / Sample Page. Restored No parent and verified Parent page None / Child pages 0. No title, status, or content changes were made.
- Opened the draft in Bricks through the map's editor shortcut. The native toolbar Current item connections control loaded the correct Privacy Policy map and hierarchy details. No builder save/publish action was performed.

## Limits and distribution

Only direct children appear in the item graph. Grandchildren can be explored by selecting a child and opening its connections. Dynamic menu selection, taxonomy/archive menu items, and dynamically generated menu entries are not converted to post connections. Existing limits on dynamic content and conditional template assignments remain. MySQL, multisite, and broader Bricks version coverage are still pending.

This candidate is installed locally; it has not been installed on NCHV or uploaded to WordPress.org. The pending review package remains 0.9.4. No SVN commit or public stable tag has been created.

ZIP: `content-explorer-for-bricks-0.9.5.zip`.
SHA-256: `90b9e9271f9b47e97f02d8dfa7254aa35ddd16b4aaf279fdca97bb6d7bab44b2`.
