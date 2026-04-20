import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to find an already-claimed account
    const { data: ownAccount, error: ownErr } = await supabase
      .from("course_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownAccount) {
      return NextResponse.json({ account: ownAccount });
    }

    // Try to find an unclaimed account matching this email (visible via RLS select_by_email policy)
    const { data: unclaimedAccount, error: unclaimedErr } = await supabase
      .from("course_accounts")
      .select("*")
      .is("user_id", null)
      .eq("email", user.email!.toLowerCase())
      .maybeSingle();

    if (unclaimedAccount) {
      // Claim it
      const { data: claimed, error: claimError } = await supabase
        .from("course_accounts")
        .update({ user_id: user.id })
        .eq("id", unclaimedAccount.id)
        .select()
        .single();

      if (claimError) {
        console.error("Claim error:", claimError);
        return NextResponse.json({ account: unclaimedAccount });
      }
      return NextResponse.json({ account: claimed });
    }

    // Diagnostic: when the authenticated client returns nothing, check
    // whether a row exists at all via the admin/service-role client. If one
    // does, RLS is masking it — surface that fact so we can see what's
    // wrong from outside.
    if (debug) {
      const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (svc && url) {
        const admin = createAdminClient(url, svc, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: adminRows } = await admin
          .from("course_accounts")
          .select("id, user_id, email, status")
          .eq("email", user.email!.toLowerCase());
        return NextResponse.json({
          account: null,
          _debug: {
            auth_user_id: user.id,
            auth_user_email: user.email,
            own_query_error: ownErr?.message ?? null,
            unclaimed_query_error: unclaimedErr?.message ?? null,
            admin_rows_for_email: adminRows,
          },
        });
      }
    }

    return NextResponse.json({ account: null });
  } catch (err) {
    console.error("Course me error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
