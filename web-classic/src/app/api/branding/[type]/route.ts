// app/api/branding/[type]/route.ts - Branding asset serving API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-action-auth';

const validTypes = ['logo-light', 'logo-dark', 'favicon', 'icon-512'] as const;
type ValidType = typeof validTypes[number];

/**
 * GET /api/branding/[type]
 * Serve branding assets for the current organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  
  try {
    if (!validTypes.includes(type as ValidType)) {
      return NextResponse.json(
        { error: 'Invalid asset type' },
        { status: 400 }
      );
    }

    const session = await requireSession();
    const user = session.user as { orgId?: string };
    const orgId = user.orgId;

    if (!orgId) {
      // Return fallback for no org context
      return handleFallback(type as ValidType);
    }

    // Get branding asset from database
    const asset = await prisma.brandingAsset.findFirst({
      where: {
        organizationId: orgId,
        type: type as ValidType,
      },
    });

    if (!asset || !asset.url) {
      return handleFallback(type as ValidType, orgId);
    }

    // Redirect to the asset URL (R2/S3/CDN)
    return NextResponse.redirect(asset.url, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // 24 hour cache
      },
    });
  } catch (error) {
    console.error('Error serving branding asset:', error);
    return handleFallback(type as ValidType);
  }
}

/**
 * Handle fallback when custom asset is not available
 */
function handleFallback(type: ValidType, orgId?: string): NextResponse {
  const fallbacks: Record<ValidType, string> = {
    'logo-light': '/AlmosaLogoWhite.png',
    'logo-dark': '/AlmosaLogoWhite.png',
    'favicon': '/favicon.ico',
    'icon-512': '/icon-512.png',
  };

  // For now, just return the fallback path
  // In production, you might want to redirect or return the actual file
  return NextResponse.json(
    {
      fallback: true,
      url: fallbacks[type],
      message: `Using default ${type}`,
    },
    {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
