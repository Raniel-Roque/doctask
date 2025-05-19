interface AdviserIdPageProps {
    params: Promise<{ adviserId: string }>
};

const AdviserIdPage = async ({ params }: AdviserIdPageProps) => {
    const { adviserId } = await params;

    return ( 
        <div>
            Adviser ID: {adviserId}
        </div>
    );
}
 
export default AdviserIdPage;