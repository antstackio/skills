---
name: design-pattern-validator
description: >
  Validates design pattern usage in TypeScript codebases based on the specific situation
  and context. Identifies appropriate pattern usage, misused patterns, missing patterns
  where they would help, and over-engineered solutions. Use this skill when reviewing
  TypeScript code architecture, refactoring complex systems, or evaluating whether the
  chosen design patterns match the actual requirements. Covers all 23 Gang of Four patterns
  across Creational, Structural, and Behavioral categories.
---

# Design Pattern Validator for TypeScript

Design patterns are reusable solutions to common software design problems. However, they must
be applied appropriately — using the wrong pattern, over-engineering with unnecessary patterns,
or missing opportunities to simplify code are all anti-patterns themselves.

This skill validates design pattern usage based on **situational appropriateness**. A pattern
is correct if it solves a real problem in the codebase and makes the code more maintainable.
A pattern is wrong if it adds complexity without benefit or doesn't match the actual requirements.

## Validation Modes

This skill operates in three modes:

1. **Pattern Review**: Examine existing pattern usage and validate if it's appropriate
2. **Architecture Analysis**: Identify missing patterns that would simplify the code
3. **Design Guidance**: Recommend appropriate patterns for new features before implementation

## Core Principles

Before applying any pattern, ask these questions:

1. **Is there a real problem?** Don't add patterns preemptively for "flexibility"
2. **Is the problem recurring?** One-off solutions don't need patterns
3. **Does the pattern match the problem?** Wrong pattern choice adds confusion
4. **Is the complexity worth it?** Patterns add abstraction — ensure there's payoff

**The rule**: Prefer simple, direct code. Only introduce patterns when they demonstrably
reduce overall complexity or enable necessary flexibility.

---

## Design Pattern Categories

### Creational Patterns
Handle object creation mechanisms, increasing flexibility and reuse of existing code.

### Structural Patterns
Organize relationships between objects and classes into larger, more flexible structures.

### Behavioral Patterns
Manage algorithms, responsibilities, and communication between objects.

---

## Pattern Validation Guidelines

For each pattern below, you'll find:
- **Intent**: What problem the pattern solves
- **When to Use**: Specific scenarios where the pattern is appropriate
- **When NOT to Use**: Anti-patterns and over-engineering red flags
- **TypeScript Specifics**: Language-specific considerations

---

## CREATIONAL PATTERNS

### 1. Singleton

**Intent**: Ensure a class has only one instance with global access point.

**When to Use**:
- Shared resource management (connection pools, thread pools, caches)
- Global application state (logging, configuration)
- Coordinating actions across the system (event bus)
- **Real indicator**: Multiple parts of the code need the exact same instance

**When NOT to Use**:
- Just to make something globally accessible — use dependency injection instead
- For simple configuration objects — use module-level constants
- When you need different instances in tests — Singletons make testing harder
- "I might need only one later" — YAGNI; add it when you actually need it

**TypeScript Validation**:
```typescript
// GOOD: Lazy initialization, private constructor
class Database {
  private static instance: Database;
  private constructor() { /* ... */ }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}

// BAD: Just a namespace pretending to be a Singleton
class Config {
  static apiUrl = "https://api.example.com";
  static timeout = 5000;
}
// Fix: Use a plain object or module-level constants instead
```

**Red Flags**:
- Multiple unrelated responsibilities in the Singleton
- Mutable global state that could be local
- Testing requires special teardown logic

---

### 2. Factory Method

**Intent**: Define an interface for creating objects, but let subclasses decide which class to instantiate.

**When to Use**:
- Framework code where subclasses need to customize object creation
- You have a class hierarchy and need to instantiate the correct subclass
- Object creation logic is complex or requires coordination
- **Real indicator**: The exact type to instantiate varies based on runtime conditions

**When NOT to Use**:
- Simple object construction — just use `new` or a function
- Only one concrete class exists — no polymorphism needed
- Constructor is sufficient — adding a factory is ceremony

**TypeScript Validation**:
```typescript
// GOOD: Actual variation in what gets created
abstract class Dialog {
  abstract createButton(): Button;

  render() {
    const button = this.createButton();
    button.onClick(() => this.closeDialog());
    button.render();
  }
}

class WindowsDialog extends Dialog {
  createButton(): Button { return new WindowsButton(); }
}

class WebDialog extends Dialog {
  createButton(): Button { return new HTMLButton(); }
}

// BAD: Factory with no variation
class UserFactory {
  createUser(name: string): User {
    return new User(name); // Just use `new User(name)` directly
  }
}
```

