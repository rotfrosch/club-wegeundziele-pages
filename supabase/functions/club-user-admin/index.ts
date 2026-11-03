import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const allowedOrigin = "https://club.wegeundziele.de";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== allowedOrigin) return json({ error: "Origin nicht erlaubt." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!['GET', 'POST'].includes(request.method)) return json({ error: "Methode nicht erlaubt." }, 405);

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Anmeldung erforderlich." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Serverkonfiguration unvollständig." }, 500);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sitzung ungültig." }, 401);

  const { data: allowed, error: permissionError } = await userClient.rpc(
    "current_user_has_permission",
    { requested_key: "club:admin" },
  );
  if (permissionError || allowed !== true) return json({ error: "Keine Club-Verwaltungsberechtigung." }, 403);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: group, error: groupError } = await admin
    .from("app_groups").select("id").eq("slug", "club-member").single();
  if (groupError || !group) return json({ error: "Club-Gruppe nicht gefunden." }, 500);

  if (request.method === "POST") {
    let body: { action?: unknown; user_id?: unknown; enabled?: unknown };
    try { body = await request.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400); }
    if (body.action === "list_users") {
      // Continue below with the read-only user list.
    } else if (body.action !== "set_membership" || typeof body.user_id !== "string" || typeof body.enabled !== "boolean") {
      return json({ error: "Ungültige Anfrage." }, 400);
    } else {
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.user_id);
      if (targetError || !target.user) return json({ error: "Benutzer nicht gefunden." }, 404);

      const membership = { user_id: body.user_id, group_id: group.id };
      const change = body.enabled
        ? await admin.from("group_members").upsert(membership, { onConflict: "user_id,group_id" })
        : await admin.from("group_members").delete().match(membership);
      if (change.error) return json({ error: "Club-Freigabe konnte nicht gespeichert werden." }, 500);

      const { error: auditError } = await admin.from("club_membership_audit").insert({
        target_user_id: body.user_id,
        changed_by: authData.user.id,
        enabled: body.enabled,
      });
      if (auditError) return json({ error: "Freigabe gespeichert, Protokollierung fehlgeschlagen." }, 500);
      return json({ ok: true });
    }
  }

  const authUsers: Array<{ id: string; email?: string; email_confirmed_at?: string; last_sign_in_at?: string }> = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return json({ error: "Benutzer konnten nicht geladen werden." }, 500);
    authUsers.push(...data.users);
    if (data.users.length < 100) break;
  }
  const ids = authUsers.map(user => user.id);
  const [{ data: profiles, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id,display_name,is_active").in("id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from("group_members").select("user_id").eq("group_id", group.id).in("user_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileError || membershipError) return json({ error: "Berechtigungen konnten nicht geladen werden." }, 500);
  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
  const clubMembers = new Set((memberships || []).map(row => row.user_id));
  const users = authUsers.map(user => {
    const profile = profileMap.get(user.id);
    return {
      id: user.id,
      email: user.email || "",
      display_name: profile?.display_name || "",
      is_active: profile?.is_active !== false,
      email_confirmed: Boolean(user.email_confirmed_at),
      last_sign_in_at: user.last_sign_in_at,
      club_enabled: clubMembers.has(user.id),
    };
  }).sort((a, b) => a.email.localeCompare(b.email, "de"));
  return json({ users });
});
