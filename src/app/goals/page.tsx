import { redirect } from "next/navigation";

export default function GoalsPage() {
  redirect("/dashboard?page=goals");
}
