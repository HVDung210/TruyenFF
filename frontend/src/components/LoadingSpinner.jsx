export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-10">
      <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-orange-500"></div>
    </div>
  );
}