**Red Flags**:
- Factory always returns the same type
- Only called from one place
- Creation logic is trivial

---

### 3. Abstract Factory

**Intent**: Create families of related objects without specifying concrete classes.

**When to Use**:
- System needs to be independent of how products are created
- Multiple related products need to be used together (consistency requirement)
- Product families that must work together (UI themes, database + cache providers)
- **Real indicator**: You need to swap entire families of objects together

**When NOT to Use**:
- Only one product family exists
- Products don't need to work together as a set
- Simple Factory or Factory Method is sufficient
- Adding new product types requires changing the factory interface

**TypeScript Validation**:
```typescript
// GOOD: Coordinated family creation
interface GUIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

class WindowsFactory implements GUIFactory {
  createButton(): Button { return new WindowsButton(); }
  createCheckbox(): Checkbox { return new WindowsCheckbox(); }
}

class MacFactory implements GUIFactory {
  createButton(): Button { return new MacButton(); }
  createCheckbox(): Checkbox { return new MacCheckbox(); }
}

// BAD: Unrelated products grouped in one factory
interface ServiceFactory {
  createUserService(): UserService;
  createPaymentService(): PaymentService;
  createEmailService(): EmailService;
}
// Fix: These don't need to vary together; inject separately
```

**Red Flags**:
- Products in the factory aren't actually related
- Only one concrete factory exists
- Frequent need to add new product types (violates Open/Closed)

---

### 4. Builder

**Intent**: Construct complex objects step by step, allowing different representations.

**When to Use**:
- Object has many optional parameters (>4 constructor parameters)
- Construction requires multiple steps or validation between steps
- Same construction process creates different representations
- **Real indicator**: Constructor has too many parameters or telescoping constructors

**When NOT to Use**:
- Simple objects with few parameters — use constructor or object literal
- All parameters are required — no complexity to hide
- TypeScript: Just use object literal with required/optional fields

**TypeScript Validation**:
```typescript
// GOOD: Many optional parameters with validation
class HttpRequestBuilder {
  private request: Partial<HttpRequest> = {};

  setUrl(url: string): this {
    this.request.url = url;
    return this;
  }

  setMethod(method: string): this {
    this.request.method = method;
    return this;
  }

  setHeaders(headers: Record<string, string>): this {
    this.request.headers = headers;
    return this;
  }

  build(): HttpRequest {
    if (!this.request.url) throw new Error("URL required");
    return this.request as HttpRequest;
  }
}

// BAD: Builder for simple object
class UserBuilder {
  private user: Partial<User> = {};

  setName(name: string): this {
    this.user.name = name;
    return this;
  }

  build(): User { return this.user as User; }
}
// Fix: Just use { name: "John" } or new User("John")
```

**Red Flags**:
- Fewer than 4 configurable parameters
- No validation or complex construction logic
- Builder methods just set fields with no processing

---

### 5. Prototype

**Intent**: Clone existing objects without depending on their concrete classes.

**When to Use**:
- Object creation is expensive (database queries, file I/O, complex computation)
- Need to create objects based on a template/preset
- Decoupling code from concrete classes being instantiated
- **Real indicator**: `new` is expensive, and you have archetypal instances

**When NOT to Use**:
- Object creation is cheap
- TypeScript: Just use spread operator `{ ...obj }` or `Object.assign`
- Deep cloning is needed — use a cloning library instead
- Prototypes share mutable state unintentionally

**TypeScript Validation**:
```typescript
// GOOD: Expensive object with clone method
class GraphicsShape {
  constructor(private canvas: CanvasContext, private pixels: Uint8Array) {
    // Expensive rendering computation
  }

  clone(): GraphicsShape {
    return new GraphicsShape(this.canvas, new Uint8Array(this.pixels));
  }
}

// BAD: Trivial cloning
class User {
  clone(): User {
    return { ...this }; // Just use spread operator directly
  }
}
```

**Red Flags**:
- Clone method just uses spread operator
- No expensive initialization
- Mutable state causes unintended sharing

---

## STRUCTURAL PATTERNS

### 6. Adapter

**Intent**: Convert the interface of a class into another interface clients expect.

**When to Use**:
- Integrating third-party libraries with incompatible interfaces
- Legacy code integration
- Making incompatible classes work together
- **Real indicator**: You control the client but not the service, or vice versa

**When NOT to Use**:
- You control both interfaces — change them directly
- Adapter is just renaming methods with no logic
- One-to-one method forwarding — consider re-exporting instead

