import { redirect } from "next/navigation";

export default function Home() {
  const instance = process.env.NEXT_PUBLIC_APP_INSTANCE ?? "student";
  if (instance === "admin") {
    redirect("/admin");
  }
  redirect("/student");
}
