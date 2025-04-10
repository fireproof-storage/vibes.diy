#!/usr/bin/env node
// @ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the .env file content directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Extract keys from .env
const OPENROUTER_PROV_KEY = envContent
  .split('\n')
  .find((line) => line.startsWith('VITE_OPENROUTER_PROV_KEY='))
  ?.split('=')?.[1]
  ?.trim();

// Get the CALLAI API key from .env
const CALLAI_API_KEY = envContent
  .split('\n')
  .find((line) => line.startsWith('VITE_CALLAI_API_KEY='))
  ?.split('=')?.[1]
  ?.trim();

if (!CALLAI_API_KEY) {
  console.warn('No CALLAI API key found in .env file');
} else {
  console.log(`Found CALLAI API key: ${CALLAI_API_KEY.substring(0, 10)}...`);
}

if (!OPENROUTER_PROV_KEY) {
  console.error('No provisioning key found in .env file');
  process.exit(1);
}

/**
 * Try different endpoints to check credits for a key
 * @param {string} key - The API key to check
 * @param {string} keyType - The type of key (provisioning or regular)
 */
async function checkCreditsAllEndpoints(key, keyType) {
  // Ensure key is defined
  if (!key) {
    console.error(`Cannot check credits: ${keyType} key is undefined`);
    return;
  }
  console.log(`\n=== Testing ${keyType} key: ${key.substring(0, 10)}... ===\n`);

  // Test the auth/key endpoint which should work for all keys
  const endpoints = ['/api/v1/auth/key', '/api/v1/credits'];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      const response = await fetch(`https://openrouter.ai${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${response.status}`);

      // Only try to parse JSON if the response is OK
      if (response.ok) {
        const responseText = await response.text();
        console.log(`Response: ${responseText}`);
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed data:', JSON.stringify(data, null, 2));
          console.log(`✅ SUCCESS: ${endpoint} worked for ${keyType} key`);
        } catch (e) {
          console.log('Could not parse response as JSON');
        }
      } else {
        // For non-OK responses, just log the status
        console.log(`❌ FAILED: ${endpoint} returned ${response.status}`);
      }
    } catch (error) {
      console.error(`Error with ${endpoint}:`, error.message);
    }
    console.log('---');
  }
}

/**
 * Create a new session key for testing
 */
async function createSessionKey() {
  try {
    console.log('Creating a new session key for testing...');
    const response = await fetch('https://openrouter.ai/api/v1/keys', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_PROV_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Credit Test Key',
        label: `credit-test-${Date.now()}`,
        limit: 0.01,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create session key: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    console.log('Created new key:', data.key.substring(0, 10) + '...');
    return data.key;
  } catch (error) {
    console.error('Error creating session key:', error);
    throw error;
  }
}

/**
 * Function to test if a session key can check its own credits
 */
async function testSessionKeyCredits() {
  console.log('\n=== TESTING IF SESSION KEYS CAN CHECK THEIR OWN CREDITS ===');

  // Create a new session key with a small limit
  console.log('\nCreating a new session key for testing...');
  const sessionKey = await createSessionKey();
  console.log(`Created session key: ${sessionKey.substring(0, 10)}...`);

  // Test if the session key can check its own credits
  console.log('\nTesting if the session key can check its own credits...');
  await checkCreditsAllEndpoints(sessionKey, 'session');

  return sessionKey;
}

// Main function
async function main() {
  try {
    console.log('Starting credit check experiments...');

    // Skip provisioning key tests since we know they work
    console.log('Skipping provisioning key tests (we know /api/v1/credits works)');

    // Skip CALLAI key tests since we know they work
    console.log('Skipping CALLAI key tests (we know /api/v1/credits works)');

    // Test if a newly created session key can check its own credits
    const sessionKey = await testSessionKeyCredits();

    console.log('\nExperiment completed successfully');
    return true;
  } catch (error) {
    console.error('\nError:', error);
    return false;
  }
}

// Run the main function
console.log('Running credit check experiments...');
main()
  .then((success) => {
    console.log(`\nScript ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
