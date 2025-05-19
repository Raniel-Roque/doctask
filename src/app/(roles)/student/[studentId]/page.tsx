interface StudentIdPageProps {
    params: Promise<{ studentId: string }>
};

const StudentIdPage = async ({ params }: StudentIdPageProps) => {
    const { studentId } = await params;

    return ( 
        <div>
            Student ID: {studentId}
        </div>
    );
}
 
export default StudentIdPage;