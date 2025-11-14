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

// Static map to track expansion states across component instances
const expansionStates = new Map<string, boolean>();

interface Props {
  name: string;
  path: string;
  state: CustomVarState;
  baseline: ConfigVar | null;
  showOnlyModified?: boolean;
  onChange: (state: CustomVarState) => void;
  onSave: (variable: CustomVar) => void;
}

interface State {
  expanded: boolean;
}

class CustomVariable extends Component<Props, State> {
  // Static method to clear expansion states (useful for cleanup)
  static clearExpansionStates() {
    expansionStates.clear();
  }

  // Static method to get current expansion states (useful for debugging)
  static getExpansionStates() {
    return new Map(expansionStates);
  }
  constructor(props: Props) {
    super(props);

    // Get expansion state from global map, defaulting to false
    const initialExpanded = expansionStates.get(props.path) || false;

    this.state = {
      expanded: initialExpanded,
    };

    this.toggleVisibility = this.toggleVisibility.bind(this);
  }

  toggleVisibility() {
    const newExpanded = !this.state.expanded;

    // Save the expansion state to global map
    expansionStates.set(this.props.path, newExpanded);

    this.setState({
      expanded: newExpanded,
    });
  }

  componentDidMount() {
    // Ensure the global state is in sync with component state
    const globalExpanded = expansionStates.get(this.props.path) || false;
    if (globalExpanded !== this.state.expanded) {
      this.setState({ expanded: globalExpanded });
    }
  }

  componentDidUpdate(prevProps: Props) {
    // If the path changed, update to the new path's expansion state
    if (prevProps.path !== this.props.path) {
      const newExpanded = expansionStates.get(this.props.path) || false;
      this.setState({ expanded: newExpanded });
    }
  }

  // Check if any child variables are modified from their baseline values
  hasBaselineModifications(): boolean {
    const { state, baseline } = this.props;
    const value = state.__value;

    if (
      !value ||
      !baseline ||
      baseline.__type !== 'custom' ||
      !baseline.__value
    ) {
      return false;
    }

    // Check each child variable
    for (const key of Object.keys(value)) {
      const childState = value[key];
      const childBaseline =
        (typeof baseline.__value === 'object' &&
          !Array.isArray(baseline.__value) &&
          baseline.__value[key]) ||
        null;

      if (childState.__type === 'custom') {
        // For custom variables, recursively check their children
        // We'll need to create a temporary CustomVariable instance to check
        const hasModifications = this.checkCustomVariableModifications(
          childState,
          childBaseline,
        );
        if (hasModifications) {
          return true;
        }
      } else {
        // For basic variables, check if current value differs from baseline
        if (
          childBaseline &&
          childBaseline.__type !== 'custom' &&
          childBaseline.__value !== childState.__value
        ) {
          return true;
        }
      }
    }

    return false;
  }

  // Helper method to recursively check custom variable modifications
  checkCustomVariableModifications(
    customState: CustomVarState,
    customBaseline: ConfigVar | null,
  ): boolean {
    const value = customState.__value;

    if (
      !value ||
      !customBaseline ||
      customBaseline.__type !== 'custom' ||
      !customBaseline.__value
    ) {
      return false;
    }

    for (const key of Object.keys(value)) {
      const childState = value[key];
      const childBaseline =
        (typeof customBaseline.__value === 'object' &&
          !Array.isArray(customBaseline.__value) &&
          customBaseline.__value[key]) ||
        null;

      if (childState.__type === 'custom') {
        if (this.checkCustomVariableModifications(childState, childBaseline)) {
          return true;
        }
      } else {
        if (
          childBaseline &&
          childBaseline.__type !== 'custom' &&
          childBaseline.__value !== childState.__value
        ) {
          return true;
        }
      }
    }

    return false;
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
              <div className="flex items-center">
                <span
                  style={
                    this.hasBaselineModifications()
                      ? {
                          display: 'inline-block',
                          textAlign: 'center',
                          width: '1ch',
                          userSelect: 'auto',
                          opacity: 1.0,
                          color: '#fbbf24',
                          fontWeight: 'bold',
                          marginRight: '4px',
                        }
                      : {
                          display: 'inline-block',
                          textAlign: 'center',
                          width: '1ch',
                          userSelect: 'none',
                          opacity: 0.0,
                        }
                  }
                  title={
                    this.hasBaselineModifications()
                      ? 'Contains variables modified from deployed baseline'
                      : ''
                  }
                >
                  •
                </span>
                <h3 className="select-none pr-1 text-lg">{name}</h3>
              </div>
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

    // Filter keys if showOnlyModified is enabled
    let filteredKeys = sortedKeys;
    if (this.props.showOnlyModified) {
      filteredKeys = sortedKeys.filter((key) => {
        const child = value[key];
        const childBaseline =
          (this.props.baseline?.__type === 'custom' &&
            this.props.baseline?.__value?.[key]) ||
          null;

        if (child.__type === 'custom') {
          // For custom variables, check if they have baseline modifications
          return this.checkCustomVariableModifications(child, childBaseline);
        } else {
          // For basic variables, check if current value differs from baseline
          return (
            childBaseline &&
            childBaseline.__type !== 'custom' &&
            childBaseline.__value !== child.__value
          );
        }
      });
    }

    filteredKeys.sort();

    const children = filteredKeys.map((key) => {
      const onChange = (newState: ConfigVarState) => {
        this.props.onChange({
          __type: 'custom',
          __value: Object.keys(value).reduce(
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

      // Get the corresponding baseline value for this child
      const childBaseline =
        (this.props.baseline?.__type === 'custom' &&
          this.props.baseline?.__value?.[key]) ||
        null;

      if (child.__type === 'custom') {
        return (
          <CustomVariable
            key={key}
            name={key}
            path={`${path}.${key}`}
            state={child}
            baseline={childBaseline}
            showOnlyModified={this.props.showOnlyModified}
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
          baseline={childBaseline}
          onChange={onChange}
          onSave={onSave}
        />
      );
    });

    return this.renderHelper(name, children);
  }
}

export default CustomVariable;
