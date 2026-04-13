"use client";

import { MessageSquare, Radio } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Link from "next/link";

/**
 * Command Room — MVP shell. Chat, dual-agent, and gateway feeds require Hermes gateway APIs;
 * see docs/PLATFORM_VISION.md for the spike roadmap.
 */
export default function CommandRoomPage() {
  return (
    <div className="min-h-screen p-6 md:p-8">
      <PageHeader
        title="Command Room"
        subtitle="Future home for operator chat, two-agent rooms, and gateway monitors. Hermes must expose HTTP/WebSocket surfaces; Mission Control will proxy read-only feeds first."
        icon={MessageSquare}
        color="purple"
      />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-zinc-100 font-semibold mb-2">
            <Radio className="h-4 w-4 text-neon-cyan" />
            Status
          </div>
          <p className="text-sm text-zinc-400">
            Spike: confirm gateway URL and auth from Hermes config, then add a minimal message
            stream. No runtime is embedded in Mission Control.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Elsewhere</h2>
          <ul className="text-sm text-neon-cyan space-y-2">
            <li>
              <Link href="/gateway" className="hover:underline">
                Gateway monitor
              </Link>
            </li>
            <li>
              <Link href="/sessions" className="hover:underline">
                Sessions
              </Link>
            </li>
            <li>
              <Link href="/logs" className="hover:underline">
                Logs
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
