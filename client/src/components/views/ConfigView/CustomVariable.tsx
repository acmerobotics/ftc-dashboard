import { Component, ReactNode, isValidElement } from 'react';
import clsx from 'clsx';

import BasicVariable from './BasicVariable';

import { ReactComponent as ExpandedMoreIcon } from '@/assets/icons/expand_more.svg';
import {
  BasicVarState,
  ConfigVar,
  ConfigVarState,
  CustomVar,
  CustomVarState,
} from '@/store/types/config';

import { ReactComponent as DownloadSVG } from '@/assets/icons/file_download.svg';

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
      const downloadConfig = () => {
    
        function downloadBlob(data: string, fileName: string, mime: string) {
          const a = document.createElement('a');
          a.style.display = 'none';
          document.body.appendChild(a);
    
          const blob = new Blob([data], { type: mime });
          const url = window.URL.createObjectURL(blob);
    
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        }

        if(children == null) return
        
        const reactNodeToString = (node: ReactNode, indent = 0): string => {
          // Handle null or undefined
          if (node == null) return 'null';
        
          // Handle strings, numbers, and other primitives
          if (typeof node !== 'object') return String(node);
        
          // Handle arrays (like from React.Children.toArray())
          if (Array.isArray(node)) {
            return node.map(child => reactNodeToString(child, indent + 2)).join('\n');
          }
        
          // Handle React elements
          if (isValidElement(node)) {
            const type = typeof node.type === 'string' ? node.type : node.type.name || 'Component';
            var varType = '';
            var varName = '';
            var varVal = '';
            Object.entries(node.props)
              .filter(([key]) => key !== 'children')
              .map(([key, value]) => {
                if(key == 'state'){
                  const val = value as BasicVarState;
                  varType = val['__type'];
                  const currVarVal = val['__value'];
                  const newVarVal = val['__newValue'];
                  if(currVarVal != newVarVal){
                    varVal = 'WARNING: YOU MAY NOT HAVE SAVED CONFIG VAR CHANGES IN DASHBOARD';
                  }
                  else{
                    varVal = newVarVal!.toString();
                  }
                }
                if(key == 'name'){
                  varName = value as string;
                }
              });
            
            return 'public static ' + varType + ' ' + varName + ' = ' + varVal + ';';
          }
        
          // Handle other objects
          return JSON.stringify(node);
        };
    
        downloadBlob(
          reactNodeToString(children),
          `${name}.csv`,
          'text/csv',
        );
      };

    return (
      <tr className="block">
        <td className="block">
          <div
            className="option-header cursor-pointer py-1"
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
              <h3 className="select-none text-lg">{name}</h3>
            </div>
            <div className="mr-3 flex items-center space-x-1">
            <button
              className={`icon-btn h-8 w-8`}
              onClick={downloadConfig}
            >
              <DownloadSVG className="h-6 w-6" />
            </button>
            </div>
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
