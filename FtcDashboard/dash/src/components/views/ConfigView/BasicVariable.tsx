import React from 'react';

import BooleanInput from './inputs/BooleanInput';
import EnumInput from './inputs/EnumInput';
import TextInput from './inputs/TextInput';
import {
  validateDouble,
  validateInt,
  validateString,
} from '@/components/inputs/validation';
import { BasicVar, BasicVarState } from '@/store/types/config';

type Props = {
  name: string;
  state: BasicVarState;
  onChange: (state: BasicVarState) => void;
  onSave: (state: BasicVar) => void;
};

class BasicVariable extends React.Component<Props> {
  render() {
    const { name, state } = this.props;

    const modified = state.__value !== state.__newValue;

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
          input = (
            <TextInput
              value={state.__newValue}
              valid={state.__valid}
              validate={validateInt}
              onChange={onChange}
              onSave={onSave}
            />
          );
          break;
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
                  value={state.__newValue}
                  valid={state.__valid}
                  validate={validateDouble}
                  onChange={onChange}
                  onSave={onSave}
                />
                {state.__valid && (
                  <p
                    className="mx-3"
                    style={{
                      opacity: 0.5,
                    }}
                  >
                    ({Number(state.__newValue)})
                  </p>
                )}
              </div>
            );
          }
          break;
        case 'string':
          input = (
            <TextInput
              value={state.__newValue}
              valid={state.__valid}
              validate={validateString}
              onChange={onChange}
              onSave={onSave}
            />
          );
          break;
        case 'boolean':
          input = (
            <BooleanInput
              value={state.__newValue as boolean}
              onChange={onChange}
              onSave={onSave}
            />
          );
          break;
        case 'enum':
          input = (
            <EnumInput
              value={state.__newValue as string}
              enumValues={state.__enumValues}
              onChange={onChange}
              onSave={onSave}
            />
          );
          break;
      }
    }

    return (
      <tr>
        <td>
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
          {name}
        </td>
        <td>{input}</td>
      </tr>
    );
  }
}

export default BasicVariable;
