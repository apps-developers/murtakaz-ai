// app/api/config/features/route.ts - Feature flags API

import { NextRequest, NextResponse } from 'next/server';
import { getOrgFeatures, updateFeatureFlag, updateFeatureFlags } from '@/lib/config/service';
import { featureFlagUpdateSchema } from '@/lib/config/validation';
import { requireOrgAdmin, requireSession } from '@/lib/server-action-auth';
import { featureRegistry } from '@/lib/config/defaults';

/**
 * GET /api/config/features
 * Get feature flags for the organization
 */
export async function GET() {
  try {
    const session = await requireSession();
    const user = session.user as { orgId?: string };
    const orgId = user.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization context' },
        { status: 400 }
      );
    }

    const features = await getOrgFeatures(orgId);

    // Merge with feature registry metadata
    const enrichedFeatures = Object.entries(features).map(([key, config]) => ({
      key,
      ...config,
      meta: featureRegistry[key] || null,
    }));

    return NextResponse.json({ features: enrichedFeatures });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config/features
 * Bulk update feature flags (requires admin)
 */
export async function PUT(request: NextRequest) {
  try {
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

    if (!body.features || typeof body.features !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body: features object required' },
        { status: 400 }
      );
    }

    // Validate each feature flag
    for (const [key, value] of Object.entries(body.features)) {
      const validation = featureFlagUpdateSchema.safeParse(value);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: `Invalid feature flag data for ${key}`,
            details: validation.error.issues,
          },
          { status: 400 }
        );
      }
    }

    await updateFeatureFlags(orgId, body.features);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating feature flags:', error);

    if (error instanceof Error && error.message.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update feature flags' },
      { status: 500 }
    );
  }
}