**TypeScript Validation**:
```typescript
// GOOD: Actual interface translation
interface MediaPlayer {
  play(filename: string): void;
}

class VlcPlayer {
  playVlcFile(file: VlcFile): void { /* ... */ }
}

class VlcAdapter implements MediaPlayer {
  constructor(private vlc: VlcPlayer) {}

  play(filename: string): void {
    const vlcFile = this.convertToVlcFormat(filename);
    this.vlc.playVlcFile(vlcFile);
  }

  private convertToVlcFormat(filename: string): VlcFile {
    // Actual conversion logic
  }
}

// BAD: Trivial renaming
class LoggerAdapter {
  constructor(private logger: Logger) {}
  log(msg: string) { this.logger.write(msg); }
}
// Fix: Just use the logger directly or alias the method
```

**Red Flags**:
- Adapter has no conversion logic
- You could just change the original interface
- One class, one adapter (no reuse)

---

### 7. Bridge

**Intent**: Separate abstraction from implementation so they can vary independently.

**When to Use**:
- Avoid permanent binding between abstraction and implementation
- Both abstraction and implementation should be extensible by subclassing
- Changes in implementation shouldn't affect clients
- **Real indicator**: Two dimensions of variation that multiply (Shape × Color, Device × App)

**When NOT to Use**:
- Only one implementation exists
- Abstraction and implementation don't vary independently
- Simpler delegation or strategy pattern would work

**TypeScript Validation**:
```typescript
// GOOD: Two varying dimensions
abstract class RemoteControl {
  constructor(protected device: Device) {}

  togglePower() { this.device.isEnabled() ? this.device.disable() : this.device.enable(); }
  volumeUp() { this.device.setVolume(this.device.getVolume() + 10); }
}

class AdvancedRemote extends RemoteControl {
  mute() { this.device.setVolume(0); }
}

interface Device {
  isEnabled(): boolean;
  enable(): void;
  disable(): void;
  getVolume(): number;
  setVolume(percent: number): void;
}

// BAD: Single implementation dimension
class Shape {
  constructor(private renderer: Renderer) {}
}
// If Shape has no variations (Circle, Square), Bridge is overkill
```

**Red Flags**:
- Only one implementation of the "implementation" interface
- Abstraction has no subclasses
- Could be solved with simple composition

---

### 8. Composite

**Intent**: Compose objects into tree structures to represent part-whole hierarchies.

**When to Use**:
- Tree structures where leaf and composite nodes should be treated uniformly
- File systems, UI component trees, organization hierarchies
- Clients should ignore the difference between individual and composed objects
- **Real indicator**: You need to apply operations recursively on a tree

**When NOT to Use**:
- No hierarchical structure
- Leaf and composite nodes have very different interfaces
- Tree is shallow (2 levels) — simple parent-child is enough

**TypeScript Validation**:
```typescript
// GOOD: Uniform tree structure
interface Graphic {
  draw(): void;
}

class Circle implements Graphic {
  draw() { /* draw circle */ }
}

class CompositeGraphic implements Graphic {
  private children: Graphic[] = [];

  add(graphic: Graphic) { this.children.push(graphic); }
  draw() { this.children.forEach(child => child.draw()); }
}

// BAD: Different interfaces
interface FileSystemNode {
  getName(): string;
}

class File implements FileSystemNode {
  getName() { return this.name; }
  getSize() { return this.size; }
}

class Directory implements FileSystemNode {
  getName() { return this.name; }
  addFile(file: File) { /* ... */ }
  // Different interface — Composite doesn't help
}
```

**Red Flags**:
- Leaf and composite have completely different methods
- No recursive operations needed
- Only 2 levels deep

---

### 9. Decorator

**Intent**: Attach additional responsibilities to objects dynamically without subclassing.

**When to Use**:
- Add responsibilities to individual objects, not entire classes
- Extension by subclassing is impractical (class explosion)
- Responsibilities should be addable/removable at runtime
- **Real indicator**: Need to mix and match features independently (logging + caching + retry)

**When NOT to Use**:
- Static features known at compile time — use inheritance
- TypeScript: Just use composition or mixins
- Single additional feature — simple wrapper class is enough
- Decorator chain becomes too deep (hard to debug)

