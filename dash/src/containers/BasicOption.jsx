import React from 'react';
import PropTypes from 'prop-types';
import BooleanInput from '../components/inputs/BooleanInput';
import EnumInput from '../components/inputs/EnumInput';
import StringInput from '../components/inputs/StringInput';
import IntInput from '../components/inputs/IntInput';
import DoubleInput from '../components/inputs/DoubleInput';
import OptionType from '../enums/OptionType';

class BasicOption extends React.Component {
  render() {
    const { name, value, schema } = this.props;

    const type = OptionType.getFromSchema(schema);

    let input;

    switch (type) {
    case OptionType.INT:
      input = <IntInput value={value} onChange={this.props.onChange} />;
      break;
    case OptionType.DOUBLE:
      input = <DoubleInput value={value} onChange={this.props.onChange} />;
      break;
    case OptionType.STRING:
      input = <StringInput value={value} onChange={this.props.onChange} />;
      break;
    case OptionType.BOOLEAN:
      input = <BooleanInput value={value} onChange={this.props.onChange} />;
      break;
    case OptionType.ENUM:
      input = <EnumInput value={value} values={schema.values} onChange={this.props.onChange} />;
      break;
    default:
      input = <p>Unknown option type: {type}</p>;
    }

    return (
      <tr>
        <td>{name}</td>
        <td>{input}</td>
      </tr>
    );
  }
}

BasicOption.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
  schema: PropTypes.any.isRequired,
  onChange: PropTypes.func.isRequired
};

export default BasicOption;
