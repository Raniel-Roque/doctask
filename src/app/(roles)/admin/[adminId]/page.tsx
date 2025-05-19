interface AdminIdPageProps {
    params: Promise<{ adminId: string }>
};

const AdminIdPage = async ({ params }: AdminIdPageProps) => {
    const { adminId } = await params;

    return ( 
        <div>
            Admin ID: {adminId}
        </div>
    );
}
 
export default AdminIdPage;