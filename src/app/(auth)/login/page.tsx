"use client";

import { SignIn } from "@clerk/clerk-react";

const LoginPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
};

export default LoginPage;
