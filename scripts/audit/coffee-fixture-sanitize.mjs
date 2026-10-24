// Shared audit sanitizer. Keep the upstream names as aliases so live probes
// and focused controls use one reviewed implementation.
export {sanitizePublicCoffeeJson as sanitizePublicJson,
 sanitizePublicCoffeeFixtureHtml as fixtureCoffeeHtml} from './coffee-source-fixture-sanitization.mjs';
