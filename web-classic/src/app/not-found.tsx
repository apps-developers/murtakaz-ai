export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
      <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
    </div>
  );
}
