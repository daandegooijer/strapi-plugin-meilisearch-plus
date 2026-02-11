import React, { lazy, Suspense } from 'react';
import {
  BackButton,
  Layouts,
  Page,
  private_AutoReloadOverlayBlockerProvider as AutoReloadOverlayBlockerProvider,
} from '@strapi/strapi/admin';
import { Flex, Loader, Box } from '@strapi/design-system';
import { useI18n } from '../hooks';
import PluginIcon from '../components/PluginIcon';

const CollectionsTable = lazy(() => import('../containers/CollectionsTable'));

/**
 * Main home page for the MeiliSearch plugin - Collections view with legend
 */
const HomePage = () => {
  const { i18n } = useI18n();

  return (
    <AutoReloadOverlayBlockerProvider>
      <Page.Main>
        <Layouts.Header
          title={
            <Flex gap={2} alignItems="center">
              <PluginIcon />
              {i18n('plugin.name', 'MeiliSearch Plus')}
            </Flex>
          }
          subtitle={i18n(
            'plugin.description',
            'Full-text search integration powered by MeiliSearch'
          )}
          navigationAction={<BackButton disabled={false} />}
        />
        <Layouts.Content>
          <Suspense
            fallback={
              <Flex justifyContent="center" alignItems="center" minHeight="400px">
                <Loader />
              </Flex>
            }
          >
            <CollectionsTable />
          </Suspense>
        </Layouts.Content>
      </Page.Main>
    </AutoReloadOverlayBlockerProvider>
  );
};

export default HomePage;
