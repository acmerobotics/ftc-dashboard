import React from 'react';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
import Icon from '../components/Icon';
import BasicVariable from './BasicVariable';
import VariableType from '../enums/VariableType';

class CustomVariable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: false
    };

    this.toggleVisibility = this.toggleVisibility.bind(this);
  }

  toggleVisibility() {
    this.setState({
      expanded: !this.state.expanded
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
            [key]: newValue
          }
        });
      };

      const onSave = (newValue) => {
        this.props.onSave({
          __type: VariableType.CUSTOM,
          __value: {
            [key]: newValue
          }
        });
      };

      if (child.__type === VariableType.CUSTOM) {
        return (
          <CustomVariable
            key={key}
            name={key}
            value={child.__value}
            onChange={onChange}
            onSave={onSave} />
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
          onSave={onSave} />
      );
    });

    return (
      <tr>
        <td>
          <div className="option-header">
            <Icon icon={ this.state.expanded ? 'expand-less' : 'expand-more' } size="tiny" onClick={this.toggleVisibility} />
            <Heading text={name} level={3} />
          </div>
          {
            this.state.expanded ?
              (
                <table>
                  <tbody>{options}</tbody>
                </table>
              )
              : null
          }
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
