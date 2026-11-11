import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/home"); // proxy mengarahkan ke /login bila belum masuk 
}
