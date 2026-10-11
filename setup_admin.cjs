const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vkwpcxbizxwlcgjtxwxo.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'loganleo2224@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('Error: ADMIN_PASSWORD environment variable not set');
  process.exit(1);
}

const SUPABASE_MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'vkwpcxbizxwlcgjtxwxo';

// Check available admin methods
console.log('Admin methods:', Object.keys(supabase.auth.admin || {}));

(async () => {
  // 1. Find the admin user
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.log('List users error:', listError.message);
    return;
  }
  const adminUser = users.users.find(u => u.email === ADMIN_EMAIL);
  console.log('Found admin user:', adminUser?.email, 'id:', adminUser?.id);

  // 2. Set the password - try different method names
  let updated = false;
  if (supabase.auth.admin.updateUser) {
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUser(
      adminUser.id,
      { password: ADMIN_PASSWORD, email_confirm: true }
    );
    if (updateError) {
      console.log('Update user error:', updateError.message);
    } else {
      console.log('Password set via updateUser');
      updated = true;
    }
  }
  if (!updated) {
    // Use management API directly
    const https = require('https');
    if (!SUPABASE_MANAGEMENT_TOKEN) {
      console.error('Error: SUPABASE_MANAGEMENT_TOKEN environment variable not set');
      process.exit(1);
    }
    const body = JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true
    });
    const opts = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + SUPABASE_PROJECT_REF + '/auth/users/' + adminUser.id,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_MANAGEMENT_TOKEN,
        'Content-Type': 'application/json',
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Mgmt API update status:', res.statusCode);
        console.log('Response:', data.substring(0, 500));
      });
    });
    req.on('error', (e) => console.log('Mgmt API error:', e.message));
    req.setHeader('Content-Length', Buffer.byteLength(body));
    req.write(body);
    req.end();
  }

  // Wait a moment for async operations
  await new Promise(r => setTimeout(r, 1000));

  // 3. Add admin role (using service_role key via PostgREST)
  const { data: existingRole, error: roleCheckError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', adminUser.id);
  console.log('Existing roles:', JSON.stringify(existingRole), 'Error:', roleCheckError?.message);

  if (!existingRole || existingRole.length === 0) {
    const { data: newRole, error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: adminUser.id, role: 'admin' })
      .select();
    console.log('Insert role result:', JSON.stringify(newRole), 'Error:', roleError?.message);
  } else {
    console.log('Admin already has roles, skipping insert');
  }

  // 4. Verify
  const { data: verifyRoles, error: verifyError } = await supabase
    .from('user_roles')
    .select('*');
  console.log('=== Final user_roles ===', JSON.stringify(verifyRoles));

  process.exit(0);
})();
