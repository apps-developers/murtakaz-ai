-- CreateTable
CREATE TABLE "organization_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "theme" JSONB,
    "branding" JSONB,
    "layout" JSONB,
    "navigation" JSONB,
    "custom_css" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_feature_flags" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_dashboards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT,
    "name" TEXT NOT NULL,
    "config" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_entity_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "key" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_entity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branding_assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_configs_organization_id_key" ON "organization_configs"("organization_id");

-- CreateIndex
CREATE INDEX "org_feature_flags_organization_id_idx" ON "org_feature_flags"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_feature_flags_organization_id_feature_key_key" ON "org_feature_flags"("organization_id", "feature_key");

-- CreateIndex
CREATE INDEX "dashboard_templates_organization_id_idx" ON "dashboard_templates"("organization_id");

-- CreateIndex
CREATE INDEX "user_dashboards_user_id_idx" ON "user_dashboards"("user_id");

-- CreateIndex
CREATE INDEX "user_dashboards_template_id_idx" ON "user_dashboards"("template_id");

-- CreateIndex
CREATE INDEX "custom_entity_types_organization_id_idx" ON "custom_entity_types"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_entity_types_organization_id_key_key" ON "custom_entity_types"("organization_id", "key");

-- CreateIndex
CREATE INDEX "branding_assets_organization_id_idx" ON "branding_assets"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "branding_assets_organization_id_type_key" ON "branding_assets"("organization_id", "type");

-- AddForeignKey
ALTER TABLE "organization_configs" ADD CONSTRAINT "organization_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_feature_flags" ADD CONSTRAINT "org_feature_flags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_templates" ADD CONSTRAINT "dashboard_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboards" ADD CONSTRAINT "user_dashboards_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "dashboard_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_entity_types" ADD CONSTRAINT "custom_entity_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branding_assets" ADD CONSTRAINT "branding_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
