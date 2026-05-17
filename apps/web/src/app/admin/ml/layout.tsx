import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ML Pipeline Dashboard — Pavelo Admin",
  description: "Image intelligence job queue and classification results management",
};

export default function AdminMLLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
