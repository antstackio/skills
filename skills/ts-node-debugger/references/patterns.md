# Patterns & TS Reference

## Type-Safe Fix Patterns

---

### 1. Unsafe access → narrowing

```typescript
// ❌ Runtime crash - array/object access returns T | undefined
function getUser(id: string) {
  return db.users[id].name;
}

// ✅ Explicit narrowing
function getUser(id: string): string | null {
  const user = db.users[id];
  if (!user) return null;
  return user.name;
}

// ✅ noUncheckedIndexedAccess forces this at compile time
// tsconfig: { "noUncheckedIndexedAccess": true }
const first = arr[0]; // type: string | undefined - must narrow before use
```

---

### 2. Untyped boundary → Zod validation

Never trust data from req.body, Lambda event.body, external APIs, or JSON.parse.

```typescript
import { z } from "zod";

// ❌ Type assertion - lies to TypeScript, crashes at runtime
const body = req.body as CreateOrderRequest;

// ✅ Parse and validate at the boundary
const CreateOrderSchema = z.object({
  cartId: z.string().uuid(),
  userId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
      })
    )
    .min(1)
});

type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;

// Throws ZodError with field-level details if invalid
const body = CreateOrderSchema.parse(req.body);

// Safe parse - use in handlers to return 422 instead of throwing
const result = CreateOrderSchema.safeParse(req.body);
if (!result.success) {
  return res.status(422).json({ errors: result.error.flatten() });
}
const { cartId, userId } = result.data; // fully typed
```

---

### 3. Async errors → typed Result pattern

Eliminates unknown error types and forces callers to handle failures.

```typescript
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };

// ❌ Caller has no idea what errors to handle
async function fetchOrder(id: string) {
  const res = await fetch(`/orders/${id}`);
  return res.json();
}

// ✅ Errors are part of the type contract
async function fetchOrder(id: string): Promise<Result<Order>> {
  try {
    const res = await fetch(`/orders/${id}`);
    if (!res.ok) {
      return {
        ok: false,
        error: new Error(`HTTP ${res.status}: ${res.statusText}`)
      };
    }
    return { ok: true, data: (await res.json()) as Order };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// Caller is forced to handle both paths
const result = await fetchOrder("123");
if (!result.ok) {
  logger.error(result.error.message);
  return;
}
console.log(result.data.status); // typed as Order
```

---

### 4. Non-exhaustive switch → assertNever

Compile-time guarantee that every union member is handled.

```typescript
// ❌ Silent fallthrough when new status is added to the union
function getLabel(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "shipped":
      return "Shipped";
    // 'cancelled' added later - no compile error, silently returns undefined
  }
}

// ✅ TS2345 compile error if any union member is unhandled
function assertNever(x: never, message = `Unhandled value: ${x}`): never {
  throw new Error(message);
}

type OrderStatus = "pending" | "shipped" | "cancelled";

function getLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "shipped":
      return "Shipped";
    case "cancelled":
      return "Cancelled";
    default:
      return assertNever(status);
  }
}
```

---

### 5. Optional chain abuse → discriminated union

Excessive ?. is a signal the domain model needs explicit states.

```typescript
// ❌ Every consumer must defensively chain - modelling problem
const city = user?.profile?.address?.city ?? "Unknown";

// ✅ Model states explicitly
type User = { status: "guest" } | { status: "registered"; profile: Profile };

type Profile = { address: Address | null };
type Address = { city: string; country: string };

// Usage is self-documenting - no optional chaining needed
if (user.status === "registered" && user.profile.address) {
  console.log(user.profile.address.city);
}
```

---

### 6. Missing await → async correctness

Most common source of vacuous tests and silent data loss.

```typescript
// ❌ Fire-and-forget - error swallowed, response sent before work completes
router.post("/orders", async (req, res) => {
  createOrder(req.body); // missing await
  res.status(201).json({ ok: true });
});

// ❌ Test always passes - assertion runs before promise resolves
test("creates order", async () => {
  createOrder({ cartId: "123" }); // missing await
  expect(mockDb.insert).toHaveBeenCalled(); // false negative
});

// ✅
router.post("/orders", async (req, res, next) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

test("creates order", async () => {
  await createOrder({ cartId: "123" });
  expect(mockDb.insert).toHaveBeenCalled();
});
```

---

### 7. Unhandled promise rejection → global handler

```typescript
// ✅ Safety net - catches anything that slips through
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled rejection");
  process.exit(1);
});

// ✅ Express async wrapper - avoids try/catch in every route
const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const order = await createOrder(req.body); // throws → caught → next(err)
    res.status(201).json(order);
  })
);
```

