import { useRef, useMemo, useCallback, useEffect } from 'react';
import { useFireproof, fireproof } from 'use-fireproof';
import type {
  ConfigOpts,
  UseFireproof,
  Database,
  DocTypes,
  AllDocsQueryOpts,
  AllDocsResponse,
  DocWithId,
  IndexKeyType,
  DocFragment,
} from 'use-fireproof';

/**
 * Wrapper database that only creates the real IndexedDB database on first write
 * This allows us to avoid creating empty IndexedDB databases for unused sessions
 */
class LazyDB {
  private name: string;
  private config: ConfigOpts;
  private inner: Database;
  private hasInitialized = false;

  constructor(name: string, config: ConfigOpts = {}) {
    this.name = name;
    this.config = config;
    // start with an in-memory / no-op IndexedDB
    this.inner = fireproof('vb.empty', this.config);
    console.log(`[LazyDB] Created stub for ${name}`);
  }

  ensureReal() {
    // on first write, swap to the real store
    if (!this.hasInitialized) {
      console.log(`[LazyDB] Creating real database for ${this.name}`);
      this.inner = fireproof(this.name, this.config);
      this.hasInitialized = true;
    } else {
      console.log(`[LazyDB] ensureReal called but already initialized for ${this.name}`);
    }
    return this.inner;
  }

  // Read operations - pass through to inner DB
  get = async <T extends DocTypes>(id: string): Promise<DocWithId<T>> => {
    console.log(`[LazyDB] get ${id} on ${this.name}, initialized: ${this.hasInitialized}`);
    return this.inner.get<T>(id);
  };

  allDocs = async <T extends DocTypes>(options?: AllDocsQueryOpts): Promise<AllDocsResponse<T>> => {
    console.log(`[LazyDB] allDocs on ${this.name}, initialized: ${this.hasInitialized}`);
    return this.inner.allDocs<T>(options);
  };

  changes = async <T extends DocTypes>(since?: any, options?: any): Promise<any> => {
    console.log(`[LazyDB] changes on ${this.name}, initialized: ${this.hasInitialized}`);
    return this.inner.changes<T>(since, options);
  };

  query = async <K extends IndexKeyType, T extends DocTypes, R extends DocFragment = T>(
    field: string,
    options?: any
  ): Promise<any> => {
    console.log(`[LazyDB] query ${field} on ${this.name}, initialized: ${this.hasInitialized}`);
    return this.inner.query<K, T, R>(field, options);
  };

  // Write operations - ensure real DB before operation
  put = async <T extends DocTypes>(doc: T) => {
    this.ensureReal();
    return this.inner.put<T>(doc);
  };

  bulk = async <T extends DocTypes>(docs: T[]) => {
    this.ensureReal();
    return this.inner.bulk<T>(docs);
  };

  // Handle any other method calls by forwarding them to the inner DB
  // This is a catch-all for methods not explicitly defined
  getProperty(prop: string) {
    const innerValue = (this.inner as any)[prop];

    // If it's a function, wrap it to ensure the real DB for write operations
    if (typeof innerValue === 'function') {
      return (...args: any[]) => {
        // For methods that might write, ensure we have the real DB
        if (['put', 'bulk', 'putAttachment', 'createIndex', 'removeIndex'].includes(prop)) {
          this.ensureReal();
        }
        return (this.inner as any)[prop](...args);
      };
    }

    // Otherwise return the property value
    return innerValue;
  }

  // Handler for property access via Proxy
  proxyHandler(prop: string | symbol): any {
    const propStr = prop.toString();
    // First check if we have the property defined directly
    if (propStr in this) {
      return (this as any)[propStr];
    }

    // Otherwise handle dynamic property access
    return this.getProperty(propStr);
  }
}

/**
 * Hook that provides a lazy-loaded Fireproof database
 * Only creates the actual IndexedDB database on first write operation
 *
 * @param name Database name
 * @param config Configuration options
 * @returns Fireproof hook API with added `open` method to force initialization
 */
export function useLazyFireproof(
  name: string,
  config: ConfigOpts = {}
): UseFireproof & { open: () => void } {
  // Create a single LazyDB instance and never re-create it
  const ref = useRef<LazyDB | null>(null);
  if (!ref.current) {
    ref.current = new LazyDB(name, config);
  }

  // Create a proxy to intercept all property access/calls
  const dbProxy = useMemo(() => {
    if (!ref.current) {
      console.error(`[useLazyFireproof] No ref.current when creating proxy for ${name}`);
      return null;
    }

    console.log(`[useLazyFireproof] Creating proxy for ${name}`);
    return new Proxy(ref.current, {
      get: (target, prop) => {
        // Log access to key methods
        if (typeof prop === 'string' && ['useDocument', 'useLiveQuery'].includes(prop)) {
          console.log(`[useLazyFireproof] Proxy accessing ${String(prop)} for ${name}`);
        }
        return target.proxyHandler(prop);
      },
    });
  }, [ref.current, name]);

  // Pass this stable reference to useFireproof
  // It will create hooks that call through to our wrapper
  const api = useFireproof(dbProxy as any);

  // Expose the open method outside of useMemo to allow immediate initialization
  const open = useCallback(() => {
    console.log(`[useLazyFireproof] open called for ${name}`);
    if (ref.current) {
      ref.current.ensureReal();
    } else {
      console.error(`[useLazyFireproof] open called but ref is null for ${name}`);
    }
  }, [ref, name]);

  // Use this immediately in useEffect for routed sessions
  useEffect(() => {
    console.log(`[useLazyFireproof] Hook initialized for ${name}`);
    // This ensures that when hooks subscribe to LiveQuery or document on mount
    // they'll get the right database immediately if open() was called synchronously
    const timeout = setTimeout(() => {
      console.log(`[useLazyFireproof] First tick completed for ${name}`);
    }, 0);
    return () => clearTimeout(timeout);
  }, [name]);

  return useMemo(
    () => ({
      ...api,
      open,
    }),
    [api, open]
  );
}
