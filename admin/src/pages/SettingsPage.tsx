import React, { lazy, Suspense } from 'react';
import {
  BackButton,
  Layouts,
  Page,
  private_AutoReloadOverlayBlockerProvider as AutoReloadOverlayBlockerProvider,
} from '@strapi/strapi/admin';
import { Flex, Loader, Button } from '@strapi/design-system';
import { useI18n } from '../hooks';
import PluginIcon from '../components/PluginIcon';
import { useNavigate } from 'react-router-dom';

const CredentialsTab = lazy(() => import('../containers/CredentialsTab'));

/**
 * Settings page for the MeiliSearch plugin - Credentials and configuration
 */
const SettingsPage = () => {
  const { i18n } = useI18n();
  const navigate = useNavigate();

  return (
    <AutoReloadOverlayBlockerProvider>
      <Page.Main>
        <Layouts.Header
          title={
            <Flex gap={2} alignItems="center">
              <PluginIcon />
              {i18n('plugin.settings.title', 'MeiliSearch Settings')}
            </Flex>
          }
          subtitle={i18n('plugin.settings.subtitle', 'Configure your MeiliSearch connection')}
          //   navigationAction={<BackButton onClick={() => navigate('..')} />}
          primaryAction={
            <Button onClick={() => navigate('..')} variant="tertiary" size="L">
              {i18n('plugin.button.collections', 'Back to Collections')}
            </Button>
          }
        />
        <Layouts.Content>
          <Suspense
            fallback={
              <Flex justifyContent="center" alignItems="center" minHeight="400px">
                <Loader />
              </Flex>
            }
          >
            <CredentialsTab />
          </Suspense>
        </Layouts.Content>
      </Page.Main>
    </AutoReloadOverlayBlockerProvider>
  );
};

export default SettingsPage;
