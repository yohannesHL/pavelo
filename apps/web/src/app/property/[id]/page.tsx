export default function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold">Property Details</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        Property ID: {params.id}
      </p>
    </div>
  );
}
