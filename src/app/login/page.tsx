import Link from "next/link";

import { SignInButton } from "@/components/SignInButton";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          Third Space
        </Link>
        <p className="text-muted-foreground">
          Sign in to post or join activities near you.
        </p>
        <SignInButton next={next} />
        <p className="text-xs text-muted-foreground">
          We use your Google account just to verify it’s you. No spam, no
          friends-of-friends.
        </p>
      </div>
    </main>
  );
}
