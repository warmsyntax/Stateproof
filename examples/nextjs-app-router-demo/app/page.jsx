import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Next.js Stateproof Example</h1>
      <p>
        <Link href="/settings">Go to Account Settings</Link>
      </p>
    </main>
  );
}
