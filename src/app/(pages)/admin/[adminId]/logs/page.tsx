import { Navbar } from "../components/navbar";

interface LogsPageProps {
    params: Promise<{ adminId: string }>
};

const LogsPage = async ({ params }: LogsPageProps) => {
    const { adminId } = await params;

    return ( 
        <div className="min-h-screen flex flex-col">
            <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white">
                <Navbar adminId={adminId} />

                <div className="px-6 mt-6 font-bold text-3xl">
                    Logs Page
                </div>
            </div>
        </div>
    );
}
 
export default LogsPage;