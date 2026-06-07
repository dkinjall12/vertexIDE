"use server"
import { currentUser } from "@/features/auth/actions";
import { db } from "@/lib/db"



export const createPlayground = async (data:{
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS";
    description?: string;
  })=>{
    const {template , title , description} = data;

    const user = await currentUser();
    try {
        const playground = await db.playground.create({
            data:{
                title:title,
                description:description,
                template:template,
                userId:user?.id!
            }
        })

        return playground;
    } catch (error) {
        console.log(error)
    }
}


export const getAllPlaygroundForUser = async ()=>{
    try {
        const user  = await currentUser();
        const playground = await db.playground.findMany({
            where:{
                userId:user?.id!
            },
            include:{
                user:true
            }
        })
        return playground;
    } catch (error) {
        console.log(error)
    }
}