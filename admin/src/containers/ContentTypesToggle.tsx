import React, { memo, useState, useEffect } from 'react';
import { Box, Checkbox, Typography, Flex, Loader } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { useI18n } from '../hooks';
import { pluginId } from '../utils/pluginId';

interface ContentType {
  name: string;
  isIndexed: boolean;
}

/**
 * Content types toggle - shows all configured types with checkboxes to enable/disable indexing
 */
const ContentTypesToggle = memo(() => {
  const { i18n } = useI18n();
  const { get, post, del } = useFetchClient();

  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load configured and indexed content types
  useEffect(() => {
    const loadContentTypes = async () => {
      setIsLoading(true);
      try {
        // Get all configured content types
        const configResponse = await get(`/${pluginId}/configured-content-types`);
        const configured = configResponse.data?.data || [];

        // Get currently indexed content types
        const indexedResponse = await get(`/${pluginId}/indexed-content-types`);
        const indexed = indexedResponse.data?.data || [];

        // Combine them
        const types = configured.map((name: string) => ({
          name,
          isIndexed: indexed.includes(name),
        }));

        setContentTypes(types);
      } catch (error) {
        console.error('[meilisearch-plus] Failed to load content types:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContentTypes();
  }, [get]);

  const handleToggle = async (contentType: string, shouldIndex: boolean) => {
    try {
      if (shouldIndex) {
        // Add to index
        await post(`/${pluginId}/indexed-content-types`, { contentType });
      } else {
        // Remove from index
        await del(`/${pluginId}/indexed-content-types?contentType=${contentType}`);
      }

      // Update local state
      setContentTypes((prev) =>
        prev.map((ct) => (ct.name === contentType ? { ...ct, isIndexed: shouldIndex } : ct))
      );
    } catch (error) {
      console.error(`[meilisearch-plus] Failed to toggle ${contentType}:`, error);
    }
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" minHeight="300px">
        <Loader />
      </Flex>
    );
  }

  return (
    <Box background="neutral0" padding={6} hasRadius>
      <Typography variant="beta" marginBottom={6}>
        {i18n('plugin.contentTypes.title', 'Content Types to Index')}
      </Typography>

      {contentTypes.length === 0 ? (
        <Box padding={4} background="neutral100" hasRadius>
          <Typography>{i18n('plugin.noConfiguredTypes', 'No content types configured')}</Typography>
        </Box>
      ) : (
        <Flex direction="column" gap={4}>
          {contentTypes.map((contentType) => (
            <Box
              key={contentType.name}
              padding={4}
              background="neutral100"
              hasRadius
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography weight="bold">{contentType.name}</Typography>
              <Checkbox
                checked={contentType.isIndexed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleToggle(contentType.name, e.target.checked);
                }}
              />
            </Box>
          ))}
        </Flex>
      )}
    </Box>
  );
});

ContentTypesToggle.displayName = 'ContentTypesToggle';

export default ContentTypesToggle;
