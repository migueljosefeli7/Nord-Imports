import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const email = process.env.ADMIN_SETUP_EMAIL?.trim().toLowerCase();
const whatsapp = process.env.ADMIN_SETUP_WHATSAPP?.replace(/\D/g, "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SECRET_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nordimports.com.br";

if (!email || !whatsapp || !url || !serviceKey) {
  console.log("Owner setup skipped: temporary configuration is not present.");
  process.exit(0);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

try {
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  let user = usersData.users.find((item) => item.email?.toLowerCase() === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/admin`,
    });
    if (error) throw error;
    user = data.user;
    console.log("Administrator invitation sent.");
  } else {
    console.log("Administrator account already exists.");
  }

  const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  if (roleError) throw roleError;

  const { error: settingsError } = await supabase.from("store_settings").update({ whatsapp }).eq("id", 1);
  if (settingsError) throw settingsError;
  console.log("Administrator role and store contact configured.");
} catch (error) {
  console.error("Owner setup failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
}
