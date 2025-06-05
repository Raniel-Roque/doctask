"use client";

import { Navbar } from "../../components/navbar";
import { use } from "react";

interface AdviserDocsPageProps {
    params: Promise<{ adviserId: string }>
};

const AdviserDocsPage = ({ params }: AdviserDocsPageProps) => {
    const { adviserId } = use(params);

    return ( 
        <div className="min-h-screen bg-gray-50">
            <Navbar adviserId={adviserId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Adviser Docs</h1>
                    <p className="text-muted-foreground">Adviser Docs</p>
                </div>
            </div>
        </div>
    );
}
 
export default AdviserDocsPage;