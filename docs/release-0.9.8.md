# Uplink naming correction — 0.9.8

Prepared Nov. 27, 2026, on release/0.9.8 in response to the WordPress.org naming review. User approved Uplink Content Explorer for Bricks and requested slug uplink-content-explorer-for-bricks.

Updated plugin/readme display names, PHP/JS text domains, primary filename, package folder, enqueue handles, admin page slug, export identity, and CI packaging paths. Public GitHub repository URL remains unchanged. Existing option keys, REST namespace, and browser preferences remain. Both server and client import validators accept old/new settings export identifiers; exports read the version from the renamed main file.

Validation: all default production-package Plugin Check 2.2.0 categories passed with no findings. PHP and application JS syntax, color regressions, Description synchronization, and whitespace checks passed. WordPress 7.0.1, 7.1.5, and 7.2-RC3 / PHP 8.4 / SQLite each passed 37 REST/permission, 15 hierarchy/menu, 16 template-mapping, 10 graph/cache, and 6 new rename/settings assertions: 84 per version.

Installed exact ZIP on localhost:8889 after deactivating old-name 0.9.5. Activation succeeded; renamed admin URL loaded content list. Native Bricks toolbar opened the Sample Page map with correct ID 2 and existing connections. No builder save/publish. Runtime no-Bricks activation coverage and GitHub CI will supplement these local checks. MySQL, multisite, and broader Bricks versions remain additional coverage.

Existing pre-directory installs must deactivate the old copy before installing/activating the renamed package. Preferences are retained. Do not activate both copies.

ZIP: uplink-content-explorer-for-bricks-0.9.8.zip.
SHA-256: 8f03312099197bb988140966354ca30ce6f93d62e0db831f7ed17b32c8c41d57.

Review upload and explicit new slug reservation request remain pending at preparation.
