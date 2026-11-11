// TAKE.it – odesílání push notifikací
// Volá ho Database Webhook při každém novém řádku v tabulce `notifications`.
// Nasazení: Supabase → Edge Functions → Deploy new function → název "push" → vlož tento kód.
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  const payload = await req.json();
  const n = payload?.record;
  if (!n?.user_id) return new Response('no record', { status: 400 });

  const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', n.user_id);
  if (!tokens?.length) return new Response('no tokens');

  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: 'default',
    title: n.title,
    body: n.body ?? '',
    data: { ...(n.data ?? {}), type: n.type },
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const out = await res.json();

  // Smazat neplatné tokeny (odinstalovaná appka)
  const results = out?.data ?? [];
  const dead = results
    .map((r: { status: string; details?: { error?: string } }, i: number) =>
      r.status === 'error' && r.details?.error === 'DeviceNotRegistered' ? tokens[i].token : null)
    .filter(Boolean);
  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);

  return new Response(JSON.stringify({ sent: messages.length }), { headers: { 'Content-Type': 'application/json' } });
});
