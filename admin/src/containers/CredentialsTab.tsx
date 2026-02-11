import React, { memo, useState, useEffect } from 'react';
import { Box, Button, Field, Typography, Link, Alert, Flex, Loader } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useCredentials, useI18n } from '../hooks';

/**
 * Settings page - Credentials management
 */
const CredentialsTab = memo(() => {
  const { credentials, isLoading, isSaving, updateCredentials, testConnection } = useCredentials();
  const { i18n } = useI18n();

  const [host, setHost] = useState(credentials.host);
  const [apiKey, setApiKey] = useState(credentials.apiKey);
  const [indexName, setIndexName] = useState(credentials.indexName);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);

  // Sync state when credentials change
  useEffect(() => {
    setHost(credentials.host);
    setApiKey(credentials.apiKey);
    setIndexName(credentials.indexName);
  }, [credentials]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const isHealthy = await testConnection();
    setConnectionStatus(isHealthy ? 'success' : 'error');
    setTestingConnection(false);
  };

  const handleSave = () => {
    updateCredentials({ host, apiKey, indexName });
    setConnectionStatus(null);
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" minHeight="400px">
        <Loader />
      </Flex>
    );
  }

  return (
    <Box background="neutral100" padding={4}>
      <Box background="neutral0" padding={6} hasRadius>
        <Typography variant="beta" marginBottom={6}>
          {i18n('plugin.settings.credentials.title', 'MeiliSearch Configuration')}
        </Typography>

        {connectionStatus === 'success' && (
          <Box marginBottom={6}>
            <Alert variant="success" icon={<Check />}>
              {i18n('plugin.connection.success', 'Connection to MeiliSearch successful!')}
            </Alert>
          </Box>
        )}

        {connectionStatus === 'error' && (
          <Box marginBottom={6}>
            <Alert variant="danger">
              {i18n(
                'plugin.connection.error',
                'Failed to connect to MeiliSearch. Please verify your credentials.'
              )}
            </Alert>
          </Box>
        )}

        {/* Host Input */}
        <Box marginBottom={6}>
          <Field.Root
            id="host"
            hint={i18n('plugin.input.host.hint', 'The URL where MeiliSearch is running')}
          >
            <Field.Label>{i18n('plugin.input.host.label', 'MeiliSearch URL')}</Field.Label>
            <Field.Input
              type="text"
              name="host"
              value={host}
              placeholder="http://localhost:7700"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHost(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>
        </Box>

        {/* API Key Input */}
        <Box marginBottom={6}>
          <Field.Root
            id="apiKey"
            hint={i18n(
              'plugin.input.apiKey.hint',
              'API key with permission to create indexes (master key recommended)'
            )}
          >
            <Field.Label>{i18n('plugin.input.apiKey.label', 'API Key')}</Field.Label>
            <Field.Input
              type="password"
              name="apiKey"
              value={apiKey}
              placeholder="••••••••••••"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>
        </Box>

        {/* Index Name Input */}
        <Box marginBottom={6}>
          <Field.Root
            id="indexName"
            hint={i18n('plugin.input.indexName.hint', 'Name of the MeiliSearch index to use')}
          >
            <Field.Label>{i18n('plugin.input.indexName.label', 'Index Name')}</Field.Label>
            <Field.Input
              type="text"
              name="indexName"
              value={indexName}
              placeholder="my-index"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndexName(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>
        </Box>

        {/* Security Warning */}
        <Box
          padding={4}
          marginBottom={6}
          background="warning100"
          hasRadius
          borderColor="warning500"
          borderStyle="solid"
          borderWidth="1px"
        >
          <Typography variant="pi" textColor="warning700" weight="bold">
            {i18n(
              'plugin.warning.security',
              'Security Warning: Do not expose this API key on the frontend. Use the searchable key instead.'
            )}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Flex gap={3}>
          <Button
            variant="secondary"
            onClick={handleTestConnection}
            disabled={testingConnection || isSaving || !host || !apiKey}
            startIcon={testingConnection ? <Loader /> : undefined}
          >
            {testingConnection
              ? i18n('plugin.button.testing', 'Testing...')
              : i18n('plugin.button.testConnection', 'Test Connection')}
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
            startIcon={isSaving ? <Loader /> : undefined}
          >
            {isSaving
              ? i18n('plugin.button.saving', 'Saving...')
              : i18n('plugin.button.save', 'Save')}
          </Button>
        </Flex>
      </Box>
    </Box>
  );
});

CredentialsTab.displayName = 'CredentialsTab';

export default CredentialsTab;
