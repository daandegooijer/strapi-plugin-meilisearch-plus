import { pluginId } from './utils/pluginId';
import { Initializer } from './components/Initializer';
import PluginIcon from './components/PluginIcon';

/**
 * MeiliSearch Plus Admin Plugin
 * Provides UI for managing MeiliSearch credentials, indexing, and search
 */
export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'MeiliSearch Plus',
      },
      Component: async () => {
        const { default: HomePage } = await import('./pages/HomePage');
        return HomePage;
      },
    });

    // Register settings section
    app.createSettingSection(
      {
        id: pluginId,
        intlLabel: {
          id: `${pluginId}.settings.title`,
          defaultMessage: 'MeiliSearch Plus',
        },
      },
      [
        {
          intlLabel: {
            id: `${pluginId}.settings.credentials`,
            defaultMessage: 'Credentials',
          },
          id: 'credentials',
          to: `/settings/${pluginId}/credentials`,
          Component: async () => {
            const { default: CredentialsTab } = await import('./containers/CredentialsTab');
            return CredentialsTab;
          },
          permissions: [],
        },
        {
          intlLabel: {
            id: `${pluginId}.settings.index`,
            defaultMessage: 'Index Settings',
          },
          id: 'index-settings',
          to: `/settings/${pluginId}/index-settings`,
          Component: async () => {
            const { default: IndexSettingsTab } = await import('./containers/IndexSettingsTab');
            return IndexSettingsTab;
          },
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name: pluginId,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const data = await import(`./translations/${locale}.json`);
          return { data: data.default, locale };
        } catch (error) {
          return { data: {}, locale };
        }
      })
    );
  },
};
