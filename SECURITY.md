# Security Policy

## Supported Versions

Only the latest version deployed to production is actively supported with security fixes.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security vulnerabilities by emailing the project maintainers directly. Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept code
- Any suggested mitigations

You will receive an acknowledgement within 48 hours. We aim to release a patch within 7 days for critical issues.

## Scope

The following are in scope:

- Authentication and authorization bypasses
- Firestore security rule weaknesses
- Injection vulnerabilities (XSS, CSRF, etc.)
- Exposure of sensitive data (API keys, credentials, PII)
- Dependency vulnerabilities with a clear exploitation path

## Security Controls in Place

| Control | Implementation |
|---|---|
| SAST | CodeQL (runs on every push/PR and weekly) |
| Dependency scanning | Dependency Review Action (blocks high/critical CVEs on PRs) |
| Secrets management | GitHub Secrets — never committed to the repository |
| Firestore access control | Security rules enforce authentication and role-based ownership on every collection |
| CI/CD least privilege | `GITHUB_TOKEN` scoped to `contents: read` by default; jobs declare only needed permissions |
| Branch protection | PRs to `main` require passing CI checks before merge |
