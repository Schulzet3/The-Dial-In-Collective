// Production service credentials are owned by Supabase Edge, never the browser.
import {createMemberApprovalBroker} from './core.mjs';
Deno.serve(createMemberApprovalBroker());
