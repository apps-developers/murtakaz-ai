"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/icon";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";
import { getMyProfile } from "@/actions/profile";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Mail, Building2, UserCircle, Shield, Briefcase, Clock, LogOut, Settings, Users } from "lucide-react";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { locale, t } = useLocale();

  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getMyProfile>> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    (async () => {
      try {
        const result = await getMyProfile();
        if (!mounted) return;
        setProfile(result);
      } catch (e: unknown) {
        if (!mounted) return;
        setProfileError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return "destructive";
      case "EXECUTIVE":
        return "default";
      case "MANAGER":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return <Shield className="h-4 w-4" />;
      case "EXECUTIVE":
        return <Briefcase className="h-4 w-4" />;
      case "MANAGER":
        return <Users className="h-4 w-4" />;
      default:
        return <UserCircle className="h-4 w-4" />;
    }
  };

  const formatRoleName = (role?: string) => {
    if (!role) return "—";
    return t(`role${role.charAt(0) + role.slice(1).toLowerCase()}`) || role;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-gradient-to-b from-card/50 to-card p-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{t("noActiveSession")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("signInToViewProfile")}</p>
        <Button asChild className="mt-6">
          <Link href={`/${locale}/auth/login`}>{t("goToSignIn")}</Link>
        </Button>
      </div>
    );
  }

  const pUser = profile?.user ?? null;
  const pOrg = profile?.user?.org ?? null;
  const pManager = profile?.user?.manager ?? null;

  const initials = (pUser?.name ?? user.name)
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t("profile")}
          subtitle={t("profileSubtitle")}
          icon={<Icon name="tabler:user" className="h-5 w-5" />}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              {t("settings")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </div>

      {/* Main Profile Card */}
      <Card className="overflow-hidden border-border bg-gradient-to-br from-card to-card/95 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left: Avatar & Basic Info */}
            <div className="flex flex-col items-center justify-center border-b border-border bg-muted/30 p-8 md:w-1/3 md:border-b-0 md:border-r">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                  {pUser?.image ? (
                    <AvatarImage src={pUser.image} alt={pUser.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-4xl font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 rounded-full bg-background p-1 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {getRoleIcon(pUser?.role)}
                  </div>
                </div>
              </div>
              
              <h2 className="mt-4 text-xl font-bold text-foreground">
                {pUser?.name ?? user.name}
              </h2>
              <p className="text-sm text-muted-foreground">{pUser?.title ?? "—"}</p>
              
              <Badge 
                variant={getRoleBadgeVariant(pUser?.role)} 
                className="mt-3"
              >
                {getRoleIcon(pUser?.role)}
                <span className="ml-1">{formatRoleName(pUser?.role)}</span>
              </Badge>

              {profile?.session?.expiresAt && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {t("sessionExpires")}: {new Date(profile.session.expiresAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Tabs with Details */}
            <div className="flex-1 p-6 md:p-8">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
                  <TabsTrigger value="personal">{t("personalInfo")}</TabsTrigger>
                  <TabsTrigger value="organization">{t("organization")}</TabsTrigger>
                  <TabsTrigger value="activity">{t("activity")}</TabsTrigger>
                </TabsList>

                {/* Personal Info Tab */}
                <TabsContent value="personal" className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoCard
                      icon={<Mail className="h-4 w-4" />}
                      label={t("email")}
                      value={pUser?.email ?? "—"}
                    />
                    <InfoCard
                      icon={<UserCircle className="h-4 w-4" />}
                      label={t("role")}
                      value={formatRoleName(pUser?.role)}
                    />
                    <InfoCard
                      icon={<Briefcase className="h-4 w-4" />}
                      label={t("title")}
                      value={pUser?.title ?? "—"}
                    />
                    <InfoCard
                      icon={<Building2 className="h-4 w-4" />}
                      label={t("department")}
                      value={(pUser as unknown as { department?: string })?.department ?? "—"}
                    />
                  </div>
                </TabsContent>

                {/* Organization Tab */}
                <TabsContent value="organization" className="mt-6 space-y-4">
                  <Card className="border-border/50 bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-primary" />
                        {t("organization")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("orgName")}</span>
                        <span className="font-medium text-foreground">{pOrg?.name ?? "—"}</span>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("domain")}</span>
                        <span className="font-medium text-foreground">{pOrg?.domain ?? "—"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4 text-primary" />
                        {t("reportingLine")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pManager ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                              {pManager.name?.charAt(0).toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{pManager.name}</p>
                            <p className="text-sm text-muted-foreground">{pManager.title}</p>
                            <p className="text-xs text-muted-foreground">{pManager.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("noManagerAssigned")}</p>
                      )}
                    </CardContent>
                  </Card>

                  {pUser?.role === "SUPER_ADMIN" && (
                    <Button asChild className="w-full">
                      <Link href={`/${locale}/super-admin/users`}>
                        <Shield className="mr-2 h-4 w-4" />
                        {t("manageUsers")}
                      </Link>
                    </Button>
                  )}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-6">
                  <Card className="border-border/50 bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-primary" />
                        {t("sessionInfo")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("sessionStatus")}</span>
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
                          {t("active")}
                        </Badge>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("expiresAt")}</span>
                        <span className="font-medium text-foreground">
                          {profile?.session?.expiresAt 
                            ? new Date(profile.session.expiresAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")
                            : "—"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for info cards
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
      <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
