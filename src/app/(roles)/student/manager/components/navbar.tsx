import Link from "next/link";
import Image from "next/image";

export const Navbar = () => {
  return (
    <nav className="flex items-center justify-between h-full w-full">
      <div className="flex gap-3 items-center shrink-0 pr-6">
        <Link href="/">
          <Image
            src="/doctask.ico"
            alt="Logo"
            width={32}
            height={32}
          />
        </Link>
        <h3 className="text-xl">DocTask</h3>
      </div>
    </nav>
  );
};
