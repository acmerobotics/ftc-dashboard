import React from 'react';
import PropTypes from 'prop-types';

import BasicVariable from './BasicVariable';
import VariableType from '../enums/VariableType';

import { ReactComponent as ExpandedMoreIcon } from '../assets/icons/expand_more.svg';

class CustomVariable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: false,
    };

    this.toggleVisibility = this.toggleVisibility.bind(this);
  }

  toggleVisibility() {
    this.setState({
      expanded: !this.state.expanded,
    });
  }

  render() {
    const { name, value } = this.props;

    const sortedKeys = Object.keys(value);

    sortedKeys.sort();

    const options = sortedKeys.map((key) => {
      const child = value[key];

      const onChange = (newValue) => {
        this.props.onChange({
          __type: VariableType.CUSTOM,
          __value: {
            [key]: newValue,
          },
        });
      };

      const onSave = (newValue) => {
        this.props.onSave({
          __type: VariableType.CUSTOM,
          __value: {
            [key]: newValue,
          },
        });
      };

      if (child.__type === VariableType.CUSTOM) {
        return (
          <CustomVariable
            key={key}
            name={key}
            value={child.__value}
            onChange={onChange}
            onSave={onSave}
          />
        );
      }

      return (
        <BasicVariable
          key={key}
          type={child.__type}
          name={key}
          value={child.__newValue}
          valid={child.__valid}
          enumClass={child.__enumClass}
          enumValues={child.__enumValues}
          modified={child.__modified}
          onChange={onChange}
          onSave={onSave}
        />
      );
    });

    return (
      <tr>
        <td>
          <div
            className="option-header py-1 cursor-pointer"
            onClick={this.toggleVisibility}
          >
            <div
              className={`w-7 h-7 mr-2 bg-gray-100 flex-center rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-200
                          transition transform ${
                            this.state.expanded ? `` : '-rotate-90'
                          }`}
            >
              <ExpandedMoreIcon className="w-6 h-6" />
            </div>
            <div className="flex justify-between items-center">
              <h3 className="text-lg select-none">{name}</h3>
            </div>
          </div>
          {this.state.expanded && (
            <table>
              <tbody>{options}</tbody>
            </table>
          )}
        </td>
      </tr>
    );
  }
}

CustomVariable.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default CustomVariable;
