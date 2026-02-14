import { transform } from "sucrase";
import {
  expr,
  process,
  toBpmn,
  ProcessBuilder,
} from "rill";

export interface ExecutionResult {
  xml: string | null;
  error: string | null;
}

/**
 * Transpile user TypeScript code and execute it, capturing toBpmn output.
 */
export function execute(code: string): ExecutionResult {
  let transpiledCode: string;

  try {
    const result = transform(code, {
      transforms: ["typescript", "imports"],
      filePath: "playground.ts",
    });
    transpiledCode = result.code;
  } catch (err) {
    return {
      xml: null,
      error: `Syntax error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Capture the last toBpmn() call result
  let capturedXml: string | null = null;

  const wrappedToBpmn = (...args: Parameters<typeof toBpmn>): string => {
    const xml = toBpmn(...args);
    capturedXml = xml;
    return xml;
  };

  // Build the require shim — maps "rill" to the real library
  const dslModule = {
    expr,
    process,
    toBpmn: wrappedToBpmn,
    ProcessBuilder,
  };

  const requireShim = (id: string) => {
    if (id === "rill") return dslModule;
    throw new Error(`Cannot require "${id}" — only "rill" is available in the playground`);
  };

  try {
    const exports = {};
    const fn = new Function("require", "exports", transpiledCode);
    fn(requireShim, exports);
  } catch (err) {
    return {
      xml: null,
      error: `Runtime error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!capturedXml) {
    return {
      xml: null,
      error: "No diagram produced. Make sure your code calls toBpmn() at the end.",
    };
  }

  return { xml: capturedXml, error: null };
}
