import { useState, useCallback, useEffect } from 'react';

export interface RuntimeError {
  type: string; // 'error' or 'unhandledrejection'
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  reason?: string;
  timestamp: string;
  errorType?: 'SyntaxError' | 'ReferenceError' | 'TypeError' | 'DatabaseError' | 'Other';
}

export type ErrorCategory = 'immediate' | 'advisory';

export function useRuntimeErrors(onSaveError?: (error: RuntimeError, category: ErrorCategory) => Promise<void>) {
  const [immediateErrors, setImmediateErrors] = useState<RuntimeError[]>([]);
  const [advisoryErrors, setAdvisoryErrors] = useState<RuntimeError[]>([]);

  // Helper to categorize errors based on their characteristics
  const categorizeError = useCallback((error: RuntimeError): ErrorCategory => {
    // Extract error type from message if not already classified
    if (!error.errorType) {
      if (error.message?.includes('SyntaxError')) {
        error.errorType = 'SyntaxError';
      } else if (error.message?.includes('ReferenceError')) {
        error.errorType = 'ReferenceError';
      } else if (error.message?.includes('TypeError')) {
        error.errorType = 'TypeError';
      } else if (
        error.message?.includes('Not found:') ||
        error.reason?.includes('Not found:') ||
        error.message?.includes('database') ||
        error.message?.includes('CRDT')
      ) {
        error.errorType = 'DatabaseError';
      } else {
        error.errorType = 'Other';
      }
    }

    // Categorize based on error type
    if (
      error.errorType === 'SyntaxError' ||
      error.errorType === 'ReferenceError' ||
      error.errorType === 'TypeError'
    ) {
      return 'immediate';
    }
    
    return 'advisory';
  }, []);

  // Add a new error, categorizing it automatically
  const addError = useCallback(async (error: RuntimeError) => {
    const category = categorizeError(error);
    
    if (category === 'immediate') {
      setImmediateErrors(prev => [...prev, error]);
    } else {
      setAdvisoryErrors(prev => [...prev, error]);
    }

    // If a save callback is provided, save the error to the database
    if (onSaveError) {
      try {
        await onSaveError(error, category);
      } catch (err) {
        console.error('Failed to save error to database:', err);
      }
    }
  }, [categorizeError, onSaveError]);

  // Clear errors
  const clearImmediateErrors = useCallback(() => {
    setImmediateErrors([]);
  }, []);

  const clearAdvisoryErrors = useCallback(() => {
    setAdvisoryErrors([]);
  }, []);

  // We don't need separate adder functions as categorization is handled by addError

  // Log errors when they change
  useEffect(() => {
    if (immediateErrors.length > 0) {
      console.log('[useRuntimeErrors] Immediate errors:', immediateErrors);
    }
  }, [immediateErrors]);

  useEffect(() => {
    if (advisoryErrors.length > 0) {
      console.log('[useRuntimeErrors] Advisory errors:', advisoryErrors);
    }
  }, [advisoryErrors]);

  return {
    immediateErrors,
    advisoryErrors,
    addError,
    clearImmediateErrors,
    clearAdvisoryErrors
  };
}