**TypeScript Validation**:
```typescript
// GOOD: Composable behaviors
interface DataSource {
  writeData(data: string): void;
  readData(): string;
}

class FileDataSource implements DataSource {
  writeData(data: string) { /* write to file */ }
  readData(): string { /* read from file */ }
}

class EncryptionDecorator implements DataSource {
  constructor(private wrapped: DataSource) {}

  writeData(data: string) {
    const encrypted = this.encrypt(data);
    this.wrapped.writeData(encrypted);
  }

  readData(): string {
    const data = this.wrapped.readData();
    return this.decrypt(data);
  }
}

const source = new EncryptionDecorator(
  new CompressionDecorator(
    new FileDataSource()
  )
);

// BAD: Single decorator with no composition
class LoggingUserService implements UserService {
  constructor(private service: UserService) {}

  getUser(id: string) {
    console.log("Getting user");
    return this.service.getUser(id);
  }
}
// Fix: Just add logging in the original class or use AOP
```

**Red Flags**:
- Only one decorator exists
- Decorators are never composed
- Interface has many methods that just forward

---

### 10. Facade

**Intent**: Provide a simplified interface to a complex subsystem.

**When to Use**:
- Complex system with many interdependent classes
- Layering subsystems (entry point to each layer)
- Simplifying API for common use cases
- **Real indicator**: Clients need to interact with many classes to accomplish one task

**When NOT to Use**:
- Subsystem is already simple
- Facade just forwards calls one-to-one
- Hiding necessary complexity (leaky abstraction)

**TypeScript Validation**:
```typescript
// GOOD: Simplifies complex subsystem
class VideoConverter {
  convert(filename: string, format: string): File {
    const file = new VideoFile(filename);
    const sourceCodec = new CodecFactory().extract(file);

    const destinationCodec = format === "mp4"
      ? new MPEG4CompressionCodec()
      : new OggCompressionCodec();

    const buffer = BitrateReader.read(filename, sourceCodec);
    const result = BitrateReader.convert(buffer, destinationCodec);
    return new AudioMixer().fix(result);
  }
}

// BAD: Trivial wrapper
class UserFacade {
  constructor(private userService: UserService) {}

  getUser(id: string) {
    return this.userService.getUser(id);
  }
}
// Fix: Just use UserService directly
```

**Red Flags**:
- One-to-one method mapping
- No coordination logic
- Clients need to bypass the facade frequently

---

### 11. Flyweight

**Intent**: Share common state between multiple objects to save memory.

**When to Use**:
- Application uses huge numbers of similar objects
- Objects have mostly immutable shared state (intrinsic state)
- Object identity doesn't matter
- **Real indicator**: Memory profiling shows object duplication

**When NOT to Use**:
- Small number of objects
- No shared state
- Premature optimization — measure first
- Added complexity outweighs memory savings

**TypeScript Validation**:
```typescript
// GOOD: Large number of similar objects
class TreeType {
  constructor(
    private name: string,
    private color: string,
    private texture: Texture
  ) {}

  draw(canvas: Canvas, x: number, y: number) {
    // Draw using shared state
  }
}

class TreeFactory {
  private static treeTypes = new Map<string, TreeType>();

  static getTreeType(name: string, color: string, texture: Texture): TreeType {
    const key = `${name}_${color}`;
    if (!this.treeTypes.has(key)) {
      this.treeTypes.set(key, new TreeType(name, color, texture));
    }
    return this.treeTypes.get(key)!;
  }
}

class Tree {
  constructor(
    private x: number,
    private y: number,
    private type: TreeType
  ) {}
}

// BAD: Premature optimization
class Point {
  private static cache = new Map<string, Point>();

  static create(x: number, y: number): Point {
    const key = `${x},${y}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new Point(x, y));
    }
    return this.cache.get(key)!;
  }
}
// Fix: Just use `new Point(x, y)` unless profiling shows a problem
```

**Red Flags**:
- No memory problem measured
- Few instances created
- Extrinsic state dominates (little sharing)

---

### 12. Proxy

**Intent**: Provide a surrogate or placeholder to control access to another object.

**When to Use**:
- Lazy initialization (virtual proxy)
- Access control (protection proxy)
- Remote object access (remote proxy)
- Logging, caching, reference counting
- **Real indicator**: Need to add behavior before/after delegating to the real object

**When NOT to Use**:
- No additional control/logic needed
- TypeScript: Use ES6 Proxy for dynamic property access instead
- Simple logging — use decorator or middleware

**TypeScript Validation**:
```typescript
// GOOD: Lazy initialization of expensive object
class DatabaseProxy implements Database {
  private database: RealDatabase | null = null;

  query(sql: string): Result {
    if (!this.database) {
      this.database = new RealDatabase(); // Expensive connection
    }
    return this.database.query(sql);
  }
}

// GOOD: Protection proxy
class DocumentProxy implements Document {
  constructor(
    private document: RealDocument,
    private user: User
  ) {}

