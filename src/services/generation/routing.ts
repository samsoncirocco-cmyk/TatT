/**
 * Client-safe entry point of the generation module.
 *
 * `routeGeneration` is pure — it reads the routing config and returns a model
 * choice, with no I/O — and feature code legitimately calls it to preview
 * which model/aspect/negative-prompt a request would get without generating
 * anything. `index.ts` says as much and exports it for that purpose.
 *
 * But importing it FROM `index.ts` drags the whole module in behind it:
 * index imports both providers, the providers import the text guard, the
 * guard imports the budget tracker, and the budget tracker imports
 * `node:crypto`. Client code cannot bundle a `node:` scheme, so the Studio
 * page failed to build with `UnhandledSchemeError` — eight import levels away
 * from anything anyone wrote on purpose.
 *
 * That was latent long before it fired. Nothing in the chain happened to need
 * a node-only module until the guard landed, so a client component had been
 * bundling the server generation module invisibly. Pointing the callers at a
 * `crypto` polyfill or lazily importing the tracker would have restored the
 * build and left that intact.
 *
 * So this is the seam: one public entry carrying only what is safe on the
 * client, and `index.ts` left as the server entry. `internal/` stays private
 * to both (ADR-0001).
 */
export { routeGeneration, getAnatomicalAspectRatio, inferProvider } from './internal/routing';
export type { GenerationRoute } from './internal/routing';
export type {
  GenerationRequest,
  GenerationMode,
  ProviderName,
  AspectRatio,
  SafetyFilterLevel,
} from './internal/provider';
