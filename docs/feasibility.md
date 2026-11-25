# Bricks port assessment

Baseline: Content Explorer for Etch v2.2.2, commit 10391f183507da71d51f58ac44b4963f47deab68.

The port is feasible. Most of the explorer is a WordPress application rather than an Etch data layer. The difficult work is complete Bricks relationship coverage and a reliable builder integration across versions.

| Capability | Difficulty | Initial preview |
| --- | --- | --- |
| Lists, search, sorting, hierarchy, quick edit, creation, Trash | Low | Reuses the WordPress backend and UI |
| Taxonomies, safe HTML titles, sorting preferences | Low | Reuses the baseline |
| Appearance, editor choices, settings transfer | Low | Separate plugin identity and storage |
| Bricks editor links and capability checks | Moderate | Uses Helpers::get_builder_edit_link and Capabilities::current_user_can_use_builder |
| Bricks template inventory | Low | Includes bricks_template without enabling its public REST controller |
| Literal links and explicit Template element usage | Moderate | Reads saved content/header/footer element metadata and refreshes on metadata changes |
| Site/item maps, ACF and Meta Box relationships | Moderate | WordPress map and field providers retained; Bricks adapter adds explicit usage |
| Native Bricks toolbar integration and theme matching | Moderate | Native compass and connections icons; original workspace styling retained |
| Bricks components | Higher | Not included; option-backed IDs require a different graph identity and usage scanner |
| Condition-based template assignments | Higher | Not included; archive and request conditions require explicit context and exclusion handling |
| WordPress.org readiness | Moderate | Metadata, no external updater, local assets and notices prepared; full review still required |

## Expected effort

Planning estimate rather than a fixed quote: several focused development days for a polished post/template explorer, then additional days for components, conditional template coverage, performance testing, accessibility checks, and release hardening. The prototype demonstrates the reusable core; it does not establish full parity or directory acceptance.

## Architecture

Keep the content application independent of the builder. Bricks only supplies the entry point, editor URLs, access decisions, and saved-data adapter. The native toolbar shortcuts mount the original explorer as a workspace panel beneath the Bricks toolbars without modifying its Vue internals. The original SVG icons and visual styling are retained; lengths use the original 16px design base so Bricks' 10px root font does not shrink the interface. It preserves the current builder session and opens other documents in a separate tab.

Do not render dynamic data or user code to discover relationships. Describe unresolved dynamic/conditional dependencies as a known scope limit. Represent future components with a distinct identifier rather than pretending they are post IDs.

## Directory preparation

Use the Content Explorer for Bricks name and content-explorer-for-bricks slug, with third-party affiliation clarified. Minimum WP 7.0, minimum PHP 8.4, tested up to 7.2. Retain GPL and icon/component licenses. No GitHub updater is included because production updates are intended for WordPress.org.

Before submission, review all Plugin Check findings, expand PHP/WP/MySQL testing, check translation extraction and source availability for bundled assets, measure large-site indexing, and complete keyboard/accessibility verification. Submission and directory approval are separate from creating the GitHub repository.
