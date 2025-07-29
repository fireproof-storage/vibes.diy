# Data Tab Implementation Plan

## Overview

Add a data tab next to the existing code and preview tabs to allow users to directly view and manage the data in the Fireproof database used by their application.

## Implementation Phases

### Phase 1: Add Data Tab UI without Changing Prompts

1. **Update Type Definitions**
   - Update `activeView` type from `'code' | 'preview'` to include `'data'`
   - Modify types in ResultPreviewProps, ResultPreviewHeaderContentProps, and IframeContentProps

2. **Modify ResultPreviewHeaderContent**
   - Add a new "Data" tab button in the tab switcher
   - Use an appropriate icon for data visualization
   - Maintain consistent styling with existing tabs

3. **Update IframeContent Component**
   - Add a new div container for data content
   - Control visibility using the same pattern as code and preview tabs
   - Apply consistent styling for the new tab

4. **Integrate Data Component**
   - Add the existing data component to the data tab container (for now just use JSON.stringify(await db.allDocs()))
   - Pass necessary props from parent components
   - Ensure the component can access the current database

5. **Update State Management**
   - Modify `activeView` state in home.tsx to handle the new 'data' value
   - Update navigation logic between tabs

### Phase 2: Implement Database Access for Data Tab

1. **Database Discovery**
   - Implement a mechanism to discover what databases the preview app is using
   - This can be done via:
     - Grep the codebase for useFireproof("dbname")

2. **View Database in Data Tab**
   - Display the database contents, schema, and statistics
   - Allow basic CRUD operations on documents (later)
   - Provide visualization of relationships and data structure
