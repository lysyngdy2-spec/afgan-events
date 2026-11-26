'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { whenFresh } from '@/lib/fresh';

// A link whose page is fetched ahead of time, but only once the screen is fresh and the
// phone is idle, so opening the app isn't slowed by a burst of background page loads.
export default function FreshLink({ href, ...rest }) {
  const router = useRouter();
  useEffect(() => whenFresh(() => router.prefetch(href, { kind: 'full' }), 900), [href, router]);
  return <Link href={href} prefetch={false} {...rest} />;
}
