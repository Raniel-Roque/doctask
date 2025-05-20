import { Navbar } from "../components/navbar";

interface AdminIdPageProps {
    params: Promise<{ adminId: string }>
};

const AdminIdPage = async ({ params }: AdminIdPageProps) => {
    const { adminId } = await params;

    return ( 
        <div className="min-h-screen flex flex-col">
            <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white">
                <Navbar adminId={adminId} />
            </div>
            <div className="mt-16">
                Admin ID: {adminId}, Home Page
            </div>
        </div>
    );
}
 
export default AdminIdPage;