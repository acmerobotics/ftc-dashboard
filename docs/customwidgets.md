---
layout: default
---

# Custom Widgets

This tutorial will walk through the process of making a custom widget. Specifically, we'll try to replicate the functionality of the [FRC Dashboard Gyro Addon](https://github.com/FRCDashboard/addon-Gyro). It's really just a simple SVG graphic that rotates depending on the robot's current heading (this degree value is sent in telemetry under the key `"heading"`).

This article presumes some knowledge of [React](https://reactjs.org/) (and tangentially [Redux](https://redux.js.org/)).

## Writing the Component

All widgets on the client-side are represented as React components. In accordance with React/Redux best practices, components are separated into Redux-dependent containers (stored in `/dash/src/containers`) and presentational components (stored in `/dash/src/components`). For more information, check out the [React/Redux docs](https://redux.js.org/basics/usage-with-react#presentational-and-container-components).

Since widgets all depend on Redux data, we'll store the corresponding component in `/dash/src/containers/GyroView.jsx`. Let's begin with some standard imports:

```jsx
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
```

As this is a relatively simple component, we'll use the function syntax for declaring components:

{% raw %}

```jsx
const GyroView = ({ telemetry }) => {
    const svgStyle = {
        width: '170px',
        height: '170px',
        border: 'solid 2px black',
        borderRadius: '50%'
    };

    return (
        <div style={{ height: '100%' }}>
            <Heading level={2} text="Gyro" />
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 'calc(100% - 25px)'
            }}>
            <svg style={svgStyle}>
                <circle cx="85" cy="85" r="50" />
                <rect style={{
                    transform: `rotate(${telemetry.data.heading}deg)`,
                    transformOrigin: 'center'
                }} x="80" y="0" width="10" height="85" fill="black" />
                <text x="85" y="90" textAnchor="middle" fill="white">
                    {telemetry.data.heading}º
                </text>
            </svg>
            </div>
        </div>
    );
};
```

{% endraw %}

Finally, the rest of the components just declares prop types and a dependence on global telemetry:

```jsx
GyroView.propTypes = {
    telemetry: PropTypes.shape({
        data: PropTypes.object.isRequired,
    }).isRequired
};

const mapStateToProps = ({ telemetry }) => ({
    telemetry
});

export default connect(mapStateToProps)(GyroView);
```

## Using the Component

To use the component, add `import GyroView from './GyroView';` to the top of `/dash/src/containers/Dashboard.jsx` and replace the desired component in `render()` (it depends on where you want it to be located; you can also add more cells to the grid).