---

### 8. useEffect issues (React)

```typescript
// ❌ Object literal in deps - new reference every render → infinite loop
useEffect(() => {
  fetchOrders({ page, limit });
}, [{ page, limit }]);

// ✅ Primitive deps only
useEffect(() => {
  fetchOrders({ page, limit });
}, [page, limit]);

// ❌ Stale closure - captures initial count
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1); // always uses stale count
  }, 1000);
  return () => clearInterval(id);
}, []);

// ✅ Functional update - no closure dependency needed
useEffect(() => {
  const id = setInterval(() => {
    setCount((c) => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);

// ❌ Missing cleanup - memory leak on unmount
useEffect(() => {
  const sub = stream.subscribe(handler);
}, [stream]);

// ✅ Always return cleanup
useEffect(() => {
  const sub = stream.subscribe(handler);
  return () => sub.unsubscribe();
}, [stream]);
```

---

### 9. Null ref access (React)

```typescript
// ❌ ref.current is T | null - crashes before mount
const handleFocus = () => {
  inputRef.current.focus(); // Object is possibly null
};

// ✅ Narrow before use
const handleFocus = () => {
  if (!inputRef.current) return;
  inputRef.current.focus();
};
```

---

### 10. Lambda - typed handler + safe body parsing

```typescript
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";

const BodySchema = z.object({
  cartId: z.string().uuid(),
  userId: z.string()
});

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  // event.body is string | null on API Gateway
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing body" }) };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      statusCode: 422,
      body: JSON.stringify({ errors: parsed.error.flatten() })
    };
  }

  const { cartId, userId } = parsed.data; // fully typed
  return { statusCode: 201, body: JSON.stringify({ cartId, userId }) };
};
```

---

### 11. Env validation at startup

Fail fast before the server accepts any traffic.

```typescript
import { z } from "zod";

// ❌ Accessing process.env inline - undefined shows up at runtime, not startup
const db = new Pool({ host: process.env.DB_HOST }); // silently undefined

// ✅ Validate all env vars once at module load
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional()
});

export const env = EnvSchema.parse(process.env); // throws at startup with clear message

const db = new Pool({ connectionString: env.DATABASE_URL }); // fully typed
```

---

### 12. ESM / CJS module resolution

```typescript
// ❌ Bare specifier fails in ESM
import { helper } from "./utils";

// ✅ ESM requires explicit .js extension (even for .ts source files)
import { helper } from "./utils.js";

// ❌ __dirname not available in ESM
const dir = __dirname;

// ✅ ESM equivalent
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// tsconfig for ESM output
// { "module": "NodeNext", "moduleResolution": "NodeNext" }
```

---

### 13. Type guard patterns

```typescript
// Basic type guard
function isString(val: unknown): val is string {
  return typeof val === 'string';
}

// Object shape guard
function isOrder(val: unknown): val is Order {
  return typeof val === 'object' && val !== null && 'id' in val && 'status' in val;
}

// Assertion function - throws instead of returning boolean
function assertDefined<T>(val: T | null | undefined, name = 'value'): asserts val is T {
  if (val == null) throw new Error(`${name} must not be null/undefined`);
}

assertDefined(user, 'user'); // narrows user to T below this line
console.log(user.email);     // safe

// Array filter with type guard - preserves element type
const orders: Array<Order | null> = [...];
const validOrders = orders.filter((o): o is Order => o !== null); // type: Order[]
```

---

### 14. Deep readonly for config / shared state

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// ❌ Config mutated accidentally downstream
const config = { db: { host: "localhost", port: 5432 } };
config.db.port = 9999; // no error

// ✅
const config: DeepReadonly<Config> = { db: { host: "localhost", port: 5432 } };
config.db.port = 9999; // TS2540: Cannot assign to 'port' - readonly
```

---

### 15. Circular dependency → runtime undefined imports

When module A imports B and B imports A, one of them gets an incomplete (partially initialized) module object. The import resolves to `undefined` at runtime even though TypeScript compiles fine.

```typescript
// ❌ a.ts imports b.ts, b.ts imports a.ts → one side gets undefined
// a.ts
import { formatName } from "./b";
export const defaultUser = { name: formatName("admin") };

// b.ts
import { defaultUser } from "./a";
export function formatName(name: string) {
  return name.toUpperCase();
}
export function getDefault() {
  return defaultUser;
} // undefined at runtime!

