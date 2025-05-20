import { Navbar } from "./components/navbar";

export const HomeManager = ({ studentId }: { studentId: string }) => {
  return (
    <div>
      <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white">
        <Navbar />
      </div>
      
      <div>
        <h1>Student ID: {studentId}</h1>
        <p>Welcome, Manager! This is your Home Page.</p>
      </div>
    </div>
  );
};