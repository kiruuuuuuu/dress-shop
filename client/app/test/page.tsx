export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Test Page
        </h1>
        <p className="text-gray-600 mb-4">
          If you can see this page with proper styling, Tailwind CSS is working correctly.
        </p>
        <div className="space-y-2">
          <div className="bg-blue-500 text-white p-3 rounded">Blue Box</div>
          <div className="bg-green-500 text-white p-3 rounded">Green Box</div>
          <div className="bg-red-500 text-white p-3 rounded">Red Box</div>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          ✅ Tailwind is working!
        </p>
      </div>
    </div>
  );
}

