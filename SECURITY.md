# Security Policy

## Supported versions

The latest released version (`main`) is the only one that receives
security fixes. There's no LTS branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Threat model in short

NOCTIS WiFi Planner is a fully client-side single-page app. It has:

- **No backend.** No data leaves the user's browser.
- **No third-party network calls** at runtime. Google Fonts is referenced
  only inside the exported HTML/PDF reports, never during normal use.
- **No authentication, no remote storage, no telemetry.**

The realistic attack surface is:

1. **Untrusted project JSON files.** Loading a malicious `.json` could
   feed bad data into the migrator. The migrator validates the top-level
   shape and ignores unknown fields, but a hand-crafted file could still
   trigger unexpected UI states.
2. **Floor-plan images.** Uploaded via `<input type=file>` and stored in
   IndexedDB. Standard browser-level image-decoding sandboxing applies.
3. **HTML export.** Per-AP fields are HTML-escaped before being
   interpolated into the exported report. If you find a way to break
   out of that, please report it (see below).

## Reporting a vulnerability

**Please don't open a public GitHub issue for security bugs.**

Instead, report privately via GitHub's
[private vulnerability reporting](https://github.com/SP1R4/noctis-wifi-planner/security/advisories/new)
on the repository. Include:

- A description of the issue and its impact
- Steps to reproduce (a minimal project file or script if possible)
- Affected version (`git rev-parse HEAD` or release tag)
- Your suggested fix, if any

You'll get an acknowledgement within 72 hours. We aim to ship a patch
within 14 days for high-impact issues and 30 days for lower-impact ones.

## Disclosure

Once a fix is released, the advisory is published with credit to the
reporter (unless you'd rather stay anonymous).

Thank you for helping keep the project safe.
