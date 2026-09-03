---
name: OpenAPI validator compatibility
description: OpenAPI integer schemas currently generate an unsupported zod.int helper in this workspace.
---

Use numeric OpenAPI schemas for API payload fields that need integer-like values until the workspace validator is upgraded.

**Why:** The current generated validator package is Zod 3, while the installed Orval output targets the Zod 4-style zod.int helper; integer schemas make the shared library typecheck fail after codegen.

**How to apply:** When adding integer-looking API fields, prefer `type: number` in the OpenAPI contract and keep the field semantically integer in server logic where needed.