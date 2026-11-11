export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    // Hanya merender halamannya saja (kosongan tanpa Navbar/Footer)
    <div className="min-h-screen bg-slate-50 ">{children}</div>
  );
}
