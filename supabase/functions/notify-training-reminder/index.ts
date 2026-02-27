import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Only allow internal/service calls
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    if (!token || (token !== serviceKey && token !== anonKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey
    );

    const projectUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayName = dayNames[tomorrow.getDay()];

    // Find all class schedules for tomorrow
    const { data: schedules } = await supabaseAdmin
      .from('class_schedule')
      .select('id, class_id, start_time, end_time, classes(id, name, dojo_id)')
      .eq('date', tomorrowStr)
      .eq('is_cancelled', false);

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ notified: 0, message: 'No classes tomorrow' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For each class, get enrolled students
    const notifiedStudents = new Set<string>();
    let notified = 0;

    for (const schedule of schedules) {
      const cls = Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes as any;
      if (!cls) continue;

      const { data: enrollments } = await supabaseAdmin
        .from('class_students')
        .select('student_id')
        .eq('class_id', schedule.class_id);

      if (!enrollments || enrollments.length === 0) continue;

      const startTime = schedule.start_time?.slice(0, 5) || '?';
      const className = cls.name || 'Treino';

      for (const enrollment of enrollments) {
        const studentId = enrollment.student_id;
        if (notifiedStudents.has(studentId)) continue;

        // Send push
        const pushRes = await fetch(`${projectUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            userId: studentId,
            title: `📅 Treino amanhã — ${dayName}`,
            body: `${className} às ${startTime}h. Prepare seu kimono! 🥋`,
            url: '/agenda',
            icon: '/favicon.png',
          }),
        });

        if (pushRes.ok) {
          // In-app notification
          await supabaseAdmin.from('notifications').insert({
            user_id: studentId,
            title: `📅 Treino amanhã — ${dayName}`,
            message: `${className} às ${startTime}h. Prepare seu kimono! 🥋`,
            type: 'info',
          });
          notifiedStudents.add(studentId);
          notified++;
        }
      }
    }

    return new Response(
      JSON.stringify({ notified, classes: schedules.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
