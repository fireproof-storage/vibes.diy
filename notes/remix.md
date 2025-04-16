# Remix Route Implementation Plan

## Overview

Create a new route at `/remix` that enables users to remix code from vibecode.garden apps.

## Implementation Steps

1. **Create new route file**

   - Create `/app/routes/remix.tsx`
   - Set up the basic route component structure

2. **Client-side functionality**

   - Use `useEffect` to get `document.referrer` on the client side
   - Extract the app domain from the referrer
   - Verify the referrer is from a `*.vibecode.garden` domain
   - Display loading state while fetching

3. **Fetch app code**

   - Fetch the App.jsx content using the pattern: `https://{app-domain}.vibecode.garden/App.jsx`
   - Handle fetch errors appropriately
   - Parse and prepare the code content for the AI session

4. **Create new session**

   - Create a dummy exchange with AI:
     ```
     user: Please help me remix {app-domain}.vibecode.garden
     ai: Certainly, here is the code: {code-block}
         Please let me know what you'd like to change.
     ```
   - Save this exchange to the session database

5. **Redirect user**
   - Once the session is created, redirect the user to the new session URL
   - Handle potential errors during the process

## Technical Considerations (all are OK thanks to team)

- Need CORS handling for fetching from external domains
- Error handling for invalid/missing referrers
- Fallback behavior if no valid referrer is found
- Security considerations for fetching and executing external code

## Future Enhancements

- UI for the remix page (not needed in initial implementation)
- Progress indicator during code fetching and session creation
- Option to customize initial remix prompt
