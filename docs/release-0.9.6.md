# Assigned singular templates and inherited links — 0.9.6

Prepared Nov. 25, 2026, on `release/0.9.6`.

About Us rendered its navigation through a conditional content template. Explorer indexed the template's links but did not map its application to the page. Contact Us had its own direct link back to About, so it appeared under Linked from while other template-mediated links did not.

The adapter now calls the installed Bricks native condition resolver for published content, header, and footer templates. It constructs a singular query context without running a frontend query or renderer and restores original WordPress globals in finally. Native specificity and exclusions apply. Page/body header/footer disable settings suppress those assignments. Template documents retain their own identity rather than inheriting a preview page's assignments.

Assigned templates contribute Uses edges. Their saved links, including nested explicit shared references, enter the page's outgoing and reverse link index. Shared traversal is cycle protected and bounded to 100 resources. Assignments rebuild after template, visibility, term, and Bricks global setting changes; schema 4 upgrades existing indexes. Direct children remain a distinct structural group.

## Validation

- PHP 8.4 / SQLite: WordPress 7.0.1, 7.1.5, and 7.2-RC3 each passed 37 REST/permission assertions, 15 hierarchy/menu assertions, 16 new template mapping assertions, and 10 graph/cache assertions: **78 per version**.
- New coverage: body/header/footer assignment, query/post state restoration, descendant matching, inherited direct/nested links and cycles, reverse usage/links, page/body visibility overrides, native exclusion and priority, stale usage/link removal after edits, unpublished template exclusion, and correct template editor identity.
- Full Plugin Check 2.2.0 on the extracted production ZIP, all default categories, strict JSON output: **no reported findings**. A new narrow annotation documents deliberate restoration of core WordPress query globals; previous SQL annotations remain unchanged.
- All PHP and application JavaScript syntax passed; 128 color pairs and existing palette/state regressions passed. Description synchronization and whitespace checks passed.
- Installed the exact ZIP over 0.9.5 on https://nchv.flyingw.dev through authenticated Edge. WordPress reported Plugin updated successfully and Explorer displayed Installed version 0.9.6.
- About Us ID 193 after bounded rebuild: **Links to 7, Child pages 7, Uses 3, Linked from 41**. Uses names About pages, Main Header, and Footer. Incoming count now includes other content inheriting shared navigation/footer links.
- About pages template ID 213: **Used by 6**, including About Us, Who Is NCHV?, Careers, Contact Us, and Annual Conference on the first page of results. More-specific Staff/Board templates remain distinct.
- Native Bricks smoke: opened About Us in a new builder tab, activated Current item connections, verified ID 193 and matching seven links/seven children/three shared parts. Visual review confirmed graph edges and groups. Closed the test builder without saving or publishing, then returned to the administration About map. No page/template content was modified.

## Limits and distribution

Singular post/page/CPT assignments are covered. Posts-page/archive URLs, popup/password-protection templates, maintenance/access-dependent rendering, and custom active-template override filters are not represented as fixed assignments. Multilingual and visitor-dependent integrations need further live coverage. No content/loop/shortcode/dynamic-data rendering occurs. Theme condition hooks may still run as part of native matching. Backend coverage uses SQLite; MySQL, multisite, and broader Bricks versions remain additional coverage.

Installed on the NCHV test site. Uploaded as the replacement WordPress.org review package on Nov. 25, 2026, at the user’s request. WordPress.org confirmed “New version of Content Explorer for Bricks uploaded for review” and listed 0.9.6 as the latest submitted version. Status remains Awaiting Review; no SVN or stable tag published.

ZIP: `content-explorer-for-bricks-0.9.6.zip`.
SHA-256: `bf4416c749463b7e53fd90cb91a1c43526ffdaba6ca0be01313343f84b6b7745`.
