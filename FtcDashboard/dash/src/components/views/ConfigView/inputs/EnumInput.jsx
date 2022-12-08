import PropTypes from 'prop-types';

const EnumInput = ({ value, enumValues, onChange, onSave }) => (
  <span>
    <select
      className="valid mr-4 rounded py-0 transition dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200"
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
      className={`
      rounded border border-gray-200 bg-gray-100 px-2 transition
      dark:border-transparent dark:bg-blue-600 dark:text-blue-50 dark:highlight-blue-100/30 dark:hover:border-blue-400/80 dark:hover:shadow-md dark:hover:shadow-blue-200/20 dark:focus:bg-blue-700
    `}
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
