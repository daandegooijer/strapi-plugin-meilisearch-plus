# MeiliSearch Plus Plugin

A comprehensive MeiliSearch integration plugin for Strapi v5 that enables full-text search capabilities for your content.

### Features

#### Server-Side

- **Credential Management**: Securely store MeiliSearch host and API key
- **Automatic Indexing**: Automatically index documents on create, update, and delete
- **Published Documents Only**: Only published documents are indexed (draft documents are excluded)
- **Content Type Management**: Choose which content types to index
- **Manual Indexing**: Trigger reindexing of specific content types without affecting others
- **Safe Reindex**: Reindex operations only affect the specified content type
- **Search API**: Full-text search with filters, pagination, and sorting
- **Connection Testing**: Verify MeiliSearch connection before operations
- **Index Status**: Monitor index health and sync status with display names
- **Content Type Display Names**: Full content type metadata with human-readable names
- **Custom Entry Transformation**: Apply `transformEntry` and `filterEntry` functions from plugin config for custom data processing before indexing
- **Per-Application Logic**: Override and customize entry data per content type/application in plugins.ts

### Admin API Routes

#### Credentials Management

- `GET /meilisearch-plus/credentials` - Get current credentials
- `POST /meilisearch-plus/credentials` - Set credentials (host, apiKey, indexName)
- `GET /meilisearch-plus/test-connection` - Test MeiliSearch connection

#### Search Operations

- `POST /meilisearch-plus/search` - Execute search query
  - Body: `{ query, filters?, limit?, offset? }`
- `GET /meilisearch-plus/index-status` - Get index status and statistics

#### Content Type Management

- `GET /meilisearch-plus/sync-status/all` - Get all configured content types with sync status
  - Returns: `{ contentType, displayName, isIndexed, total, indexed, syncPercentage, isSynced }`
- `GET /meilisearch-plus/indexed-content-types` - List indexed content types
- `POST /meilisearch-plus/indexed-content-types` - Add content type to index
  - Body: `{ contentType }`
- `DELETE /meilisearch-plus/indexed-content-types` - Remove content type from index and MeiliSearch

#### Manual Indexing

- `POST /meilisearch-plus/reindex` - Reindex documents for a specific content type
  - Body: `{ contentType }` - Only reindexes the specified content type
- `POST /meilisearch-plus/clear-index` - Clear indexed documents for a content type
  - Body: `{ contentType }` - Only clears the specified content type

### Content API Routes (Public)

- `POST /api/plugins/meilisearch-plus/search` - Public search endpoint
  - Body: `{ query, filters?, limit?, offset? }`

## Architecture

### Services

#### `meilisearch-client.ts`

Factory service for creating and managing MeiliSearch client instances.

- `createClient(credentials)` - Create authenticated client
- `testConnection(client)` - Verify connection health
- `getIndexUids(client)` - List all indexes
- `createIndex(client, indexName)` - Create new index
- `deleteIndex(client, indexName)` - Delete index

#### `store.ts`

Persistent storage for credentials and configuration using Strapi's store API.

- `getCredentials()` / `setCredentials()`
- `getApiKey()` / `setApiKey()`
- `getHost()` / `setHost()`
- `getIndexName()` / `setIndexName()`
- `getIndexedContentTypes()` / `setIndexedContentTypes()`
- `addIndexedContentType()` / `removeIndexedContentType()`

#### `meilisearch.ts`

Core indexing and search service.

- `indexDocument()` - Index single document
- `indexDocuments()` - Bulk index documents
- `deleteDocument()` - Remove document from index
- `deleteAllDocuments()` - Clear all documents
- `search()` - Search with filters and pagination
- `getIndexSettings()` / `updateIndexSettings()`

#### `lifecycle.ts`

Lifecycle hook subscriptions for automatic indexing.

- `subscribeContentType(contentType)` - Listen to create/update/delete events
- `unsubscribeContentType(contentType)` - Stop listening (metadata only)

### Controllers

#### `credentials.ts`

Admin endpoints for managing MeiliSearch credentials and connections.

#### `search.ts`

Search functionality with index status monitoring.

#### `content-types.ts`

Manage which content types are indexed.

#### `indexing.ts`

Manual indexing operations (reindex, clear).

## Admin Panel

The plugin provides a dedicated admin interface in the Strapi Settings menu with two sections:

### Settings Page

Access the plugin settings at **Settings > MeiliSearch Plus**:

#### Credentials Tab

Configure MeiliSearch connection details:

- **MeiliSearch URL** - The URL where MeiliSearch is running (e.g., `http://localhost:7700`)
- **API Key** - API key with permission to create indexes (master key recommended)
- **Index Name** - Name of the MeiliSearch index to use for this installation

Features:

- Test connection button to verify credentials
- Security warning about API key exposure
- Save configuration

#### Index Settings Tab

Configure which fields are searchable and sortable per content type:

