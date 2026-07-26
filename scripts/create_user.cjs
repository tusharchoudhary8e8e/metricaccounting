const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const email = process.argv[2];
const password = process.argv[3];
const allowedIp = process.argv[4];

if (!email || !password || !allowedIp) {
  console.log(`
=====================================================
  TAP Accounting - Admin Account & IP Creation Tool
=====================================================

Usage:
  node scripts/create_user.cjs <email> <password> <allowed_ip>

Example:
  node scripts/create_user.cjs user@company.com SecretPass123 203.0.113.19
`);
  process.exit(0);
}

const SUPABASE_URL = "https://vgyxuaistuegijwjopnf.supabase.co";
const SUPABASE_KEY = "sb_publishable_HOyOBnSCNUnClEfzvPeiVw_bO2gzrrL";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log(`\nCreating account for: ${email}`);
  console.log(`Setting allowed IP: ${allowedIp}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        allowed_ip: allowedIp
      }
    }
  });

  if (error) {
    console.error("❌ Error creating account:", error.message);
    process.exit(1);
  }

  console.log("\n✅ SUCCESS: Account created successfully!");
  console.log(`User ID: ${data.user?.id}`);
  console.log(`Email: ${data.user?.email}`);
  console.log(`Bound IP: ${data.user?.user_metadata?.allowed_ip || allowedIp}`);
}

main();
