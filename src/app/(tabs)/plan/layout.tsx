import { TodayScreen } from '@/components/screens/TodayScreen';
import { StackHost } from '@/lib/nav/StackHost';

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <StackHost rootPath="/plan" root={<TodayScreen />}>
      {children}
    </StackHost>
  );
}
