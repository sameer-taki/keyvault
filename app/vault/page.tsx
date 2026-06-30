import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import ConnectionCheck from "@/components/ConnectionCheck";

export default async function VaultPage() {
  const { userId } = await auth();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold">Your vault</h1>
          <p className="text-sm text-slate-500">Signed in as {userId}</p>
        </div>
        <UserButton />
      </header>

      <section className="space-y-3">
        <p className="text-slate-600 dark:text-slate-400">
          Auth is wired up. The encrypted vault (master-password unlock + items) lands in the next
          phases. Below is a live check that authenticated Supabase requests reach the database
          under your identity.
        </p>
        <ConnectionCheck />
      </section>
    </main>
  );
}
