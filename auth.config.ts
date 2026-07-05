import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

export default{
    // Trust the host provided by the deployment platform (e.g. Vercel). Without
    // this, Auth.js v5 throws "UntrustedHost", which crashes the Edge middleware
    // (MIDDLEWARE_INVOCATION_FAILED) on Vercel preview/production deployments.
    trustHost: true,
    providers:[
        GitHub({
            clientId:process.env.AUTH_GITHUB_ID,
            clientSecret:process.env.AUTH_GITHUB_SECRET
        }),
        Google({
            clientId:process.env.AUTH_GOOGLE_ID,
            clientSecret:process.env.AUTH_GOOGLE_SECRET,
        })
    ]
} satisfies NextAuthConfig