---
name: react-effect-guide
description: >
  Identifies unnecessary useEffect usage in React code and recommends the correct
  alternative pattern. Use this skill whenever writing, reviewing, or refactoring
  React components that contain useEffect, or when a developer is about to add a
  useEffect. Also trigger when you see derived state, event-driven logic in Effects,
  Effect chains, or state synchronization patterns — these are common signs of
  useEffect misuse. Covers all 12 anti-patterns from React's official docs.
---

# React Effect Guide

Effects are an escape hatch for synchronizing with **external systems** — browser APIs,
third-party widgets, network connections. They are not for transforming data, responding
to user events, or orchestrating state updates between components.

Removing unnecessary Effects makes code faster (fewer render passes), simpler, and less
error-prone. The fewer raw `useEffect` calls in your components, the easier the application
is to maintain, debug, and optimize.

This skill applies in two modes:

- **Reviewing existing code**: when you see a `useEffect`, check it against the patterns below.
  If it matches an anti-pattern, flag it and explain the fix. Don't silently rewrite.
- **Writing new code**: before reaching for `useEffect`, run through the decision tree.
  Most of the time, there's a better tool. This matters because the most common useEffect
  mistakes happen when writing new code — not in review, where problems are visible.

## The two foundational rules

These two rules eliminate the vast majority of unnecessary Effects:

**You don't need Effects to transform data for rendering.** When an Effect updates state,
it triggers an entirely new render cycle. React calls component functions, commits to the
DOM, then runs Effects — and if an Effect immediately sets state, the whole process
restarts from scratch. That's an extra render pass with stale intermediate values.

**You don't need Effects to handle user events.** Inside an event handler, you know
*exactly* what the user did. By the time an Effect runs, that context is lost. If some
code is caused by a *specific user interaction*, put it in an event handler. If it's caused
by the component being *displayed on screen*, keep it in an Effect.

## Decision tree

When you encounter or are about to write a `useEffect`, ask: **why does this code run?**

```
Why does this code need to run?
├── To compute a value from props/state
│   └── Calculate during render (derived values, expensive computations)
│       └── Expensive? Wrap in useMemo
├── Because the user did something specific
│   └── Put it in the event handler (shared logic, notifications, parent callbacks)
├── To reset state when a prop changes
│   └── Can you reset ALL state? → Use key prop
│   └── Only SOME state? → Derive during render or adjust during render
├── To sync with an external system (DOM, network, browser API)
│   └── Effect IS appropriate — but ensure proper cleanup
│       └── Subscription? → Prefer useSyncExternalStore
│       └── Data fetching? → Add ignore flag + prefer a library
└── To pass data up to a parent
    └── Move the data source to the parent instead
```

## Four replacement strategies

All 12 patterns distill into four strategies:

1. **Compute during rendering** — for any value derivable from props/state. Simplest fix.
2. **Move to event handlers** — for logic triggered by user interactions (notifications,
   form submissions, parent callbacks).
3. **Use specialized hooks** — `useMemo` for expensive derived values,
   `useSyncExternalStore` for external store subscriptions, `key` prop for full state resets.
4. **Keep the Effect but with proper cleanup** — only for genuine external system sync.

---

## Derived values belong in render, not in Effects

A value computed from props or state should be a `const` in the function body, not state
updated by an Effect. This is the single most common useEffect mistake.

**Anti-pattern:**
```jsx
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);
```

**Fix — calculate during rendering:**
```jsx
const fullName = firstName + ' ' + lastName;
```

The rule: **when something can be calculated from existing props or state, don't put it
in state — calculate it during rendering.** This eliminates the extra cascading update,
removes code, and prevents bugs where state variables fall out of sync.

---

## Expensive computations use useMemo, not Effects

When a derived calculation is genuinely expensive (≥1ms, measured with `console.time`),
wrap it in `useMemo`. Don't store it as state updated by an Effect.

**Anti-pattern:**
```jsx
const [visibleTodos, setVisibleTodos] = useState([]);
useEffect(() => {
  setVisibleTodos(getFilteredTodos(todos, filter));
}, [todos, filter]);
```

