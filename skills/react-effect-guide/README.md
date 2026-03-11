# react-effect-guide

Identifies unnecessary useEffect usage in React code and recommends the correct alternative pattern. Based on React's official "You Might Not Need an Effect" documentation, covering all 12 anti-patterns.

## Usage

Install via:

```bash
npx skills add antstackio/skills --skill react-effect-guide
```

Then ask the agent:

- "Review this React component for unnecessary Effects"
- "Build me a Toggle component that notifies a parent on change"
- "My search results don't match what I typed when typing fast"

The skill activates automatically when it detects useEffect usage, derived state patterns, Effect chains, or state synchronization between components.

## What It Does

**When reviewing code**, the skill checks each useEffect against 12 known anti-patterns and flags issues with:
1. A descriptive name for the anti-pattern
2. An explanation of why it's a problem
3. A fix adapted to the specific code
4. Tradeoff notes where relevant

**When writing new code**, the skill runs through a decision tree before reaching for useEffect, preventing anti-patterns from being written in the first place.

## Anti-Patterns Covered

- Derived values in Effects (compute during render instead)
- Expensive calculations in Effects (use useMemo)
- Resetting all state with Effects (use key prop)
- Adjusting partial state with Effects (derive or adjust during render)
- Shared event logic in Effects (extract helper functions)
- Display-caused vs event-caused side effects
- Effect chains (cascading re-renders)
- App initialization in Effects (module-level or guard pattern)
- Notifying parents via Effects (call in event handlers)
- Data flowing up via Effects (lift data to parent)
- External subscriptions in Effects (use useSyncExternalStore)
- Data fetching without cleanup (race condition guard)

## Benchmark Results

Tested across 6 eval scenarios comparing with-skill vs baseline:

| Metric | With Skill | Baseline |
|---|---|---|
| Assertions passed | 28/28 (100%) | 23/28 (82%) |
| Code generation accuracy | Prevents anti-patterns | Writes anti-patterns |
| Review quality | Structured, actionable | Good but less thorough |

The biggest impact is on **code generation tasks** where the baseline writes the exact anti-pattern the skill prevents (e.g., notifying parents via useEffect instead of event handlers).
