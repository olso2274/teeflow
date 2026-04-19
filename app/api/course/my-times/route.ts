import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: account } = await supabase
      .from("course_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ times: [] });
    }

    const { data: times, error } = await supabase
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

    // RLS ensures only the owning course staff can update
    const { error } = await supabase
      .from("course_tee_times")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to cancel tee time." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("My times DELETE error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
