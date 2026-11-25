# WordPress.org preparation — 0.9.0

Historical Pressship attempt. The subsequent preparation without Pressship, including a validated ZIP and resolved/reviewed warning dispositions, is recorded in [release-0.9.0.md](release-0.9.0.md).

Prepared Nov. 25, 2026. Status: **submission candidate; publishing checks blocked**.

## Prepared

- Local branch: `release/0.9.0`, based on tested beta.6. No commit, push, GitHub release, or release tag was created for 0.9.0.
- PHP header, asset versions, readme Stable tag, changelog, upgrade notice, and repository documentation use 0.9.0.
- Minimum WordPress 7.0, minimum PHP 8.4, tested up to WordPress 7.2 remain unchanged.
- Readme explains saved-reference indexing, unsupported components/condition-based template assignments, permissions, local assets, source location, and warranty terms.
- `.pressshipignore` excludes development instructions, repository README, documentation, scripts, and tests. Runtime JavaScript, CSS, SVGs, vendor assets, and licenses remain included.

## Pressship results

Followed the [Pressship agent runbook](https://pressship.org/ai) using the installed Pressship 0.2.2 package. Homebrew Subversion 1.14.5 is installed at `/opt/homebrew/bin/svn`; PATH was set to include it.

| Check | Result |
| --- | --- |
| `pressship whoami` | Attempted; its Chromium process was blocked before the account check completed |
| `pressship info .` | Passed; plugin name, slug, version 0.9.0, Stable tag 0.9.0, and compatibility metadata identified |
| `pressship status .` | Attempted; browser launch blocked |
| `pressship verify .` | Ran and exited 1; blocked during the remote readme validator, before Plugin Check |
| `pressship pack . --output-dir …` | Ran and exited 1; validation blocked, so no validated ZIP was created |
| `pressship publish . --dry-run -y --output-dir …` | Ran and exited 1; submission-status inspection/browser launch blocked |

The concrete failure is macOS denying Chromium's Mach rendezvous registration (`bootstrap_check_in … Permission denied (1100)`) in this execution environment. No validation-skip flags were used. The error is not evidence of a plugin validation failure or a successful dry run.

## Edge follow-up

At the user's request, checked the already-authenticated Microsoft Edge session through the native UI. WordPress.org showed Stephen Walker as signed in. The Add your Plugin page displayed the new-submission form; no existing matching review entry was shown in that page.

Pressship 0.2.2's browser-session implementation launches its own Playwright Chromium and reads its own saved session. It exposes no Edge channel or existing-browser attachment option. The authenticated Edge session therefore does not resolve the CLI process-launch restriction.

No submission checkboxes were accepted, no ZIP was uploaded, and no authenticated browser session data was exported or copied. The attempted readme-validator navigation was interrupted by concurrent use of Edge; no remote readme-validation result is claimed.

The expected workflow is a new submission, based on the observed Edge form. The CLI did not confirm its publishing route; SVN release readiness is not established.

## Supplemental local checks

- Pressship's local readme parser/validator: **zero findings**. This is the local component only, not a completed `pressship verify`.
- Manifest inspected using Pressship's own package exclusion rules: **60 files, 596,029 uncompressed bytes**. This is a source-manifest size, not a ZIP size. No development directories appeared in that manifest.
- PHP and application JavaScript syntax passed; `git diff --check` passed.
- Isolated WordPress REST/permissions integration: **37 assertions passed**.
- Color regression suite passed: 128 base foreground/background pairs plus original-palette, hover, inverse-label, and border checks.
- Last successful full Plugin Check was beta.6: **0 errors, 16 inherited database warnings**. A fresh 0.9.0 Plugin Check did not run through Pressship because the remote validator failed first. These warnings have not been accepted or hidden.

## Before uploading

1. Run the same Pressship account/status, verify, pack, and publish dry-run sequence in an environment that permits its Chromium process to launch. Keep all validation enabled.
2. Review and resolve or specifically justify the database warnings. Check remaining runtime, source/license, and accessibility gates in validation.md.
3. Inspect the actual verified ZIP and confirmed route, then obtain approval for the concrete WordPress.org submission. Do not commit to SVN or create release tags before directory approval.

Git working files and the local branch changed for preparation. No remote Git or SVN state changed. No upload or release occurred. Raw local command logs and a machine-readable preflight manifest are in the workspace's `outputs/pressship-0.9.0` directory and are excluded from the plugin.
