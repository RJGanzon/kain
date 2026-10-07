import { Placeholder } from '@/components/screens/Placeholder';
import { StackHost } from '@/lib/nav/StackHost';
import { SAMPLE_POTS } from '@/lib/sample/eatery';

export default function EateryLayout({ children }: { children: React.ReactNode }) {
  return (
    <StackHost
      rootPath="/eatery"
      root={
        <Placeholder
          title="Your carinderia"
          presentation="tab"
          scrollKey="/eatery"
          links={[
            ...SAMPLE_POTS.map((p) => ({ href: `/eatery/pot/${p.id}`, label: p.name, kind: 'push-full' as const })),
            { href: '/business', label: 'Business plan', kind: 'sheet-up' as const },
          ]}
        />
      }
    >
      {children}
    </StackHost>
  );
}
