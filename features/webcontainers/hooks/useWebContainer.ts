import { useState, useEffect, useCallback, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

export const useWebContainer = (): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);
  const instanceRef = useRef<WebContainer | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        const webcontainerInstance = await WebContainer.boot({ coep: 'credentialless' });
        
        if (!mounted) return;
        
        instanceRef.current = webcontainerInstance;
        setInstance(webcontainerInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize WebContainer:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize WebContainer');
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
      if (instanceRef.current) {
        instanceRef.current.teardown();
      }
    };
  }, []);

  const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
    if (!instance) {
      throw new Error('WebContainer instance is not available');
    }

    try {
      // Ensure the folder structure exists
      const pathParts = path.split('/');
      const folderPath = pathParts.slice(0, -1).join('/'); // Extract folder path

      if (folderPath) {
        await instance.fs.mkdir(folderPath, { recursive: true }); // Create folder structure recursively
      }

      // Write the file
      await instance.fs.writeFile(path, content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
      console.error(`Failed to write file at ${path}:`, err);
      throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
    }
  }, [instance]);

  // Added destroy function
  const destroy = useCallback(() => {
    if (instance) {
      instance.teardown();
      setInstance(null);
      setServerUrl(null);
    }
  }, [instance]);

  return { serverUrl, isLoading, error, instance, writeFileSync, destroy };
};