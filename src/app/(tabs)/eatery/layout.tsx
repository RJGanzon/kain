import { EateryScreen } from '@/components/screens/EateryScreen';
import { StackHost } from '@/lib/nav/StackHost';

export default function EateryLayout({ children }: { children: React.ReactNode }) {
  return (
    <StackHost rootPath="/eatery" root={<EateryScreen />}>
      {children}
    </StackHost>
  );
}
