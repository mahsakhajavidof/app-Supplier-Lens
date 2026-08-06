# Mandatory implementation rules

These rules apply to every code change made in this repository.

1. Keep code clean, readable, and maintainable.
2. Every new or modified source-code file must remain under 250 lines.
   - Split code into focused modules when necessary.
   - Do not refactor an existing oversized file unless required for the requested change.
3. Implement only the explicitly requested change.
   - Do not make unrelated design, styling, architecture, dependency, naming, formatting, or behavior changes.
4. Record every implementation in `worklog.md`, including:
   - date and summary
   - files changed
   - tests added or updated
   - validation results
   - commit and pull-request information
5. Every functional code change must include a corresponding automated test.
   - Cover the intended behavior and important regression cases.
   - Documentation-only and `worklog.md` updates do not recursively require tests.
6. Run the relevant test suite, type checks, and builds after implementation.
7. Do not push or merge if validation fails.
8. When all relevant tests and checks are green:
   - create an intentional commit
   - push the working branch to GitHub
   - open a pull request
   - merge it into the default branch automatically once required GitHub checks pass
9. Never force-push, bypass branch protection, suppress failing tests, or discard existing work to complete the merge.
10. If merging is blocked by permissions, required approval, conflicts, or failing external checks, report the exact blocker and leave the pull request ready for completion.
