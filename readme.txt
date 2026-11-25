=== Content Explorer for Bricks ===
Contributors: stphnwlkr
Donate link: https://buymeacoffee.com/mjdwdceq0j
Tags: content, admin, bricks, search, taxonomy
Requires at least: 7.0
Tested up to: 7.2
Requires PHP: 8.4
Stable tag: 0.9.4
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Browse, search, edit, and map WordPress content from a workspace for Bricks Builder.

== Description ==

Content Explorer for Bricks provides searchable content lists, hierarchy, sorting, pagination, quick editing, taxonomy tools, and visual maps of saved links and shared resources.

Open Content Explorer in WordPress administration or use the compass and connections icons in the Bricks toolbar. Builder links open another tab to preserve the current document's unsaved work.

The Bricks adapter reads saved element metadata for internal links, literal local URLs, rich text links, and Template elements. It does not execute dynamic data, loops, shortcodes, or custom code. ACF and Meta Box relationship fields are supported where installed.

Version 0.9.0 adapts Content Explorer for Etch 2.2.2. Bricks components and condition-based template assignments are not included. Bricks Builder is not bundled. This plugin is not affiliated with or endorsed by Bricks.

All assets ship locally. There are no plugin telemetry requests, remote asset services, or external update checks. Production updates are intended for WordPress.org after directory approval.

== Installation ==

1. Upload the ZIP through Plugins > Add Plugin > Upload Plugin.
2. Activate Content Explorer for Bricks.
3. Open Content Explorer from the WordPress menu.
4. With Bricks active, use the compass and connections icons while editing a document.

== Frequently Asked Questions ==

= Does the plugin require Bricks? =

WordPress administration content tools work without Bricks. Builder shortcuts and saved Bricks element indexing require Bricks Builder.

= Does the map include unsaved or dynamic content? =

No. It reads saved references and literal links without rendering user code. Components stored in Bricks options and condition-based template assignments require further integration.

= Does it change editor permissions? =

No. Editor preferences control shortcuts only. WordPress and Bricks permissions still apply.

= Where is the source code? =

Source, development history, and issue tracking are available at https://github.com/stphnwlkr/content-explorer-for-bricks. Bundled library versions, licenses, and rebuild instructions are recorded in NOTICE.txt and assets/vendor/webawesome/README.md.

= Is there a warranty? =

The plugin is provided as is, without warranty of any kind. See the included GPL license for the full terms.

== Screenshots ==

1. Search and manage content directly inside the Bricks workspace.
2. Update titles, slugs, status, dates, and parents with Quick edit.
3. Explore the site map with content-type filters, zoom controls, and item details.

== Upgrade Notice ==

= 0.9.4 =
Fix the nested field appearance in map search.

= 0.9.3 =
Correct button interaction styling to follow the Bricks interface theme.

= 0.9.2 =
Improve dropdown caret spacing throughout Content Explorer.

= 0.9.1 =
Fix Quick edit form field contrast in WordPress administration.

= 0.9.0 =
First WordPress.org submission candidate, including the Bricks workspace, saved-content maps, content management, and native theme integration.

== Changelog ==

= 0.9.4 =
* Style map search as one native-themed control without a nested input background or focus ring.

= 0.9.3 =
* Match button hover, focus, and active states to the Bricks accent and inverse colors, including WordPress edit links.

= 0.9.2 =
* Inset dropdown carets consistently across lists, settings, Quick edit, and maps, including right-to-left layouts.

= 0.9.1 =
* Keep Quick edit text fields readable when WordPress administration input styles are present.

= 0.9.0 =
* Prepare the first WordPress.org submission candidate.
* Include the tested explorer, map, quick-edit, taxonomy, and settings tools from the development previews.
* Preserve distinct map colors, readable interaction states, native Bricks styling, and active-template mapping.
* Cache bounded map scans with automatic invalidation on post, metadata, and taxonomy changes.

= 0.1.0-beta.6 =
* Normalize native theme foregrounds for contrast on panels, controls, and tinted selected cards.
* Keep map controls readable on hover, focus, and when toggled off.
* Preserve the original distinct graph colors, keep text at full contrast, and distinguish hover backgrounds.
* Restore action preview icons and center the sidebar collapse caret.

= 0.1.0-beta.5 =
* Follow the current editing document after Bricks instant navigation, including header and footer templates.
* Keep the current-item map and site-map marker aligned with the active editor document.

= 0.1.0-beta.4 =
* Enlarge the map zoom symbols and center them within their buttons.

= 0.1.0-beta.3 =
* Dismiss Content Explorer before other Bricks toolbar actions open their native panels.
* Preserve native control focus and explorer list state when switching workspaces.
* Reduce graph filter column spacing from 16px to 8px and add an 8px row gap.

= 0.1.0-beta.2 =
* Follow Bricks native dark, light, and custom colors, borders, radius, typography, and focus accents.
* Restore visible native dropdown carets, including status and connection sorting controls.
* Use the installed Bricks icon for builder edit actions.

= 0.1.0-beta.1 =
* Initial Bricks development preview based on Content Explorer for Etch 2.2.2.
* Added administration workspace and native Bricks toolbar entry points.
* Added Bricks editor capability checks and saved element link/template indexing.
* Set WordPress 7.0 and PHP 8.4 minimums; tested up to WordPress 7.2.

== License and Warranty ==

GPLv3 or later. Provided as is, without warranty of any kind. See LICENSE.txt and NOTICE.txt for retained third-party notices.
