# Runbook — Version a release

Owner: Release Engineer.

1. Scheme: `R<major>.<minor>` per product (e.g. Release 1, R1.1 for its hotfixes).
   Major = a composed release through the full gate; minor = hotfix-lane patches on
   that major. No date-based or commit-hash "versions" in client-facing anything.
2. Tag the release commit `release/<product>-R<major>.<minor>` at go. The tag is
   the one promoted artifact's identity — env identity travels WITH the artifact
   (one pipeline, one promoted artifact; never rebuilt per target).
3. The composition record, release notes, rollback plan, and both certificates
   (quality, security) all carry the same version string. A document without the
   version string is not part of the release.
