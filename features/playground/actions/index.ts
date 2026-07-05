"use server"
import { currentUser, getGithubAccessToken } from "@/features/auth/actions";
import { db } from "@/lib/db"
import { TemplateFolder } from "../libs/path-to-json";
import { revalidatePath } from "next/cache";
import {
  GithubImportError,
  importGithubRepo,
  parseGithubUrl,
} from "@/lib/github";


// Toggle marked status for a problem
export const toggleStarMarked = async (playgroundId: string, isChecked: boolean) => {
    const user = await currentUser();
    const userId = user?.id;
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    if (isChecked) {
      await db.starMark.create({
        data: {
          userId: userId!,
          playgroundId,
          isMarked: isChecked,
        },
      });
    } else {
      await db.starMark.delete({
        where: {
          userId_playgroundId: {
            userId,
            playgroundId: playgroundId,

          },
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, isMarked: isChecked };
  } catch (error) {
    console.error("Error updating problem:", error);
    return { success: false, error: "Failed to update problem" };
  }
};

export const createPlayground = async (data:{
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  })=>{
    const {template , title , description} = data;

    const user = await currentUser();
    if (!user?.id) throw new Error("Not authenticated");

    try {
        const playground = await db.playground.create({
            data:{
                title:title,
                description:description,
                template:template,
                userId:user.id
            }
        })

        return playground;
    } catch (error) {
        console.log(error)
    }
}


export const createPlaygroundFromGithub = async (data: {
    url: string;
    title?: string;
}) => {
    const user = await currentUser();
    if (!user?.id) throw new Error("Not authenticated");

    let parsed;
    try {
        parsed = parseGithubUrl(data.url);
    } catch (error) {
        if (error instanceof GithubImportError) {
            return { error: error.message };
        }
        throw error;
    }

    try {
        const token = await getGithubAccessToken();
        const { templateFolder, template, fileCount } = await importGithubRepo(
            parsed,
            token
        );

        const playground = await db.playground.create({
            data: {
                title: data.title?.trim() || parsed.repo,
                description: `Imported from github.com/${parsed.owner}/${parsed.repo}`,
                template,
                userId: user.id,
                // Store the file tree as a JSON string, matching the format that
                // SaveUpdatedCode writes and usePlayground expects on load.
                templateFiles: {
                    create: {
                        content: JSON.stringify(templateFolder),
                    },
                },
            },
        });

        revalidatePath("/dashboard");
        return { id: playground.id, fileCount };
    } catch (error) {
        if (error instanceof GithubImportError) {
            return { error: error.message };
        }
        console.error("createPlaygroundFromGithub error:", error);
        return { error: "Failed to import the repository. Please try again." };
    }
}


export const getAllPlaygroundForUser = async ()=>{
    try {
        const user = await currentUser();
        if (!user?.id) throw new Error("Not authenticated");

        const playground = await db.playground.findMany({
            where:{
                userId:user.id
            },
            include:{
                user:true,
                Starmark:{
                    where:{
                        userId:user.id
                    },
                    select:{
                        isMarked:true
                    }
                }
            }
        })
      
        return playground;
    } catch (error) {
        console.log(error)
    }
}

export const getPlaygroundById = async (id:string)=>{
    try {
        const playground = await db.playground.findUnique({
            where:{id},
            select:{
              templateFiles:{
                select:{
                  content:true
                }
              }
            }
        })
        return playground;
    } catch (error) {
        console.log(error)
    }
}

export const SaveUpdatedCode = async (playgroundId: string, data: TemplateFolder) => {
  const user = await currentUser();
  if (!user) return null;

  try {
    const updatedPlayground = await db.templateFile.upsert({
      where: {
        playgroundId, // now allowed since playgroundId is unique
      },
      update: {
        content: JSON.stringify(data),
      },
      create: {
        playgroundId,
        content: JSON.stringify(data),
      },
    });

    return updatedPlayground;
  } catch (error) {
    console.log("SaveUpdatedCode error:", error);
    return null;
  }
};

export const deleteProjectById = async (id:string)=>{
    try {
        await db.playground.delete({
            where:{id}
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.log(error)
    }
}


export const editProjectById = async (id:string,data:{title:string , description:string})=>{
    try {
        await db.playground.update({
            where:{id},
            data:data
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.log(error)
    }
}

export const duplicateProjectById = async (id: string) => {
    try {
        // Fetch the original playground data
        const originalPlayground = await db.playground.findUnique({
            where: { id },
            include: {
                templateFiles: true, // Include related template files
            },
        });

        if (!originalPlayground) {
            throw new Error("Original playground not found");
        }

        // Create a new playground with the same data but a new ID
        const duplicatedPlayground = await db.playground.create({
            data: {
                title: `${originalPlayground.title} (Copy)`,
                description: originalPlayground.description,
                template: originalPlayground.template,
                userId: originalPlayground.userId,
                templateFiles: {
                    create: originalPlayground.templateFiles.map((file: { content: any }) => ({
                        content: file.content,
                    })),
                },
            },
        });

        // Revalidate the dashboard path to reflect the changes
        revalidatePath("/dashboard");

        return duplicatedPlayground;
    } catch (error) {
        console.error("Error duplicating project:", error);
    }
};