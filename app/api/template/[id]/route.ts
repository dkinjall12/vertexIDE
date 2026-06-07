import { readTemplateStructureFromJson, saveTemplateStructureToJson } from "@/features/playground/libs/path-to-json";
import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const param = await (params)
  const id = param.id
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
    console.log("Input Path:", inputPath);
    const outputFile = path.join(process.cwd(), `/output/${templateKey}.json`);

    console.log("Output Path:", outputFile);
     await saveTemplateStructureToJson(inputPath, outputFile);
  const result = await readTemplateStructureFromJson(outputFile);

    return Response.json({ success: true, templateJson: result}, { status: 200 });
  } catch (error) {
    console.error("Error generating template JSON:", error);
    return Response.json({ error: "Failed to generate template" }, { status: 500 });
  }
}
