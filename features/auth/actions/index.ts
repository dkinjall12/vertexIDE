"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";


export const getUserById = async (id:string)=>{
    try {
        const user = await db.user.findUnique({
            where:{id},
            include:{accounts:true}
        })
        return user
    } catch (error) {
        console.log(error)
        return null
    }
}

export const getAccountByUserId = async (userId:string)=>{
    try {
        const account = await db.account.findFirst({
            where:{
                userId
            }
        })
        return account
    } catch (error) {
        console.log(error)
        return null
    }
}

export const currentUser = async()=>{
    const user = await auth()
    return user?.user;
}

/**
 * Returns the current user's stored GitHub OAuth access token, if they signed in
 * with GitHub. Used to raise GitHub API rate limits when importing a repo.
 * Returns null for Google-only users (import then falls back to unauthenticated).
 */
export const getGithubAccessToken = async () => {
    const user = await currentUser();
    if (!user?.id) return null;
    try {
        const account = await db.account.findFirst({
            where: { userId: user.id, provider: "github" },
            select: { accessToken: true },
        });
        return account?.accessToken ?? null;
    } catch (error) {
        console.log("getGithubAccessToken error:", error);
        return null;
    }
}