# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

## Repository Overview

**Name:** My-new-repo
**Purpose:** A learning/training repository ("Первый репозиторий для обучения" — First repository for learning)
**State:** Early-stage / minimal — currently contains only a README.

## Repository Structure

```
My-new-repo/
├── README.md       # Project description (in Russian)
└── CLAUDE.md       # This file
```

## Git Workflow

- **Default branch:** `main` (remote), `master` (local clone)
- **Feature branches:** Use descriptive names; AI-generated branches follow the pattern `claude/<task-description>-<session-id>`
- Always commit with clear, descriptive messages explaining *why* a change was made
- Push feature branches with `git push -u origin <branch-name>`

## Development Conventions

Since this is a learning repository without an established tech stack, apply these general conventions until a stack is chosen:

- Keep changes small and focused
- Prefer editing existing files over creating new ones unless a new file is clearly necessary
- Do not add unnecessary boilerplate, comments, or abstractions
- Avoid over-engineering — match complexity to the current task only

## Notes for AI Assistants

- This repo is in an early/empty state. When asked to add features, confirm the intended language/framework with the user first if not specified.
- No build system, test runner, linter, or CI pipeline is configured yet. Do not assume any exist.
- The README is written in Russian; follow the user's language preference when adding user-facing documentation.
- Do not create documentation files (README, CLAUDE.md, etc.) unless explicitly requested.
