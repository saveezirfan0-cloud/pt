import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Only allow same-origin, relative redirect targets (prevents open redirects).
function safeNext(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/dashboard';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next'));

  // If Supabase itself reported an error on the link (e.g. expired), surface it.
  const providerError = searchParams.get('error_description') || searchParams.get('error');

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (!providerError) {
    const supabase = createClient();

    // 1) PKCE / OAuth flow — confirmation link contains ?code=
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
      return fail(origin, next, error.message);
    }

    // 2) OTP flow — email confirmation, recovery, magic link, etc.
    //    Works across devices/browsers (no PKCE verifier cookie needed).
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(`${origin}${next}`);
      return fail(origin, next, error.message);
    }
  }

  return fail(origin, next, providerError || 'auth_callback_failed');
}

function fail(origin: string, next: string, reason: string) {
  const url = new URL(`${origin}/auth/login`);
  url.searchParams.set('error', reason);
  // Preserve where the user was trying to go (e.g. accepting a partner invite).
  if (next && next !== '/dashboard') url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}
