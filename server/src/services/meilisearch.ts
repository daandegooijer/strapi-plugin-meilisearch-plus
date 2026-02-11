/**
 * Main MeiliSearch service for indexing and searching documents
 */
export default ({ strapi }) => ({
  async initializeClient() {
    const storeService = strapi.plugin('meilisearch-plus').service('store');
    const clientService = strapi.plugin('meilisearch-plus').service('meilisearch-client');

    const credentials = await storeService.getCredentials();
    const client = clientService.createClient(credentials);

    if (!client) {
      strapi.log.warn('[meilisearch-plus] No MeiliSearch client available');
      return null;
    }

    const isHealthy = await clientService.testConnection(client);
    if (!isHealthy) {
      return null;
    }

    return client;
  },

  // Batch size for MeiliSearch operations
  BATCH_SIZE: 1000,

  /**
   * Index a single document in MeiliSearch
   */
  async indexDocument({
    contentType,
    document,
  }: {
    contentType: string;
    document: any;
  }): Promise<void> {
    if (!document) return;

    const client = await this.initializeClient();
    if (!client) return;

    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');
      const finalIndexName = await storeService.getIndexName();

      if (!finalIndexName) {
        strapi.log.warn('[meilisearch-plus] No index name configured');
        return;
      }

      // Get the full UID for content type
      const contentTypeUid = contentTypeService.getContentTypeUid({ contentType });
      if (!contentTypeUid) {
        strapi.log.error(`[meilisearch-plus] Invalid content type: ${contentType}`);
        return;
      }

      // Fetch the complete published document from database
      const fullDocument = await strapi.documents(contentTypeUid).findOne({
        documentId: document.documentId || document.id,
        status: 'published',
      });

      if (!fullDocument) {
        strapi.log.debug(
          `[meilisearch-plus] Document not found or not published: ${document.documentId || document.id}`
        );
        return;
      }

      // Sanitize and transform
      const sanitized = await this.sanitizeEntries({
        contentType,
        entries: [fullDocument],
      });

      if (sanitized.length === 0) return;

      // Index the document
      const index = client.index(finalIndexName);
      const response = await index.addDocuments(sanitized, { primaryKey: 'id' });

      strapi.log.debug(
        `[meilisearch-plus] Indexed document ${document.documentId || document.id} for ${contentType} (Task uid: ${response.taskUid})`
      );
    } catch (error) {
      strapi.log.error(`[meilisearch-plus] Failed to index document for ${contentType}:`, error);
    }
  },

  /**
   * Sanitize and transform entries for MeiliSearch
   */
  async sanitizeEntries({
    contentType,
    entries,
  }: {
    contentType: string;
    entries: any[];
  }): Promise<any[]> {
    if (!Array.isArray(entries) || entries.length === 0) {
      return entries;
    }

    const configService = strapi.plugin('meilisearch-plus').service('config');

    // Apply filterEntry from plugin config
    let filtered = await configService.filterEntries({
      contentType,
      entries,
    });

    // Apply transformEntry from plugin config
    let transformed = await configService.transformEntries({
      contentType,
      entries: filtered,
    });

    // Add _contentType, documentId (primary key for Strapi v5), and locale
    return transformed.map((entry) => ({
      _contentType: contentType,
      id: entry.documentId || entry.id, // Strapi v5 uses documentId as primary key
      documentId: entry.documentId || entry.id,
      locale: entry.locale || 'en',
      ...entry,
    }));
  },

  /**
   * Add all entries for a content type to MeiliSearch (full reindex)
   */
  async addContentTypeInMeiliSearch({ contentType }: { contentType: string }) {
    const client = await this.initializeClient();
    if (!client) return [];
    const storeService = strapi.plugin('meilisearch-plus').service('store');
    const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');
    const finalIndexName = await storeService.getIndexName();
    if (!finalIndexName) {
      strapi.log.warn('[meilisearch-plus] No index name configured');
      return [];
    }
    const index = client.index(finalIndexName);
    // Get UID for content type
    const contentTypeUid = contentTypeService.getContentTypeUid({ contentType });
    if (!contentTypeUid) {
      const availableUids = Object.keys(strapi.contentTypes);
      strapi.log.error(
        `[meilisearch-plus] Invalid content type: ${contentType}. Available UIDs: ${availableUids.join(', ')}`
      );
      throw new Error(`[meilisearch-plus] Invalid content type: ${contentType}`);
    }
    // Fetch only published entries for this content type (Strapi v5)
    const documents = await strapi
      .documents(contentTypeUid)
      .findMany({ limit: -1, status: 'published' });
    if (!documents || documents.length === 0) {
      strapi.log.info(`[meilisearch-plus] No documents found for ${contentType}`);
      return [];
    }
    // Sanitize
    const sanitized = await this.sanitizeEntries({ contentType, entries: documents });
    // Batch add
    let taskUids: any[] = [];
    for (let i = 0; i < sanitized.length; i += this.BATCH_SIZE) {
      const batch = sanitized.slice(i, i + this.BATCH_SIZE);
      const response = await index.addDocuments(batch, { primaryKey: 'id' });
      strapi.log.info(
        `[meilisearch-plus] Added batch of ${batch.length} documents for ${contentType} (Task uid: ${response.taskUid})`
      );
      taskUids.push(response.taskUid);
    }

    // Wait for all indexing tasks to complete before returning
    if (taskUids.length > 0) {
      try {
        // Wait for each task individually to ensure all are complete
        for (const taskUid of taskUids) {
          await client.waitForTask(taskUid);
        }
        strapi.log.debug(`[meilisearch-plus] All indexing tasks completed for ${contentType}`);
      } catch (error) {
        strapi.log.warn(`[meilisearch-plus] Error waiting for indexing tasks:`, error);
      }
    }

    await storeService.addIndexedContentType(contentType);
    // Optionally subscribe to lifecycle events here
    return taskUids;
  },

  /**
   * Remove all documents for a content type from MeiliSearch
   * Handles pagination in case there are more documents than the search limit
   */
  async emptyOrDeleteIndex({ contentType }: { contentType: string }) {
    const client = await this.initializeClient();
    if (!client) return;
    const storeService = strapi.plugin('meilisearch-plus').service('store');
    const finalIndexName = await storeService.getIndexName();
    if (!finalIndexName) {
      strapi.log.warn('[meilisearch-plus] No index name configured');
      return;
    }
    const index = client.index(finalIndexName);

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      // Always search from offset 0 since we delete as we go
      const searchResult = await index.search('', {
        filter: [`_contentType = "${contentType}"`],
        limit: 100000,
        offset: 0,
      });

      const ids = searchResult.hits.map((hit: any) => hit.id);

      if (ids.length > 0) {
        const response = await index.deleteDocuments(ids);
        // Wait for deletion task to complete
        await client.waitForTask(response.taskUid);
        totalDeleted += ids.length;
        strapi.log.debug(
          `[meilisearch-plus] Batch deleted ${ids.length} documents for ${contentType}`
        );
      }

      // Check if there are more documents to delete
      hasMore = searchResult.estimatedTotalHits > 0;
    }

    if (totalDeleted > 0) {
      strapi.log.info(
        `[meilisearch-plus] Total deleted: ${totalDeleted} documents for ${contentType}`
      );
    } else {
      strapi.log.info(`[meilisearch-plus] No documents found to delete for ${contentType}`);
    }

    await storeService.removeIndexedContentType(contentType);
    // Optionally unsubscribe from lifecycle events here
  },

  /**
   * Update (reindex) all entries for a content type
   */
  async updateContentTypeInMeiliSearch({ contentType }: { contentType: string }) {
    // Remove all docs for this type, then re-add
    await this.emptyOrDeleteIndex({ contentType });
    return this.addContentTypeInMeiliSearch({ contentType });
  },

  async deleteDocument({ contentType, documentId, indexName = null }: any) {
    const client = await this.initializeClient();
    if (!client) return;

    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const finalIndexName = indexName || (await storeService.getIndexName());

      if (!finalIndexName) {
        strapi.log.warn('[meilisearch-plus] No index name configured');
        return;
      }

      const index = client.index(finalIndexName);
      await index.deleteDocument(documentId);
      strapi.log.debug(`[meilisearch-plus] Deleted document ${documentId} from ${finalIndexName}`);
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to delete document:', error);
    }
  },

  async deleteAllDocuments({ contentType, indexName = null }: any) {
    const client = await this.initializeClient();
    if (!client) return;

    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const finalIndexName = indexName || (await storeService.getIndexName());

      if (!finalIndexName) {
        strapi.log.warn('[meilisearch-plus] No index name configured');
        return;
      }

      const index = client.index(finalIndexName);
      if (contentType) {
        // Only delete documents for the specified content type
        const searchResult = await index.search('', {
          filter: [`_contentType = "${contentType}"`],
          limit: 100000, // Increased to handle larger datasets
        });
        const ids = searchResult.hits.map((hit: any) => hit.id);
        if (ids.length > 0) {
          const response = await index.deleteDocuments(ids);
          // Wait for deletion task to complete
          await client.waitForTask(response.taskUid);
          strapi.log.info(`[meilisearch-plus] Deleted ${ids.length} documents for ${contentType}`);
        } else {
          strapi.log.info(`[meilisearch-plus] No documents found for ${contentType} to delete.`);
        }
      } else {
        // If no contentType specified, delete all documents (fallback)
        const response = await index.deleteAllDocuments();
        await client.waitForTask(response.taskUid);
        strapi.log.info(`[meilisearch-plus] Deleted all documents in index`);
      }
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to delete all documents:', error);
    }
  },

  async search({ query, indexName = null, filters = null, limit = 10, offset = 0 }: any) {
    const client = await this.initializeClient();
    if (!client) return null;

    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const finalIndexName = indexName || (await storeService.getIndexName());

      if (!finalIndexName) {
        strapi.log.warn('[meilisearch-plus] No index name configured');
        return null;
      }

      const index = client.index(finalIndexName);
      const results = await index.search(query, {
        filter: filters,
        limit,
        offset,
      });

      return results;
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Search failed:', error);
      return null;
    }
  },

  async getIndexSettings({ indexName = null }: any) {
    const client = await this.initializeClient();
    if (!client) return null;

    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const finalIndexName = indexName || (await storeService.getIndexName());

      if (!finalIndexName) {
        return null;
      }

      const index = client.index(finalIndexName);
      const settings = await index.getSettings();
      return settings;
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get index settings:', error);
      return null;
    }
  },

  async updateIndexSettings({ indexName = null, settings }: any) {
    const client = await this.initializeClient();
    if (!client) return false;

    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const finalIndexName = indexName || (await storeService.getIndexName());

      if (!finalIndexName) {
        return false;
      }

      const index = client.index(finalIndexName);
      await index.updateSettings(settings);
      strapi.log.info(`[meilisearch-plus] Updated settings for index ${finalIndexName}`);
      return true;
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to update index settings:', error);
      return false;
    }
  },

  async ensureContentTypeFilterable({ indexName = null }: any) {
    const client = await this.initializeClient();
    if (!client) return false;

    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const finalIndexName = indexName || (await storeService.getIndexName());
      if (!finalIndexName) return false;
      const index = client.index(finalIndexName);
      const settings = await index.getSettings();
      const filterable = settings.filterableAttributes || [];
      if (!filterable.includes('_contentType')) {
        filterable.push('_contentType');
        await index.updateSettings({ filterableAttributes: filterable });
        strapi.log.info(
          `[meilisearch-plus] Added _contentType to filterableAttributes for index ${finalIndexName}`
        );
      }
      return true;
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to ensure _contentType is filterable:', error);
      return false;
    }
  },

  async syncIndexedCollections() {
    // Validate that indexed content types actually have documents in MeiliSearch
    // and remove from store if no documents found
    const storeService = strapi.plugin('meilisearch-plus').service('store');
    const client = await this.initializeClient();

    if (!client) {
      strapi.log.debug('[meilisearch-plus] No MeiliSearch client available for sync');
      return;
    }

    try {
      const indexName = await storeService.getIndexName();
      if (!indexName) {
        strapi.log.debug('[meilisearch-plus] No index name configured for sync');
        return;
      }

      const indexedContentTypes = await storeService.getIndexedContentTypes();
      if (!indexedContentTypes || indexedContentTypes.length === 0) {
        return;
      }

      const index = client.index(indexName);

      for (const contentType of indexedContentTypes) {
        try {
          // Search for documents with this content type using _contentType filter
          const searchResult = await index.search('', {
            filter: [`_contentType = "${contentType}"`],
            limit: 0,
          });

          if (searchResult.estimatedTotalHits === 0) {
            strapi.log.debug(
              `[meilisearch-plus] No documents found for ${contentType}, removing from indexed list`
            );
            await storeService.removeIndexedContentType(contentType);
          }
        } catch (e) {
          strapi.log.debug(
            `[meilisearch-plus] Could not search for ${contentType} during sync: ${(e as Error).message}`
          );
          // Don't remove if we can't verify
          continue;
        }
      }

      strapi.log.info('[meilisearch-plus] Synced indexed collections');
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to sync indexed collections:', error);
    }
  },
});
