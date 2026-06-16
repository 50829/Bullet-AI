import { redirect } from "next/navigation";

type MainPageProps = {
  searchParams?: Promise<{
    page?: string | string[];
  }>;
};

export default async function MainPage({ searchParams }: MainPageProps) {
  const params = searchParams ? await searchParams : {};
  const page = typeof params.page === "string" ? `?page=${encodeURIComponent(params.page)}` : "";

  redirect(`/dashboard${page}`);
}
