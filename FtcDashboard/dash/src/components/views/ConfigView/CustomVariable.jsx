import React from 'react';
import PropTypes from 'prop-types';

import BasicVariable from './BasicVariable';
import VariableType from '@/enums/VariableType';

import { ReactComponent as ExpandedMoreIcon } from '@/assets/icons/expand_more.svg';

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
            className="option-header cursor-pointer py-1"
            onClick={this.toggleVisibility}
          >
            <div
              className={`flex-center mr-2 h-7 w-7 transform rounded-full border border-gray-200 bg-gray-100 transition
                          hover:border-gray-400 hover:bg-gray-200 ${
                            this.state.expanded ? `` : '-rotate-90'
                          }`}
            >
              <ExpandedMoreIcon className="h-6 w-6" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="select-none text-lg">{name}</h3>
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
