import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Authenticate the request via the user's session cookie.
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the service-role client for the course_accounts lookup: the
    // existing RLS policies on the table reference auth.users in a
    // subquery which the `authenticated` role can't read, so every
    // authenticated query returns "permission denied for table users"
    // and masks the legitimate row. We've already verified identity
    // above, so it's safe to read/update this user's own row with
    // admin privileges as long as every query is scoped to user.id /
    // user.email.
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!svc || !url) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }
    const admin = createAdminClient(url, svc, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Already-claimed row for this user
    const { data: ownAccount } = await admin
      .from("course_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownAccount) {
      return NextResponse.json({ account: ownAccount });
    }

    // Fall back to an unclaimed row with the user's email — claim it
    const userEmail = user.email!.toLowerCase();
    const { data: unclaimedAccount } = await admin
      .from("course_accounts")
      .select("*")
      .is("user_id", null)
      .eq("email", userEmail)
      .maybeSingle();

    if (unclaimedAccount) {
      const { data: claimed, error: claimError } = await admin
        .from("course_accounts")
        .update({ user_id: user.id, status: "active" })
        .eq("id", unclaimedAccount.id)
        .select()
        .single();

      if (claimError) {
        console.error("Claim error:", claimError);
        return NextResponse.json({ account: unclaimedAccount });
      }
      return NextResponse.json({ account: claimed });
    }

    return NextResponse.json({ account: null });
  } catch (err) {
    console.error("Course me error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
