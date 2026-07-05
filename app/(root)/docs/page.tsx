import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  FolderGit2,
  MousePointerClick,
  PlusCircle,
  Save,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Docs - Getting Started | VibeCode",
  description: "Learn how to create playgrounds, import GitHub repos, and use the VibeCode editor.",
};

const steps = [
  {
    icon: PlusCircle,
    title: "Create a playground",
    body: "From the Dashboard, click \"Add New\", pick a starter template (React, Next.js, Express, Vue, Hono or Angular), name it, and you'll drop straight into the editor.",
  },
  {
    icon: FolderGit2,
    title: "Import a GitHub repository",
    body: "Click \"Open Github Repository\" on the Dashboard and paste any public repo URL (e.g. https://github.com/owner/repo). We pull the files in and open them in the editor. node_modules, binaries and large files are skipped.",
  },
  {
    icon: TerminalSquare,
    title: "Run it in the browser",
    body: "Each playground boots a WebContainer — a full Node.js runtime in your browser. It installs dependencies and starts the dev server automatically, with a live preview and an interactive terminal.",
  },
  {
    icon: Save,
    title: "Edit and save",
    body: "Edit files in the Monaco editor. Press Ctrl+S (or Ctrl+Shift+S for Save All) to write changes into the running container and persist them — the preview hot-reloads with your changes.",
  },
  {
    icon: Sparkles,
    title: "Use AI assistance",
    body: "Inline code suggestions appear as you type, and the AI chat panel can answer questions about the file you're working on. (AI features depend on the configured provider quota.)",
  },
  {
    icon: MousePointerClick,
    title: "Manage your projects",
    body: "Star, rename, duplicate or delete playgrounds from the Dashboard table. Starred projects show up in the sidebar for quick access.",
  },
];

export default function DocsPage() {
  return (
    <div className="z-20 flex flex-col items-center justify-start min-h-screen w-full px-4 py-16 mt-6">
      <div className="w-full max-w-3xl">
        <span className="inline-block text-sm font-semibold text-[#e93f3f] mb-2">
          Documentation
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Getting Started
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
          VibeCode Editor lets you spin up a real, runnable dev environment in
          your browser — from a starter template or straight from a GitHub repo.
          Here&apos;s everything you need to know.
        </p>

        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className="flex gap-4 p-5 border rounded-xl bg-muted/40 transition-colors hover:border-[#e93f3f]/60"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-[#e93f3f]/10 flex items-center justify-center text-[#e93f3f]">
                <step.icon size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">{step.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 border rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">Ready to build?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Head to your dashboard and create your first playground.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="brand" size="lg">
              Go to Dashboard
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
