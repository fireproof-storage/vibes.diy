import { CALLAI_ENDPOINT } from '~/config/env';
import iframeTemplateRaw from '~/components/ResultPreview/templates/iframe-template.html?raw';
import { normalizeComponentExports } from './normalizeComponentExports';
import { transformImports } from '~/components/ResultPreview/transformImports';

export function generateStandaloneHtml(params: { code: string; sessionId?: string }): string {
  const normalized = normalizeComponentExports(params.code);
  const transformed = transformImports(normalized);
  const sid = params.sessionId || 'default-session';

  return iframeTemplateRaw
    .replaceAll('{{API_KEY}}', 'sk-vibes-proxy-managed')
    .replaceAll('{{CALLAI_ENDPOINT}}', CALLAI_ENDPOINT)
    .replace('{{APP_CODE}}', transformed)
    .replace('{{SESSION_ID}}', sid);
}

export function downloadTextFile(
  filename: string,
  contents: string,
  type: string = 'text/html'
): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
