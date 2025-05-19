import Link from "next/link";

const Home = () => {
  return (  
    <div className="flex min-h-screen items-center justify-center">
      <Link href="/admin/123" className="underline text-blue-500">Click here to go to admin</Link>
    </div>
  );
}
 
export default Home;