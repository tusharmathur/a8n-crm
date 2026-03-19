export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
      <meta name="googlebot" content="noindex, nofollow" />
      {children}
    </>
  );
}
