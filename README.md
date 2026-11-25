# Content Explorer for Bricks

A Bricks Builder adaptation of [Content Explorer for Etch 2.2.2](https://github.com/stphnwlkr/etch-content-hub-sort/releases/tag/v2.2.2), pinned to commit `10391f183507da71d51f58ac44b4963f47deab68`.

Initial development preview: **0.1.0-beta.5**. Requires WordPress **7.0+**, PHP **8.4+**. Tested up to WordPress **7.2**. This is not yet a WordPress.org submission candidate.

## Use

Install the ZIP through Plugins > Add Plugin > Upload Plugin. Open **Content Explorer** in WordPress administration, or **Content Explorer** while editing with Bricks. The original compass and connections icons open the explorer directly inside the Bricks workspace. Click the active icon again or use the Back control to return to the canvas. Builder links open another tab so the current document's unsaved edits remain intact.

The inherited interface provides searchable and sortable content lists, hierarchy, pagination, column preferences, safe inline title formatting, quick edit, creation, Trash, taxonomy management, site and item maps, supported ACF/Meta Box relationships, and settings transfer. Capabilities and REST nonces protect data and changes. Only administrators can change site settings. Editor choices affect shortcuts; they do not change a user's permissions.

Bricks template posts are available in List. Editor shortcuts respect Bricks' enabled post types and builder capabilities. Saved internal links, literal local URLs, rich text links, and Template elements in Bricks content/header/footer metadata contribute to the map index. Metadata saves update the index after Bricks saves its elements.

## Appearance

The original explorer layout and compass/connections icons are retained. Colors, borders, corner radius, font family, focus indicators, and default status styling follow Bricks native CSS variables in dark, light, and custom modes. Dropdowns retain visible native carets. Explicit explorer color customizations continue to override theme defaults. Builder edit actions use the icon from the installed Bricks theme rather than bundling Bricks artwork.

## Known limits

- Bricks components are option-backed objects rather than posts. Their inventory and usage need a separate adapter.
- Condition-based header, footer, single, and archive assignments are not inferred. Explicit Template elements are indexed.
- Maps describe saved data. Dynamic URLs, query results, unsaved changes, and code execution are excluded.
- Native toolbar placement is verified on the test site; more Bricks versions and toolbar configurations need coverage.
- The baseline's map-index database-query warnings need review and performance measurements before WordPress.org submission.
- WordPress 7.0/7.1, MySQL, multisite, and broader Bricks version coverage remain release gates.

## Releases

Create `release/<version>` before each release-worthy change, run validation, and merge the reviewed branch to `main`. A `v<version>` tag builds an installable ZIP. Beta tags produce GitHub prereleases. Do not bundle a GitHub updater in the WordPress.org package: WordPress.org will deliver production updates after approval.

See [docs/feasibility.md](docs/feasibility.md) for the port assessment and [docs/validation.md](docs/validation.md) for verification results and outstanding release gates.

## License and warranty

GPL-3.0-or-later. Provided **as is, without warranty of any kind**. Retains the original baseline and third-party notices in NOTICE.txt and assets. Bricks Builder is a separate product and is not bundled. This project is not affiliated with or endorsed by Bricks.
