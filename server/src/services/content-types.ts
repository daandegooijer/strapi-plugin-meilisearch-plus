/**
 * Service for working with content types
 * Counts documents in database and MeiliSearch index
 */
export default ({ strapi }) => ({
  /**
   * Get the content type UID from either a UID or a model name
   */
  getContentTypeUid({ contentType }: { contentType: string }): string | undefined {
    const contentTypes = strapi.contentTypes;
    const contentTypeUids = Object.keys(contentTypes);

    strapi.log.debug(`[meilisearch-plus] getContentTypeUid: Looking for "${contentType}"`);
    strapi.log.debug(`[meilisearch-plus] Available UIDs:`, contentTypeUids);

    // If it's already a UID, return it
    if (contentTypeUids.includes(contentType)) {
      strapi.log.debug(`[meilisearch-plus] Found as UID: ${contentType}`);
      return contentType;
    }

    // Try with api:: prefix (e.g., "post" -> "api::post.post")
    const withPrefix = `api::${contentType}.${contentType}`;

    if (contentTypeUids.includes(withPrefix)) {
      strapi.log.debug(`[meilisearch-plus] Found with prefix: ${withPrefix}`);
      return withPrefix;
    }

    // Otherwise search by model name
    const found = contentTypeUids.find((uid) => {
      const ctConfig = contentTypes[uid];
      const matches = ctConfig.modelName === contentType;
      if (matches) {
        strapi.log.debug(`[meilisearch-plus] Found by modelName match: ${uid}`);
      }
      return matches;
    });

    // Fallback: try to match by the last segment (e.g., 'post' in 'api::post.post')
    if (!found) {
      const fallback = contentTypeUids.find((uid) => uid.split('.').pop() === contentType);
      if (fallback) {
        strapi.log.debug(`[meilisearch-plus] Fallback match by last segment: ${fallback}`);
        return fallback;
      }
    }

    if (!found) {
      strapi.log.warn(
        `[meilisearch-plus] Could not find UID for "${contentType}". Available:`,
        contentTypeUids
      );
    }

    return found;
  },

  /**
   * Get the collection/model name from a content type UID or name
   */
  getCollectionName({ contentType }: { contentType: string }): string {
    const contentTypes = strapi.contentTypes;
    const contentTypeUids = Object.keys(contentTypes);

    if (contentTypeUids.includes(contentType)) {
      return contentTypes[contentType].modelName;
    }

    return contentType;
  },

  /**
   * Count published documents in a content type
   */
  async getDocumentCount({
    contentType,
    filters = {},
    status = 'published',
  }: {
    contentType: string;
    filters?: Record<string, any>;
    status?: string;
  }): Promise<number> {
    const contentTypeUid = this.getContentTypeUid({ contentType });

    if (!contentTypeUid) {
      const contentTypes = strapi.contentTypes;
      const availableUids = Object.keys(contentTypes);
      const apiContentTypes = availableUids.filter((uid) => uid.startsWith('api::'));

      strapi.log.warn(
        `[meilisearch-plus] Could not find UID for "${contentType}". Available API types:`,
        apiContentTypes
      );
      return 0;
    }

    try {
      const count = await strapi.documents(contentTypeUid).count({
        filters,
        status,
      });

      return count || 0;
    } catch (error) {
      strapi.log.warn(`[meilisearch-plus] getDocumentCount error for ${contentType}:`, error);
      return 0;
    }
  },

  /**
   * Count indexed documents in MeiliSearch for a content type
   */
  async getIndexedDocumentCount({
    contentType,
    indexName = null,
  }: {
    contentType: string;
    indexName?: string | null;
  }): Promise<number> {
    try {
      const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');
      const storeService = strapi.plugin('meilisearch-plus').service('store');

      const finalIndexName = indexName || (await storeService.getIndexName());

      if (!finalIndexName) {
        strapi.log.debug('[meilisearch-plus] No index name configured');
        return 0;
      }

      const client = await meilisearchService.initializeClient();
      if (!client) {
        return 0;
      }

      const index = client.index(finalIndexName);

      // Search using _contentType filter to count documents for this type
      const result = await index.search('', {
        filter: [`_contentType = "${contentType}"`],
        limit: 0,
      });

      return result.estimatedTotalHits || 0;
    } catch (error: any) {
      // Silently handle "Index not found" errors - this is expected when index hasn't been created yet
      if (error?.message?.includes('not found')) {
        strapi.log.debug(
          `[meilisearch-plus] Index not found for ${contentType} (this is normal on first setup)`
        );
        return 0;
      }
      strapi.log.warn(
        `[meilisearch-plus] getIndexedDocumentCount error for ${contentType}:`,
        error
      );
      return 0;
    }
  },

  /**
   * Get sync status for a content type
   * Returns: total, indexed, syncPercentage
   */
  async getSyncStatus({ contentType }: { contentType: string }): Promise<{
    total: number;
    indexed: number;
    syncPercentage: number;
    isSynced: boolean;
  }> {
    const total = await this.getDocumentCount({ contentType });
    const indexed = await this.getIndexedDocumentCount({ contentType });

    const syncPercentage = total === 0 ? 0 : Math.round((indexed / total) * 100);
    const isSynced = total === indexed && total > 0;

    return {
      total,
      indexed,
      syncPercentage,
      isSynced,
    };
  },

  /**
   * Get sync status for multiple content types
   */
  async getSyncStatusForMultiple({ contentTypes }: { contentTypes: string[] }): Promise<
    Record<
      string,
      {
        total: number;
        indexed: number;
        syncPercentage: number;
        isSynced: boolean;
      }
    >
  > {
    const results: Record<
      string,
      {
        total: number;
        indexed: number;
        syncPercentage: number;
        isSynced: boolean;
      }
    > = {};

    for (const contentType of contentTypes) {
      results[contentType] = await this.getSyncStatus({ contentType });
    }

    return results;
  },
});
