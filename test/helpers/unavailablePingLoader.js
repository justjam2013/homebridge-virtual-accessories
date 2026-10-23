// Simulate an installed package whose native binding cannot load.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@homebridge/node-icmp-ping') {
    const source = 'globalThis.pingLoadAttempts = (globalThis.pingLoadAttempts ?? 0) + 1;'
      + 'throw new Error("Native binding unavailable (test)");'
      + 'export const ping = () => { globalThis.unavailablePingCalls = (globalThis.unavailablePingCalls ?? 0) + 1; };';
    return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
