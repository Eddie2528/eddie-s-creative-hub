import { createMiddleware } from "@tanstack/react-start";

// Stands in for the generated `attachSupabaseAuth`, which reaches for the
// browser Supabase client on every server-function call. That client throws
// when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are absent — as they
// are in the production build — so the throw took down every server function
// before it left the browser, including ones that need no session at all.
//
// Attach the token when we can get one, carry on without it when we can't.
// Nothing is granted by its absence: a server function that needs a user still
// sees an anonymous request and is refused by RLS, so this fails closed.
export const attachSupabaseAuthIfAvailable = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) return next({ headers: { Authorization: `Bearer ${token}` } });
    } catch (cause) {
      console.warn("[Supabase] No auth session attached to this server function", cause);
    }
    return next({ headers: {} });
  },
);
