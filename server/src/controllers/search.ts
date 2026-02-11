/**
 * Search controller for MeiliSearch search operations
 */
export default ({ strapi }) => ({
  async search(ctx) {
    try {
      const { query, filters, limit = 20, offset = 0 } = ctx.request.body;

      if (!query) {
        ctx.status = 400;
        ctx.body = { error: 'Query parameter is required' };
        return;
      }

      const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');
      const storeService = strapi.plugin('meilisearch-plus').service('store');

      const indexName = await storeService.getIndexName();
      if (!indexName) {
        ctx.status = 400;
        ctx.body = { error: 'Index name not configured' };
        return;
      }

      const results = await meilisearchService.search({
        query,
        filters,
        limit,
        offset,
        indexName,
      });

      ctx.body = { data: results };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Search failed:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async getIndexStatus(ctx) {
    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const clientService = strapi.plugin('meilisearch-plus').service('meilisearch-client');

      const credentials = await storeService.getCredentials();
      const indexName = await storeService.getIndexName();

      if (!indexName) {
        ctx.body = { data: { status: 'not-configured' } };
        return;
      }

      const client = clientService.createClient(credentials);
      if (!client) {
        ctx.body = { data: { status: 'disconnected' } };
        return;
      }

      const isHealthy = await clientService.testConnection(client);
      if (!isHealthy) {
        ctx.body = { data: { status: 'unhealthy' } };
        return;
      }

      const indexUids = await clientService.getIndexUids(client);
      const indexExists = indexUids.includes(indexName);

      if (!indexExists) {
        ctx.body = { data: { status: 'index-missing' } };
        return;
      }

      const indexedContentTypes = await storeService.getIndexedContentTypes();
      const stats = {
        status: 'healthy',
        indexName,
        indexedContentTypes: indexedContentTypes || [],
        totalIndexes: indexUids.length,
      };

      ctx.body = { data: stats };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get index status:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },
});
