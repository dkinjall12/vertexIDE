import type {
  TemplateFile,
  TemplateFolder,
  TemplateItem,
} from "@/features/playground/libs/path-to-json";
import type { Templates } from "@prisma/client";

/**
 * Utilities for importing a **public** GitHub repository into a playground.
 *
 * Security note (SSRF): all outbound requests are restricted to a fixed
 * allow-list of GitHub hosts. We never fetch a raw user-supplied URL; instead we
 * parse out `owner`/`repo`/`ref` and build requests against known hosts only.
 */

const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = "https://raw.githubusercontent.com";

// Guardrails so a huge repo can't blow up the serverless function / DB document.
const MAX_FILES = 400;
const MAX_FILE_SIZE = 500 * 1024; // 500 KB per file
const MAX_TOTAL_SIZE = 6 * 1024 * 1024; // 6 MB total
const FETCH_CONCURRENCY = 12;

const IGNORE_FOLDERS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  "vendor",
]);

const IGNORE_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".DS_Store",
  "thumbs.db",
]);

// Extensions we treat as binary and therefore skip (the editor stores text only).
const BINARY_EXTENSIONS = new Set([
  "png","jpg","jpeg","gif","ico","webp","bmp","tiff","avif",
  "woff","woff2","ttf","eot","otf",
  "mp4","webm","mov","avi","mkv","mp3","wav","ogg","flac",
  "pdf","zip","gz","tar","rar","7z","bz2",
  "wasm","exe","dll","so","dylib","bin","dat",
  "jar","class","psd","sketch","fig",
]);

export interface ParsedRepo {
  owner: string;
  repo: string;
  ref?: string;
}

export class GithubImportError extends Error {}

/**
 * Parse a variety of GitHub URL / shorthand formats into owner/repo/ref.
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 *   github.com/owner/repo
 *   owner/repo
 */
export function parseGithubUrl(input: string): ParsedRepo {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new GithubImportError("Please enter a GitHub repository URL.");
  }

  let owner: string | undefined;
  let repo: string | undefined;
  let ref: string | undefined;

  const shorthand = /^([\w.-]+)\/([\w.-]+)$/.exec(trimmed);
  if (shorthand) {
    owner = shorthand[1];
    repo = shorthand[2];
  } else {
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      throw new GithubImportError("That doesn't look like a valid URL.");
    }

    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      throw new GithubImportError("Only github.com repositories are supported.");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new GithubImportError(
        "URL must point to a repository, e.g. https://github.com/owner/repo"
      );
    }

    owner = parts[0];
    repo = parts[1];

    // /owner/repo/tree/<branch>/...
    if (parts[2] === "tree" && parts[3]) {
      ref = parts[3];
    }
  }

  if (!owner || !repo) {
    throw new GithubImportError("Could not read the owner/repo from that URL.");
  }

  repo = repo.replace(/\.git$/i, "");
  return { owner, repo, ref };
}

function authHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "vertex-ide",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

interface GithubTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
}

/** Resolve the repo's default branch (and confirm it exists / is accessible). */
async function resolveRef(
  { owner, repo, ref }: ParsedRepo,
  token?: string | null
): Promise<string> {
  if (ref) return ref;

  const res = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: authHeaders(token) }
  );

  if (res.status === 404) {
    throw new GithubImportError(
      "Repository not found. Make sure it exists and is public."
    );
  }
  if (res.status === 403) {
    throw new GithubImportError(
      "GitHub rate limit reached. Sign in with GitHub or try again later."
    );
  }
  if (!res.ok) {
    throw new GithubImportError(`GitHub error (${res.status}) reading the repo.`);
  }

  const data = (await res.json()) as { default_branch?: string; private?: boolean };
  if (data.private) {
    throw new GithubImportError("Only public repositories are supported.");
  }
  return data.default_branch || "main";
}

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  // A leading dot (e.g. ".gitignore") is a name, not an extension.
  if (idx <= 0) return "";
  return name.slice(idx + 1).toLowerCase();
}

function shouldSkip(path: string, size?: number): boolean {
  const segments = path.split("/");
  if (segments.some((seg) => IGNORE_FOLDERS.has(seg))) return true;
  // Reject path traversal defensively.
  if (segments.some((seg) => seg === "..")) return true;

  const name = segments[segments.length - 1];
  if (IGNORE_FILES.has(name)) return true;
  if (BINARY_EXTENSIONS.has(extOf(name))) return true;
  if (typeof size === "number" && size > MAX_FILE_SIZE) return true;
  return false;
}

