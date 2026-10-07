import { createHmac } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/** Local Supabase defaults (`supabase status`). These are public development keys, not secrets. */
export const LOCAL_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const LOCAL_ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
export const LOCAL_SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const LOCAL_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long';

export type Client = SupabaseClient<Database>;

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

/** An access token for a user, signed with the local JWT secret (email logins are off). */
export function mintToken(userId: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ sub: userId, email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600, iss: `${LOCAL_URL}/auth/v1` }),
  );
  const sig = createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const anon = (): Client => createClient<Database>(LOCAL_URL, LOCAL_ANON, opts);
export const admin = (): Client => createClient<Database>(LOCAL_URL, LOCAL_SERVICE, opts);

/** Create a confirmed test user and return a client signed in as them. */
export async function testUser(name: string): Promise<{ client: Client; id: string; token: string }> {
  const email = `${name}-${crypto.randomUUID().slice(0, 8)}@test.kain`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: `Test ${name}` },
  });
  if (error) throw error;
  const token = mintToken(data.user.id, email);
  const client = createClient<Database>(LOCAL_URL, LOCAL_ANON, { ...opts, global: { headers: { Authorization: `Bearer ${token}` } } });
  return { client, id: data.user.id, token };
}

export async function removeUser(id: string): Promise<void> {
  await admin().auth.admin.deleteUser(id);
}
