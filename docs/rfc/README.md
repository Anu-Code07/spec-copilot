# Request for Comments (RFC)

SpecDrive uses an RFC process for significant changes that affect architecture, public APIs, or the specification format.

## When to Write an RFC

- New core domain concepts or spec schema changes
- Breaking CLI or MCP API changes
- New plugin extension points
- Multi-agent workflow changes
- Storage or knowledge base format changes

## RFC Lifecycle

```
Draft → Review → Accepted → Implemented → Archived
         ↓
      Rejected
```

1. **Draft** — Author opens PR adding `docs/rfc/NNNN-title.md`
2. **Review** — Maintainers and community discuss for ≥ 7 days
3. **Accepted** — Merged; implementation can proceed
4. **Implemented** — Linked PR merged; RFC marked complete
5. **Rejected** — Documented with rationale

## RFC Template

```markdown
# RFC-NNNN: Title

- **Status:** Draft | Review | Accepted | Rejected | Implemented
- **Author:** @username
- **Created:** YYYY-MM-DD

## Summary

One paragraph overview.

## Motivation

What problem does this solve?

## Detailed Design

Technical specification.

## Drawbacks

Why might we not do this?

## Alternatives

What else was considered?

## Unresolved Questions

Open items for discussion.
```

## Numbering

RFCs are numbered sequentially: `0001`, `0002`, etc.

## Current RFCs

| RFC | Title | Status |
|-----|-------|--------|
| — | — | — |

No RFCs filed yet. Phase 1 design decisions are documented in [DESIGN-DECISIONS.md](../phase-1/DESIGN-DECISIONS.md).
