export const metadata = {
  title: 'Stateproof Next.js Demo',
  description: 'Next.js App Router Stateproof validation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: '2rem', background: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}
