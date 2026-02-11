import { useEffect, useRef } from 'react';
import { pluginId } from '../utils/pluginId';

interface InitializerProps {
  setPlugin: (id: string) => void;
}

/**
 * Plugin initializer component
 * Registers the plugin with Strapi on initialization
 */
const Initializer: React.FC<InitializerProps> = ({ setPlugin }) => {
  const ref = useRef(setPlugin);

  useEffect(() => {
    ref.current(pluginId);
  }, []);

  return null;
};

export { Initializer };
