import { FX_STORAGE_KEY } from "./resolve";

/**
 * Runs synchronously before first paint so CSS-only effects (scanlines,
 * glitch, cursor) don't flash on for users who opted out. FxProvider
 * refines the value after hydration with the full resolveFxLevel policy.
 */
export const fxInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  FX_STORAGE_KEY,
)});var r=matchMedia("(prefers-reduced-motion: reduce)").matches;document.documentElement.dataset.fx=p==="full"||p==="low"?p:r?"low":"full"}catch(e){document.documentElement.dataset.fx="full"}})()`;
