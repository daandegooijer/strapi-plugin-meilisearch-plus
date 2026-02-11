import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';

/**
 * Hook for internationalization
 * Provides i18n function to translate messages
 */
export function useI18n() {
  const intl = useIntl();

  const i18n = useCallback(
    (key: string, defaultMessage: string): string => {
      try {
        return intl.formatMessage({ id: key, defaultMessage });
      } catch (e) {
        return defaultMessage;
      }
    },
    [intl]
  );

  return useMemo(() => ({ i18n }), [i18n]);
}
