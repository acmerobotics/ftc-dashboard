import React from 'react';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import Heading from '../components/Heading';
import Icon from '../components/Icon';
import BasicOption from './BasicOption';
import OptionType from '../enums/OptionType';

class CustomOption extends React.Component {
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
    const { name, value, modifiedValue, schema } = this.props;

    const optionKeys = Object.keys(value)
      .filter((key) => key in schema)
      .sort();

    // TODO: hack to reverse sort PID coefficients
    if (isEqual(optionKeys, ['d', 'i', 'p'])) {
      optionKeys[0] = 'p';
      optionKeys[2] = 'd';
    }

    const options = optionKeys.map((key) => {
      const onChange = (value) => {
        this.props.onChange({
          ...modifiedValue,
          [key]: value
        });
      };

      const onSave = (value) => {
        this.props.onSave({
          [key]: value
        });
      };

      const type = OptionType.getFromSchema(schema[key]);

      if (type === OptionType.CUSTOM) {
        return (
          <CustomOption
            key={key}
            name={key}
            value={value[key]}
            modifiedValue={modifiedValue ? modifiedValue[key] : undefined}
            schema={schema[key]}
            onChange={onChange}
            onSave={onSave} />
        );
      }

      const modified = typeof modifiedValue !== 'undefined' && (key in modifiedValue);
      
      const optionValue = modified ? modifiedValue[key].value : value[key];
      const optionSchema = schema[key];

      const valid = modified ? modifiedValue[key].valid : true;

      return (
        <BasicOption
          key={key}
          name={key}
          value={optionValue}
          modified={modified}
          valid={valid}
          schema={optionSchema}
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

CustomOption.propTypes = {
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
  value: PropTypes.object.isRequired,
  modifiedValue: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default CustomOption;
