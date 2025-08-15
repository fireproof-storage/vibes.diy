import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callAi, getMeta } from 'call-ai';

describe('call-ai provider routing and streaming TTFB', () => {
  const originalFetch = global.fetch;
  let logs: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    logs = [];
    console.log = (...args: any[]) => {
      logs.push(args.map(String).join(' '));
      originalLog.apply(console, args);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
    console.log = originalLog;
  });

  it('includes provider object in non-streaming request body', async () => {
    let capturedBody: any = null;
    global.fetch = vi.fn(async (_url: any, init: any) => {
      if (init && init.body) {
        try {
          capturedBody = JSON.parse(init.body);
        } catch {
          // ignore
        }
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as any;

    const res = await callAi('hi', {
      apiKey: 'test-key',
      model: 'openai/gpt-4',
      provider: { sort: 'latency' },
    });
    expect(typeof res).toBe('string');
    // Ensure provider object was forwarded to body
    expect(capturedBody).toBeTruthy();
    expect(capturedBody.provider).toEqual({ sort: 'latency' });
  });

  it('captures TTFB in streaming meta and logs when debug=true', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(
            encoder.encode(
              'data: ' + JSON.stringify({ choices: [{ delta: { content: 'H' } }] }) + '\n\n'
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }, 5);
      },
    });

    global.fetch = vi.fn(async () => {
      return new Response(stream as any, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    }) as any;

    const gen = (await callAi('hi', {
      apiKey: 'test-key',
      model: 'openai/gpt-4',
      stream: true,
      debug: true,
      provider: { sort: 'latency' },
    })) as AsyncGenerator<string>;

    let last = '';
    for await (const chunk of gen) {
      last = chunk;
    }

    const meta = getMeta(last);
    expect(meta?.timing?.startTime).toBeTypeOf('number');
    expect(meta?.timing?.firstByteTime).toBeTypeOf('number');
    // firstByteTime should be >= startTime
    expect((meta!.timing!.firstByteTime as number) >= (meta!.timing!.startTime as number)).toBe(
      true
    );
    // Debug logs should include a TTFB line
    expect(logs.some((l) => /TTFB:/i.test(l))).toBe(true);
  });
});
