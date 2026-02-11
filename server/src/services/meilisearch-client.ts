import { MeiliSearch } from 'meilisearch';

/**
 * MeiliSearch client factory
 * Creates and returns a MeiliSearch client instance
 */
export default ({ strapi }) => ({
  createClient(config: { host: string; apiKey: string }) {
    if (!config.host || !config.apiKey) {
      strapi.log.warn('[meilisearch-plus] MeiliSearch credentials not configured');
      return null;
    }

    try {
      const client = new MeiliSearch({
        host: config.host,
        apiKey: config.apiKey,
      });
      strapi.log.info('[meilisearch-plus] MeiliSearch client initialized');
      return client;
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to initialize MeiliSearch client:', error);
      return null;
    }
  },

  async testConnection(client: MeiliSearch): Promise<boolean> {
    if (!client) return false;
    try {
      await client.health();
      strapi.log.info('[meilisearch-plus] MeiliSearch connection successful');
      return true;
    } catch (error) {
      strapi.log.error('[meilisearch-plus] MeiliSearch connection failed:', error);
      return false;
    }
  },

  async getIndexUids(client: MeiliSearch): Promise<string[]> {
    if (!client) return [];
    try {
      const response = await client.getIndexes();
      return response.results.map((index) => index.uid);
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get index UIDs:', error);
      return [];
    }
  },

  async createIndex(client: MeiliSearch, indexName: string, primaryKey = 'id') {
    if (!client) return null;
    try {
      const index = await client.createIndex(indexName, { primaryKey });
      strapi.log.info(`[meilisearch-plus] Created index: ${indexName}`);
      return index;
    } catch (error) {
      strapi.log.error(`[meilisearch-plus] Failed to create index ${indexName}:`, error);
      return null;
    }
  },

  async deleteIndex(client: MeiliSearch, indexName: string) {
    if (!client) return false;
    try {
      await client.deleteIndex(indexName);
      strapi.log.info(`[meilisearch-plus] Deleted index: ${indexName}`);
      return true;
    } catch (error) {
      strapi.log.error(`[meilisearch-plus] Failed to delete index ${indexName}:`, error);
      return false;
    }
  },
});
