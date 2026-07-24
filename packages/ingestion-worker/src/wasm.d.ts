declare module "*.wasm" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}

declare module "*.yaml" {
  const text: string;
  export default text;
}

// @mixmark-io/domino ships a non-module .d.ts; declare the bit we use.
declare module "@mixmark-io/domino" {
  const domino: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createDocument(html?: string, force?: boolean): { body: any; getElementById(id: string): any };
  };
  export default domino;
}
