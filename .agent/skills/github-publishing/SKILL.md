---
name: github-publishing
description: Publishes code to GitHub, manages repositories, and enforces Norwegian commit message standards. Use when the user wants to push code, create a repository, or version control their project.
---

# GitHub Publishing

## When to use this skill
- The user wants to "publish" or "upload" their code to GitHub.
- The user asks to "push" changes.
- The user wants to set up a new repository.
- The user asks about "commit messages" or "git standards".

## Workflow
1.  **Check Status**: Verify if the directory is already a git repository (`git status`).
2.  **Initialize**: If not, run `git init`.
3.  **Ignore**: Ensure a `.gitignore` exists and includes sensitive/generated files (node_modules, .env, etc.).
4.  **Stage**: Add files using `git add .` (warn user if adding large/sensitive files).
5.  **Commit**: Create a commit message following the **Norwegian Standard** (see below).
6.  **Remote**: Check for remote origin (`git remote -v`).
    - If none, asking the user to create a repo or use `gh repo create` if the GitHub CLI is authenticated.
    - Add remote: `git remote add origin <url>`.
7.  **Push**: Push the code associated with the appropriate branch (`git push -u origin main` or similar).

## Instructions

### Norwegian Commit Message Standard
All commit messages MUST be in Norwegian and follow this format:
`<Type>: <Kort beskrivelse>`

**Allowed Types:**
- **Funksjon**: New feature (feat)
- **Fiks**: Bug fix (fix)
- **Dokumentasjon**: Documentation changes (docs)
- **Stil**: Formatting, missing semi colons, etc; no code change (style)
- **Refaktorering**: Refactoring production code (refactor)
- **Test**: Adding missing tests, refactoring tests (test)
- **Vedlikehold**: Updating build tasks, package manager configs, etc (chore)

**Example:**
- `Funksjon: Legg til login-knapp på startsiden`
- `Fiks: Rett krasj ved lasting av brukerprofil`
- `Stil: Juster padding på dashboard-kort`

### Repository Creation Steps
If `gh` CLI is available and authenticated:
```bash
gh repo create smart-training-planner --public --source=. --remote=origin
```

If manual:
1.  Ask user to create a repository on GitHub.
2.  Get the URL (e.g., `https://github.com/user/repo.git`).
3.  Run: `git remote add origin <url>`

### Pushing
Always check the current branch name (`main` or `master`).
```bash
git push -u origin main
```
