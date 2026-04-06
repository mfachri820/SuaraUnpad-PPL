import { GoogleOAuthProvider } from '@react-oauth/google';


const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">

      <GoogleOAuthProvider clientId={googleClientId}>
      {children}
    </GoogleOAuthProvider>

    </div>
    
  );
}