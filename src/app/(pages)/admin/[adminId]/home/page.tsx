import { api } from "../../../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "../../../../../../convex/_generated/dataModel";

import { Navbar } from "../components/navbar";

interface AdminHomePageProps {
  params: { adminId: string };
}

const AdminHomePage = async ({ params }: AdminHomePageProps) => {
  const { adminId } = await params;

  // Cast adminId to Id<"users">
  const user = await fetchQuery(api.documents.getUserById, {
    id: adminId as Id<"users">,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white">
        <Navbar adminId={adminId} />

        <div className="px-6 mt-6 font-bold text-3xl">
          Welcome Back, {user?.first_name ?? "User"}!
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;