- **Max Total Hits** - Maximum number of documents returned by MeiliSearch (default: 1000)
- **Filterable Attributes** - Select which fields can be used as filters in search queries
- **Sortable Attributes** - Select which fields can be sorted in search results
- **Mandatory Field**: `_contentType` is always included (required for document categorization)
- Organize by content type using tabbed interface
- Human-readable field names (converted from snake_case)

### Collections Tab

Monitor indexed content types in the main plugin view:

- View all configured content types with display names
- Check indexing status (complete/in-progress)
- See database count vs indexed documents
- Toggle content types on/off for indexing
- Update index (sync without full rebuild)
- Reindex individual content types (only affects the selected type)
- See hooks status (automatic sync enabled/disabled)

## Configuration

The plugin is enabled by default in `apps/cms/config/plugins.ts`:

```typescript
'meilisearch-plus': {
  enabled: true,
  resolve: './src/plugins/meilisearch-plus',
},
```

## Environment Variables

Set these in your `.env` file:

```
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-api-key
MEILISEARCH_INDEX_NAME=your-index-name
```

## Custom Entry Transformation

The plugin supports custom data processing through `transformEntry` and `filterEntry` functions in the plugin config, allowing you to apply application-specific logic before indexing.

### transformEntry

Apply custom transformations to entries before indexing. Useful for:
- Flattening nested data structures
- Enriching entries with computed fields
- Extracting specific fields for search
- Custom data formatting

```typescript
'meilisearch-plus': {
  page: {
    indexName: env('MEILISEARCH_INDEX_NAME'),
    entriesQuery: { locale: 'all' },
    async transformEntry({ entry, contentType }) {
      // Transform entry before indexing
      return {
        ...entry,
        // Add custom computed fields
        title: entry.title?.toUpperCase(),
        // Flatten hero image
        heroImage: entry.hero?.[0]?.image?.url,
        // Format dates
        publishedDate: entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString() : null,
      };
    },
  },
  job: {
    indexName: env('MEILISEARCH_INDEX_NAME'),
    entriesQuery: { locale: 'all' },
    async transformEntry({ entry, contentType }) {
      return await transform(entry, 'api::job.job');
    },
  },
}
```

### filterEntry

Filter out entries that shouldn't be indexed. Useful for:
- Excluding entries with certain conditions
- Filtering by custom field values
- Permission-based filtering

```typescript
'meilisearch-plus': {
  page: {
    indexName: env('MEILISEARCH_INDEX_NAME'),
    entriesQuery: { locale: 'all' },
    async filterEntry({ entry, contentType }) {
      // Only index pages that are marked as searchable
      return entry.isSearchable === true;
    },
    async transformEntry({ entry, contentType }) {
      return entry;
    },
  },
}
```

## UID Mapping and Content Type Handling

Content types are configured using short names in the plugin config (e.g., `page`, `job`) and are mapped to full UIDs:

```typescript
// Config uses short names
'meilisearch-plus': {
  page: { /* config */},
  job: { /* config */},
}

// Internally mapped to full UIDs
api::page.page
api::job.job
```

The `/sync-status/all` endpoint returns:

```json
{
  "contentType": "api::page.page",
  "displayName": "Pagina",
  "isIndexed": true,
  "total": 18,
  "indexed": 18,
  "syncPercentage": 100,
  "isSynced": true
}
```

## Key Implementation Details

### Content Type Identification

The plugin uses full content type UIDs throughout the application (e.g., `api::page.page`):

- UIDs are mapped from plugin configuration short names
- Display names are fetched from Strapi content type schema
- All API responses include both UID and displayName for clarity

### Document Indexing

- **Status Filter**: Only `published` documents are indexed (draft documents are excluded)
- **Content Type Field**: The `_contentType` field is automatically added to all documents for categorization
- **Batch Processing**: Documents are indexed in batches of 1000
- **Safe Deletion**: When toggling off a content type, all its documents are removed from MeiliSearch

### Reindex Operations

- **Content Type Scoped**: Reindex and clear operations only affect the specified content type
- **No Cross-Type Interference**: Toggling or reindexing one type doesn't affect others
- **Full Rebuild**: Reindex performs a complete delete and re-add cycle for the specific type

### Attribute Settings

- **Mandatory Fields**: `_contentType` is always included in filterable and sortable attributes (required for document lookup)
- **Field Name Formatting**: Field names are converted to human-readable format in the UI (e.g., `publishedAt` → "Published At")
- **Per-Content-Type Config**: Settings are merged across content types to create a unified index configuration

### Database & Storage

The plugin uses Strapi's store API to persist:

- MeiliSearch credentials (host, API key, index name)
- Indexed content types list
- Index settings (filterable/sortable attributes, max total hits)
- Lifecycle subscriptions for automatic indexing

## Error Handling

All services include comprehensive error handling with logging:

- Connection errors are logged but don't block startup
- Document indexing failures are logged but don't break transactions
- Missing credentials/index names are handled gracefully
- All operations have timeout protection
- Reindex and clear operations safely handle already-deleted documents

## Type Safety

The plugin is fully written in TypeScript with:

- Strict type checking
- Comprehensive JSDoc comments
- Service interfaces for IDE autocompletion
