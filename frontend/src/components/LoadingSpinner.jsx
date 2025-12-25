export default function LoadingSpinner({ size = 'normal' }) {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    normal: 'w-12 h-12 border-4'
  };

  return (
    <div className={`${sizeClasses[size]} border-orange-500 border-t-transparent rounded-full animate-spin`}></div>
  );
}