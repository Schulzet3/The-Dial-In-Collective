// main.js already starts exactly one CloudApp. Install its import extension
// synchronously before authentication's first asynchronous response completes.
import {CloudApp} from './main.js';
import {installNativeImport} from './import-integration.js';
installNativeImport(CloudApp);
