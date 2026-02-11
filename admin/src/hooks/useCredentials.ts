import { useCallback, useEffect, useState, useMemo } from 'react';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { pluginId } from '../utils/pluginId';

interface CredentialsType {
  host: string;
  apiKey: string;
  indexName: string;
}

/**
 * Hook for managing MeiliSearch credentials
 * Provides credential management with caching and persistence
 */
export function useCredentials() {
  const [credentials, setCredentials] = useState<CredentialsType>({
    host: '',
    apiKey: '',
    indexName: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refetch, setRefetch] = useState(0);

  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const fetchCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await get(`/${pluginId}/credentials`);
      setCredentials(data.data || {});
    } catch (error) {
      console.error('[meilisearch-plus] Failed to fetch credentials:', error);
      toggleNotification({
        type: 'warning',
        message: 'Failed to load credentials',
      });
    } finally {
      setIsLoading(false);
    }
  }, [get, toggleNotification]);

  const updateCredentials = useCallback(
    async (newCredentials: CredentialsType) => {
      setIsSaving(true);
      try {
        const { data } = await post(`/${pluginId}/credentials`, newCredentials);
        setCredentials(data.data || newCredentials);
        toggleNotification({
          type: 'success',
          message: 'Credentials saved successfully',
        });
        setRefetch((prev) => prev + 1);
      } catch (error) {
        console.error('[meilisearch-plus] Failed to update credentials:', error);
        toggleNotification({
          type: 'warning',
          message: 'Failed to save credentials',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [post, toggleNotification]
  );

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await get(`/${pluginId}/test-connection`);
      return data.data?.healthy || false;
    } catch (error) {
      console.error('[meilisearch-plus] Connection test failed:', error);
      return false;
    }
  }, [get]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials, refetch]);

  return useMemo(
    () => ({
      credentials,
      isLoading,
      isSaving,
      updateCredentials,
      testConnection,
      refetch: () => setRefetch((prev) => prev + 1),
    }),
    [credentials, isLoading, isSaving, updateCredentials, testConnection]
  );
}