  read(): string {
    if (this.user.hasPermission("read")) {
      return this.document.read();
    }
    throw new Error("Access denied");
  }
}

// BAD: No added behavior
class ServiceProxy {
  constructor(private service: Service) {}

  doWork() { return this.service.doWork(); }
}
// Fix: Just use Service directly
```

**Red Flags**:
- Proxy has no additional logic
- All methods just forward calls
- Real object is always created immediately

---

## BEHAVIORAL PATTERNS

### 13. Chain of Responsibility

**Intent**: Pass requests along a chain of handlers until one handles it.

**When to Use**:
- Multiple objects can handle a request, but handler isn't known in advance
- Set of handlers should be dynamic
- Handlers should be executed in specific order
- **Real indicator**: Middleware, filter chains, event bubbling

**When NOT to Use**:
- Only one handler exists
- Handler is known at compile time
- No request should go unhandled (use explicit routing instead)
- Performance critical (chain traversal is slower)

**TypeScript Validation**:
```typescript
// GOOD: Middleware chain
abstract class Handler {
  private next: Handler | null = null;

  setNext(handler: Handler): Handler {
    this.next = handler;
    return handler;
  }

  handle(request: Request): Response | null {
    const result = this.doHandle(request);
    if (result) return result;
    return this.next ? this.next.handle(request) : null;
  }

  protected abstract doHandle(request: Request): Response | null;
}

class AuthHandler extends Handler {
  protected doHandle(request: Request): Response | null {
    if (!request.hasValidToken()) {
      return { status: 401, body: "Unauthorized" };
    }
    return null; // Pass to next
  }
}

// BAD: Static if-else chain disguised as pattern
class RequestHandler extends Handler {
  protected doHandle(request: Request): Response | null {
    if (request.path === "/users") return this.handleUsers(request);
    if (request.path === "/posts") return this.handlePosts(request);
    return null;
  }
}
// Fix: Use a router or simple switch statement
```

**Red Flags**:
- Chain is never modified at runtime
- All requests follow the same path
- No request should be unhandled

---

### 14. Command

**Intent**: Encapsulate a request as an object, enabling parameterization and queuing.

**When to Use**:
- Parameterize objects with operations (buttons, menu items)
- Queue operations, schedule execution, or support undo
- Log changes for recovery or audit
- **Real indicator**: Need undo/redo, macro recording, or transaction log

**When NOT to Use**:
- Simple callback is sufficient
- No undo/queuing/logging needed
- Command has no state or parameters
- TypeScript: Just use functions (first-class functions are better than Command objects)

**TypeScript Validation**:
```typescript
// GOOD: Undo/redo support
interface Command {
  execute(): void;
  undo(): void;
}

class TransferMoneyCommand implements Command {
  constructor(
    private from: Account,
    private to: Account,
    private amount: number
  ) {}

  execute() {
    this.from.withdraw(this.amount);
    this.to.deposit(this.amount);
  }

  undo() {
    this.to.withdraw(this.amount);
    this.from.deposit(this.amount);
  }
}

class CommandHistory {
  private history: Command[] = [];

  execute(command: Command) {
    command.execute();
    this.history.push(command);
  }

  undo() {
    const command = this.history.pop();
    command?.undo();
  }
}

// BAD: Command with no state
class SaveCommand implements Command {
  execute() { document.save(); }
  undo() { /* undo not possible */ }
}
// Fix: Just use () => document.save()
```

**Red Flags**:
- Command has no state
- No undo support needed
- Execute method just calls a function

---

### 15. Iterator

**Intent**: Access elements of a collection sequentially without exposing representation.

**When to Use**:
- Custom traversal algorithm (DFS, BFS, filtered iteration)
- Multiple traversals in progress simultaneously
- Uniform interface for different collection types
- **Real indicator**: TypeScript — just implement `Iterable<T>` for `for...of` support

**When NOT to Use**:
- TypeScript: Built-in iteration is sufficient (arrays, maps, sets)
- Single, simple traversal — just expose the array
- No custom traversal logic

**TypeScript Validation**:
```typescript
// GOOD: Custom tree traversal
class TreeNode<T> {
  constructor(
    public value: T,
    public children: TreeNode<T>[] = []
  ) {}

  *[Symbol.iterator](): Iterator<T> {
    yield this.value;
    for (const child of this.children) {
      yield* child;
    }
  }

  *breadthFirst(): Iterator<T> {
    const queue = [this];
    while (queue.length > 0) {
      const node = queue.shift()!;
      yield node.value;
      queue.push(...node.children);
    }
  }
}

