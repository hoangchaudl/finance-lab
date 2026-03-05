import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Supabase credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch all authenticated users with valid emails
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const users = usersData.users.filter(
      (u) => u.email && u.email_confirmed_at
    );

    if (users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No verified users to notify", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the app URL from the request origin or use a fallback
    const appUrl = req.headers.get("origin") || SUPABASE_URL.replace(".supabase.co", ".lovable.app");

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      const userName = user.user_metadata?.full_name || "there";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Finance Lab <onboarding@resend.dev>",
          to: [user.email],
          subject: "📊 Weekly Budget Check-in",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a2e; font-size: 24px;">Hey ${userName}! 👋</h1>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                It's time for your weekly budget check-in. Staying on top of your finances 
                is the key to reaching your goals!
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Take a few minutes to:
              </p>
              <ul style="color: #555; font-size: 16px; line-height: 1.8;">
                <li>Log any recent transactions</li>
                <li>Review your budget allocations</li>
                <li>Check your progress toward FIRE goals</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/budget" 
                   style="background-color: #1a1a2e; color: #ffffff; padding: 14px 32px; 
                          text-decoration: none; border-radius: 8px; font-size: 16px; 
                          display: inline-block;">
                  Review My Budget →
                </a>
              </div>
              <p style="color: #999; font-size: 13px; text-align: center;">
                You're receiving this because you have an account on Finance Lab.
              </p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        sentCount++;
      } else {
        const errBody = await res.text();
        errors.push(`Failed for ${user.email}: ${errBody}`);
      }
    }

    return new Response(
      JSON.stringify({ message: "Reminders sent", sent: sentCount, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
