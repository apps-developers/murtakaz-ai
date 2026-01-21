import { redirect } from "next/navigation";

export default function KPIsPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/entities/kpi`);
}
