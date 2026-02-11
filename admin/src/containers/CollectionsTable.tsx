import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Table,
  Tbody,
  Td,
  Tr,
  Typography,
  Badge,
  Flex,
  Loader,
  Alert,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Check } from '@strapi/icons';
import { RefreshIcon, XIcon, DangerIcon } from '../components/Icons';
import { useI18n } from '../hooks';
import { pluginId } from '../utils/pluginId';

interface ContentType {
  name: string;
  uid?: string;
  displayName?: string;
  isIndexed: boolean;
  total?: number;
  indexed?: number;
  syncPercentage?: number;
  isSynced?: boolean;
}

/**
 * Collections table - shows all configured content types with indexing controls
 */
const CollectionsTable = memo(() => {
  const { i18n } = useI18n();
  const { get, post, del } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
  const [syncData, setSyncData] = useState<Record<string, any>>({});

  // Load configured and indexed content types
  useEffect(() => {
    loadContentTypes();
  }, [get]);

  const loadContentTypes = async () => {
    setIsLoading(true);
    try {
      // Get all sync status at once
      const syncResponse = await get(`/${pluginId}/sync-status/all`);
      const syncStatuses = syncResponse.data?.data || [];
      console.log('Sync statuses from API:', syncStatuses);

      // Extract configured UIDs from sync status response
      const configuredUids = syncStatuses.map((item: any) => item.contentType);
      console.log('Configured content types from API:', configuredUids);

      // Fetch all content types from Strapi to get display names
      const allContentTypes = strapi.contentTypes;
      // Build sync data map and contentTypes array directly from syncStatuses
      const syncMap: Record<string, any> = {};
      const types: ContentType[] = syncStatuses.map((item: any) => {
        syncMap[item.contentType] = {
          total: item.total || 0,
          indexed: item.indexed || 0,
          syncPercentage: item.syncPercentage || 0,
          isSynced: item.isSynced || false,
          isIndexed: item.isIndexed || false,
        };
        return {
          name: item.displayName || item.contentType,
          uid: item.contentType,
          displayName: item.displayName || item.contentType,
          isIndexed: item.isIndexed || false,
          total: item.total || 0,
          indexed: item.indexed || 0,
          syncPercentage: item.syncPercentage || 0,
          isSynced: item.isSynced || false,
        };
      });

      setSyncData(syncMap);
      setContentTypes(types);
    } catch (error) {
      console.error('[meilisearch-plus] Failed to load content types:', error);
      toggleNotification({
        type: 'warning',
        message: 'Failed to load sync status',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (name: string) => {
    // Get current state of this content type
    console.log(contentTypes);
    const currentContentType = contentTypes.find((ct) => ct.name === name || ct.uid === name);
    if (!currentContentType) return;

    const shouldAddIndex = !currentContentType.isIndexed;
    console.log(`[meilisearch-plus] Toggling ${name} to ${shouldAddIndex}`);

    setLoadingState((prev) => ({ ...prev, [name]: true }));
    try {
      const contentTypeUid = currentContentType?.uid || name;
      if (shouldAddIndex) {
        console.log(`[meilisearch-plus] POST to /${pluginId}/indexed-content-types`);
        const response = await post(`/${pluginId}/indexed-content-types`, {
          contentType: contentTypeUid,
        });
        console.log('[meilisearch-plus] POST response:', response);

        // After adding to index, immediately reindex to sync documents
        console.log(`[meilisearch-plus] Reindexing ${contentTypeUid} after adding to index`);
        await post(`/${pluginId}/reindex`, { contentType: contentTypeUid });
        console.log(`[meilisearch-plus] Reindex complete for ${contentTypeUid}`);
      } else {
        console.log(
          `[meilisearch-plus] DELETE to /${pluginId}/indexed-content-types?contentType=${contentTypeUid}`
        );
        const response = await del(
          `/${pluginId}/indexed-content-types?contentType=${contentTypeUid}`
        );
        console.log('[meilisearch-plus] DELETE response:', response);
      }

      setContentTypes((prev) =>
        prev.map((ct) => (ct.name === name ? { ...ct, isIndexed: shouldAddIndex } : ct))
      );

      toggleNotification({
        type: 'success',
        message: shouldAddIndex ? `${name} added to index` : `${name} removed from index`,
      });

      // Reload sync status after toggle
      await loadContentTypes();
    } catch (error) {
      console.error(`[meilisearch-plus] Failed to toggle ${name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[meilisearch-plus] Error details:', errorMessage);
      toggleNotification({
        type: 'warning',
        message: `Failed to update ${name}: ${errorMessage}`,
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleUpdate = async (contentType: string) => {
    console.log(`[meilisearch-plus] Updating ${contentType}`);
    setLoadingState((prev) => ({ ...prev, [contentType]: true }));
    try {
      // Find the UID for this contentType
      const ct = contentTypes.find((ct) => ct.name === contentType || ct.uid === contentType);
      const contentTypeUid = ct?.uid || contentType;
      const response = await post(`/${pluginId}/reindex`, { contentType: contentTypeUid });
      console.log('[meilisearch-plus] Update response:', response);

      toggleNotification({
        type: 'success',
        message: `${contentType} index updated`,
      });

      // Reload sync status after update
      await loadContentTypes();
    } catch (error) {
      console.error(`[meilisearch-plus] Failed to update ${contentType}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toggleNotification({
        type: 'warning',
        message: `Failed to update ${contentType}: ${errorMessage}`,
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, [contentType]: false }));
    }
  };

  const handleReindex = async (contentType: string) => {
    console.log(`[meilisearch-plus] Reindexing ${contentType}`);
    setLoadingState((prev) => ({ ...prev, [contentType]: true }));
    try {
      // Find the UID for this contentType
      const ct = contentTypes.find((ct) => ct.name === contentType || ct.uid === contentType);
      const contentTypeUid = ct?.uid || contentType;
      // Clear only this content type from index for full rebuild
      await post(`/${pluginId}/clear-index`, { contentType: contentTypeUid });
      console.log('[meilisearch-plus] Index cleared for', contentTypeUid);

      // Then reindex
      const response = await post(`/${pluginId}/reindex`, { contentType: contentTypeUid });
      console.log('[meilisearch-plus] Reindex response:', response);

      toggleNotification({
        type: 'success',
        message: `${contentType} index reindexed`,
      });

      // Reload sync status after reindex
      await loadContentTypes();
    } catch (error) {
      console.error(`[meilisearch-plus] Failed to reindex ${contentType}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toggleNotification({
        type: 'warning',
        message: `Failed to reindex ${contentType}: ${errorMessage}`,
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, [contentType]: false }));
    }
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" minHeight="400px">
        <Loader />
      </Flex>
    );
  }

  const COL_COUNT = 8;
  const ROW_COUNT = Math.max(6, contentTypes.length);

  return (
    <Box background="neutral100" padding={4}>
      {/* Legend */}
      <Box padding={6} marginBottom={6} background="neutral0" hasRadius>
        <Typography variant="beta" marginBottom={6} paddingBottom={4}>
          {i18n('plugin.legend.title', 'Legend')}
        </Typography>

        <Flex
          direction="column"
          alignItems="flex-start"
          justifyContent="between"
          gap={6}
          style={{ width: '100%' }}
        >
          {/* First Row */}
          <Flex alignItems="flex-start" justifyContent="between" gap={6} style={{ width: '100%' }}>
            {/* IN MEILISEARCH */}
            <Box flex={1}>
              <Typography variant="sigma" textColor="neutral600" marginBottom={3}>
                {i18n('plugin.legend.in-meilisearch', 'IN MEILISEARCH')}
              </Typography>
              <Flex direction="column" alignItems="flex-start" gap={3} paddingTop={2}>
                <Flex gap={3} alignItems="flex-start">
                  <Badge background="success600" textColor="neutral0">
                    <Check />
                  </Badge>
                  <Typography size="sm">
                    {i18n('plugin.legend.indexed', 'Content type is indexed')}
                  </Typography>
                </Flex>
                <Flex gap={3} alignItems="flex-start">
                  <Badge background="neutral900" textColor="neutral0">
                    <XIcon size={16} color="white" />
                  </Badge>
                  <Typography size="sm">
                    {i18n('plugin.legend.not-indexed', 'Content type is not indexed')}
                  </Typography>
                </Flex>
              </Flex>
            </Box>

            {/* INDEXING STATUS */}
            <Box flex={1}>
              <Typography variant="sigma" textColor="neutral600" marginBottom={3}>
                {i18n('plugin.legend.indexing-status', 'INDEXING STATUS')}
              </Typography>
              <Flex direction="column" gap={3} alignItems="flex-start" paddingTop={2}>
                <Flex gap={3} alignItems="flex-start">
                  <Badge background="success600" textColor="neutral0">
                    <Check />
                  </Badge>
                  <Typography size="sm">
                    {i18n('plugin.legend.indexing-complete', 'Indexing complete')}
                  </Typography>
                </Flex>
                <Flex gap={3} alignItems="flex-start">
                  <Badge background="warning600" textColor="neutral0">
                    <RefreshIcon size={16} color="white" />
                  </Badge>
                  <Typography size="sm">
                    {i18n('plugin.legend.indexing-in-progress', 'Indexing in progress')}
                  </Typography>
                </Flex>
              </Flex>
            </Box>

            {/* HOOKS */}
            <Box flex={1}>
              <Typography variant="sigma" textColor="neutral600" marginBottom={3}>
                {i18n('plugin.legend.hooks', 'HOOKS')}
              </Typography>
              <Flex direction="column" gap={3} paddingTop={2} alignItems="flex-start">
                <Flex gap={3} alignItems="flex-start">
                  <Badge background="success600" textColor="neutral0">
                    <Check />
                  </Badge>
                  <Typography size="sm">
                    {i18n('plugin.legend.hooks-active', 'Hooks active - automatic sync enabled')}
                  </Typography>
                </Flex>
                <Flex gap={3} alignItems="flex-start">
                  <Badge background="neutral900" textColor="neutral0">
                    <DangerIcon size={16} color="white" />
                  </Badge>
                  <Typography size="sm">
                    {i18n(
                      'plugin.legend.hooks-inactive',
                      'Hooks not active - manual reload required'
                    )}
                  </Typography>
                </Flex>
              </Flex>
            </Box>
          </Flex>

          {/* ACTIONS Section */}
          <Box>
            <Typography variant="sigma" textColor="neutral600" marginBottom={3}>
              {i18n('plugin.legend.actions', 'ACTIONS')}
            </Typography>
            <Flex direction="column" gap={2} alignItems="flex-start">
              <Typography size="sm">
                <strong>{i18n('plugin.button.update', 'Update')}</strong> —{' '}
                {i18n(
                  'plugin.legend.update',
                  'Sync & refresh the index with the latest entries without deleting existing data.'
                )}
              </Typography>
              <Typography size="sm">
                <strong>{i18n('plugin.button.reindex', 'Reindex')}</strong> —{' '}
                {i18n(
                  'plugin.legend.reindex',
                  'Full rebuild: delete all indexed documents and reindex everything from scratch.'
                )}
              </Typography>
            </Flex>
          </Box>
        </Flex>
      </Box>

      {/* Content Types Table */}
      <Box background="neutral0" hasRadius>
        <Table colCount={COL_COUNT} rowCount={ROW_COUNT}>
          <thead>
            <Tr>
              <Td>
                <Typography variant="sigma" textColor="neutral600">
                  {i18n('plugin.table.header.index', 'Index')}
                </Typography>
              </Td>
              <Td>
                <Typography variant="sigma" textColor="neutral600">
                  {i18n('plugin.table.header.name', 'Name')}
                </Typography>
              </Td>
              <Td>
                <Typography variant="sigma" textColor="neutral600">
                  {i18n('plugin.table.header.in-meilisearch', 'In MeiliSearch')}
                </Typography>
              </Td>
              <Td>
                <Typography variant="sigma" textColor="neutral600">
                  {i18n('plugin.table.header.database', 'Database')}
                </Typography>
              </Td>
              <Td>
                <Typography variant="sigma" textColor="neutral600">
                  {i18n('plugin.table.header.indexed', 'Indexed')}
                </Typography>
              </Td>
              <Td>
                <Typography variant="sigma" textColor="neutral600">
                  {i18n('plugin.table.header.sync', 'Sync %')}
                </Typography>
              </Td>
              <Td>
                <Typography variant="sigma" textColor="neutral600">
                  {i18n('plugin.table.header.actions', 'Actions')}
                </Typography>
              </Td>
              <Td></Td>
            </Tr>
          </thead>
          <Tbody>
            {contentTypes.length === 0 ? (
              <Tr>
                <Td colSpan={COL_COUNT}>
                  <Box padding={4}>
                    <Typography>
                      {i18n('plugin.noConfiguredTypes', 'No content types configured')}
                    </Typography>
                  </Box>
                </Td>
              </Tr>
            ) : (
              contentTypes.map((contentType) => (
                <Tr key={contentType.uid || contentType.name}>
                  <Td>
                    <Checkbox
                      checked={contentType.isIndexed}
                      onCheckedChange={() => {
                        handleToggle(contentType.name);
                      }}
                      disabled={loadingState[contentType.name]}
                      aria-label={`Toggle indexing for ${contentType.name}`}
                    />
                  </Td>
                  <Td>
                    <Typography weight="bold">
                      {contentType.displayName || contentType.name}
                    </Typography>
                    <Typography
                      variant="pi"
                      textColor="neutral600"
                      fontSize={12}
                      style={{ display: 'block' }}
                    >
                      {contentType.uid}
                    </Typography>
                  </Td>
                  <Td>
                    {contentType.isIndexed ? (
                      <Badge background="success600" textColor="neutral0">
                        <Check />
                      </Badge>
                    ) : (
                      <Badge background="neutral900" textColor="neutral0">
                        <XIcon size={16} color="white" />
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <Typography size="sm">{contentType.total || 0}</Typography>
                  </Td>
                  <Td>
                    <Typography size="sm">{contentType.indexed || 0}</Typography>
                  </Td>
                  <Td>
                    {contentType.isSynced ? (
                      <Flex gap={2} alignItems="center">
                        <Badge background="success600" textColor="neutral0">
                          <Check />
                        </Badge>
                        <Typography size="sm" weight="bold">
                          {contentType.syncPercentage || 0}%
                        </Typography>
                      </Flex>
                    ) : (
                      <Flex gap={2} alignItems="center">
                        <Badge background="warning600" textColor="neutral0">
                          <DangerIcon size={16} color="white" />
                        </Badge>
                        <Typography size="sm">{contentType.syncPercentage || 0}%</Typography>
                      </Flex>
                    )}
                  </Td>
                  <Td>
                    {contentType.isIndexed && (
                      <Flex gap={2}>
                        <Button
                          size="S"
                          variant="secondary"
                          disabled={loadingState[contentType.name]}
                          onClick={() => handleUpdate(contentType.name)}
                        >
                          {i18n('plugin.button.update', 'Update')}
                        </Button>
                        <Button
                          size="S"
                          variant="tertiary"
                          disabled={loadingState[contentType.name]}
                          onClick={() => handleReindex(contentType.name)}
                        >
                          {i18n('plugin.button.reindex', 'Reindex')}
                        </Button>
                      </Flex>
                    )}
                  </Td>
                  <Td>{loadingState[contentType.name] && <Loader />}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
});

CollectionsTable.displayName = 'CollectionsTable';

export default CollectionsTable;
