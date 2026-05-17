export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold">Property Details</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        Property ID: {id}
      </p>
    </div>
  );
}
