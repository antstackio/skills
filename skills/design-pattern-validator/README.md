# design-pattern-validator

Validates design pattern usage in TypeScript codebases based on situational appropriateness. Identifies correct pattern usage, misused patterns, missing patterns where they would help, and over-engineered solutions.

## Overview

This skill helps evaluate whether design patterns are being used correctly in TypeScript projects. Based on the comprehensive design pattern catalog from [Refactoring Guru](https://refactoring.guru/design-patterns/typescript), it covers all 23 Gang of Four patterns across Creational, Structural, and Behavioral categories.

The skill validates patterns based on **situational appropriateness** — a pattern is correct only if it solves a real problem and makes the code more maintainable. It flags both missing patterns that would simplify code and unnecessary patterns that add complexity without benefit.

## Usage

Install via:

```bash
npx skills add <your-org>/skills --skill design-pattern-validator
```

Then ask the agent:

- "Review this TypeScript repository for design pattern usage"
- "Is the Singleton pattern appropriate here?"
- "What design patterns would improve this authentication system?"
- "I'm building a plugin system — which patterns should I use?"
- "This Factory class feels over-engineered, can you validate it?"

The skill activates when you request architecture reviews, pattern validation, or when discussing refactoring complex systems.

## What It Does

The skill operates in three modes:

### 1. Pattern Review
Examines existing pattern usage and validates appropriateness:
- Identifies which patterns are being used
- Validates if the pattern matches the problem
- Checks if simpler alternatives would work better
- Flags TypeScript-specific alternatives (unions, generics, etc.)

### 2. Architecture Analysis
Identifies missing patterns that would simplify code:
- Detects code smells suggesting pattern opportunities
- Recommends appropriate patterns for the situation
- Explains why the pattern would help
- Shows before/after examples

### 3. Design Guidance
Recommends patterns for new features before implementation:
- Analyzes requirements
- Suggests appropriate patterns
- Explains tradeoffs between pattern choices
- Warns against premature pattern application

## Design Patterns Covered

### Creational Patterns (5)
Handle object creation mechanisms:
- **Singleton** — Ensure single instance with global access
- **Factory Method** — Define interface for creating objects
- **Abstract Factory** — Create families of related objects
- **Builder** — Construct complex objects step by step
- **Prototype** — Clone objects without depending on classes

### Structural Patterns (7)
Organize relationships between objects:
- **Adapter** — Convert incompatible interfaces
- **Bridge** — Separate abstraction from implementation
- **Composite** — Compose tree structures
- **Decorator** — Add behaviors dynamically
- **Facade** — Simplify complex subsystems
- **Flyweight** — Share common state to save memory
- **Proxy** — Control access to objects

### Behavioral Patterns (11)
Manage algorithms and responsibilities:
- **Chain of Responsibility** — Pass requests along handler chain
- **Command** — Encapsulate requests as objects
- **Iterator** — Traverse collections sequentially
- **Mediator** — Reduce chaotic dependencies
- **Memento** — Capture and restore state
- **Observer** — Notify dependents of changes
- **State** — Alter behavior based on state
- **Strategy** — Make algorithms interchangeable
- **Template Method** — Define algorithm skeleton
- **Visitor** — Separate algorithms from objects

## Key Principles

The skill follows these core validation principles:

1. **Real Problems First**: Patterns should solve actual problems, not theoretical ones
2. **Recurring Issues**: One-off solutions don't need patterns
3. **Right Pattern, Right Problem**: Wrong pattern choice adds confusion
4. **Complexity Tradeoff**: Pattern complexity must have clear payoff
5. **TypeScript Alternatives**: Prefer language features (unions, generics, functions) when simpler

**The golden rule**: Prefer simple, direct code. Only introduce patterns when they demonstrably reduce overall complexity or enable necessary flexibility.

## TypeScript-Specific Validation

The skill recognizes TypeScript alternatives to classical patterns:

- **Discriminated Unions** → Instead of State/Strategy for simple cases
- **Function Types** → Instead of Command pattern
- **Generics** → Instead of Template Method
- **Object Literals** → Instead of Builder for simple config
- **ES6 Proxy** → Instead of classic Proxy pattern

This prevents over-engineering with classical patterns when TypeScript provides simpler solutions.

## Example Output

When the skill finds a pattern issue:

```
Pattern Issue: Singleton with Mutable Global State

Location: src/services/ConfigManager.ts:15

Problem:
The ConfigManager Singleton holds mutable state that's accessed globally,
making the code difficult to test and creating hidden dependencies.

Impact:
- Tests must share the same instance and reset state manually
- Parallel test execution is impossible
- State changes have global side effects

Recommended Fix:
Use dependency injection instead. Create a ConfigManager instance and
pass it to classes that need it:

class ConfigManager {
  constructor(private config: Config) {}
  // No singleton pattern needed
}

// In main.ts
const config = new ConfigManager(loadConfig());
const userService = new UserService(config);

When to use Singleton:
- Shared resource pools (database connections, thread pools)
- Truly global coordination (event bus)
- When you need the exact same instance everywhere

This case: Configuration is better injected than globally accessed.
```

## When to Use This Skill

Use this skill when:

- Reviewing architecture of TypeScript projects
- Refactoring complex systems
- Making design decisions for new features
- Code review feedback mentions "design patterns"
- Deciding between different architectural approaches
- Evaluating if code is over-engineered
- Learning when to apply specific patterns

Don't use for:

- Simple bug fixes (unless pattern-related)
- Non-TypeScript codebases (pattern principles still apply but lack TS-specific guidance)
- Questions about non-pattern architectural decisions

## Best Practices

When using this skill:

1. **Provide Context**: Share the specific problem you're trying to solve
2. **Show Code**: Include relevant code snippets for pattern validation
3. **Ask Specific Questions**: "Is Singleton appropriate?" is better than "What pattern should I use?"
4. **Consider Alternatives**: The skill often suggests simpler solutions than patterns

## Pattern Anti-Patterns

The skill identifies these common misuses:

- **Premature Pattern Application**: Adding patterns "for flexibility" before problems exist
- **Wrong Pattern Choice**: Using patterns that don't match the problem
- **God Objects**: Facades or Mediators with too many responsibilities
- **Over-Decorated**: Too many layers of decorators making code hard to debug
- **Singleton Abuse**: Using Singleton just for global access
- **Pattern for Pattern's Sake**: Applying patterns to demonstrate knowledge rather than solve problems

## References

This skill is based on:
- Gang of Four: Design Patterns (1994)
- [Refactoring Guru: Design Patterns in TypeScript](https://refactoring.guru/design-patterns/typescript)
- TypeScript language features and best practices

## Contributing

Found a pattern validation that could be improved? Have suggestions for additional pattern guidance? Please contribute by:

1. Opening an issue with specific examples
2. Suggesting additional validation rules
3. Providing real-world cases where patterns helped or hurt

---

**Remember**: The best pattern is often no pattern at all. This skill helps you make informed decisions about when patterns genuinely improve code versus when they add unnecessary complexity.
