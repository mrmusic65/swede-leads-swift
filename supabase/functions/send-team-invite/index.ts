import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing auth header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, teamId, role } = await req.json();
    if (!email || !teamId || !role) throw new Error('Missing fields');

    // Verify requester is admin/owner
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Not authorized');
    }

    // Get team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    // Check if already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('invited_email', email)
      .single();

    if (existing) {
      throw new Error('Already invited');
    }

    // Check if user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    // Insert pending member
    const { error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: existingProfile?.id || null,
        role,
        invited_email: email,
        status: existingProfile ? 'active' : 'pending',
      });

    if (insertError) throw insertError;

    // If user exists, update their profile team_id
    if (existingProfile) {
      await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', existingProfile.id);
    }

    // Send email via Resend
    if (resendApiKey) {
      const inviterName = user.user_metadata?.full_name || user.email;
      const teamName = team?.name || 'ett team';

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LeadRadar <noreply@resend.dev>',
          to: [email],
          subject: `Du har blivit inbjuden till ${teamName} på LeadRadar`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #0d9488;">LeadRadar — Teaminbjudan</h2>
              <p>${inviterName} har bjudit in dig till teamet <strong>${teamName}</strong> på LeadRadar.</p>
              <p>Din roll: <strong>${role === 'admin' ? 'Admin' : 'Medlem'}</strong></p>
              <p>Logga in eller skapa ett konto på LeadRadar för att gå med i teamet.</p>
              <a href="${req.headers.get('origin') || 'https://swede-leads-swift.lovable.app'}/auth" 
                 style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
                Gå med i teamet
              </a>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
