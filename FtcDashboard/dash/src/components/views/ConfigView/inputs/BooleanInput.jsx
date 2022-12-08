import PropTypes from 'prop-types';

const BooleanInput = ({ value, onChange, onSave }) => (
  <span className="flex items-center">
    <input
      className="mr-4 rounded transition dark:ring-offset-slate-100/40"
      type="checkbox"
      checked={value}
      onChange={(evt) =>
        onChange({
          value: evt.target.checked,
          valid: true,
        })
      }
    />
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

BooleanInput.propTypes = {
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default BooleanInput;
