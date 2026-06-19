/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import AutofillRoot from './src/autofill/AutofillRoot';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
// Second surface, rendered by the native VaultAutofillActivity.
AppRegistry.registerComponent('vaultAutofill', () => AutofillRoot);
