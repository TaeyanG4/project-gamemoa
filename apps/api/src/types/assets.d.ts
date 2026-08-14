// Ambient module declarations for binary assets bundled directly into the Worker. `.wasm` is
// natively understood by Wrangler's bundler (imports resolve to a WebAssembly.Module); `.ttf`
// needs the "Data" module rule in wrangler.jsonc to resolve to an ArrayBuffer the same way.

declare module "*.wasm" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}

declare module "*.ttf" {
  const data: ArrayBuffer;
  export default data;
}
