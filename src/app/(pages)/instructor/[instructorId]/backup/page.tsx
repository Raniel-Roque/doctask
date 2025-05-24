import { Navbar } from "../components/navbar";

interface BackupAndRestorePageProps {
  params: { instructorId: string };
}

const BackupAndRestorePage = async ({ params }: BackupAndRestorePageProps) => {
  const { instructorId } = await params;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white">
        <Navbar instructorId={instructorId} />

        <div className="px-6 mt-6 font-bold text-3xl">
          Backup and Restore Page
        </div>
      </div>
    </div>
  );
};

export default BackupAndRestorePage;
