"use client";

import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Button } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(token ? null : "Missing invite token.");
  const [loading, setLoading] = useState(false);

  const accept = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI(`/api/agent/teams/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setError(res.status === 410 ? "This invitation has expired." : "Couldn't accept invite.");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Couldn't accept invite.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-default-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03] text-center">
        <h1 className="text-xl font-semibold">Team invitation</h1>
        <p className="mt-2 text-sm text-default-500">
          {error ?? "Click below to accept and join the team."}
        </p>
        {!error && (
          <Button color="primary" className="mt-6 w-full" onPress={accept} isLoading={loading}>
            Accept invitation
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AcceptTeamInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-default-500">Loading…</div>}>
      <AcceptInviteInner />
    </Suspense>
  );
}
