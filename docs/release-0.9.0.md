# WordPress.org submission candidate — 0.9.0

Prepared and checked Nov. 25, 2026, using WordPress Plugin Check, local PHP/JavaScript checks, isolated WordPress installations, and authenticated Edge. Pressship was not used for this final preparation.

## Metadata

- Name / slug: Content Explorer for Bricks / `content-explorer-for-bricks`.
- Version and Stable tag: 0.9.0.
- Plugin URI: https://github.com/stphnwlkr/content-explorer-for-bricks
- Author: Stephen Walker.
- Author URI: https://profiles.wordpress.org/stphnwlkr/
- Minimum WordPress 7.0; PHP 8.4; tested up to WordPress 7.2.
- GPL-3.0-or-later is retained because the inherited explorer code uses that license. The reference plugin's GPL-2.0 license does not replace this project's license.

The attached Editorial Title 1.4.0 ZIP could not be downloaded because the transfer failed DNS resolution. The author fields above were verified from the public `stphnwlkr/uplink-editorial-title` source, rather than claimed to have been read from the attachment.

## Validation

| Check | Result |
| --- | --- |
| Official WordPress.org readme validator in authenticated Edge | No errors or warnings; optional notes for missing screenshots section and donation link |
| Plugin Check 2.2.0 on the production package, new-plugin mode, all default categories | No reported errors or warnings; no custom file/category exclusions |
| PHP/application JavaScript syntax and color regressions | Passed |
| WordPress 7.0.1 / PHP 8.4 / SQLite | 37 REST/permission assertions and 10 graph/cache assertions passed |
| WordPress 7.1.5 / PHP 8.4 / SQLite | 37 REST/permission assertions and 10 graph/cache assertions passed |
| WordPress 7.2-RC3 / PHP 8.4 / SQLite | 37 REST/permission assertions and 10 graph/cache assertions passed |
| Installed ZIP on localhost:8889 / Bricks 2.5-beta | List, quick edit/cancel, item and site maps, zoom, and native panel handoff passed |

The graph renderer is now formatted as readable JavaScript. Its parsed syntax tree was compared before/after formatting and was unchanged.

## Disposition of the earlier 16 warnings

The final zero-finding result includes narrowly documented analyzer exceptions. It does not mean all 16 findings represented defects that were removed.

| Earlier findings | Count | Disposition |
| --- | ---: | --- |
| Database scans without caching | 4 | Added five-minute WordPress object-cache entries keyed by cursor, scope, and core posts/terms last-changed values |
| Direct database query advisories | 4 | Narrow line annotations explain the bounded keyset scans and their caches; WordPress query APIs do not expose these ID/term-taxonomy-ID cursor arguments |
| Interpolated SQL-format advisories | 4 | Narrow annotations document that the interpolated fragments contain generated `%s` placeholders only; cursor and scope values are bound through `wpdb::prepare` |
| Metadata query performance advisories | 4 | Narrow annotations explain exact-key reverse lookups of the plugin's saved-reference index, capped at 501 results, with core query-cache invalidation and live relationship-field verification |

There are no blanket PHPCS disables or Plugin Check category/code exclusions. The new cache tests observe actual SQL queries and verify cache reuse, refresh after post/Bricks metadata/term changes, and freshness of incoming relationship lookups. Permission checks remain applied when turning cached IDs into graph nodes; cached scans do not store permission-dependent responses.

## Package

- File: `content-explorer-for-bricks-0.9.0.zip`.
- Size: 163,396 bytes (about 160 KiB).
- Files: 61, under the single `content-explorer-for-bricks/` directory.
- SHA-256: `04b9bf4b157283dc53f794b1430702e97128e9b7916b839e0f13f7684091c018`.
- Includes runtime PHP/JS/CSS/SVGs, local vendor assets, licenses, notices, and vendor source/rebuild information.
- Excludes Git/SVN metadata, tests, build scripts, documentation, credentials, databases, and archives.
- Bricks Builder is not bundled. Its icon loads from the installed theme. No external updater is included. Without Bricks, the icon preview uses a bundled local fallback; the WordPress-only bootstrap and authorized content API were checked separately.

Machine-readable before/after Plugin Check results and the package manifest are retained in the workspace's `outputs/0.9.0-validation` directory.

## Publishing preflight

The authenticated WordPress.org account and new-submission form were inspected in Edge. No matching existing submission was shown. This is a new-submission candidate, not an SVN update; WordPress.org assigns SVN access after approval.

No WordPress.org upload, directory-declaration acceptance, SVN commit, release tag, or public release has occurred. A concrete ZIP has been prepared and tested for the final submission decision. The previous failed Pressship dry run remains a historical failed attempt, not a passed publishing check.

## Limits retained for review

- Maps index saved references; Bricks components and condition-based template assignments are not inferred.
- The tested database engine is SQLite. MySQL, multisite, additional Bricks versions, OS forced-colors, and a formal screen-reader audit remain further coverage, not claims of this run.
- WordPress 7.2 coverage used RC3. Additional changes before its final release may require another run.
- Custom themes with extreme opposing surface colors should be checked after applying them; the previous contrast audit records the detailed state coverage and limits.
