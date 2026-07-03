import { scanTemplateDirectory } from "@/features/playground/libs/path-to-json";
import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import { NextRequest } from "next/server";

// Helper function to ensure valid JSON
function validateJsonStructure(data: unknown): boolean {
  try {
    JSON.parse(JSON.stringify(data)); // Ensures it's serializable
    return true;
  } catch (error) {
    console.error("Invalid JSON structure:", error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const param = await params;
  const id = param.id;

  if (!id) {
    return Response.json({ error: "Missing playground ID" }, { status: 400 });
  }

  const playground = await db.playground.findUnique({
    where: { id },
  });

  if (!playground) {
    return Response.json({ error: "Playground not found" }, { status: 404 });
  }

  const templateKey = playground.template as keyof typeof templatePaths;
  const templatePath = templatePaths[templateKey];

  if (!templatePath) {
    return Response.json({ error: "Invalid template" }, { status: 404 });
  }

  try {
    const inputPath = path.join(process.cwd(), templatePath);

    // Scan the template directory in-memory. We intentionally avoid writing an
    // intermediate JSON file to disk: on serverless platforms (e.g. Vercel) the
    // application filesystem is read-only outside of /tmp, so writing under the
    // project directory throws EROFS and breaks playground loading.
    const result = await scanTemplateDirectory(inputPath);

    if (!validateJsonStructure(result.items)) {
      return Response.json({ error: "Invalid JSON structure" }, { status: 500 });
    }

    return Response.json({ success: true, templateJson: result }, { status: 200 });
  } catch (error) {
    console.error("Error generating template JSON:", error);
    return Response.json({ error: "Failed to generate template" }, { status: 500 });
  }
}


