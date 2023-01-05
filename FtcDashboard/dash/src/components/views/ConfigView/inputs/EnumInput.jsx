import PropTypes from 'prop-types';

const EnumInput = ({ value, enumValues, onChange, onSave }) => (
  <span>
    <select
      className={`
        valid focus: mr-4 rounded border border-gray-300
        bg-gray-100 py-0
        shadow-sm transition hover:border-gray-400 hover:shadow focus:border-primary-500 focus:shadow-primary-600 focus:ring-primary-600
        dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200
      `}
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
      dark:text-primary-50 rounded border border-gray-200 bg-gray-100 px-2
      transition hover:border-gray-400 hover:shadow focus:border-gray-500
      focus:bg-gray-300 dark:border-transparent dark:bg-primary-600 dark:highlight-primary-100/30 dark:hover:border-primary-400/80 dark:hover:shadow-md dark:hover:shadow-blue-200/20 dark:focus:bg-primary-700
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
