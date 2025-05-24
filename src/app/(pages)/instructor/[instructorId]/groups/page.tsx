import { Navbar } from "../components/navbar";

interface GroupsPageProps {
    params: Promise<{ instructorId: string }>
};

const GroupsPage = async ({ params }: GroupsPageProps) => {
    const { instructorId } = await params;

    return ( 
        <div className="min-h-screen flex flex-col">
            <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white">
                <Navbar instructorId={instructorId} />

                <div className="px-6 mt-6 font-bold text-3xl">
                    Groups Page
                </div>
            </div>
        </div>
    );
}
 
export default GroupsPage;