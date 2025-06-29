import { Liveblocks } from "@liveblocks/node";
import { ConvexHttpClient } from "convex/browser";
import { auth, currentUser } from "@clerk/nextjs/server";

import { api } from "../../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!
})

export async function POST(req: Request) {
    const { sessionClaims } = await auth();
    
    if(!sessionClaims) {
        return new Response("Unauthorized", { status: 401 });
    }

    const user = await currentUser();
    
    if(!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { room } = await req.json();
    
    // Get the user from Convex database
    const convexUser = await convex.query(api.fetch.getUserByClerkId, { clerkId: user.id });
    
    if (!convexUser) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Only students (role 0) can access documents
    if (convexUser.role !== 0) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Check if user has access to this document (room is the document ID)
    const documentAccess = await convex.query(api.fetch.getUserDocumentAccess, { 
        documentId: room, 
        userId: convexUser._id 
    });

    if (!documentAccess.hasAccess) {
        return new Response("Unauthorized", { status: 401 });
    }

    const name = user.fullName ?? user.username ?? `${convexUser.first_name} ${convexUser.last_name}`
    const nameToNumber = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = Math.abs(nameToNumber) % 360;
    const color = `hsl(${hue}, 80%, 60%)`

    const session = liveblocks.prepareSession(user.id, {
        userInfo: {
            name,
            avatar: user.imageUrl,
            color,
        },
    });

    session.allow(room, session.FULL_ACCESS);
    const { body, status } = await session.authorize();

    return new Response(body, { status });
};