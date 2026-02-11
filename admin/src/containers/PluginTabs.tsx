import React, { lazy, Suspense, useState } from 'react';
import { Box, Button, Loader, Flex } from '@strapi/design-system';
import { useI18n } from '../hooks';

const CredentialsTab = lazy(() => import('./CredentialsTab'));
const CollectionsTab = lazy(() => import('./CollectionsTab'));
const IndexSettingsTab = lazy(() => import('./IndexSettingsTab'));

/**
 * Tabbed interface for plugin main container
 */
const PluginTabs: React.FC = () => {
  const { i18n } = useI18n();
  const [activeTab, setActiveTab] = useState<'collections' | 'settings' | 'indexSettings'>('collections');

  return (
    <Box background="neutral100" padding={4}>
      {/* Tab Navigation */}
      <Box marginBottom={6} display="flex" gap={3}>
        <Button
          variant={activeTab === 'collections' ? 'default' : 'tertiary'}
          onClick={() => setActiveTab('collections')}
        >
          {i18n('plugin.tab.collections', 'Collections')}
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'tertiary'}
          onClick={() => setActiveTab('settings')}
        >
          {i18n('plugin.tab.settings', 'Settings')}
        </Button>
        <Button
          variant={activeTab === 'indexSettings' ? 'default' : 'tertiary'}
          onClick={() => setActiveTab('indexSettings')}
        >
          {i18n('plugin.tab.indexSettings', 'Index Settings')}
        </Button>
      </Box>

      {/* Tab Content */}
      <Suspense
        fallback={
          <Flex justifyContent="center" alignItems="center" minHeight="300px">
            <Loader />
          </Flex>
        }
      >
        {activeTab === 'collections' && <CollectionsTab />}
        {activeTab === 'settings' && <CredentialsTab />}
        {activeTab === 'indexSettings' && <IndexSettingsTab />}
      </Suspense>
    </Box>
  );
};

export default PluginTabs;
