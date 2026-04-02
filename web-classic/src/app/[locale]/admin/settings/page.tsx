// app/[locale]/admin/settings/page.tsx - Admin settings page with configuration panels

import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeConfigPanel } from "@/components/admin/config/theme-config-panel";
import { BrandingConfigPanel } from "@/components/admin/config/branding-config-panel";
import { FeaturesConfigPanel } from "@/components/admin/config/features-config-panel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your organization's appearance and features",
};

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize your organization's appearance, branding, and available features.
        </p>
      </div>

      <Tabs defaultValue="theme" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="space-y-4">
          <ThemeConfigPanel />
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <BrandingConfigPanel />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <FeaturesConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
