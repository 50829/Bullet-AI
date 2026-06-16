import { redirect } from "next/navigation";

export default function ReflectionsPage() {
  redirect("/dashboard?page=reflections");
}
