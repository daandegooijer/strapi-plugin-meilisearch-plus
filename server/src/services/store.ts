/**
 * Store service for managing MeiliSearch credentials and state
 * Stores credentials in Strapi's data store and provides methods to retrieve them
 */
export default ({ strapi }) => {
  const strapiStore = strapi.store({
    type: 'plugin',
    name: 'meilisearch-plus',
  });

  return {
    async getApiKey(): Promise<string> {
      const credentials = await strapiStore.get({ key: 'credentials' });
      return credentials?.apiKey || '';
    },

    async setApiKey(apiKey: string): Promise<void> {
      const credentials = await strapiStore.get({ key: 'credentials' });
      await strapiStore.set({ key: 'credentials', value: { ...credentials, apiKey } });
    },

    async getHost(): Promise<string> {
      const credentials = await strapiStore.get({ key: 'credentials' });
      return credentials?.host || '';
    },

    async setHost(host: string): Promise<void> {
      const credentials = await strapiStore.get({ key: 'credentials' });
      await strapiStore.set({ key: 'credentials', value: { ...credentials, host } });
    },

    async getIndexName(): Promise<string> {
      const credentials = await strapiStore.get({ key: 'credentials' });
      return credentials?.indexName || '';
    },

    async setIndexName(indexName: string): Promise<void> {
      const credentials = await strapiStore.get({ key: 'credentials' });
      await strapiStore.set({ key: 'credentials', value: { ...credentials, indexName } });
    },

    async getCredentials(): Promise<{ host: string; apiKey: string; indexName: string }> {
      const data = await strapiStore.get({ key: 'credentials' });

      // PRIORITY ORDER:
      // 1. Admin Settings (store) - User-configured via admin UI
      // 2. Plugin Config (plugins.ts) - Fallback for development/initial setup

      let host = data?.host || '';
      let apiKey = data?.apiKey || '';
      let indexName = data?.indexName || '';

      // If admin settings are empty, fall back to plugin config
      if (!host || !apiKey) {
        try {
          const pluginConfig = strapi.config.get('plugin::meilisearch-plus');
          if (pluginConfig) {
            if (!host && pluginConfig.host) {
              host = pluginConfig.host;
            }
            if (!apiKey && pluginConfig.apiKey) {
              apiKey = pluginConfig.apiKey;
            }
            if (!indexName && pluginConfig.post?.indexName) {
              indexName = pluginConfig.post.indexName;
            }
          }
        } catch (error) {
          strapi.log.debug('[meilisearch-plus] Could not retrieve plugin config');
        }
      }

      return { host, apiKey, indexName };
    },

    async syncCredentials(): Promise<{ host: string; apiKey: string }> {
      // Sync credentials from plugin config to admin settings (one-time initialization)
      // This is called at plugin bootstrap to populate admin settings from config file,
      // but admin settings always take priority after this point.
      const pluginConfig = strapi.config.get('plugin::meilisearch-plus');
      let apiKey = '';
      let host = '';

      if (pluginConfig) {
        apiKey = pluginConfig.apiKey || '';
        host = pluginConfig.host || '';
      }

      // Only save to admin settings if they're empty and config has values
      const existingApiKey = await this.getApiKey();
      const existingHost = await this.getHost();

      if (!existingApiKey && apiKey) {
        await this.setApiKey(apiKey);
      }
      if (!existingHost && host) {
        await this.setHost(host);
      }

      return { apiKey, host };
    },

    async setCredentials(credentials: {
      host: string;
      apiKey: string;
      indexName: string;
    }): Promise<void> {
      await strapiStore.set({ key: 'credentials', value: credentials });
      strapi.log.info('[meilisearch-plus] Credentials updated');
    },

    async getIndexedContentTypes(): Promise<string[]> {
      const data = await strapiStore.get({ key: 'indexed-content-types' });
      return data?.contentTypes || [];
    },

    async setIndexedContentTypes(contentTypes: string[]): Promise<void> {
      await strapiStore.set({ key: 'indexed-content-types', value: { contentTypes } });
    },

    async addIndexedContentType(contentType: string): Promise<void> {
      const contentTypes = await this.getIndexedContentTypes();

      strapi.log.debug('[meilisearch-plus] Current indexed content types:', contentTypes);
      strapi.log.debug('[meilisearch-plus] Adding content type:', contentType);
      if (!contentTypes.includes(contentType)) {
        contentTypes.push(contentType);
        await this.setIndexedContentTypes(contentTypes);
      }
    },

    async removeIndexedContentType(contentType: string): Promise<void> {
      const contentTypes = await this.getIndexedContentTypes();
      const filtered = contentTypes.filter((ct) => ct !== contentType);
      await this.setIndexedContentTypes(filtered);
    },

    async getListenedContentTypes(): Promise<string[]> {
      const data = await strapiStore.get({ key: 'listened-content-types' });
      return data?.contentTypes || [];
    },

    async setListenedContentTypes(contentTypes: string[]): Promise<void> {
      await strapiStore.set({ key: 'listened-content-types', value: { contentTypes } });
    },

    async getStoreKey(options: { key: string }): Promise<any> {
      const data = await strapiStore.get({ key: options.key });
      return data;
    },

    async setStoreKey(options: { key: string; value: any }): Promise<void> {
      await strapiStore.set({ key: options.key, value: options.value });
    },
  };
};
