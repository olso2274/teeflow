import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// The course_accounts RLS policies reference auth.users in a subquery that
// the `authenticated` role can't read, so every authenticated query on that
// table fails with "permission denied for table users". We authenticate the
// user via cookies here, then perform the table operations with the
// service-role client scoped strictly to this user's rows.
async function withAdmin() {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!svc || !url) throw new Error("Server misconfigured.");
  return createAdminClient(url, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await withAdmin();

    const { data: account } = await admin
      .from("course_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ times: [] });
    }

    const { data: times, error } = await admin
      .from("course_tee_times")
      .select("*")
      .eq("course_account_id", account.id)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .order("tee_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load times." }, { status: 500 });
    }

    return NextResponse.json({ times: times ?? [] });
  } catch (err) {
    console.error("My times GET error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing tee time id." }, { status: 400 });
    }

    const admin = await withAdmin();

    // Scope the delete to this user's course_account to prevent other users
    // from toggling off someone else's tee times.
    const { data: account } = await admin
      .from("course_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "No course account found." }, { status: 403 });
    }

    const { error } = await admin
      .from("course_tee_times")
      .update({ is_active: false })
      .eq("id", id)
      .eq("course_account_id", account.id);

    if (error) {
      return NextResponse.json({ error: "Failed to cancel tee time." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("My times DELETE error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
