import React from 'react';

import BooleanInput from './inputs/BooleanInput';
import EnumInput from './inputs/EnumInput';
import TextInput from './inputs/TextInput';
import {
  validateDouble,
  validateInt,
  validateString,
} from '@/components/inputs/validation';
import { BasicVar, BasicVarState, ConfigVar } from '@/store/types/config';

type Props = {
  name: string;
  path: string;
  state: BasicVarState;
  baseline: ConfigVar | null;
  onChange: (state: BasicVarState) => void;
  onSave: (state: BasicVar) => void;
};

class BasicVariable extends React.Component<Props> {
  // Helper function to get formatted baseline value for display
  getBaselineDisplayValue(): string | null {
    const { baseline } = this.props;

    if (!baseline || baseline.__type === 'custom') {
      return null;
    }

    if (baseline.__value === null) {
      return 'null';
    }

    // Format based on type
    switch (baseline.__type) {
      case 'boolean':
        return String(baseline.__value);
      case 'string':
        return `"${baseline.__value}"`;
      case 'enum':
        return String(baseline.__value);
      case 'int':
      case 'long':
      case 'float':
      case 'double':
        return String(baseline.__value);
    }

    // This should never be reached, but TypeScript needs it
    return null;
  }

  // Helper component to display baseline value in parentheses
  renderBaselineValue() {
    const { state, baseline } = this.props;
    const baselineDisplay = this.getBaselineDisplayValue();

    if (!baselineDisplay || !baseline || baseline.__type === 'custom') {
      return null;
    }

    // Show baseline if current edited value differs from baseline value
    const currentValueDiffersFromBaseline =
      baseline.__value !== state.__newValue;

    if (!currentValueDiffersFromBaseline) {
      return null;
    }

    return (
      <p
        className="mx-3"
        style={{
          opacity: 0.5,
        }}
      >
        ({baselineDisplay})
      </p>
    );
  }

  render() {
    const { name, path, state, baseline } = this.props;

    const modified = state.__value !== state.__newValue;

    // Check if the current value differs from the baseline
    const modifiedFromBaseline =
      baseline &&
      baseline.__type !== 'custom' &&
      baseline.__value !== state.__value;

    const onChange = (validatedValue: {
      value: string | number | boolean;
      valid: boolean;
    }) => {
      const { value, valid } = validatedValue;
      this.props.onChange({
        ...state,
        __newValue: value,
        __valid: valid,
      });
    };

    const onSave = () => {
      if (state.__valid && modified) {
        if (state.__type === 'enum') {
          this.props.onSave({
            __type: 'enum',
            __value: state.__newValue,
            __enumClass: state.__enumClass,
            __enumValues: state.__enumValues,
          });
        } else {
          this.props.onSave({
            __type: state.__type,
            __value: state.__newValue,
          });
        }
      }
    };

    let input;

    if (state.__newValue === null) {
      input = <p>null</p>;
    } else {
      switch (state.__type) {
        case 'int':
        case 'long':
          input = (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <TextInput
                id={path}
                value={state.__newValue as number | string}
                valid={state.__valid}
                validate={validateInt}
                onChange={onChange}
                onSave={onSave}
              />
              {this.renderBaselineValue()}
            </div>
          );
          break;
        case 'float':
        case 'double':
          if (typeof state.__value === 'string') {
            input = <p>{state.__value}</p>;
          } else {
            input = (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <TextInput
                  id={path}
                  value={state.__newValue as number | string}
                  valid={state.__valid}
                  validate={validateDouble}
                  onChange={onChange}
                  onSave={onSave}
                />
                {this.renderBaselineValue()}
              </div>
            );
          }
          break;
        case 'string':
          input = (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <TextInput
                id={path}
                value={state.__newValue as number | string}
                valid={state.__valid}
                validate={validateString}
                onChange={onChange}
                onSave={onSave}
              />
              {this.renderBaselineValue()}
            </div>
          );
          break;
        case 'boolean':
          input = (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <BooleanInput
                id={path}
                value={state.__newValue as boolean}
                onChange={onChange}
                onSave={onSave}
              />
              {this.renderBaselineValue()}
            </div>
          );
          break;
        case 'enum':
          input = (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <EnumInput
                id={path}
                value={state.__newValue as string}
                enumValues={state.__enumValues}
                onChange={onChange}
                onSave={onSave}
              />
              {this.renderBaselineValue()}
            </div>
          );
          break;
      }
    }

    return (
      <tr>
        <td>
          <label htmlFor={path}>
            <span
              style={
                modified
                  ? {
                      userSelect: 'auto',
                      opacity: 1.0,
                    }
                  : {
                      userSelect: 'none',
                      opacity: 0.0,
                    }
              }
            >
              *
            </span>
            <span
              style={
                modifiedFromBaseline
                  ? {
                      userSelect: 'auto',
                      opacity: 1.0,
                      color: '#ff6b6b',
                      fontWeight: 'bold',
                    }
                  : {
                      userSelect: 'none',
                      opacity: 0.0,
                    }
              }
              title={
                modifiedFromBaseline ? 'Modified from deployed baseline' : ''
              }
            >
              !
            </span>
            {name}
          </label>
        </td>
        <td>{input}</td>
      </tr>
    );
  }
}

export default BasicVariable;
