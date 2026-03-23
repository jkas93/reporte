const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://zmbczckytldxxmqxffwm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptYmN6Y2t5dGxkeHhtcXhmZndtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEzNzY0NCwiZXhwIjoyMDg5NzEzNjQ0fQ.O9sjSVQC73FFr40UDNoDv2JJqaT7SQXqsNrIzOqfyhM"
);

async function check() {
  const { data, error } = await supabase.from("tenants").select("*");
  if (error) {
    console.error("Error:", error.message);
    return;
  }
  console.log("Tenants found:", JSON.stringify(data, null, 2));
}

check();
