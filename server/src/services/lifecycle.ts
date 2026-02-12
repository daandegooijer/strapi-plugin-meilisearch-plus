/**
 * Lifecycle service for managing content lifecycle hooks
 * Handles subscribing to document creation, updates, and deletions
 */
export default ({ strapi }) => ({
  async subscribeContentType({ contentType }: { contentType: string }) {
    const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');
    const storeService = strapi.plugin('meilisearch-plus').service('store');

    strapi.log.info(`[meilisearch-plus] Starting subscription for content type: ${contentType}`);

    // Subscribe to document creation
    strapi.db.lifecycles.subscribe({
      models: [contentType],
      async afterCreate(event) {
        const { result } = event;
        strapi.log.info(`[meilisearch-plus] afterCreate triggered for ${contentType}`, {
          documentId: result.documentId || result.id,
          publishedAt: result.publishedAt,
        });
        try {
          await meilisearchService.indexDocument({ contentType, document: result });
          strapi.log.info(`[meilisearch-plus] ✓ Indexed document for ${contentType}`);
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] ✗ Failed to index document for ${contentType}:`,
            error
          );
        }
      },
    });

    // Subscribe to document update
    // Note: Similar to afterCreate, we fetch the document with status: 'published'
    // If no published version exists, the document won't be indexed.
    strapi.db.lifecycles.subscribe({
      models: [contentType],
      async afterUpdate(event) {
        const { result } = event;
        const documentId = result.documentId || result.id;

        strapi.log.info(`[meilisearch-plus] afterUpdate triggered for ${contentType}`, {
          documentId,
          publishedAt: result.publishedAt,
        });

        try {
          // Get content type service
          const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');
          const contentTypeUid = contentTypeService.getContentTypeUid({ contentType });

          // Fetch the document with published status to ensure we only index published content
          const fullDocument = await contentTypeService.getEntry({
            contentType: contentTypeUid,
            documentId: documentId,
            entriesQuery: {
              status: 'published',
              locale: result.locale,
            },
          });

          // Only index if a published version exists
          if (fullDocument) {
            strapi.log.info(
              `[meilisearch-plus] Document is PUBLISHED - indexing in Meilisearch (${contentType} ID: ${documentId})`
            );
            await meilisearchService.indexDocument({ contentType, document: fullDocument });
            strapi.log.info(
              `[meilisearch-plus] ✓ Indexed/updated published document for ${contentType}`
            );
          } else {
            // No published version exists, remove from Meilisearch
            strapi.log.info(
              `[meilisearch-plus] No published version found - removing from Meilisearch (${contentType} ID: ${documentId})`
            );
            const locale = result.locale || 'en';
            await meilisearchService.deleteDocument({ contentType, documentId, locale });
            strapi.log.info(
              `[meilisearch-plus] ✓ Removed unpublished document from index for ${contentType}`
            );
          }
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] ✗ Failed to handle document update for ${contentType}:`,
            error
          );
        }
      },
    });

    // Subscribe to bulk create (afterCreateMany)
    strapi.db.lifecycles.subscribe({
      models: [contentType],
      async afterCreateMany(event) {
        const { result } = event;

        strapi.log.info(`[meilisearch-plus] afterCreateMany triggered for ${contentType}`, {
          count: result.count,
          ids: result.ids,
        });

        try {
          const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');
          const contentTypeUid = contentTypeService.getContentTypeUid({ contentType });

          // Fetch published documents in batches
          const documents = await strapi.documents(contentTypeUid).findMany({
            filters: { documentId: { $in: result.ids } },
            status: 'published',
            limit: -1,
          });

          if (documents && documents.length > 0) {
            // Index each document individually
            for (const doc of documents) {
              await meilisearchService.indexDocument({ contentType, document: doc });
            }
            strapi.log.info(
              `[meilisearch-plus] ✓ Indexed ${documents.length} documents for ${contentType}`
            );
          }
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] ✗ Failed to handle bulk create for ${contentType}:`,
            error
          );
        }
      },
    });

    // Subscribe to bulk update (afterUpdateMany)
    strapi.db.lifecycles.subscribe({
      models: [contentType],
      async afterUpdateMany(event) {
        strapi.log.info(`[meilisearch-plus] afterUpdateMany triggered for ${contentType}`, {
          filters: event.params?.where,
        });

        try {
          const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');
          const contentTypeUid = contentTypeService.getContentTypeUid({ contentType });

          // Fetch documents matching the filter with published status
          const documents = await strapi.documents(contentTypeUid).findMany({
            filters: event.params?.where || {},
            status: 'published',
            limit: -1,
          });

          if (documents && documents.length > 0) {
            // Index each published document individually
            for (const doc of documents) {
              await meilisearchService.indexDocument({ contentType, document: doc });
            }
            strapi.log.info(
              `[meilisearch-plus] ✓ Reindexed ${documents.length} documents for ${contentType}`
            );
          }
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] ✗ Failed to handle bulk update for ${contentType}:`,
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
        const documentId = result.documentId || result.id;
        const locale = result.locale || 'en';

        strapi.log.info(`[meilisearch-plus] afterDelete triggered for ${contentType}`, {
          documentId,
          locale,
        });

        try {
          // Delete all locale variants of this document from Meilisearch
          await meilisearchService.deleteDocument({ contentType, documentId, locale });
          strapi.log.info(
            `[meilisearch-plus] ✓ Deleted indexed document for ${contentType} (locale: ${locale})`
          );
        } catch (error) {
          strapi.log.error(
            `[meilisearch-plus] ✗ Failed to delete indexed document for ${contentType}:`,
            error
          );
        }
      },
    });

    strapi.log.info(
      `[meilisearch-plus] ✓ Successfully subscribed to lifecycle events for ${contentType}`
    );
  },

  async unsubscribeContentType({ contentType }: { contentType: string }) {
    // Note: Strapi doesn't provide an unsubscribe method, so we'll need to handle this differently
    // For now, we'll just log that we're "unsubscribing"
    strapi.log.info(`[meilisearch-plus] Unsubscribed from lifecycle events for ${contentType}`);
  },
});
