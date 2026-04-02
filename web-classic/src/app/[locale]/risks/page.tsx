"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/providers/locale-provider";
import { getOrgEntitiesByTypeCode } from "@/actions/entities";

type RiskRow = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>["items"][number];

export default function RisksPage() {
  const { locale, t, isArabic } = useLocale();
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrgEntitiesByTypeCode({ entityTypeCode: "risk", q: q || undefined, pageSize: 200 })
      .then((res) => setRisks(res.items))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("risks")}
        subtitle={t("risksSubtitle")}
        icon={<Icon name="tabler:shield-exclamation" className="h-5 w-5" />}
        breadcrumbs={[
          { label: t("risks") },
        ]}
      />

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:clipboard-list" className="h-4 w-4 text-foreground" />
                {t("riskRegister")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("riskRegisterDesc")}</CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchDemoPlaceholder")}
                className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">{t("risk")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("status")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("code")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("description")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : risks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      {t("noItemsYet")}
                    </TableCell>
                  </TableRow>
                ) : (
                  risks.map((risk) => (
                    <TableRow key={risk.id} className="border-border hover:bg-card/50">
                      <TableCell className="font-medium text-foreground">
                        <Link href={`/${locale}/entities/risk/${risk.id}`} className="hover:underline">
                          {isArabic ? risk.titleAr ?? risk.title : risk.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-foreground">{risk.status}</TableCell>
                      <TableCell className="text-muted-foreground">{risk.key ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(isArabic ? risk.descriptionAr ?? risk.description : risk.description) ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
