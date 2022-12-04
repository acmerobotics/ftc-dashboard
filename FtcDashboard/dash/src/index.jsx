import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import Dashboard from './components/Dashboard';
import configureStore from './store/configureStore';
import './index.css';

const store = configureStore();
const root = createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <Dashboard />
  </Provider>,
);
