/** A repository whose every method fails, for adapters a test does not use. */
export function unimplemented<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get(_target, method) {
      return () => {
        throw new Error(`${name}.${String(method)} is not implemented in this test`);
      };
    },
  });
}
