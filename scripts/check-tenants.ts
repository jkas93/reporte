import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.from("tenants").select("id, name, slug");
  if (error) {
    console.error("Error:", error.message);
    return;
  }
  console.log("Tenants found:", JSON.stringify(data, null, 2));
}

check();
