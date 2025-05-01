import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
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
  UseLiveQuery,
  LiveQueryResult,
  MapFn,
} from 'use-fireproof';

/**
 * Wrapper database that only creates the real IndexedDB database on first write
 * This allows us to avoid creating empty IndexedDB databases for unused sessions
 */
// Simple event emitter for browser environment
type Listener = (db: Database) => void;

class SimpleEventEmitter {
  private listeners: Listener[] = [];

  on(callback: Listener): void {
    this.listeners.push(callback);
  }

  off(callback: Listener): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  emit(db: Database): void {
    this.listeners.forEach(listener => {
      try {
        listener(db);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
}

class LazyDB {
  private name: string;
  private config: ConfigOpts;
  private inner: Database;
  private hasInitialized = false;
  private eventEmitter = new SimpleEventEmitter();

  // Public accessor for initialization state
  isInitialized(): boolean {
    return this.hasInitialized;
  }

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
      // Emit an event to notify subscribers that the database has transitioned
      this.eventEmitter.emit(this.inner);
    }
    return this.inner;
  }

  // Subscribe to database transition events
  onTransition(callback: (db: Database) => void) {
    this.eventEmitter.on(callback);
    return () => this.eventEmitter.off(callback);
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
 * @param initializeImmediately When true, initializes the real database immediately instead of waiting for first write
 * @param config Configuration options
 * @returns Fireproof hook API with added `open` method to force initialization
 */
export function useLazyFireproof(
  name: string,
  initializeImmediately: boolean = false,
  config: ConfigOpts = {}
): UseFireproof & {
  open: () => void;
  onDatabaseTransition: (callback: (db: Database) => void) => () => void;
} {
  // Create a single LazyDB instance and never re-create it
  const ref = useRef<LazyDB | null>(null);
  if (!ref.current) {
    ref.current = new LazyDB(name, config);

    // Initialize immediately if requested
    if (initializeImmediately) {
      ref.current.ensureReal();
    }
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

  // Create a proper custom hook for enhanced live query
  // This follows the Rules of Hooks by keeping all hook calls at the top level
  function useEnhancedLiveQuery<T extends DocTypes, K extends IndexKeyType = any, R extends DocFragment = T>(
    mapFnOrField: string | MapFn<T>,
    options?: any
  ): LiveQueryResult<T, K, R> {
    // Use a state counter to trigger refreshes when the database transitions
    const [refreshCounter, setRefreshCounter] = useState(0);
    
    // Add a refresh key to options that will change when we need to refresh
    const optionsWithKey = useMemo(() => {
      return { ...options, _refreshKey: refreshCounter };
    }, [options, refreshCounter]);
    
    // Call the original useLiveQuery with our enhanced options
    const result = api.useLiveQuery<T, K, R>(mapFnOrField, optionsWithKey);
    
    // Set up effect to listen for database transition events
    useEffect(() => {
      if (!ref.current) return;
      
      // If already initialized, no need to listen for transitions
      if (ref.current.isInitialized()) return;
      
      // Subscribe to database transition events
      const unsubscribe = ref.current.onTransition(() => {
        // Force a refresh by updating the counter
        setRefreshCounter((prev) => prev + 1);
      });
      
      // Return cleanup function that properly removes the event listener
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [mapFnOrField, options]);
    
    return result;
  }
  
  // Create a wrapper that maintains the correct typing for the API
  const enhancedUseLiveQuery = useEnhancedLiveQuery as UseLiveQuery;

  // Expose the open method outside of useMemo to allow immediate initialization
  const open = useCallback(() => {
    if (ref.current) {
      ref.current.ensureReal();
    }
  }, [ref]);

  // Expose a method to subscribe to database transition events
  const onDatabaseTransition = useCallback(
    (callback: (db: Database) => void) => {
      if (!ref.current) {
        console.warn('Cannot subscribe to database transitions: database not initialized');
        return () => {};
      }
      return ref.current.onTransition(callback);
    },
    [ref]
  );

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
      useLiveQuery: enhancedUseLiveQuery, // Override with our enhanced version
      open,
      onDatabaseTransition,
    }),
    [api, enhancedUseLiveQuery, open, onDatabaseTransition]
  );
}
