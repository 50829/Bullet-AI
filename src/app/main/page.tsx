import { redirect } from "next/navigation";
import { getWorkspacePathFromLegacyPage } from "../../lib/navigation/workspaceRoutes";

type MainPageProps = {
  searchParams?: Promise<{
    page?: string | string[];
  }>;
};

export default async function MainPage({ searchParams }: MainPageProps) {
  const params = searchParams ? await searchParams : {};
  const page = typeof params.page === "string" ? params.page : null;

  redirect(getWorkspacePathFromLegacyPage(page));
}
