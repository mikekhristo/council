import type { DeliberationEvent } from '@/lib/types';

export async function* parseSSEStream(
  response: globalThis.Response
): AsyncGenerator<DeliberationEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream in response');

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let currentData = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          currentData = line.slice(5).trim();
        } else if (line === '') {
          if (currentEvent && currentData) {
            try {
              const parsed: DeliberationEvent = {
                type: currentEvent as DeliberationEvent['type'],
                data: JSON.parse(currentData),
              };
              yield parsed;
            } catch {
              // Skip malformed events
            }
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }

    // Handle any remaining data in buffer
    if (currentEvent && currentData) {
      try {
        const parsed: DeliberationEvent = {
          type: currentEvent as DeliberationEvent['type'],
          data: JSON.parse(currentData),
        };
        yield parsed;
      } catch {
        // Skip malformed events
      }
    }
  } finally {
    reader.releaseLock();
  }
}