// BAD: Wrapper around array
class NumberCollection {
  constructor(private items: number[]) {}

  *[Symbol.iterator](): Iterator<number> {
    for (const item of this.items) {
      yield item;
    }
  }
}
// Fix: Just expose items directly or return items
```

**Red Flags**:
- Iterator just wraps array iteration
- No custom traversal logic
- Single traversal pattern

---

### 16. Mediator

**Intent**: Reduce chaotic dependencies by making objects communicate through a mediator.

**When to Use**:
- Set of objects communicate in complex ways (many-to-many)
- Reusing objects is difficult due to tight coupling
- Scattered behavior should be customized without subclassing
- **Real indicator**: Event bus, chatroom coordinator, dialog form validation

**When NOT to Use**:
- Simple one-to-one or one-to-many relationships
- Mediator becomes a "god object" with too many responsibilities
- Direct communication is clearer

**TypeScript Validation**:
```typescript
// GOOD: Complex UI component coordination
class DialogMediator {
  private title: TextBox;
  private listBox: ListBox;
  private okButton: Button;

  constructor() {
    this.title = new TextBox(this);
    this.listBox = new ListBox(this);
    this.okButton = new Button(this);
  }

  notify(sender: Component, event: string) {
    if (sender === this.title && event === "change") {
      this.listBox.filter(this.title.getText());
    }

    if (sender === this.listBox && event === "select") {
      this.title.setText(this.listBox.getSelected());
    }
  }
}

// BAD: Mediator for simple delegation
class UserMediator {
  constructor(
    private userService: UserService,
    private emailService: EmailService
  ) {}

  createUser(data: UserData) {
    const user = this.userService.create(data);
    this.emailService.sendWelcome(user);
  }
}
// Fix: Just put this in a UserController or service method
```

**Red Flags**:
- Only two components communicating
- Mediator has no complex coordination logic
- Becomes a god object

---

### 17. Memento

**Intent**: Capture and restore an object's internal state without violating encapsulation.

**When to Use**:
- Need to save/restore object state (undo, snapshots, checkpoints)
- Direct state access would violate encapsulation
- Rollback transactions
- **Real indicator**: Snapshot + restore functionality with private state

**When NOT to Use**:
- State is already public
- TypeScript: Just use `{ ...obj }` for simple state copy
- State is too large to copy efficiently
- Serialization is simpler (JSON.stringify/parse)

**TypeScript Validation**:
```typescript
// GOOD: Encapsulated state snapshot
class Editor {
  private text: string = "";
  private cursor: number = 0;
  private selection: [number, number] = [0, 0];

  createMemento(): Memento {
    return new Memento(this.text, this.cursor, this.selection);
  }

  restore(memento: Memento) {
    this.text = memento.getText();
    this.cursor = memento.getCursor();
    this.selection = memento.getSelection();
  }
}

class Memento {
  constructor(
    private text: string,
    private cursor: number,
    private selection: [number, number]
  ) {}

  getText() { return this.text; }
  getCursor() { return this.cursor; }
  getSelection() { return this.selection; }
}

// BAD: Public state with spread operator
class Form {
  text: string = "";

  save() { return { ...this }; }
  restore(state: any) { Object.assign(this, state); }
}
// Fix: This isn't Memento pattern, just use spread directly
```

**Red Flags**:
- All state is public
- Just using object spread
- No encapsulation benefit

---

### 18. Observer

**Intent**: Define a subscription mechanism to notify multiple objects about events.

**When to Use**:
- One object's state change should trigger updates to unknown number of dependents
- Publishers and subscribers should be loosely coupled
- Dynamic subscription list
- **Real indicator**: Event emitters, reactive data, pub/sub systems

**When NOT to Use**:
- TypeScript: Use native EventTarget or EventEmitter instead
- Only one subscriber
- Tight coupling is acceptable
- Observer list never changes

**TypeScript Validation**:
```typescript
// GOOD: Event notification system
interface Observer<T> {
  update(data: T): void;
}

class Observable<T> {
  private observers: Observer<T>[] = [];

  subscribe(observer: Observer<T>) {
    this.observers.push(observer);
  }

  unsubscribe(observer: Observer<T>) {
    this.observers = this.observers.filter(o => o !== observer);
  }

  notify(data: T) {
    this.observers.forEach(o => o.update(data));
  }
}

class Stock extends Observable<number> {
  setPrice(price: number) {
    // Update price
    this.notify(price);
  }
}

