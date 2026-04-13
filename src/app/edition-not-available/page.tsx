import Link from "next/link";

export default function EditionNotAvailablePage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-white">Not available in Simple edition</h1>
      <p className="text-sm text-gray-400 max-w-md">
        This area is part of Control Hub Commercial. OSS Simple edition includes core Hermes
        surfaces only; upgrade for operations, task lists, workspaces, packages, and Command Room.
      </p>
      <Link href="/" className="text-sm text-neon-cyan hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