/** Insert a file into the nested TemplateFolder tree, creating folders as needed. */
function insertFile(root: TemplateFolder, path: string, content: string): void {
  const segments = path.split("/");
  const fileName = segments.pop()!;
  let current = root;

  for (const folderName of segments) {
    let next = current.items.find(
      (item): item is TemplateFolder =>
        "folderName" in item && item.folderName === folderName
    );
    if (!next) {
      next = { folderName, items: [] };
      current.items.push(next);
    }
    current = next;
  }

  const ext = extOf(fileName);
  const file: TemplateFile = {
    filename: ext ? fileName.slice(0, fileName.length - ext.length - 1) : fileName,
    fileExtension: ext,
    content,
  };
  current.items.push(file);
}

/** Best-effort mapping of the repo to one of the supported template badges. */
function detectTemplate(paths: string[], packageJson?: string): Templates {
  const lower = paths.map((p) => p.toLowerCase());
  const has = (needle: string) => lower.some((p) => p.includes(needle));

  let deps: Record<string, string> = {};
  if (packageJson) {
    try {
      const parsed = JSON.parse(packageJson);
      deps = { ...parsed.dependencies, ...parsed.devDependencies };
    } catch {
      /* ignore malformed package.json */
    }
  }
  const dep = (name: string) => Object.prototype.hasOwnProperty.call(deps, name);

  if (has("next.config") || dep("next")) return "NEXTJS";
  if (has("angular.json") || dep("@angular/core")) return "ANGULAR";
  if (dep("vue") || lower.some((p) => p.endsWith(".vue"))) return "VUE";
  if (dep("hono")) return "HONO";
  if (dep("express")) return "EXPRESS";
  return "REACT";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export interface ImportedRepo {
  templateFolder: TemplateFolder;
  template: Templates;
  ref: string;
  fileCount: number;
}

/**
 * Fetch a public GitHub repo and convert it into the playground TemplateFolder
 * structure. `token` (a GitHub OAuth token) is optional and only raises API
 * rate limits.
 */
export async function importGithubRepo(
  parsed: ParsedRepo,
  token?: string | null
): Promise<ImportedRepo> {
  const { owner, repo } = parsed;
  const ref = await resolveRef(parsed, token);

  const treeRes = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: authHeaders(token) }
  );

  if (treeRes.status === 404) {
    throw new GithubImportError(
      `Branch "${ref}" not found in ${owner}/${repo}.`
    );
  }
  if (!treeRes.ok) {
    throw new GithubImportError(
      `GitHub error (${treeRes.status}) reading the file tree.`
    );
  }

  const tree = (await treeRes.json()) as {
    tree: GithubTreeEntry[];
    truncated?: boolean;
  };

  const blobs = tree.tree.filter(
    (entry) => entry.type === "blob" && !shouldSkip(entry.path, entry.size)
  );

  if (blobs.length === 0) {
    throw new GithubImportError(
      "No importable text files were found in this repository."
    );
  }
  if (blobs.length > MAX_FILES) {
    throw new GithubImportError(
      `This repository has too many files to import (${blobs.length} > ${MAX_FILES}).`
    );
  }

  let totalSize = 0;
  const files = await mapWithConcurrency(blobs, FETCH_CONCURRENCY, async (entry) => {
    const rawRes = await fetch(
      `${GITHUB_RAW}/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/${encodeURIComponent(ref)}/${entry.path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    );

    if (!rawRes.ok) {
      // Skip files we can't read rather than failing the whole import.
      return { path: entry.path, content: null as string | null };
    }
    const content = await rawRes.text();
    totalSize += content.length;
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new GithubImportError(
        "This repository is too large to import (over 6 MB of text)."
      );
    }
    return { path: entry.path, content };
  });

  const root: TemplateFolder = { folderName: "Root", items: [] };
  let included = 0;
  for (const file of files) {
    if (file.content === null) continue;
    insertFile(root, file.path, file.content);
    included += 1;
  }

  const packageJson = files.find((f) => f.path === "package.json")?.content ?? undefined;
  const template = detectTemplate(
    blobs.map((b) => b.path),
    packageJson
  );

  return { templateFolder: root, template, ref, fileCount: included };
}

// Re-export so callers only need this module.
export type { TemplateFolder, TemplateItem };
