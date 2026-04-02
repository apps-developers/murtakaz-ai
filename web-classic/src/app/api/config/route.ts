// app/api/config/route.ts - Organization configuration API

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getOrgConfig, updateOrgConfig } from '@/lib/config/service';
import { organizationConfigPartialSchema } from '@/lib/config/validation';
import { requireOrgAdmin, requireSession } from '@/lib/server-action-auth';
import type { OrganizationConfig, BrandingConfig, CustomerTheme, LayoutConfig, NavSectionConfig } from '@/types/config';

/**
 * GET /api/config
 * Get organization configuration for the current user
 */
export async function GET() {
  try {
    // Get current user and org
    const session = await requireSession();
    const user = session.user as { orgId?: string };
    const orgId = user.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization context' },
        { status: 400 }
      );
    }

    const config = await getOrgConfig(orgId);

    return NextResponse.json({
      theme: config.theme,
      branding: config.branding,
      layout: config.layout,
      navigation: config.navigation,
      features: config.features,
      customCSS: config.customCSS,
    });
  } catch (error) {
    console.error('Error fetching org config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config
 * Update organization configuration (requires admin)
 */
export async function PUT(request: NextRequest) {
  try {
    // Require admin access
    await requireOrgAdmin();

    const session = await requireSession();
    const user = session.user as { orgId?: string };
    const orgId = user.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization context' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = organizationConfigPartialSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid configuration data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const updateData: Partial<OrganizationConfig> = {};
    if (validationResult.data.theme) updateData.theme = validationResult.data.theme as CustomerTheme;
    if (validationResult.data.branding) updateData.branding = validationResult.data.branding as BrandingConfig;
    if (validationResult.data.layout) updateData.layout = validationResult.data.layout as LayoutConfig;
    if (validationResult.data.navigation) updateData.navigation = validationResult.data.navigation as NavSectionConfig[];
    if (validationResult.data.customCSS !== undefined) updateData.customCSS = validationResult.data.customCSS;

    await updateOrgConfig(orgId, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating org config:', error);

    if (error instanceof Error && error.message.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/config
 * Partial update of organization configuration (requires admin)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Require admin access
    await requireOrgAdmin();

    const session = await requireSession();
    const user = session.user as { orgId?: string };
    const orgId = user.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization context' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = organizationConfigPartialSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid configuration data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const updateData: Partial<OrganizationConfig> = {};
    if (validationResult.data.theme) updateData.theme = validationResult.data.theme as CustomerTheme;
    if (validationResult.data.branding) updateData.branding = validationResult.data.branding as BrandingConfig;
    if (validationResult.data.layout) updateData.layout = validationResult.data.layout as LayoutConfig;
    if (validationResult.data.navigation) updateData.navigation = validationResult.data.navigation as NavSectionConfig[];
    if (validationResult.data.customCSS !== undefined) updateData.customCSS = validationResult.data.customCSS;

    await updateOrgConfig(orgId, updateData);

    // Return updated config
    const updatedConfig = await getOrgConfig(orgId);

    return NextResponse.json({
      success: true,
      config: {
        theme: updatedConfig.theme,
        branding: updatedConfig.branding,
        layout: updatedConfig.layout,
        navigation: updatedConfig.navigation,
        features: updatedConfig.features,
        customCSS: updatedConfig.customCSS,
      },
    });
  } catch (error) {
    console.error('Error updating org config:', error);

    if (error instanceof Error && error.message.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
