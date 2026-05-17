export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="space-y-8">
        {/* Hero */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Pavelo
          </h1>
          <p className="text-lg text-[var(--muted-foreground)]">
            Your AI estate agent that listens, remembers, and delivers.
          </p>
        </div>

        {/* Status Card */}
        <div
          className="rounded-[var(--radius-card)] border border-[var(--border)] p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="mb-4 text-xl font-semibold">System Status</h2>
          <div className="grid gap-3">
            <StatusRow label="Frontend (Next.js 15)" status="operational" />
            <StatusRow label="API Gateway (Fastify)" status="operational" />
            <StatusRow label="Agent Service (Python)" status="operational" />
            <StatusRow label="ML Service (Python)" status="operational" />
            <StatusRow label="Database (PostgreSQL)" status="operational" />
            <StatusRow label="Cache (Redis)" status="operational" />
          </div>
        </div>

        {/* Sprint Info */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-6">
          <h2 className="mb-2 text-xl font-semibold">Sprint 1 — Infrastructure Foundations</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Monorepo scaffold, service skeletons, design system, CI/CD pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-input)] bg-[var(--muted)] px-4 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        {status}
      </span>
    </div>
  );
}
