"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";

interface ManagerHomeProps {
    params: Promise<{ studentId: string }>
};

const ManagerHomePage = ({ params }: ManagerHomeProps) => {
    const { studentId } = use(params);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar studentId={studentId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Welcome, Manager!</h1>
                    <p className="text-muted-foreground">This is your Home Page.</p>
                </div>
            </div>
        </div>
    );
}
 
export default ManagerHomePage;

 
