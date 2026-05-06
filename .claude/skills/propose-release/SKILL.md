---
name: propose-release
description: Add a new opportunity to the DxbEstate Intel feed. Triggers when user says "add release", "publish release", "propose release", "add opportunity", or similar with an opportunity name/URL.
---

# Propose Release Skill

Triggers the `propose-release.yml` GitHub Actions workflow to research and add a new opportunity to the DxbEstate Intel feed.

## When to use

Use this skill when the user asks to:
- "Add release X"
- "Publish release X"
- "Propose release X"
- "Add opportunity X"
- "Add X to the feed"
- Any variation asking to add a specific listing/tower/community/developer-launch/auction-lot

## How to trigger

Use the GitHub CLI to trigger the workflow:

```bash
gh workflow run propose-release.yml \
  -f proposal="<USER'S OPPORTUNITY NAME OR URL>"
```

## Parameters

- **proposal** (required): The listing URL, building/tower name, developer launch, auction lot, or community signal the user wants added. URLs are preferred — the workflow verifies them with WebFetch.

## Workflow behavior

The workflow will:
1. Research the opportunity using web search (portals, DLD/RERA, developer pages, auctions)
2. Verify all URLs with WebFetch
3. Add it as the FIRST item in `src/data/releases.json` (also exposed as `src/data/opportunities.json`)
4. Run build to verify
5. Commit and push to master

## After triggering

1. Run the `gh workflow run` command
2. Tell the user the workflow has been triggered
3. Surface the run URL with `gh run list --workflow=propose-release.yml --limit 1` (do not hardcode the repo path — derive it from the active git remote)

## Example

User: "Add opportunity 2BR Marina Gate listing https://www.propertyfinder.ae/..."

```bash
gh workflow run propose-release.yml \
  -f proposal="2BR Marina Gate https://www.propertyfinder.ae/..."
```
