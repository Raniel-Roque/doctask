import { Navbar } from "../components/navbar";
import { api } from "../../../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Users } from "lucide-react";
import { CopyButton } from "./components/copy-button";

interface AdviserHomePageProps {
    params: Promise<{ adviserId: string }>
};

const AdviserHomePage = async ({ params }: AdviserHomePageProps) => {
    const { adviserId } = await params;

    // Fetch adviser data
    const adviser = await fetchQuery(api.fetch.getUserById, {
        id: adviserId as Id<"users">,
    });

    // Fetch adviser's groups
    const adviserCode = await fetchQuery(api.fetch.getAdviserCode, {
        adviserId: adviserId as Id<"users">,
    });

    // Fetch all groups to filter by adviser's group_ids
    const allGroups = await fetchQuery(api.fetch.getGroups);
    const adviserGroups = allGroups?.filter(group => 
        adviserCode?.group_ids?.includes(group._id) ?? false
    ) || [];

    // Fetch all users to get project manager names
    const allUsers = await fetchQuery(api.fetch.getUsers);
    const projectManagers = allUsers?.filter(user => 
        adviserGroups.some(group => group.project_manager_id === user._id)
    ) || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar adviserId={adviserId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Welcome Back, {adviser?.first_name ?? "User"}!</h1>
                    <p className="text-muted-foreground">Adviser Overview</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Total Groups Card */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Groups Handled</p>
                                <h3 className="text-2xl font-bold mt-1">{adviserGroups.length}</h3>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-full">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    {/* Total Requests Card */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Group Requests</p>
                                <h3 className="text-2xl font-bold mt-1">{adviserCode?.requests_group_ids?.length ?? 0}</h3>
                            </div>
                            <div className="bg-orange-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Adviser Code Card */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                    Your Adviser Code
                                    {adviserCode?.code && (
                                        <span className="align-middle ml-1"><CopyButton code={adviserCode.code} /></span>
                                    )}
                                </p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-2xl font-bold mt-1">{adviserCode?.code ?? "N/A"}</h3>
                                </div>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Groups Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Handled Groups</h2>
                            <button className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                                <Users className="w-5 h-5" />
                                View Group Requests
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium text-gray-600">Group Name</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-600">Progress</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adviserGroups.map((group) => {
                                        const projectManager = projectManagers.find(
                                            pm => pm._id === group.project_manager_id
                                        );
                                        const groupName = projectManager 
                                            ? `${projectManager.last_name} et al`
                                            : "Unnamed Group";
                                        
                                        return (
                                            <tr key={group._id} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4">{groupName}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: "0%" }}></div>
                                                        </div>
                                                        <span className="text-sm text-gray-600">0%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button className="text-blue-600 hover:text-blue-800">
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdviserHomePage;