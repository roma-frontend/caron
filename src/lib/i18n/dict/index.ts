import type { DictModule } from '../types';
import { shell } from './shell';
import { adminProducts } from './adminProducts';
import { adminProductForm } from './adminProductForm';
import { adminOrders } from './adminOrders';
import { adminSettings } from './adminSettings';
import { adminCustomers } from './adminCustomers';
import { adminControl } from './adminControl';
import { adminCatalog } from './adminCatalog';
import { shopCheckout } from './shopCheckout';
import { shopProduct } from './shopProduct';
import { shopPages } from './shopPages';
import { authPages } from './authPages';
import { components } from './components';
import { adminComponents } from './adminComponents';
import { misc } from './misc';
import { storefrontExtra } from './storefrontExtra';

/**
 * Merged project translation dictionary. Each domain module owns a key prefix
 * (see the module files) so they can be edited independently without
 * collisions. Later spreads win on key conflicts.
 */
export const DICT: DictModule = {
  ...shell,
  ...adminProducts,
  ...adminProductForm,
  ...adminOrders,
  ...adminSettings,
  ...adminCustomers,
  ...adminControl,
  ...adminCatalog,
  ...shopCheckout,
  ...shopProduct,
  ...shopPages,
  ...authPages,
  ...components,
  ...adminComponents,
  ...misc,
  ...storefrontExtra,
};
