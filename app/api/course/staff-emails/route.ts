import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return createAdminClient(url, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* GET  — return the current staff_emails list */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: account } = await admin
    .from("course_accounts")
    .select("id, email, staff_emails")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "No account found." }, { status: 403 });

  // The primary email is always included in the list returned to the client
  const all = Array.from(new Set([account.email, ...(account.staff_emails ?? [])]));
  return NextResponse.json({ primary_email: account.email, staff_emails: all });
}

/* POST  — add an email to staff_emails */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await request.json();
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const admin = adminClient();
  const { data: account } = await admin
    .from("course_accounts")
    .select("id, email, staff_emails")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "No account found." }, { status: 403 });
  if (normalized === account.email) {
    return NextResponse.json({ error: "That is already the primary email." }, { status: 400 });
  }

  const existing: string[] = account.staff_emails ?? [];
  if (existing.includes(normalized)) {
    return NextResponse.json({ error: "Email already in list." }, { status: 400 });
  }
  if (existing.length >= 9) {
    return NextResponse.json({ error: "Maximum 9 additional staff emails." }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("course_accounts")
    .update({ staff_emails: [...existing, normalized] })
    .eq("id", account.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/* DELETE  — remove an email from staff_emails */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await request.json();
  const normalized = email?.trim().toLowerCase();

  const admin = adminClient();
  const { data: account } = await admin
    .from("course_accounts")
    .select("id, email, staff_emails")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "No account found." }, { status: 403 });
  if (normalized === account.email) {
    return NextResponse.json({ error: "Cannot remove the primary login email." }, { status: 400 });
  }

  const updated = (account.staff_emails ?? []).filter((e: string) => e !== normalized);
  const { error: updateErr } = await admin
    .from("course_accounts")
    .update({ staff_emails: updated })
    .eq("id", account.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
