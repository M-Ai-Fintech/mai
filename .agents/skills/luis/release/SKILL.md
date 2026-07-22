---
name: release
description: Mark a MAI Backlog task as Done and announce it in the releases channel. Use for /release, entrega, entregar, or deliver after verifying the task is In Progress and ready for release.
---

# Release Backlog Task

Mark a Backlog task as Done and announce the release in the #releases Slack channel.

**Aliases:** `/entrega`, `/entregar`, `/deliver`

## Usage

```
/release MAI-XXX
/entrega MAI-XXX
```

## Arguments

- `MAI-XXX` (required): The Backlog task identifier (e.g., MAI-743)

## Workflow

1. **Fetch the task** with `backlog task view MAI-N --plain`.
2. **Validate status**: The task MUST be in "In Progress" status
   - If not, warn the user and **stop execution** - do not proceed with any other steps
3. **Change status** with `backlog task edit MAI-N --status "Done" --plain`.
4. **Announce in Slack**: Send a message to #releases (C02S4CK5L90) with the format:
   ```
   Entregue:
   [MAI-XXX] - Task Title
   ```

## Example

Input:
```
/release MAI-743
```

Output in #releases:
```
Entregue:
[MAI-743] - [PROD] - [NOVA INTEGRA] - Toggle para ativar a funcionalidade não aparece no menu
```

## Error Handling

- **Status not "In Progress"**: Display a warning message explaining the current status and that the task must be in "In Progress" before it can be released. Do NOT change the status or post to Slack.
- **Task not found**: Display an error that the task was not found in Backlog.

## Required Tools

- Backlog CLI for task reads and status updates.
- Available Slack connector send-message tool for `#releases`.

## Constants

- Slack #releases channel ID: `C02S4CK5L90`
- Required status before release: `In Progress`
- Target status after release: `Done`
