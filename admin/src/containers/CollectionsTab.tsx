import React, { memo } from 'react';
import { Box, Badge, Typography, Flex, Loader, Button } from '@strapi/design-system';
import { useIndexedContentTypes, useI18n } from '../hooks';

/**
 * Collections view showing indexed content types with legend and features
 */
const CollectionsTab = memo(() => {
  const { contentTypes, isLoading } = useIndexedContentTypes();
  const { i18n } = useI18n();

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" minHeight="400px">
        <Loader />
      </Flex>
    );
  }

  return (
    <Box background="neutral100" padding={4}>
      {/* Legend */}
      <Box background="neutral0" padding={6} hasRadius marginBottom={8}>
        <Typography variant="beta" marginBottom={6}>
          {i18n('plugin.legend.title', 'Legend')}
        </Typography>

        <Flex direction="column" alignItems="flex-start" gap={5} paddingTop={2}>
          {/* In MeiliSearch */}
          <Flex alignItems="left" gap={6}>
            <Typography variant="sigma" textColor="neutral600" style={{ minWidth: '130px' }}>
              {i18n('plugin.legend.in-meilisearch', 'IN MEILISEARCH')}
            </Typography>
            <Flex alignItems="center" gap={8}>
              <Flex alignItems="center" gap={3}>
                <Badge background="success600" textColor="neutral0">
                  YES
                </Badge>
                <Typography size="sm">
                  {i18n('plugin.legend.indexed', 'Content type is indexed')}
                </Typography>
              </Flex>
              <Flex alignItems="center" gap={3}>
                <Badge background="neutral900" textColor="neutral0">
                  NO
                </Badge>
                <Typography size="sm">
                  {i18n('plugin.legend.not-indexed', 'Content type is not indexed')}
                </Typography>
              </Flex>
            </Flex>
          </Flex>

          {/* Indexing Status */}
          <Flex alignItems="center" gap={6}>
            <Typography variant="sigma" textColor="neutral600" style={{ minWidth: '130px' }}>
              {i18n('plugin.legend.indexing-status', 'INDEXING STATUS')}
            </Typography>
            <Flex alignItems="center" gap={8}>
              <Flex alignItems="center" gap={3}>
                <Badge background="success600" textColor="neutral0">
                  ✓
                </Badge>
                <Typography size="sm">
                  {i18n('plugin.legend.indexing-complete', 'Indexing complete')}
                </Typography>
              </Flex>
              <Flex alignItems="center" gap={3}>
                <Badge background="warning600" textColor="neutral0">
                  ⟳
                </Badge>
                <Typography size="sm">
                  {i18n('plugin.legend.indexing-in-progress', 'Indexing in progress')}
                </Typography>
              </Flex>
            </Flex>
          </Flex>

          {/* Hooks */}
          <Flex alignItems="center" gap={6}>
            <Typography variant="sigma" textColor="neutral600" style={{ minWidth: '130px' }}>
              {i18n('plugin.legend.hooks', 'HOOKS')}
            </Typography>
            <Flex alignItems="center" gap={8}>
              <Flex alignItems="center" gap={3}>
                <Badge background="success600" textColor="neutral0">
                  ✓
                </Badge>
                <Typography size="sm">
                  {i18n('plugin.legend.hooks-active', 'Hooks active - automatic sync enabled')}
                </Typography>
              </Flex>
              <Flex alignItems="center" gap={3}>
                <Badge background="neutral900" textColor="neutral0">
                  ⚠
                </Badge>
                <Typography size="sm">
                  {i18n(
                    'plugin.legend.hooks-inactive',
                    'Hooks not active - manual reload required'
                  )}
                </Typography>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {/* Content Types List */}
      <Box background="neutral0" padding={6} hasRadius>
        <Typography variant="beta" marginBottom={6}>
          {i18n('plugin.collections.title', 'Indexed Content Types')}
        </Typography>

        {contentTypes.length === 0 ? (
          <Box padding={4} background="neutral100" hasRadius>
            <Typography>
              {i18n('plugin.noIndexedTypes', 'No content types are currently indexed')}
            </Typography>
          </Box>
        ) : (
          <Flex direction="column" gap={3}>
            {contentTypes.map((ct: any) => (
              <Box
                key={ct.uid || ct.name}
                padding={4}
                background="neutral100"
                hasRadius
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Flex alignItems="center" gap={3}>
                  <Badge background="success600" textColor="neutral0">
                    ✓
                  </Badge>
                  <Box>
                    <Typography weight="bold">{ct.name || ct.uid}</Typography>
                    {ct.uid && (
                      <Typography size="sm" textColor="neutral600">
                        {ct.uid}
                      </Typography>
                    )}
                  </Box>
                </Flex>
                <Flex gap={2}>
                  <Button variant="tertiary" size="S">
                    {i18n('plugin.button.reindex', 'Reindex')}
                  </Button>
                </Flex>
              </Box>
            ))}
          </Flex>
        )}
      </Box>
    </Box>
  );
});

CollectionsTab.displayName = 'CollectionsTab';

export default CollectionsTab;
