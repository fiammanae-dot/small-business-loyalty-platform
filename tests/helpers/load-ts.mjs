/**
 * Imports a TypeScript module from src/ for a behavioural test, following its
 * "@/..." imports. Each file is transpiled on its own (types are erased) and
 * inlined as a data: URL, so pure modules can be exercised without a build.
 * Not for modules that import server-only code or packages.
 */
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";

const urls = new Map();

function resolveAlias(specifier) {
  const base = `src/${specifier.slice(2)}`;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`load-ts: cannot resolve ${specifier}`);
}

function moduleUrl(path) {
  if (urls.has(path)) return urls.get(path);
  let js = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  js = js.replace(/(from\s+|import\s*\(\s*)"(@\/[^"]+)"/g, (_match, prefix, specifier) => `${prefix}"${moduleUrl(resolveAlias(specifier))}"`);
  const url = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  urls.set(path, url);
  return url;
}

export function loadTs(path) {
  return import(moduleUrl(path));
}
