# .ai — Project context for AI agents

Project context and instructions for AI coding agents (Claude, GPT, Cursor). Compatible with Anthropic and OpenAI conventions.

## Entrypoint

- **[START_HERE.md](START_HERE.md)** — Read first. Project name, how to run, architecture, primary files, conventions, and default agent prompt.
- **[CLAUDE.md](CLAUDE.md)** — Anthropic (Claude Code) entrypoint; points to START_HERE and rules.

## Requirements and rules

- **[PRD.md](PRD.md)** — Short summary: goals, non-goals, API quick reference.
- **[PRD.json](PRD.json)** — Full product requirements (functional, security, data model, API, UX, known issues).
- **[rules/](rules/)** — Loadable rule files: [conventions](rules/conventions.md), [API](rules/api.md). Use for focused context without loading the full PRD.

## Usage

1. Read `START_HERE.md` first, then `PRD.md` or `rules/` as needed.
2. **Claude Code:** Use [CLAUDE.md](CLAUDE.md) in this folder.
3. **OpenAI / Cursor:** Use `START_HERE.md` as main context; add `@.ai/rules/<topic>.md` for conventions or API rules.
