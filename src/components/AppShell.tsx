import { BottomNav } from '@/components/BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-md px-5 pt-6 pb-32 safe-top">{children}</main>
      <BottomNav />
    </div>
  );
}
