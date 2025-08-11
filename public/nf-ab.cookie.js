/*
 * Netlify Split Testing opt-in/out via query params (pre-mount)
 *
 * Reads `?nf_ab` or `?ab` on arrival to set/clear the `nf_ab` cookie before the app
 * initializes, so Netlify can route this and subsequent requests to a specific branch
 * deploy on the primary domain without redirects. Preserves origin-scoped storage.
 *
 * Usage examples (open on the main domain):
 *   - Set to a branch:   ?nf_ab=my-experimental-branch
 *   - Clear the cookie:  ?nf_ab=clear  (aliases: off, reset, none)
 *   - Also accepts `ab=` as a synonym for `nf_ab=`
 */
(function () {
  try {
    var u = new URL(window.location.href);
    var sp = u.searchParams;
    var hasNf = sp.has('nf_ab');
    var hasAb = sp.has('ab');
    if (!hasNf && !hasAb) return;

    var value = hasNf ? sp.get('nf_ab') : sp.get('ab');
    var clear = value && /^(clear|off|reset|none)$/i.test(value);

    var secure = window.location.protocol === 'https:' ? '; Secure' : '';
    var cookieBase = 'nf_ab=';

    // Make whitespace after semicolons optional to be robust across browsers
    var currentMatch = document.cookie.match(/(?:^|;\s*)nf_ab=([^;]+)/);
    var current = currentMatch ? decodeURIComponent(currentMatch[1]) : null;

    // Apply changes if needed
    if (clear) {
      // Clear cookie if present
      if (current) {
        document.cookie = 'nf_ab=; Max-Age=0; Path=/; SameSite=Lax' + secure;
      }
    } else if (value && value !== current) {
      // Long-ish expiration so the choice sticks for developers
      var expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie =
        cookieBase +
        encodeURIComponent(value) +
        '; Expires=' +
        expires +
        '; Path=/; SameSite=Lax' +
        secure;
    }

    // Determine whether a reload is required (only if the effective value changed)
    var shouldReload = false;
    if (clear) {
      if (current) shouldReload = true; // only reload if we actually removed an existing cookie
    } else if (value && value !== current) {
      shouldReload = true;
    }

    // Always remove our params to avoid loops and keep URLs clean
    sp.delete('nf_ab');
    sp.delete('ab');
    var newUrl = u.origin + u.pathname + (sp.toString() ? '?' + sp.toString() : '') + u.hash;

    if (shouldReload) {
      window.location.replace(newUrl);
    } else if (hasNf || hasAb) {
      // Clean the URL without a reload if nothing changed
      history.replaceState(null, '', newUrl);
    }
  } catch (_e) {
    // Swallow errors to avoid blocking page load in edge cases
  }
})();
