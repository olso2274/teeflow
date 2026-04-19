import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to find an already-claimed account
    const { data: ownAccount } = await supabase
      .from("course_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownAccount) {
      return NextResponse.json({ account: ownAccount });
    }

    // Try to find an unclaimed account matching this email (visible via RLS select_by_email policy)
    const { data: unclaimedAccount } = await supabase
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

    return NextResponse.json({ account: null });
  } catch (err) {
    console.error("Course me error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
