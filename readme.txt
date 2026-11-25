=== Content Explorer for Bricks ===
Contributors: stphnwlkr
Tags: content, admin, bricks, search, taxonomy
Requires at least: 7.0
Tested up to: 7.2
Requires PHP: 8.4
Stable tag: 0.1.0-beta.3
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Browse, search, edit, and map WordPress content from a workspace for Bricks Builder.

== Description ==

Content Explorer for Bricks provides searchable content lists, hierarchy, sorting, pagination, quick editing, taxonomy tools, and visual maps of saved links and shared resources.

Open Content Explorer in WordPress administration or use the compass and connections icons in the Bricks toolbar. Builder links open another tab to preserve the current document's unsaved work.

The Bricks adapter reads saved element metadata for internal links, literal local URLs, rich text links, and Template elements. It does not execute dynamic data, loops, shortcodes, or custom code. ACF and Meta Box relationship fields are supported where installed.

This initial development preview adapts Content Explorer for Etch 2.2.2. Bricks components and condition-based template assignments are not yet included. Bricks Builder is not bundled. This plugin is not affiliated with or endorsed by Bricks.

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

== Changelog ==

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

== Upgrade Notice ==

= 0.1.0-beta.2 =
Development preview. Full Bricks feature parity and directory submission checks remain in progress.

== License and Warranty ==

GPLv3 or later. Provided as is, without warranty of any kind. See LICENSE.txt and NOTICE.txt for retained third-party notices.
