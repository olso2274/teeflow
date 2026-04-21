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

/* ── GET /api/course/profile?id=[course_account_id] ─────────────────────────
   Public — returns the profile of any active course (for the golfer-facing
   profile page).  Auth not required.
   ─────────────────────────────────────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from("course_accounts")
    .select("id, course_name, contact_name, email, phone, website_url, description, address, holes, par, logo_url, status, created_at")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ profile: data });
}

/* ── PUT /api/course/profile ─────────────────────────────────────────────────
   Authenticated — course admin updates their own profile.
   ─────────────────────────────────────────────────────────────────────────── */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    course_name,
    phone,
    website_url,
    description,
    address,
    holes,
    par,
    logo_url,
  } = body;

  // Validate
  if (description && description.length > 500) {
    return NextResponse.json({ error: "Description must be 500 characters or fewer." }, { status: 400 });
  }
  if (website_url && !/^https?:\/\/.+/.test(website_url.trim())) {
    return NextResponse.json({ error: "Website URL must start with http:// or https://" }, { status: 400 });
  }

  const admin = adminClient();

  // Verify ownership
  const { data: account } = await admin
    .from("course_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "No course account found." }, { status: 403 });
  }

  const { data: updated, error: updateErr } = await admin
    .from("course_accounts")
    .update({
      ...(course_name !== undefined && { course_name: course_name.trim() }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(website_url !== undefined && { website_url: website_url?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(holes !== undefined && { holes: holes ? parseInt(holes) : null }),
      ...(par !== undefined && { par: par ? parseInt(par) : null }),
      ...(logo_url !== undefined && { logo_url: logo_url?.trim() || null }),
    })
    .eq("id", account.id)
    .select()
    .single();

  if (updateErr) {
    console.error("Profile update error:", updateErr);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
