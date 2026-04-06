import { GoogleOAuthProvider } from '@react-oauth/google';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">

      <GoogleOAuthProvider clientId="CLIENT_ID_KAMU_DI_SINI">
      {children}
    </GoogleOAuthProvider>

    </div>
    
  );
}