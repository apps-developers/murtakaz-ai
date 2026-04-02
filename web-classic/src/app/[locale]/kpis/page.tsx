import { redirect } from "next/navigation";

export default async function KPIsPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  redirect(`/${locale}/entities/kpi`);
}
