import React, { useEffect, useState } from 'react';
import { useWebContainer } from '../hooks/useWebContainer';
import { TemplateFolder } from '@/features/playground/libs/path-to-json';
import { transformToWebContainerFormat } from '../hooks/transformer';

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({ templateData }) => {
  const { serverUrl, isLoading, error, instance } = useWebContainer({ templateData });
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    async function setupContainer() {
      if (!instance) return;

      try {
        // Mount files
        const files = transformToWebContainerFormat(templateData);
        await instance.mount(files);

        // Install dependencies
        const installProcess = await instance.spawn('npm', ['install']);
        
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('Install output:', data);
          }
        }));

        const installExitCode = await installProcess.exit;
        
        if (installExitCode !== 0) {
          throw new Error('Failed to install dependencies');
        }

        // Start the server
        const startProcess = await instance.spawn('npm', ['run', 'start']);
        
        startProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('Server output:', data);
          }
        }));

        // Listen for server ready event
        instance.on('server-ready', (port: number, url: string) => {
          console.log('Server ready on port', port, 'at', url);
          setPreviewUrl(url);
        });

      } catch (err) {
        console.error('Error setting up container:', err);
      }
    }

    setupContainer();
  }, [instance, templateData]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="mb-2">Initializing WebContainer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {!previewUrl ? (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="mb-2">Starting development server...</p>
          </div>
        </div>
      ) : (
        <iframe 
          src={previewUrl} 
          className="w-full h-full border-none"
          title="WebContainer Preview"
        />
      )}
    </div>
  );
}

export default WebContainerPreview;