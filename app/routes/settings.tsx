import AppLayout from '../components/AppLayout';
import { HomeIcon } from '../components/SessionSidebar/HomeIcon';
import { useSession } from '../hooks/useSession';

export function meta() {
  return [
    { title: 'Settings - Vibes DIY' },
    { name: 'description', content: 'Settings for AI App Builder' },
  ];
}

export default function Settings() {
  // Use the session hook with null to access just the main database
  const { mainDatabase } = useSession();

  // Simple example function to demonstrate using the mainDatabase
  const countSessions = async () => {
    if (!mainDatabase) return 0;

    try {
      // Query sessions from the main database
      const result = await mainDatabase.query('type', {
        key: 'session',
      });
      return result.rows.length;
    } catch (error) {
      console.error('Error counting sessions:', error);
      return 0;
    }
  };
  return (
    <AppLayout
      fullWidthChat={true}
      headerLeft={
        <div className="flex items-center">
          <a href="/" className="flex items-center text-lg font-semibold">
            <HomeIcon className="mr-2 h-5 w-5" />
          </a>
          <h1 className="ml-4 text-xl font-bold">Settings</h1>
        </div>
      }
      chatPanel={
        <div className="flex h-full flex-col items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold">Application Settings</h2>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              Settings page placeholder content. Configure your application preferences here.
            </p>
            <div className="space-y-4">
              <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Main database is now accessible for settings.
                </p>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <button
                    onClick={async () => {
                      const count = await countSessions();
                      alert(`You have ${count} sessions in your database`);
                    }}
                    className="mt-2 rounded-md bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                  >
                    Count Sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      previewPanel={<div />} // Empty div for preview panel
    />
  );
}
