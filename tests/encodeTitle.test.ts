import { describe, it, expect } from 'vitest';
import { encodeTitle } from '../app/components/SessionSidebar/utils';

describe('encodeTitle', () => {
  it('converts spaces and special characters to hyphenated encoding', () => {
    expect(encodeTitle('Hello World!')).toBe('hello-world-');
    expect(encodeTitle('My_App 2024')).toBe('my_app-2024');
  });

  it('uses default when empty title provided', () => {
    expect(encodeTitle('')).toBe('untitled-chat');
  });
});
