import { Component, MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';

import BasicVariable from './BasicVariable';

import { ReactComponent as ExpandedMoreIcon } from '@/assets/icons/expand_more.svg';
import {
  ConfigVar,
  ConfigVarState,
  CustomVar,
  CustomVarState,
} from '@/store/types/config';

import { ReactComponent as CopySVG } from '@/assets/icons/copy.svg';
import { BaseViewIconButton } from '@/components/views/BaseView';

interface Props {
  name: string;
  path: string;
  state: CustomVarState;
  onChange: (state: CustomVarState) => void;
  onSave: (variable: CustomVar) => void;
}

interface State {
  expanded: boolean;
}

class CustomVariable extends Component<Props, State> {
  constructor(props: Props) {
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

  renderHelper(name: string, children: ReactNode) {
    const copyConfig = (evt: MouseEvent) => {
      evt.stopPropagation();

      const value = this.props.state.__value;
      if (value == null) return;

      const configStr = Object.entries(value)
        .sort()
        .map(([name, val]) => {
          if (val.__type === 'custom') return '';

          let str = 'public static ';

          if (val.__type === 'enum') {
            const enumClass = val.__enumClass.split('.').at(-1);
            str +=
              enumClass +
              ' ' +
              name +
              ' = ' +
              enumClass +
              '.' +
              val.__newValue +
              ';\n';
          } else {
            str += val.__type + ' ' + name + ' = ' + val.__newValue + ';\n';
          }

          return str;
        })
        .join('');

      if (window.isSecureContext) {
        navigator.clipboard.writeText(configStr);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = configStr;
        document.body.append(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error(err);
        }
        document.body.removeChild(textArea);
      }
      return;
    };

    return (
      <tr className="block">
        <td className="block">
          <div
            className="option-header flex cursor-pointer items-center py-1"
            onClick={this.toggleVisibility}
          >
            <div
              className={clsx(
                'flex-center mr-2 h-7 w-7 transform rounded-full border transition',
                'border-gray-200 bg-gray-100 hover:border-gray-400 hover:bg-gray-200',
                'dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200',
                !this.state.expanded && '-rotate-90',
              )}
            >
              <ExpandedMoreIcon className="h-6 w-6" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="select-none pr-1 text-lg">{name}</h3>
            </div>
            <BaseViewIconButton
              title="Copy Config to Clipboard"
              onClick={copyConfig}
              size={6}
            >
              <CopySVG className="h-6 w-6" />
            </BaseViewIconButton>
          </div>
          {this.state.expanded && (
            <table>
              <tbody>{children}</tbody>
            </table>
          )}
        </td>
      </tr>
    );
  }

  render() {
    const { name, path, state } = this.props;

    const value = state.__value;
    if (value === null) {
      return this.renderHelper(
        name,
        <tr>
          <td>null</td>
        </tr>,
      );
    }

    const sortedKeys = Object.keys(value);
    sortedKeys.sort();

    const children = sortedKeys.map((key) => {
      const onChange = (newState: ConfigVarState) => {
        this.props.onChange({
          __type: 'custom',
          __value: sortedKeys.reduce(
            (acc, key2) => ({
              ...acc,
              [key2]: key === key2 ? newState : value[key2],
            }),
            {},
          ),
        });
      };

      const onSave = (variable: ConfigVar) => {
        this.props.onSave({
          __type: 'custom',
          __value: {
            [key]: variable,
          },
        });
      };

      const child = value[key];
      if (child.__type === 'custom') {
        return (
          <CustomVariable
            key={key}
            name={key}
            path={`${path}.${key}`}
            state={child}
            onChange={onChange}
            onSave={onSave}
          />
        );
      }

      return (
        <BasicVariable
          key={key}
          name={key}
          path={`${path}.${key}`}
          state={child}
          onChange={onChange}
          onSave={onSave}
        />
      );
    });

    return this.renderHelper(name, children);
  }
}

export default CustomVariable;
