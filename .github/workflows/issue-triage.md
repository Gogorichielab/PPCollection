---
emoji: 🏷️
description: Triage newly opened issues by labeling and requesting missing details.
on:
  issues:
    types: [opened, reopened, edited]
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    mode: gh-proxy
    toolsets: [default]
safe-outputs:
  add-labels:
  add-comment:
---

# Issue Triage

## Task

You triage newly opened or updated issues in this repository.

1. Read the issue title, body, labels, and metadata.
2. Classify the issue into one or more categories and apply labels:
   - `bug` for defects or regressions
   - `enhancement` for feature requests
   - `documentation` for docs-related requests
   - `question` for support or clarification requests
3. If the issue body is missing key details, add a concise comment asking for exactly what is missing.
4. If labels are already appropriate and no extra context is needed, call `noop` with a short reason.

## Safe Outputs

- Use `add-labels` to apply issue labels.
- Use `add-comment` only when details are missing or clarification is required.
- Use `noop` when no visible change is needed.