**Fix — compute inline (simple case):**
```jsx
const visibleTodos = getFilteredTodos(todos, filter);
```

**Fix — memoize (expensive case):**
```jsx
const visibleTodos = useMemo(
  () => getFilteredTodos(todos, filter),
  [todos, filter]
);
```

Nuances:
- `useMemo` runs *during rendering* — the function must be a pure calculation.
- It only helps on re-renders, not first render. Test with CPU throttling since developer
  machines are faster than users' devices.
- React Compiler (v1.0+, released October 2025) can auto-memoize, reducing the need for
  manual `useMemo`.

---

## Reset all state with `key`, not Effects

When a prop changes and you need to reset all component state, use `key` to tell React
it's a conceptually different component instance.

**Anti-pattern:**
```jsx
export default function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');
  useEffect(() => { setComment(''); }, [userId]);
}
```

This is inefficient (renders with stale value first, then re-renders) and fragile — you'd
need to repeat this in every nested component with state.

**Fix — key on the component:**
```jsx
export default function ProfilePage({ userId }) {
  return <Profile userId={userId} key={userId} />;
}

function Profile({ userId }) {
  const [comment, setComment] = useState('');
  // All state resets automatically when key changes — including children
}
```

When the `key` changes, React destroys and recreates the component and all its children.
Pass the prop as both a regular prop and as `key`; consumers don't need to know about it.

---

## Adjust partial state during rendering, or restructure to avoid it

When only *some* state should reset on prop change, always prefer this hierarchy:
1. Can you reset ALL state? → Use `key` (see above)
2. Can you derive during render? → Best option (no state adjustment needed)
3. Last resort → Store previous prop and adjust during render

**Anti-pattern:**
```jsx
useEffect(() => { setSelection(null); }, [items]);
```

**Best — derive from stable identifiers:**
```jsx
const [selectedId, setSelectedId] = useState(null);
const selection = items.find(item => item.id === selectedId) ?? null;
```

No adjustment needed. If the item exists, it stays selected; if it doesn't, `selection`
becomes `null` automatically.

**OK — adjust during render (last resort):**
```jsx
const [prevItems, setPrevItems] = useState(items);
if (items !== prevItems) {
  setPrevItems(items);
  setSelection(null);
}
```

React throws away the returned JSX and retries rendering when you call `setState` during
render. The `items !== prevItems` guard prevents infinite loops.

---

## Shared event logic goes in a helper function, not Effects

When two event handlers need the same logic, extract a function and call it from both.
Don't move shared logic into an Effect triggered by state changes.

**Anti-pattern:**
```jsx
useEffect(() => {
  if (product.isInCart) {
    showNotification(`Added ${product.name}!`);
  }
}, [product]);
```

This causes a real bug: if the cart is persisted to localStorage, the notification fires
on every page reload because `product.isInCart` is already `true` on mount. The
notification should only fire when the user *acts*.

The diagnostic test: **ask why this code needs to run.** If the answer is "because the
user clicked a button," it belongs in an event handler, not an Effect.

**Fix — shared helper called from handlers:**
```jsx
function buyProduct() {
  addToCart(product);
  showNotification(`Added ${product.name}!`);
}
function handleBuyClick() { buyProduct(); }
function handleCheckoutClick() { buyProduct(); navigateTo('/checkout'); }
```

---

## Display-caused vs event-caused side effects

This is a nuance pattern — sometimes the same component has BOTH legitimate Effects and
misplaced event logic. The key: ask *what caused this code to run*.

**Correct (display-caused — the component was shown):**
```jsx
useEffect(() => {
  post('/analytics/event', { eventName: 'visit_form' });
}, []);
```

**Wrong (event-caused — the user pressed submit, disguised as an Effect):**
```jsx
const [jsonToSubmit, setJsonToSubmit] = useState(null);
useEffect(() => {
  if (jsonToSubmit !== null) post('/api/register', jsonToSubmit);
}, [jsonToSubmit]);
```

