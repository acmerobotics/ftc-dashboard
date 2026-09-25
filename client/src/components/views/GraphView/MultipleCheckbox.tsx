import { useId } from 'react';

type MultipleCheckboxProps = {
  arr: string[];
  // fully controlled: the order of `selected` is preserved, and newly checked
  // values are appended, so the caller stays in charge of the ordering
  selected: string[];
  exclude?: string[];
  onChange: (selected: string[]) => void;
};

const MultipleCheckbox = ({
  arr,
  selected,
  exclude,
  onChange,
}: MultipleCheckboxProps) => {
  const id = useId();

  const handleChange = (val: string, checked: boolean) =>
    onChange(
      checked
        ? [...selected.filter((el) => el !== val), val]
        : selected.filter((el) => el !== val),
    );

  return (
    <table className="overflow-y-scroll">
      <tbody>
        {arr
          .filter((val) => !exclude || exclude.indexOf(val) === -1)
          .map((val) => (
            <tr key={val}>
              <td>
                <input
                  id={`multiple-checkbox-${id}-${val}`}
                  className="rounded text-primary-600 transition hover:border-gray-900 hover:shadow focus:ring-primary-600 dark:ring-offset-slate-100/40"
                  type="checkbox"
                  onChange={(evt) => handleChange(val, evt.target.checked)}
                  checked={selected.indexOf(val) !== -1}
                />
              </td>
              <td>
                <label htmlFor={`multiple-checkbox-${id}-${val}`}>{val}</label>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};

export default MultipleCheckbox;
