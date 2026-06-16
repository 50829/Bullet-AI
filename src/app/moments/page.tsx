import { redirect } from "next/navigation";

export default function MomentsPage() {
  redirect("/dashboard?page=moments");
}
