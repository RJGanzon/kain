import { Placeholder } from '@/components/screens/Placeholder';
import { StackHost } from '@/lib/nav/StackHost';

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <StackHost
      rootPath="/plan"
      root={
        <Placeholder
          title="Today's plan"
          presentation="tab"
          scrollKey="/plan"
          links={[
            { href: '/plan/week', label: 'See week', kind: 'push' },
            { href: '/plan/setup', label: 'Edit budget', kind: 'push-full' },
            { href: '/plan?sheet=market', label: 'Change market', kind: 'sheet-up' },
          ]}
        />
      }
    >
      {children}
    </StackHost>
  );
}
