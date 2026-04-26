"use client";

import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Button } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Info = { team: { id: string; name: string; icon: string; hue: number }; permission: "read" | "edit" } | null;

function JoinTeamInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [info, setInfo] = useState<Info>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) { setError("Missing invite token."); return; }
    fetchAPI(`/api/agent/teams/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setError(res.status === 410 ? "This invite link has expired." : "Invite not found.");
          return;
        }
        setInfo(await res.json());
      })
      .catch(() => setError("Couldn't load invite."));
  }, [token]);

  const join = async () => {
    setJoining(true);
    try {
      const res = await fetchAPI(`/api/agent/teams/share/${token}`, { method: "POST" });
      if (!res.ok) {
        setError("Couldn't join team.");
        setJoining(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Couldn't join team.");
      setJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-default-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        {error ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold">{error}</h1>
            <p className="mt-2 text-sm text-default-500">Ask the person who shared this link to send a new one.</p>
          </div>
        ) : !info ? (
          <div className="text-center text-sm text-default-500">Loading invite…</div>
        ) : (
          <>
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ background: `hsl(${info.team.hue} 70% 50%)` }}
            >
              <span className="material-icons-round">{info.team.icon}</span>
            </div>
            <h1 className="text-center text-xl font-semibold">Join "{info.team.name}"</h1>
            <p className="mt-2 text-center text-sm text-default-500">
              You'll be added as <strong>{info.permission === "edit" ? "an editor" : "a viewer"}</strong>.
            </p>
            <Button color="primary" className="mt-6 w-full" onPress={join} isLoading={joining}>
              Accept &amp; join team
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-default-500">Loading…</div>}>
      <JoinTeamInner />
    </Suspense>
  );
}