The analytics Effect is correct — it fires because the form was *displayed*. The
registration is wrong — it fires because the user *pressed submit*. Move the POST into
the submit handler directly.

---

## Effect chains are a code smell

Multiple Effects that trigger each other through state changes cause cascading re-renders
and are fragile. This is both a performance and a correctness problem.

**Anti-pattern (4 chained Effects, up to 3 unnecessary re-renders):**
```jsx
useEffect(() => { if (card?.gold) setGoldCardCount(c => c + 1); }, [card]);
useEffect(() => { if (goldCardCount > 3) { setRound(r => r + 1); setGoldCardCount(0); } }, [goldCardCount]);
useEffect(() => { if (round > 5) setIsGameOver(true); }, [round]);
```

Adding game-history replay would retrigger the entire chain — fragile.

**Fix — derive what you can, compute all transitions in the handler:**
```jsx
const isGameOver = round > 5; // derived during render

function handlePlaceCard(nextCard) {
  setCard(nextCard);
  if (nextCard.gold) {
    if (goldCardCount < 3) {
      setGoldCardCount(goldCardCount + 1);
    } else {
      setGoldCardCount(0);
      setRound(round + 1);
      if (round === 5) alert('Good game!');
    }
  }
}
```

**Critical caveat: inside event handlers, state behaves like a snapshot.** After calling
`setRound(round + 1)`, the `round` variable still has the old value. If you need the
updated value for further calculations, use a local variable:
```jsx
const nextRound = round + 1;
setRound(nextRound);
if (nextRound > 5) { /* ... */ }
```

**Exception:** a chain of Effects IS appropriate when each dropdown's options depend on
the selected value of a previous dropdown, because you're synchronizing with the network
(a genuine external system).

---

## App initialization belongs outside Effects

Once-per-app logic (auth checks, loading from localStorage) runs twice in Strict Mode
during development when placed in an Effect. This can invalidate auth tokens or cause
duplicate side effects.

**Fix A — module-level guard:**
```jsx
let didInit = false;
function App() {
  useEffect(() => {
    if (!didInit) { didInit = true; checkAuthToken(); loadDataFromLocalStorage(); }
  }, []);
}
```

**Fix B — run at module scope:**
```jsx
if (typeof window !== 'undefined') { // browser environment check for SSR
  checkAuthToken();
  loadDataFromLocalStorage();
}
function App() { /* ... */ }
```

Caveat: top-level code runs when the module is *imported*, even if the component never
renders. Keep this confined to root component modules like `App.js`.

---

## Notify parents from event handlers, not Effects

This is one of the most common mistakes when writing new components. The instinct is to
watch local state with an Effect and call a parent callback — don't do it.

**Anti-pattern:**
```jsx
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);
  useEffect(() => {
    onChange(isOn);
  }, [isOn, onChange]);
  function handleClick() { setIsOn(!isOn); }
}
```

This causes problems:
1. **Extra render pass** — Toggle renders with new state, then Effect fires onChange,
   parent re-renders. Two passes instead of one.
2. **Fires on mount** — onChange gets called with the initial value, which the parent
   almost certainly doesn't expect.
3. **Hard to trace** — data flows through state → render → Effect → parent instead of
   a direct event → state + callback path.

**Fix A — call onChange alongside setState in the event handler:**
```jsx
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);

  function updateToggle(nextIsOn) {
    setIsOn(nextIsOn);
    onChange(nextIsOn); // called in the same event, React batches both
  }

  function handleClick() { updateToggle(!isOn); }
  function handleDragEnd(e) {
    if (isCloserToRightEdge(e)) updateToggle(true);
    else updateToggle(false);
  }
}
```

**Fix B — fully controlled component (preferred when parent needs the value):**
```jsx
function Toggle({ isOn, onChange }) {
  function handleClick() { onChange(!isOn); }
}
```

The principle: **whenever two state variables need to stay synchronized, lift state up
so there's only one source of truth.** This eliminates the need for synchronization
entirely.

