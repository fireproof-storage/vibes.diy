import { getCredits } from '../config/provisioning';
import type { RuntimeError } from './useRuntimeErrors';

// Global request tracking to prevent duplicate credit check calls
let pendingCreditsCheck: Promise<any> | null = null;

export async function checkCredits(
  apiKeyToCheck: string,
  addError: (err: RuntimeError) => void,
  setNeedsNewKey: (v: boolean) => void
): Promise<boolean> {
  if (!apiKeyToCheck) {
    console.warn('checkCredits: No API key provided');
    addError({
      type: 'error',
      message: 'API key is required to check credits.',
      errorType: 'Other',
      source: 'checkCredits',
      timestamp: new Date().toISOString(),
    });
    return false;
  }

  try {
    if (!pendingCreditsCheck) {
      pendingCreditsCheck = getCredits(apiKeyToCheck);
    }

    const credits = await pendingCreditsCheck;
    console.log('💳 Credits:', credits);
    pendingCreditsCheck = null;

    if (credits && credits.available <= 0.9) {
      setNeedsNewKey(true);
      addError({
        type: 'error',
        message: 'Low credits. A new API key might be required soon.',
        errorType: 'Other',
        source: 'checkCredits',
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  } catch (error: any) {
    pendingCreditsCheck = null;
    console.error('Error checking credits:', error);
    setNeedsNewKey(true);
    addError({
      type: 'error',
      message: error.message || 'Failed to check credits. A new API key might be needed.',
      errorType: 'Other',
      source: 'checkCredits',
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });
    return false;
  }
}
