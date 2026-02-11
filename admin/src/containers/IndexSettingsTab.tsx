import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardBody,
  Checkbox,
  Field,
  Typography,
  Alert,
  Loader,
  Tabs,
  Flex,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useI18n } from '../hooks';

interface ContentType {
  uid: string;
  name: string;
  displayName?: string;
}

interface IndexSettingsData {
  contentTypes: ContentType[];
  fields: { [key: string]: string[] };
  filterableAttributes: { [key: string]: { [key: string]: boolean } };
  sortableAttributes: { [key: string]: { [key: string]: boolean } };
  maxTotalHits: number;
}

/**
 * Index Settings Tab - Configure filterable/sortable attributes and pagination
 */
const IndexSettingsTab = memo(() => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { i18n } = useI18n();

  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [fields, setFields] = useState<{ [key: string]: string[] }>({});
  const [filterableAttributes, setFilterableAttributes] = useState<{
    [key: string]: { [key: string]: boolean };
  }>({});
  const [sortableAttributes, setSortableAttributes] = useState<{
    [key: string]: { [key: string]: boolean };
  }>({});
  const [maxTotalHits, setMaxTotalHits] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('');

  // Fetch content types and their fields
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await get('/meilisearch-plus/index-settings/content-types');

        const data: IndexSettingsData = response?.data || response || {};

        setContentTypes(data.contentTypes || []);
        setFields(data.fields || {});
        setFilterableAttributes(data.filterableAttributes || {});
        setSortableAttributes(data.sortableAttributes || {});
        setMaxTotalHits(data.maxTotalHits || 1000);

        if (data.contentTypes && data.contentTypes.length > 0) {
          setActiveTab(data.contentTypes[0].uid || data.contentTypes[0].name);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || i18n('plugin.error', 'Failed to load settings'));
        toggleNotification({
          type: 'warning',
          message: i18n('plugin.error-loading-settings', 'Failed to load index settings'),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterableChange = useCallback(
    (contentType: string, field: string, checked: boolean) => {
      setFilterableAttributes((prev) => ({
        ...prev,
        [contentType]: {
          ...(prev[contentType] || {}),
          [field]: checked,
        },
      }));
    },
    []
  );

  const handleSortableChange = useCallback(
    (contentType: string, field: string, checked: boolean) => {
      setSortableAttributes((prev) => ({
        ...prev,
        [contentType]: {
          ...(prev[contentType] || {}),
          [field]: checked,
        },
      }));
    },
    []
  );

  // Convert snake_case to Title Case
  const formatFieldName = (field: string): string => {
    return field
      .replace(/^_/, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Build the attributes arrays
      const filterableAttrs: { [key: string]: string[] } = {};
      const sortableAttrs: { [key: string]: string[] } = {};

      Object.entries(filterableAttributes).forEach(([contentType, attrs]) => {
        filterableAttrs[contentType] = Object.entries(attrs)
          .filter(([_, checked]) => checked)
          .map(([field]) => field);
      });

      Object.entries(sortableAttributes).forEach(([contentType, attrs]) => {
        sortableAttrs[contentType] = Object.entries(attrs)
          .filter(([_, checked]) => checked)
          .map(([field]) => field);
      });

      await post('/meilisearch-plus/index-settings/save', {
        filterableAttributes: filterableAttrs,
        sortableAttributes: sortableAttrs,
        maxTotalHits,
      });

      // Apply settings to indexes immediately
      await post('/meilisearch-plus/index-settings/apply', {});

      toggleNotification({
        type: 'success',
        message: i18n('plugin.settings-saved', 'Index settings saved and applied successfully'),
      });
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message || i18n('plugin.error-saving', 'Failed to save settings');
      setError(errorMsg);
      toggleNotification({
        type: 'warning',
        message: errorMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" minHeight="400px">
        <Loader />
      </Flex>
    );
  }

  return (
    <Box background="neutral100" padding={4}>
      {error && (
        <Box marginBottom={4}>
          <Alert variant="danger" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Pagination Settings Section */}
      <Card marginBottom={4}>
        <CardHeader title={i18n('plugin.pagination-settings', 'Pagination Settings')} />
        <CardBody>
          <Box style={{ maxWidth: '400px' }}>
            <Field.Root
              id="maxTotalHits"
              hint={i18n(
                'plugin.max-total-hits-hint',
                'Maximum number of documents returned by MeiliSearch'
              )}
            >
              <Field.Label>{i18n('plugin.max-total-hits', 'Max Total Hits')}</Field.Label>
              <Field.Input
                type="number"
                name="maxTotalHits"
                value={maxTotalHits}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMaxTotalHits(parseInt(e.target.value) || 1000)
                }
                disabled={saving}
              />
              <Field.Hint />
            </Field.Root>
          </Box>
        </CardBody>
      </Card>

      {/* Attribute Settings Section */}
      {contentTypes.length === 0 ? (
        <Card>
          <CardHeader title={i18n('plugin.attributes-settings', 'Attribute Settings')} />
          <CardBody>
            <Box padding={4} background="neutral100" hasRadius textAlign="center">
              <Typography variant="sigma">
                {i18n('plugin.no-content-types', 'No content types configured')}
              </Typography>
            </Box>
          </CardBody>
        </Card>
      ) : (
        <Tabs.Root defaultValue={activeTab} onValueChange={setActiveTab}>
          <Tabs.List aria-label={i18n('plugin.select-content-type', 'Select Content Type')}>
            {contentTypes.map((ct) => (
              <Tabs.Trigger key={ct.uid || ct.name} value={ct.uid || ct.name}>
                {ct.displayName || ct.name}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {contentTypes.map((ct) => {
            const contentTypeUid = ct.uid || ct.name;
            return (
              <Tabs.Content key={`content-${contentTypeUid}`} value={contentTypeUid}>
                {fields[contentTypeUid]?.length > 0 ? (
                  <Card marginTop={4}>
                    <CardBody>
                      <Box padding={4}>
                        {/* Filterable Attributes */}
                        <Box marginBottom={8}>
                          <Typography variant="beta" marginBottom={4} tag="h3" weight="bold">
                            {i18n('plugin.filterable-attributes', 'Filterable Attributes')}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600" marginBottom={4}>
                            {i18n(
                              'plugin.filterable-attributes-hint',
                              'Select which fields can be used as filters in searches'
                            )}
                          </Typography>
                          <Box
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                              gap: '16px',
                            }}
                          >
                            {fields[contentTypeUid].map((field) => (
                              <Box
                                key={`filter-${contentTypeUid}-${field}`}
                                display="flex"
                                alignItems="center"
                                padding={3}
                                background="neutral100"
                                hasRadius
                              >
                                <Checkbox
                                  id={`filter-${contentTypeUid}-${field}`}
                                  checked={filterableAttributes?.[contentTypeUid]?.[field] || false}
                                  onCheckedChange={(checked: boolean) =>
                                    handleFilterableChange(contentTypeUid, field, checked)
                                  }
                                  disabled={saving}
                                />
                                <label
                                  htmlFor={`filter-${contentTypeUid}-${field}`}
                                  style={{
                                    marginLeft: '12px',
                                    cursor: 'pointer',
                                    flex: 1,
                                    userSelect: 'none',
                                  }}
                                >
                                  <Typography size="sm" weight="medium">
                                    {formatFieldName(field)}
                                  </Typography>
                                </label>
                              </Box>
                            ))}
                          </Box>
                        </Box>

                        {/* Sortable Attributes */}
                        <Box>
                          <Typography variant="beta" marginBottom={4} tag="h3" weight="bold">
                            {i18n('plugin.sortable-attributes', 'Sortable Attributes')}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600" marginBottom={4}>
                            {i18n(
                              'plugin.sortable-attributes-hint',
                              'Select which fields can be used for sorting in results'
                            )}
                          </Typography>
                          <Box
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                              gap: '16px',
                            }}
                          >
                            {fields[contentTypeUid].map((field) => (
                              <Box
                                key={`sort-${contentTypeUid}-${field}`}
                                display="flex"
                                alignItems="center"
                                padding={3}
                                background="neutral100"
                                hasRadius
                              >
                                <Checkbox
                                  id={`sort-${contentTypeUid}-${field}`}
                                  checked={sortableAttributes?.[contentTypeUid]?.[field] || false}
                                  onCheckedChange={(checked: boolean) =>
                                    handleSortableChange(contentTypeUid, field, checked)
                                  }
                                  disabled={saving}
                                />
                                <label
                                  htmlFor={`sort-${contentTypeUid}-${field}`}
                                  style={{
                                    marginLeft: '12px',
                                    cursor: 'pointer',
                                    flex: 1,
                                    userSelect: 'none',
                                  }}
                                >
                                  <Typography size="sm" weight="medium">
                                    {formatFieldName(field)}
                                  </Typography>
                                </label>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </CardBody>
                  </Card>
                ) : (
                  <Card marginTop={4}>
                    <CardBody>
                      <Box padding={4} textAlign="center">
                        <Typography size="sm" textColor="neutral600">
                          {i18n('plugin.no-fields', 'No fields available')}
                        </Typography>
                      </Box>
                    </CardBody>
                  </Card>
                )}
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
      )}

      {/* Save Button */}
      {contentTypes.length > 0 && (
        <Box marginTop={6} display="flex" justifyContent="flex-end">
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? (
              <>
                <Loader /> {i18n('plugin.saving', 'Saving...')}
              </>
            ) : (
              <>
                <Check /> {i18n('plugin.save-settings', 'Save Settings')}
              </>
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
});

IndexSettingsTab.displayName = 'IndexSettingsTab';

export default IndexSettingsTab;
