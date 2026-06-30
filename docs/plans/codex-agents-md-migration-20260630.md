# Codex AGENTS.md Migration Plan

- Date: 2026-06-30
- Project: estate-web

## Goal

Restore the full project-specific agent instructions for Codex by migrating the existing Claude Code guidance from `CLAUDE.md` into `AGENTS.md`.

## Scope

- Replace the incomplete 5-line `AGENTS.md` with the full migrated project guidance.
- Preserve the existing frontend, Git, PR, TypeScript, Next.js, security, testing, and API-client rules.
- Adjust naming references from Claude/CLAUDE.md to Codex/AGENTS.md where appropriate.

## Validation

- Compare line counts and diff against `CLAUDE.md` to confirm only Codex-oriented naming changes were introduced.
- Keep application source code untouched.