// Symptoms:
// - TypeError: Cannot read properties of undefined
// - TypeError: X is not a function
// - Works after unrelated file changes (module init order shifted)

// ✅ Break the cycle — extract shared code into a third module
// shared.ts
export function formatName(name: string) {
  return name.toUpperCase();
}

// a.ts
import { formatName } from "./shared";
export const defaultUser = { name: formatName("admin") };

// b.ts
import { formatName } from "./shared";
import { defaultUser } from "./a"; // no cycle — safe
```

**How to detect:** If a `TypeError: X is not a function` or `undefined` import has no obvious cause, check for circular requires:

```bash
# Find circular dependencies with madge
npx madge --circular --extensions ts src/
```

---

### 16. Memory leak — event listeners and timers not cleaned up

Uncleaned listeners and timers cause memory growth, duplicate event handling, and eventual crashes in long-running processes.

```typescript
// ❌ Listener added on every request — never removed, leaks memory
app.post("/webhook", (req, res) => {
  eventEmitter.on("processed", (result) => {
    // adds new listener each call
    res.json(result);
  });
  eventEmitter.emit("process", req.body);
});
// After 11 requests: MaxListenersExceededWarning

// ✅ Use `once` for single-fire listeners
app.post("/webhook", (req, res) => {
  eventEmitter.once("processed", (result) => {
    // auto-removed after firing
    res.json(result);
  });
  eventEmitter.emit("process", req.body);
});

// ❌ setInterval in module scope — no cleanup on shutdown
const interval = setInterval(() => {
  refreshCache();
}, 60_000);
// Lambda frozen/thawed, server restarted → orphaned timer, duplicate work

// ✅ Track and clean up on shutdown
const interval = setInterval(() => refreshCache(), 60_000);

process.on("SIGTERM", () => {
  clearInterval(interval);
  server.close();
});

// ❌ Stream not cleaned up on error — file descriptor leak
function processFile(path: string) {
  const stream = fs.createReadStream(path);
  stream.pipe(transform).pipe(output);
  // if transform throws, stream stays open
}

// ✅ Handle stream errors and cleanup
function processFile(path: string) {
  const stream = fs.createReadStream(path);
  stream.on("error", (err) => {
    stream.destroy();
    logger.error("Stream failed", err);
  });
  stream.pipe(transform).pipe(output);
}
```

**How to detect:** Look for `MaxListenersExceededWarning`, steadily growing RSS memory (`process.memoryUsage()`), or duplicate event handling.

---

## TS Compiler Error Reference

| Code     | Meaning                         | Fix                                           |
| -------- | ------------------------------- | --------------------------------------------- |
| `TS2322` | Type not assignable             | Narrow or fix the mismatch at source          |
| `TS2345` | Argument type mismatch          | Check function signature vs call site         |
| `TS2531` | Object is possibly null         | Add null guard                                |
| `TS2532` | Object is possibly undefined    | Add undefined guard or optional chain         |
| `TS2339` | Property does not exist on type | Wrong type assumed - check actual type        |
| `TS2554` | Expected N args, got M          | Check overloads, defaults, or rest args       |
| `TS2307` | Cannot find module              | Missing `@types/`, wrong path, bad `paths`    |
| `TS7006` | Parameter implicitly `any`      | Add explicit type annotation                  |
| `TS2304` | Cannot find name                | Missing import or typo                        |
| `TS2589` | Type instantiation too deep     | Circular generics - add explicit annotation   |
| `TS2540` | Cannot assign - readonly        | Remove mutation or clone the object           |
| `TS2349` | Expression is not callable      | Type is not a function - check definition     |
| `TS2538` | Cannot use as index type        | Index must be `string \| number \| symbol`    |
| `TS2741` | Property missing in type        | Add the missing required property             |
| `TS1005` | `;` expected                    | Syntax error - check TS version or JSX config |

---

## Recommended tsconfig Flags

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  }
}
```

| Flag                         | What it catches                                                   |
| ---------------------------- | ----------------------------------------------------------------- |
| `strict`                     | Enables all strict checks (noImplicitAny, strictNullChecks, etc.) |
| `noUncheckedIndexedAccess`   | `arr[i]` and `obj[key]` become `T \| undefined`                   |
| `exactOptionalPropertyTypes` | Distinguishes `{ a?: string }` from `{ a: string \| undefined }`  |
| `noImplicitReturns`          | Function must return on all code paths                            |
| `noFallthroughCasesInSwitch` | Switch cases must break or return                                 |
| `noImplicitOverride`         | Class overrides must use `override` keyword                       |
