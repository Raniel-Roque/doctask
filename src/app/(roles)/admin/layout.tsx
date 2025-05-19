interface AdminLayoutLayoutProps {
    children: React.ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutLayoutProps) => {
    return (  
        <div>
            {children}
        </div>
    );
}
 
export default AdminLayout;