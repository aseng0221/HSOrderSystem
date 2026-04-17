# Skill: Maestro E2E Automation

- **Tooling:** Maestro (YAML-based UI testing).
- **File Location:** All tests should be stored in `.maestro/` or `__tests__/e2e/`.
- **Workflow (Phase 4):** - After generating a UI component or screen, proactively ask: "Should I generate a Maestro flow for this screen?"
  - Use `maestro test [path]` to verify the flow.
- **Maestro Best Practices:**
  - Use `tapOn` with ID (testID) rather than text whenever possible.
  - Include `assertVisible` to verify screen transitions.
  - Use `back` and `scrollUntilVisible` for complex navigation.
- **Command Template:** - Run current test: `maestro test .maestro/test-flow.yaml`
  - Record a new flow (if user requested): `maestro record .maestro/new-flow.yaml`
