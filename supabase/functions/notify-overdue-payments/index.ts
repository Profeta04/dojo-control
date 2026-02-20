import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find students with overdue payments who haven't been notified today
    const today = new Date().toISOString().split('T')[0];
    const { data: overduePayments } = await supabaseAdmin
      .from('payments')
      .select('student_id, due_date, amount, description')
      .eq('status', 'atrasado')
      .order('due_date', { ascending: true });

    if (!overduePayments || overduePayments.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), { headers: corsHeaders });
    }

    // Group by student_id (one notification per student)
    const studentMap = new Map<string, { count: number; oldest: string }>();
    for (const p of overduePayments) {
      const existing = studentMap.get(p.student_id);
      if (!existing || p.due_date < existing.oldest) {
        studentMap.set(p.student_id, {
          count: (existing?.count || 0) + 1,
          oldest: p.due_date,
        });
      } else {
        studentMap.set(p.student_id, { count: (existing?.count || 0) + 1, oldest: existing.oldest });
      }
    }

    const projectUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    let notified = 0;

    for (const [studentId, info] of studentMap) {
      const count = info.count;
      const body = count === 1
        ? `Você possui 1 pagamento em atraso. Regularize para evitar bloqueio.`
        : `Você possui ${count} pagamentos em atraso. Regularize para evitar bloqueio.`;

      // Send push notification
      const pushRes = await fetch(`${projectUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          userId: studentId,
          title: '⚠️ Pagamento em Atraso',
          body,
          url: '/mensalidade',
          icon: '/favicon.png',
        }),
      });

      if (pushRes.ok) {
        // Also create an in-app notification
        await supabaseAdmin.from('notifications').insert({
          user_id: studentId,
          title: '⚠️ Pagamento em Atraso',
          message: body,
          type: 'payment',
        });
        notified++;
      }
    }

    return new Response(JSON.stringify({ notified, total: studentMap.size }), { headers: corsHeaders });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
