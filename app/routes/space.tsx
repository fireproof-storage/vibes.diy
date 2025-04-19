import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SimpleAppLayout from '../components/SimpleAppLayout';
import { ImgFile } from '../components/SessionSidebar/ImgFile';
import VibesDIYLogo from '../components/VibesDIYLogo';
import type { ReactElement } from 'react';
import { useFireproof } from 'use-fireproof';

// Define the structure of our vibe documents
interface VibeDocument {
  _id: string;
  title?: string;
  slug?: string;
  publishedUrl?: string;
  _attachments?: {
    screenshot?: {
      data: Blob;
    };
  };
}

export function meta() {
  return [
    { title: 'Space Vibes - Vibes DIY' },
    { name: 'description', content: 'User space in Vibes DIY' },
  ];
}

export default function SpaceRoute(): ReactElement {
  const navigate = useNavigate();
  const { userId } = useParams();

  // Console log the username parameter
  console.log('Space username:', userId);
  
  // Use Fireproof with the user-specific database
  const { useAllDocs } = useFireproof(`vu-${userId}`);
  
  // Query all documents in the database
  const allDocsResult = useAllDocs();
  const docs = allDocsResult.docs || [];
  const isLoading = !allDocsResult.docs; // If docs is undefined, it's still loading
  
  // Type the documents properly
  const vibes = docs as unknown as VibeDocument[];
  
  // Log all documents when they change
  useEffect(() => {
    if (docs && docs.length > 0) {
      console.log('All documents in database:', docs);
    } else if (!isLoading) {
      console.log('No documents found in the database');
    }
  }, [docs, isLoading]);
  
  // Handle clicking the remix button
  const handleRemixClick = (slug: string | undefined) => {
    if (slug) {
      navigate(`/remix/${slug}`);
    }
  };

  return (
    <SimpleAppLayout
      headerLeft={
        <div className="flex items-center">
          <a href="/" className="flex items-center px-2 py-1 hover:opacity-80" title="Home">
            <VibesDIYLogo width={100} />
          </a>
        </div>
      }
    >
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-4 text-2xl font-bold">Space: {userId}</h2>
              <p className="text-accent-01 dark:text-accent-01 mb-6">
                View vibes in this space
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : vibes.length === 0 ? (
            <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-md border py-8 text-center">
              <p className="mb-4 text-lg">No vibes found in this space</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vibes.map((doc) => (
                <div
                  key={doc._id}
                  className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-md border p-4 transition-colors hover:border-blue-500"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="mb-1 text-lg font-medium">{doc.title || doc._id}</h3>
                  </div>
                  
                  {doc._attachments?.screenshot?.data && (
                    <ImgFile
                      file={{
                        file: async () => new File(
                          [doc._attachments!.screenshot!.data],
                          'screenshot.png',
                          { type: 'image/png' }
                        ),
                        type: 'image/png'
                      }}
                      alt={`Screenshot from ${doc.title || doc._id}`}
                      className="border-light-decorative-01 dark:border-dark-decorative-01 mt-3 mb-4 rounded-md border"
                    />
                  )}
                  
                  <div className="flex space-x-2">
                    <div className="flex-grow"></div>
                    
                    {doc.slug && (
                      <button
                        onClick={() => handleRemixClick(doc.slug)}
                        className="text-light-secondary dark:text-dark-secondary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded-md px-3 py-1 text-sm"
                      >
                        Remix
                      </button>
                    )}
                    
                    {doc.publishedUrl && (
                      <a
                        href={doc.publishedUrl}
                        className="text-light-primary bg-light-decorative-01 dark:text-dark-primary dark:bg-dark-decorative-01 rounded-md px-3 py-1 text-sm hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Live
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SimpleAppLayout>
  );
}
