import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, name, role, color } = await req.json();

    if (!email || !name || !role) {
      return new Response(JSON.stringify({ error: 'email, name and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client — uses service role key injected automatically by Supabase
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Send invite email — user clicks link and sets their own password
    const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name, role },
      redirectTo: 'https://thestockyard.netlify.app/login',
    });

    if (inviteError) throw inviteError;

    // Create the profile row so the app can find them on first login
    const { error: profileError } = await admin.from('profiles').upsert({
      id: data.user.id,
      name,
      role,
      org_id: ORG_ID,
      color: color || '#1a3d76',
    });

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
