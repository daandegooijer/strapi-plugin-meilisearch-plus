/**
 * Controller for manual indexing operations
 */
export default ({ strapi }) => ({
  async reindexContentType(ctx) {
    try {
      const { contentType } = ctx.request.body || ctx.params;
      if (!contentType) {
        ctx.status = 400;
        ctx.body = { error: 'Content type is required' };
        return;
      }
      const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');
      const taskUids = await meilisearchService.updateContentTypeInMeiliSearch({ contentType });
      ctx.body = { data: { reindexed: taskUids.length } };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Reindexing failed:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async clearIndex(ctx) {
    try {
      const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');
      // Accept contentType from body, but allow it to be undefined
      const { contentType } = ctx.request.body || {};
      await meilisearchService.deleteAllDocuments({ contentType });
      ctx.body = { data: { cleared: true } };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Clear index failed:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },
});