// BAD: Callback list
class Button {
  private listeners: (() => void)[] = [];

  onClick(listener: () => void) {
    this.listeners.push(listener);
  }
}
// Fix: This is fine; no need for formal Observer pattern
```

**Red Flags**:
- Single subscriber
- Could use simple callback
- No dynamic subscription needed

---

### 19. State

**Intent**: Allow an object to alter its behavior when its internal state changes.

**When to Use**:
- Object has many states with different behaviors
- Large conditionals based on state scattered across methods
- State transitions are complex
- **Real indicator**: Big switch/if-else on state in multiple methods

**When NOT to Use**:
- Few states (2-3 simple states)
- State-based logic is isolated to one place
- TypeScript: Discriminated unions + switch is clearer

**TypeScript Validation**:
```typescript
// GOOD: Complex state behavior
interface State {
  insertCoin(context: VendingMachine): void;
  selectProduct(context: VendingMachine): void;
  dispense(context: VendingMachine): void;
}

class VendingMachine {
  private state: State = new NoCoinState();

  setState(state: State) { this.state = state; }
  insertCoin() { this.state.insertCoin(this); }
  selectProduct() { this.state.selectProduct(this); }
  dispense() { this.state.dispense(this); }
}

class NoCoinState implements State {
  insertCoin(context: VendingMachine) {
    console.log("Coin inserted");
    context.setState(new HasCoinState());
  }

  selectProduct() { console.log("Insert coin first"); }
  dispense() { console.log("Insert coin first"); }
}

// BAD: Simple state flag
class Door {
  private state: "open" | "closed" = "closed";

  open() {
    if (this.state === "closed") {
      this.state = "open";
    }
  }

  close() {
    if (this.state === "open") {
      this.state = "closed";
    }
  }
}
// Fix: This is perfectly fine; no pattern needed
```

**Red Flags**:
- 2-3 simple states
- State logic isolated to one method
- TypeScript unions would be clearer

---

### 20. Strategy

**Intent**: Define a family of algorithms and make them interchangeable.

**When to Use**:
- Multiple algorithms for a task, chosen at runtime
- Isolate algorithm implementation from usage
- Avoid conditionals for selecting behavior
- **Real indicator**: Different ways to do the same thing (sort algorithms, compression, routing)

**When NOT to Use**:
- Only one algorithm exists
- Algorithm never changes at runtime
- TypeScript: Just use function parameters

**TypeScript Validation**:
```typescript
// GOOD: Runtime-selected algorithms
interface SortStrategy<T> {
  sort(data: T[]): T[];
}

class QuickSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] { /* quicksort */ }
}

class MergeSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] { /* mergesort */ }
}

class Sorter<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>) {
    this.strategy = strategy;
  }

  sort(data: T[]): T[] {
    return this.strategy.sort(data);
  }
}

// BAD: Strategy for static algorithm
class TaxCalculator {
  constructor(private strategy: TaxStrategy) {}

  calculate(amount: number) {
    return this.strategy.calculate(amount);
  }
}
// If strategy never changes, just use a function parameter
```

**Red Flags**:
- Strategy never changes at runtime
- Only one strategy exists
- Could use a simple function parameter

---

### 21. Template Method

**Intent**: Define the skeleton of an algorithm, letting subclasses override specific steps.

**When to Use**:
- Multiple classes have similar algorithms with slight variations
- Want to control which steps can be customized
- Avoid code duplication in similar algorithms
- **Real indicator**: Workflow with fixed steps but variable implementation

**When NOT to Use**:
- TypeScript: Prefer composition over inheritance
- Steps vary significantly between implementations
- Only used once (no code reuse)

**TypeScript Validation**:
```typescript
// GOOD: Standardized workflow with variations
abstract class DataParser {
  parse(path: string): Data {
    const raw = this.readFile(path);
    const data = this.parseData(raw);
    this.validateData(data);
    return data;
  }

  private readFile(path: string): string { /* ... */ }
  protected abstract parseData(raw: string): Data;

  protected validateData(data: Data) {
    // Default validation, can be overridden
  }
}

class JSONParser extends DataParser {
  protected parseData(raw: string): Data {
    return JSON.parse(raw);
  }
}

class XMLParser extends DataParser {
  protected parseData(raw: string): Data {
    return this.parseXML(raw);
  }
}

// BAD: Single implementation
abstract class ReportGenerator {
  generate() {
    this.printHeader();
    this.printBody();
    this.printFooter();
  }

