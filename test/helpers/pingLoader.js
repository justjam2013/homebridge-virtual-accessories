import { URL } from 'node:url';

// Scoped to this test process: never load the native ICMP binding.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@homebridge/node-icmp-ping') {
    return { url: new URL('./pingMock.js', import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
