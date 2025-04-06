# Cookie Consent and Google Analytics Implementation Plan

## Packages to Install

```bash
pnpm install react-cookie-consent react-ga4 --save
```

## Implementation Steps

1. **Set up Google Analytics property**
   - Create a GA4 property in Google Analytics console
   - Obtain Measurement ID (e.g., G-XXXXXXXXXX)

Google gave me this:

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3TJLJPPLFH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-3TJLJPPLFH');
</script>

2. **Implement Cookie Consent Banner**

   - Add the consent banner to app layout
   - Configure with accept/decline options
   - Set appropriate cookie expiration (e.g., 365 days)

3. **Conditional GA Loading**

   - Create utility to check for consent before loading GA
   - Implement GA tracking only after consent is given
   - Use the onAccept event handler to initialize GA

4. **Layout Integration**

   - Add the consent banner to app layout component
   - Ensure banner displays prominently but doesn't interfere with UI
   - Use default package styles initially

5. **GA Implementation**
   - Create GA initialization function
   - Set up page view tracking
   - Prepare for future custom event tracking

## Code Implementation Plan

1. **Add Cookie Consent Component to Layout**

   - Integrate into the main app layout
   - Configure with proper styling and text
   - Set up accept/decline callbacks

2. **Create GA Utility**

   - Create a utility file for GA functions
   - Implement initialization and tracking methods
   - Add consent check before any tracking

3. **Privacy Policy Update**
   - Update or create privacy policy page
   - Include details about cookie usage and tracking

## Technical Considerations

- Only load GA scripts after explicit consent
- Store consent state in a cookie with appropriate expiration
- Ensure decline option completely prevents GA loading
- Plan for future authentication integration

## Future Enhancements

- Custom styling to match app theme
- More granular consent options if needed
- Additional analytics event tracking
