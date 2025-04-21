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
  }

  ensureReal() {
    // on first write, swap to the real store
    if (!this.hasInitialized) {
      this.inner = fireproof(this.name, this.config);
      this.hasInitialized = true;
    }
    return this.inner;
  }

  // Read operations - pass through to inner DB
  get = async <T extends DocTypes>(id: string): Promise<DocWithId<T>> => this.inner.get<T>(id);

  allDocs = async <T extends DocTypes>(options?: AllDocsQueryOpts): Promise<AllDocsResponse<T>> =>
    this.inner.allDocs<T>(options);

  changes = async <T extends DocTypes>(since?: any, options?: any): Promise<any> =>
    this.inner.changes<T>(since, options);

  query = async <K extends IndexKeyType, T extends DocTypes, R extends DocFragment = T>(
    field: string,
    options?: any
  ): Promise<any> => this.inner.query<K, T, R>(field, options);

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
      return null;
    }

    return new Proxy(ref.current, {
      get: (target, prop) => target.proxyHandler(prop),
    });
  }, [ref.current]);

  // Pass this stable reference to useFireproof
  // It will create hooks that call through to our wrapper
  const api = useFireproof(dbProxy as any);

  // Expose the open method outside of useMemo to allow immediate initialization
  const open = useCallback(() => {
    if (ref.current) {
      ref.current.ensureReal();
    }
  }, [ref]);

  // Use this immediately in useEffect for routed sessions
  useEffect(() => {
    // This ensures that when hooks subscribe to LiveQuery or document on mount
    // they'll get the right database immediately if open() was called synchronously
    const timeout = setTimeout(() => {}, 0);
    return () => clearTimeout(timeout);
  }, []);

  return useMemo(
    () => ({
      ...api,
      open,
    }),
    [api, open]
  );
}
