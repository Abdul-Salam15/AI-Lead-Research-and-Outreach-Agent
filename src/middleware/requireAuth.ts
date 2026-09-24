import { Request, Response, NextFunction } from "express";
import { supabase, createUserClient } from "../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string | undefined };
      // Scoped to this request's caller — every user-facing route should
      // read/write through this, not the service-role `supabase` export,
      // so migration 0006's RLS policies are the thing actually enforcing
      // per-user isolation rather than app-level filtering alone.
      supabaseUser?: SupabaseClient;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization bearer token" });
  }

  // Verified via the service-role client — it can validate any user's
  // token regardless of which key issued it.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = { id: data.user.id, email: data.user.email };
  req.supabaseUser = createUserClient(token);
  next();
}
