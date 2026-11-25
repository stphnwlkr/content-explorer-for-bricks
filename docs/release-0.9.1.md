# Quick edit field contrast — 0.9.1

Prepared Nov. 25, 2026, on `release/0.9.1`.

## Cause and correction

WordPress administration `input[type=...]` rules outranked the explorer's class plus zero-specificity `:where()` background rule. Text still inherited the dark dialog foreground, producing light text on white inputs. The installed 0.9.0 reproduction confirmed RGB(255,255,255) backgrounds with RGB(225,225,229) text for title, slug, date, and parent search.

The scoped field rule now uses `:is()` so native-token background and foreground remain paired above WordPress's form rules. No global WordPress input styles or Bricks theme tokens were changed. Both manager fields and dialogs receive the correction.

## Verification

- Installed the exact 0.9.1 ZIP on localhost:8889.
- WordPress administration: title, slug, date, parent search, and select backgrounds RGB(17,17,19), text RGB(225,225,229); placeholders use the same full-strength foreground.
- Slug focus and hover: same readable pair; visible 2px focus outline. No content changes were saved.
- Bricks 2.5-beta: all five field types retain native RGB(35,41,47) surfaces with RGB(226,230,233) text.
- Full production-package Plugin Check 2.2.0 in new-plugin mode: no reported findings; existing reviewed SQL annotations remain unchanged.
- PHP and application JavaScript syntax: passed.
- Color regression suite: 128 pairs plus palette, hover, inverse, borders, and normalization assertions passed.
- WordPress 7.2-RC3 / PHP 8.4 / SQLite: 37 integration and 10 cache assertions passed.
- GitHub/WordPress.org descriptions still match exactly; `git diff --check` passed.
- This focused correction was browser checked in the current admin and Bricks dark palettes. Existing light/custom contrast-math coverage passed; a fresh live light/custom browser pass was not performed.

## Package

File: `content-explorer-for-bricks-0.9.1.zip`.
SHA-256: `8ba89a0d38e98675f242d3d2502525199bec328670938ca60aa79297f9703fec`.
Directory review update status is recorded in `notes.md`.
