import { useCallback, useEffect, useState, useMemo } from 'react';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { pluginId } from '../utils/pluginId';

interface IndexedContentType {
  name: string;
  uid: string;
}

/**
 * Hook for managing indexed content types
 */
export function useIndexedContentTypes() {
  const [contentTypes, setContentTypes] = useState<IndexedContentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);

  const { get, post, del } = useFetchClient();
  const { toggleNotification } = useNotification();

  const fetchIndexedContentTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await get(`/${pluginId}/indexed-content-types`);
      setContentTypes(data.data || []);
    } catch (error) {
      console.error('[meilisearch-plus] Failed to fetch indexed content types:', error);
      toggleNotification({
        type: 'warning',
        message: 'Failed to load indexed content types',
      });
    } finally {
      setIsLoading(false);
    }
  }, [get, toggleNotification]);

  const addContentType = useCallback(
    async (contentType: string) => {
      try {
        const { data } = await post(`/${pluginId}/indexed-content-types`, {
          contentType,
        });
        setContentTypes(data.data || []);
        toggleNotification({
          type: 'success',
          message: `${contentType} added to index`,
        });
      } catch (error) {
        console.error('[meilisearch-plus] Failed to add content type:', error);
        toggleNotification({
          type: 'warning',
          message: 'Failed to add content type',
        });
      }
    },
    [post, toggleNotification]
  );

  const removeContentType = useCallback(
    async (contentType: string) => {
      try {
        const { data } = await del(`/${pluginId}/indexed-content-types?contentType=${contentType}`);
        setContentTypes(data.data || []);
        toggleNotification({
          type: 'success',
          message: `${contentType} removed from index`,
        });
      } catch (error) {
        console.error('[meilisearch-plus] Failed to remove content type:', error);
        toggleNotification({
          type: 'warning',
          message: 'Failed to remove content type',
        });
      }
    },
    [del, toggleNotification]
  );

  useEffect(() => {
    fetchIndexedContentTypes();
  }, [fetchIndexedContentTypes, refetch]);

  return useMemo(
    () => ({
      contentTypes,
      isLoading,
      addContentType,
      removeContentType,
      refetch: () => setRefetch((prev) => prev + 1),
    }),
    [contentTypes, isLoading, addContentType, removeContentType]
  );
}
