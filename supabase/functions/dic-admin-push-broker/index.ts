// Issue #1938: strictly signed Netlify-to-Supabase service-only operations.
// Supabase itself provisions the runtime service API key; no key is copied to Netlify.
import {createAdminPushBroker} from './core.mjs';
Deno.serve(createAdminPushBroker());
