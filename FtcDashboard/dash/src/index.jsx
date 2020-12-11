import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Dashboard from './containers/Dashboard.jsx';
import configureStore from './configureStore.js';
import './index.css';

const store = configureStore();

ReactDOM.render(
  <Provider store={store}>
    <Dashboard />
  </Provider>,
  document.getElementById('root'),
);
