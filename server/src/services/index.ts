import meilisearchClient from './meilisearch-client';
import meilisearch from './meilisearch';
import store from './store';
import lifecycle from './lifecycle';
import contentTypes from './content-types';
import config from './config';

export default {
  'meilisearch-client': meilisearchClient,
  meilisearch,
  store,
  lifecycle,
  'content-types': contentTypes,
  config,
};