  abstract printHeader(): void;
  abstract printBody(): void;
  abstract printFooter(): void;
}
// If only one subclass exists, just use a regular class
```

**Red Flags**:
- Only one subclass exists
- TypeScript: Composition would be clearer
- All steps are abstract (no common code)

---

### 22. Visitor

**Intent**: Separate algorithms from the objects they operate on.

**When to Use**:
- Perform operations across a heterogeneous object structure
- Many unrelated operations on objects
- Object structure rarely changes, but operations do
- **Real indicator**: AST traversal, compiler passes, reporting on object graphs

**When NOT to Use**:
- Object structure changes frequently (visitor interface changes)
- Operations are simple and belong on the objects
- TypeScript: Discriminated unions + switch is simpler
- Adding new object types is common

**TypeScript Validation**:
```typescript
// GOOD: AST traversal with multiple operations
interface ASTNode {
  accept(visitor: Visitor): void;
}

class NumberNode implements ASTNode {
  constructor(public value: number) {}
  accept(visitor: Visitor) { visitor.visitNumber(this); }
}

class AddNode implements ASTNode {
  constructor(public left: ASTNode, public right: ASTNode) {}
  accept(visitor: Visitor) { visitor.visitAdd(this); }
}

interface Visitor {
  visitNumber(node: NumberNode): void;
  visitAdd(node: AddNode): void;
}

class EvaluatorVisitor implements Visitor {
  visitNumber(node: NumberNode) { return node.value; }
  visitAdd(node: AddNode) { /* evaluate */ }
}

class PrinterVisitor implements Visitor {
  visitNumber(node: NumberNode) { console.log(node.value); }
  visitAdd(node: AddNode) { /* print */ }
}

// BAD: Simple type checking
type Shape = Circle | Rectangle;

interface Visitor {
  visitCircle(c: Circle): void;
  visitRectangle(r: Rectangle): void;
}
// Fix: Use discriminated union with switch instead
```

**Red Flags**:
- Object types change frequently
- TypeScript: Union types + switch is clearer
- Few operations

---

## Validation Workflow

When reviewing code for design patterns, follow this workflow:

### 1. Identify Pattern Usage
Look for:
- Class structures that match pattern signatures
- Comments mentioning patterns
- Names like `*Factory`, `*Builder`, `*Proxy`, etc.

### 2. Validate Appropriateness
For each pattern found, ask:
- **Does it solve a real problem?** Not just theoretical flexibility
- **Is the problem recurring?** One-off solutions don't need patterns
- **Does the benefit outweigh complexity?** Measure against simpler alternatives
- **Are TypeScript alternatives better?** (unions, functions, built-in features)

### 3. Check for Missing Patterns
Identify code smells that suggest missing patterns:
- God classes → Facade or Mediator
- Constructor with many parameters → Builder
- Type-based conditionals → Strategy or State
- Coupled object creation → Factory Method or Abstract Factory

### 4. Report Findings
Structure feedback as:
1. **Pattern identified**: Name and location
2. **Assessment**: Appropriate, misused, or missing
3. **Reasoning**: Why it is/isn't appropriate for this situation
4. **Recommendation**: Keep, refactor, or introduce pattern
5. **Code example**: Show the fix if refactoring is needed

---

## TypeScript-Specific Considerations

TypeScript provides alternatives to many classical patterns:

1. **Use Discriminated Unions over State/Strategy for simple cases**:
   ```typescript
   type State = { type: "loading" } | { type: "success", data: Data } | { type: "error", error: Error };
   ```

2. **Use Function Types over Command for simple cases**:
   ```typescript
   type Command = () => void;
   ```

3. **Use Generics over Template Method**:
   ```typescript
   function process<T>(data: T, parse: (raw: T) => Data): Data
   ```

4. **Use Object Literals over Builder for simple config**:
   ```typescript
   const config: Config = { url: "...", timeout: 5000 };
   ```

5. **Use ES6 Proxy over classic Proxy for dynamic behavior**:
   ```typescript
   const proxy = new Proxy(target, { get(target, prop) { /* ... */ } });
   ```

---

## How to Report Issues

When you find pattern misuse or missing patterns:

1. **Name the pattern concern**: "Singleton with mutable global state" or "Missing Factory Method"
2. **Explain the problem**: Why current approach is problematic
3. **Show the impact**: Performance, maintainability, testability issues
4. **Provide the fix**: Refactored code using appropriate pattern (or removing unnecessary pattern)
5. **Note tradeoffs**: When to use the pattern and when simpler code is better

Always prefer simple, direct code. Patterns are tools for managing complexity — not
certificates of sophistication. The best code is code that's easy to understand and change.
