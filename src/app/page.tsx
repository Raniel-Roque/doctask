const LoadingPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-black border-solid" />
        <p className="text-gray-600 text-lg font-medium">Loading Application...</p>
      </div>
    </div>
  );
};

export default LoadingPage;
