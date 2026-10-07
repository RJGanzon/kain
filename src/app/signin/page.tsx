import type { Metadata, Viewport } from 'next';
import { Placeholder } from '@/components/screens/Placeholder';

export const metadata: Metadata = { title: 'Sign in' };
export const viewport: Viewport = { themeColor: '#FFC83A' };

export default function SignInPage() {
  return (
    <Placeholder
      title="Sign in"
      presentation="full"
      links={[
        { href: '/plan/setup', label: 'Plan meals without an account', kind: 'push-full', replace: true },
        { href: '/eatery', label: 'For my eatery', kind: 'forward', replace: true },
      ]}
    />
  );
}
