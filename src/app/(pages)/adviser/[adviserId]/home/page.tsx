import { Navbar } from "../navbar";

interface AdviserIdPageProps {
    params: Promise<{ adviserId: string }>
};

const AdviserIdPage = async ({ params }: AdviserIdPageProps) => {
    const { adviserId } = await params;

    return ( 
        <div className="min-h-screen flex flex-col">
            <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white">
                <Navbar />
            </div>
            <div className="mt-16">
                Adviser ID: {adviserId}, Home Page
            </div>
        </div>
    );
}
 
export default AdviserIdPage;