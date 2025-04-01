# Syntax Highlighting Issue Analysis

## Issue Description

Syntax highlighting was lost in the code preview when the new data tab implementation was added.

## Root Cause

The changes to `IframeContent.tsx` significantly simplified the Monaco editor setup, but removed critical syntax highlighting configuration:

### Key Changes That Caused the Issue:

1. **Language Registration Removed**:

   ```typescript
   // These registrations were removed
   monacoInstance.languages.register({ id: 'jsx' });
   monacoInstance.languages.register({ id: 'javascript' });
   ```

2. **JSX Configuration Removed**:

   ```typescript
   // This configuration was removed
   monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
     jsx: monacoInstance.languages.typescript.JsxEmit.React,
     jsxFactory: 'React.createElement',
     reactNamespace: 'React',
     allowNonTsExtensions: true,
     allowJs: true,
     target: monacoInstance.languages.typescript.ScriptTarget.Latest,
   });
   ```

3. **Model Language Setting Removed**:

   ```typescript
   // This critical setting was removed
   const model = editor.getModel();
   if (model) {
     monacoInstance.editor.setModelLanguage(model, 'jsx');
   }
   ```

4. **Editor Configuration Removed**:
   ```typescript
   // These visual enhancements were removed
   editor.updateOptions({
     tabSize: 2,
     bracketPairColorization: { enabled: true },
     guides: { bracketPairs: true },
   });
   ```

## Fix Recommendation

Restore the critical Monaco editor configuration while maintaining the new data tab functionality:

1. Re-add the language registrations
2. Re-add the JSX configuration
3. Re-add the model language setting
4. Re-add the editor visual enhancements

This should restore syntax highlighting while preserving the data tab functionality.
