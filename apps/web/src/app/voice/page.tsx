"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VoicePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/chat?voice=true"); }, [router]);
  return null;
}
