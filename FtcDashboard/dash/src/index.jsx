import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import configureStore from './store/configureStore';

import './index.css';
import App from './components/App';

const store = configureStore();
const root = createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
  </Provider>,
);