---

## Data flows down, not up via Effects

When a child fetches data and passes it to a parent through an Effect, data flow becomes
nearly impossible to trace. Move the data source to the parent.

**Anti-pattern:**
```jsx
function Child({ onFetched }) {
  const data = useSomeAPI();
  useEffect(() => { if (data) onFetched(data); }, [onFetched, data]);
}
```

**Fix — fetch in parent, pass data down:**
```jsx
function Parent() {
  const data = useSomeAPI();
  return <Child data={data} />;
}
```

React's data model is top-down. When something goes wrong, you trace up the component
tree to find the source — a far simpler debugging model than chasing Effects.

---

## Use useSyncExternalStore for external subscriptions

Manual subscribe/unsubscribe in an Effect can cause **tearing in concurrent rendering** —
different parts of the UI showing inconsistent data from the same store.

**Anti-pattern:**
```jsx
useEffect(() => {
  function update() { setIsOnline(navigator.onLine); }
  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
}, []);
```

**Fix — useSyncExternalStore:**
```jsx
function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,                  // subscribe function (React won't resubscribe for same ref)
    () => navigator.onLine,     // getSnapshot (client)
    () => true                  // getServerSnapshot (SSR)
  );
}
```

Use for: browser APIs (`navigator.onLine`, `matchMedia`, `localStorage`), third-party
state libraries (Redux, Zustand), and any mutable external data source.

---

## Data fetching needs cleanup (race condition guard)

Unlike the other patterns, **data fetching in Effects is not entirely wrong** — it IS
external system sync. But it requires careful handling. The most common bug is a race
condition where stale responses overwrite fresh data.

**Anti-pattern (race condition):**
```jsx
useEffect(() => {
  fetchResults(query).then(json => setResults(json));
}, [query]);
```

Typing "hello" fast fires fetches for "h", "he", "hel", "hell", "hello" — responses
arrive out of order, displaying stale results.

**Fix — cleanup with ignore flag:**
```jsx
useEffect(() => {
  let ignore = false;
  fetchResults(query).then(json => {
    if (!ignore) setResults(json);
  });
  return () => { ignore = true; };
}, [query]);
```

**Better — extract into a reusable custom hook:**
```jsx
function useData(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let ignore = false;
    fetch(url)
      .then(response => response.json())
      .then(json => { if (!ignore) setData(json); });
    return () => { ignore = true; };
  }, [url]);
  return data;
}
```

**Best — use a framework or library.** Raw `useEffect` data fetching has additional
unresolved challenges: **caching** (instant back-button navigation), **server-side
rendering** (initial HTML with content instead of spinners), and **network waterfalls**
(children waiting on parents). TanStack Query, SWR, or framework-level loaders
(Next.js, Remix) handle all of these.

---

## When Effects ARE correct

Effects remain the right tool for synchronizing with external systems:

- **Controlling non-React DOM widgets** (video play/pause, jQuery plugins, map widgets)
- **Setting up server connections** (WebSockets, chat rooms) — with cleanup to disconnect
- **Subscribing to browser events** (scroll, resize) — prefer `useSyncExternalStore` for
  store-like patterns
- **Triggering imperative animations** on DOM elements managed outside React
- **Sending analytics** on page/component display (double-fire in Strict Mode is acceptable)
- **Fetching data** as a fallback when no framework or caching library is available — with
  proper cleanup

## How to flag issues

When you spot an anti-pattern, explain it like this:

1. **Name the anti-pattern** — e.g., "This is derived state in an Effect — it should be computed during rendering"
2. **Explain why it's a problem** — extra render pass, race condition, fires on mount, etc.
3. **Show the fix** — adapted to their specific code, not a generic template
4. **Note the tradeoff** if relevant — e.g., "useMemo only helps if this takes ≥1ms"

When writing new code, apply these patterns proactively. Before adding a `useEffect`, run
through the decision tree. The most impactful anti-patterns to avoid when generating code
are derived state in Effects, Effect chains, and especially notifying parents via Effects
instead of event handlers.
