import { getToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessagesClient } from "@/components/features/chat/MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
    const token = await getToken();
    if (!token) redirect("/login");

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex-1 min-h-0">
                <MessagesClient />
            </div>
        </div>
    );
}