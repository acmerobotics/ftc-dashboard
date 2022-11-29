import PropTypes from 'prop-types';

const EnumInput = ({ value, enumValues, onChange, onSave }) => (
  <span>
    <select
      className="py-0 mr-4 rounded valid"
      value={value}
      onChange={(evt) =>
        onChange({
          value: evt.target.value,
          valid: true,
        })
      }
    >
      {enumValues.map((enumValue) => (
        <option key={enumValue} value={enumValue}>
          {enumValue}
        </option>
      ))}
    </select>
    <button
      className="px-2 bg-gray-100 border border-gray-200 rounded"
      onClick={onSave}
    >
      Save
    </button>
  </span>
);

EnumInput.propTypes = {
  value: PropTypes.string.isRequired,
  enumValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EnumInput;
