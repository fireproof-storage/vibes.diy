## Feature / Fix Request: Lazy‑Open Support in `useFireproof`

### Background

In our app we call

```ts
const { useDocument, useLiveQuery, database } = useFireproof(dbName);
```

very early—before the user has entered any data—because we need the
`doc/merge/submit` callbacks for controlled inputs.  
Today this call **always opens** the IndexedDB store referenced by
`dbName`, even if we never write to it. On large installations this
creates thousands of empty `db‑xxxxxxxx` folders.

### Desired Behaviour

Add first‑class "lazy open" semantics so that:

1. `useFireproof()` _does not_ open IndexedDB until the first mutating
   call (`put`, `bulk`, or `submit()` from `useDocument`).
2. All React helpers it returns (`useDocument`, `useLiveQuery`, etc.)
   remain reference‑stable; they must keep working transparently once
   the DB is opened.
3. Reads (`get`, `useLiveQuery`, `doc`) before first write should:
   • resolve from in‑memory cache if present  
   • otherwise return `undefined` / empty array without opening a store  
   Opening happens only when a write is attempted.

### Proposed API

No change to the existing API, it just doesn't call `fireproof(dbName)` internally until first write.
