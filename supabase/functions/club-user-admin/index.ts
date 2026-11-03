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
    let body: { action?: unknown; user_id?: unknown; enabled?: unknown; email?: unknown };
    try { body = await request.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400); }
    if (body.action === "list_users") {
      // Continue below with the read-only user list.
    } else if (body.action === "invite_user") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return json({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }, 400);
      }
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://club.wegeundziele.de/einladung/",
      });
      if (inviteError || !invited.user) {
        const existing = inviteError?.message?.toLowerCase().includes("already") || inviteError?.status === 422;
        return json({ error: existing ? "Dieser Benutzer ist bereits angelegt. Bitte den Club-Schalter in der Tabelle verwenden." : "Die Einladung konnte nicht versendet werden." }, 400);
      }
      const membership = await admin.from("group_members").upsert(
        { user_id: invited.user.id, group_id: group.id },
        { onConflict: "user_id,group_id" },
      );
      if (membership.error) return json({ error: "Einladung versendet, Club-Freigabe konnte nicht gespeichert werden." }, 500);
      const { error: auditError } = await admin.from("club_membership_audit").insert({
        target_user_id: invited.user.id,
        changed_by: authData.user.id,
        enabled: true,
      });
      if (auditError) return json({ error: "Einladung versendet, Protokollierung fehlgeschlagen." }, 500);
      return json({ ok: true });
    } else if (body.action === "delete_invitation") {
      if (typeof body.user_id !== "string") return json({ error: "Ungültige Anfrage." }, 400);
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.user_id);
      if (targetError || !target.user) return json({ error: "Einladung nicht gefunden." }, 404);
      if (target.user.email_confirmed_at) {
        return json({ error: "Bestätigte Benutzer werden nicht gelöscht. Bitte stattdessen den Club-Zugang entfernen." }, 409);
      }
      if (target.user.id === authData.user.id) return json({ error: "Das eigene Konto kann nicht gelöscht werden." }, 409);
      const { data: membership, error: membershipError } = await admin.from("group_members")
        .select("user_id").eq("user_id", target.user.id).eq("group_id", group.id).maybeSingle();
      if (membershipError) return json({ error: "Club-Zuordnung konnte nicht geprüft werden." }, 500);
      if (!membership) return json({ error: "Nur Einladungen aus der Club-Verwaltung können hier gelöscht werden." }, 409);
      const { error: deleteError } = await admin.auth.admin.deleteUser(target.user.id);
      if (deleteError) return json({ error: "Die Einladung konnte nicht gelöscht werden." }, 500);
      return json({ ok: true });
    } else if (body.action === "delete_user") {
      if (typeof body.user_id !== "string") return json({ error: "Ungültige Anfrage." }, 400);
      if (body.user_id === authData.user.id) return json({ error: "Das eigene Konto kann nicht gelöscht werden." }, 409);
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.user_id);
      if (targetError || !target.user) return json({ error: "Benutzer nicht gefunden." }, 404);
      if (!target.user.email_confirmed_at) return json({ error: "Unbestätigte Konten bitte als Einladung löschen." }, 409);
      const [{ data: memberships, error: membershipsError }, { count: directPermissionCount, error: directPermissionsError }] = await Promise.all([
        admin.from("group_members").select("app_groups!inner(slug)").eq("user_id", target.user.id),
        admin.from("user_permissions").select("user_id", { count: "exact", head: true }).eq("user_id", target.user.id),
      ]);
      if (membershipsError || directPermissionsError) return json({ error: "Zentrale Rechte konnten nicht geprüft werden." }, 500);
      const groupSlugs = (memberships || []).map(row => {
        const related = row.app_groups as unknown as { slug?: string } | Array<{ slug?: string }> | null;
        return Array.isArray(related) ? related[0]?.slug : related?.slug;
      }).filter(Boolean);
      const clubOnlyGroups = new Set(["club-member", "campions-club"]);
      const hasNonClubRights = groupSlugs.some(slug => !clubOnlyGroups.has(slug as string)) || (directPermissionCount || 0) > 0;
      if (hasNonClubRights) {
        return json({ error: "Dieser Benutzer besitzt weitere zentrale oder Homepage-Rechte und kann hier nicht vollständig gelöscht werden." }, 409);
      }
      const { error: deleteError } = await admin.auth.admin.deleteUser(target.user.id);
      if (deleteError) return json({ error: "Der Benutzer konnte nicht vollständig gelöscht werden." }, 500);
      return json({ ok: true });
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
  const [{ data: profiles, error: profileError }, { data: memberships, error: membershipError }, { data: allMemberships, error: allMembershipsError }, { data: directPermissions, error: directPermissionsError }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id,display_name,is_active").in("id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from("group_members").select("user_id").eq("group_id", group.id).in("user_id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from("group_members").select("user_id,app_groups!inner(slug)").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from("user_permissions").select("user_id").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileError || membershipError || allMembershipsError || directPermissionsError) return json({ error: "Berechtigungen konnten nicht geladen werden." }, 500);
  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
  const clubMembers = new Set((memberships || []).map(row => row.user_id));
  const groupsByUser = new Map<string, Set<string>>();
  for (const row of allMemberships || []) {
    const related = row.app_groups as unknown as { slug?: string } | Array<{ slug?: string }> | null;
    const slug = Array.isArray(related) ? related[0]?.slug : related?.slug;
    if (!slug) continue;
    if (!groupsByUser.has(row.user_id)) groupsByUser.set(row.user_id, new Set());
    groupsByUser.get(row.user_id)?.add(slug);
  }
  const usersWithDirectPermissions = new Set((directPermissions || []).map(row => row.user_id));
  const users = authUsers.map(user => {
    const profile = profileMap.get(user.id);
    const groupSlugs = groupsByUser.get(user.id) || new Set<string>();
    const hasNonClubRights = [...groupSlugs].some(slug => !["club-member", "campions-club"].includes(slug)) || usersWithDirectPermissions.has(user.id);
    const canDeleteUser = user.id !== authData.user.id && Boolean(user.email_confirmed_at) && !hasNonClubRights;
    return {
      id: user.id,
      email: user.email || "",
      display_name: profile?.display_name || "",
      is_active: profile?.is_active !== false,
      email_confirmed: Boolean(user.email_confirmed_at),
      last_sign_in_at: user.last_sign_in_at,
      club_enabled: clubMembers.has(user.id),
      can_delete_user: canDeleteUser,
      delete_block_reason: user.id === authData.user.id ? "Eigenes Konto geschützt" : (hasNonClubRights ? "Weitere zentrale Rechte vorhanden" : "Nur unbestätigte Einladung löschbar"),
    };
  }).sort((a, b) => a.email.localeCompare(b.email, "de"));
  return json({ users });
});
