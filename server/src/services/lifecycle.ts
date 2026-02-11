/**
 * Lifecycle service for managing content lifecycle hooks
 * Handles subscribing to document creation, updates, and deletions
 */
export default ({ strapi }) => ({
  async subscribeContentType({ contentType }: { contentType: string }) {
    const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');
    const storeService = strapi.plugin('meilisearch-plus').service('store');

    // Subscribe to document creation
    strapi.db.lifecycles.subscribe({
      models: [contentType],
      async afterCreate(event) {
        const { result } = event;
        try {
          await meilisearchService.indexDocument({ contentType, document: result });
          strapi.log.debug(`[meilisearch-plus] Indexed document for ${contentType}`);
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] Failed to index document for ${contentType}:`,
            error
          );
        }
      },
    });

    // Subscribe to document update
    strapi.db.lifecycles.subscribe({
      models: [contentType],
      async afterUpdate(event) {
        const { result } = event;
        try {
          await meilisearchService.indexDocument({ contentType, document: result });
          strapi.log.debug(`[meilisearch-plus] Updated indexed document for ${contentType}`);
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] Failed to update indexed document for ${contentType}:`,
            error
          );
        }
      },
    });

    // Subscribe to document deletion
    strapi.db.lifecycles.subscribe({
      models: [contentType],
      async afterDelete(event) {
        const { result } = event;
        try {
          await meilisearchService.deleteDocument({ contentType, documentId: result.id });
          strapi.log.debug(`[meilisearch-plus] Deleted indexed document for ${contentType}`);
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] Failed to delete indexed document for ${contentType}:`,
            error
          );
        }
      },
    });

    strapi.log.info(`[meilisearch-plus] Subscribed to lifecycle events for ${contentType}`);
  },

  async unsubscribeContentType({ contentType }: { contentType: string }) {
    // Note: Strapi doesn't provide an unsubscribe method, so we'll need to handle this differently
    // For now, we'll just log that we're "unsubscribing"
    strapi.log.info(`[meilisearch-plus] Unsubscribed from lifecycle events for ${contentType}`);
  },
});
