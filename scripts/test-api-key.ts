#!/usr/bin/env tsx
/**
 * API Key utility script
 * Creates a new API key and checks its credit information using Edge Functions
 */
import { getCredits } from '../app/config/provisioning';
import { createOrUpdateKeyViaEdgeFunction } from '../app/services/apiKeyService';

/**
 * Creates a new API key and returns the key data using the Edge Function
 */
async function createApiKey() {
  console.log('Creating new API key...');

  try {
    // Mock user ID for testing
    const testUserId = `test-${Date.now()}`;
    // Pass undefined for hash and a dummy token for testing purposes
    const { key: keyData } = await createOrUpdateKeyViaEdgeFunction(
      testUserId,
      undefined,
      'test-token'
    );

    console.log('API key created successfully:');
    console.log(`- Hash: ${keyData.hash}`);
    console.log(`- Name: ${keyData.name}`);
    console.log(`- Label: ${keyData.label}`);
    console.log(`- Limit: $${keyData.limit}`);
    console.log(`- Key: ${keyData.key?.substring(0, 10)}...`);

    return keyData;
  } catch (error) {
    console.error('Failed to create API key:', error);
    throw error;
  }
}

/**
 * Checks the credits for an API key
 * @param apiKey - The API key to check
 */
async function checkCredits(apiKey: string) {
  if (!apiKey) {
    throw new Error('No API key provided');
  }

  console.log('Checking credits for API key...');

  try {
    const credits = await getCredits(apiKey);

    console.log('Credit information:');
    console.log(`- Available: $${credits.available}`);
    console.log(`- Usage: $${credits.usage}`);
    console.log(`- Limit: $${credits.limit}`);

    return credits;
  } catch (error) {
    console.error('Failed to check credits:', error);
    throw error;
  }
}

// Main function to run the script
async function main() {
  try {
    // Create a new API key
    const keyData = await createApiKey();

    // Check credits for the new key
    const credits = await checkCredits(keyData.key!);

    // Return the key and credits for potential use in other scripts
    return { keyData, credits };
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (process.argv[1] === import.meta.url) {
  console.log('Running API key utility script...');
  main()
    .then((result) => {
      console.log('keyData:', result?.keyData);
      console.log('Credits:', result?.credits);
      // Write the API key to stdout for potential capture by other scripts
      if (result?.keyData?.key) {
        console.log(`\nAPI_KEY=${result.keyData.key}`);
      }
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
