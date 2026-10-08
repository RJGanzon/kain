import type { Metadata, Viewport } from 'next';
import { WelcomeScreen } from '@/components/screens/WelcomeScreen';

export const metadata: Metadata = { title: 'Welcome' };
export const viewport: Viewport = { themeColor: '#FFC83A' };

export default function WelcomePage() {
  return <WelcomeScreen />;
}
