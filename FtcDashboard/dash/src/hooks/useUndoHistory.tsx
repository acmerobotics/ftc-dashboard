import { useReducer, useMemo } from 'react';
import { isEqual } from 'lodash';

enum StateHistoryCommand {
  INITIALIZE,
  APPEND,
  UNDO,
  REDO,
}

export default function useUndoHistory<T>(
  initialHead: T,
): [
  T,
  {
    initialize: (payload: T) => void;
    append: (payload: T) => void;
    undo: () => void;
    redo: () => void;
  },
] {
  type StateHistoryAction =
    | {
        type: StateHistoryCommand.INITIALIZE;
        payload: T;
      }
    | {
        type: StateHistoryCommand.APPEND;
        payload: T;
      }
    | { type: StateHistoryCommand.UNDO }
    | { type: StateHistoryCommand.REDO };

  interface StateHistoryReducerState {
    history: T[];
    actionHistory: StateHistoryCommand[];
    currentHistoryPosition: number;
  }

  const stateHistoryReducer = (
    state: StateHistoryReducerState,
    action: StateHistoryAction,
  ): StateHistoryReducerState => {
    switch (action.type) {
      case StateHistoryCommand.INITIALIZE: {
        return {
          history: [action.payload],
          actionHistory: [StateHistoryCommand.INITIALIZE],
          currentHistoryPosition: 0,
        };
      }
      case StateHistoryCommand.APPEND: {
        if (state.history.length !== 0) {
          if (
            isEqual(state.history[state.currentHistoryPosition], action.payload)
          ) {
            return state;
          }

          const lastAction =
            state.actionHistory[state.actionHistory.length - 1];
          if (
            lastAction === StateHistoryCommand.UNDO ||
            lastAction === StateHistoryCommand.REDO
          ) {
            if (
              isEqual(
                state.history[state.currentHistoryPosition],
                action.payload,
              )
            )
              return state;
          }
        }

        const newHistory = [
          ...state.history.slice(0, state.currentHistoryPosition + 1),
          action.payload,
        ];

        const newActionHistory = [
          ...state.actionHistory,
          StateHistoryCommand.APPEND,
        ];
        const newCurrentHistoryPosition = state.currentHistoryPosition + 1;

        return {
          history: newHistory,
          actionHistory: newActionHistory,
          currentHistoryPosition: newCurrentHistoryPosition,
        };
      }
      case StateHistoryCommand.UNDO: {
        if (state.currentHistoryPosition <= 0) return state;

        const newActionHistory = [
          ...state.actionHistory,
          StateHistoryCommand.UNDO,
        ];
        const newCurrentHistoryPosition = state.currentHistoryPosition - 1;

        return {
          history: state.history,
          actionHistory: newActionHistory,
          currentHistoryPosition: newCurrentHistoryPosition,
        };
      }
      case StateHistoryCommand.REDO: {
        if (state.currentHistoryPosition >= state.history.length - 1)
          return state;

        const newActionHistory = [
          ...state.actionHistory,
          StateHistoryCommand.REDO,
        ];
        const newCurrentHistoryPosition = state.currentHistoryPosition + 1;

        return {
          history: state.history,
          actionHistory: newActionHistory,
          currentHistoryPosition: newCurrentHistoryPosition,
        };
      }
    }
  };

  const [{ history, currentHistoryPosition }, dispatch] = useReducer(
    stateHistoryReducer,
    {
      history: [initialHead],
      actionHistory: [StateHistoryCommand.INITIALIZE],
      currentHistoryPosition: 0,
    },
  );

  // Requires a useMemo or it causes an infinite loop in useEffect dependencies
  const initialize = useMemo(
    () => (payload: T) =>
      dispatch({ type: StateHistoryCommand.INITIALIZE, payload }),
    [dispatch],
  );
  const append = useMemo(
    () => (payload: T) =>
      dispatch({ type: StateHistoryCommand.APPEND, payload }),
    [dispatch],
  );
  const undo = useMemo(
    () => () => dispatch({ type: StateHistoryCommand.UNDO }),
    [dispatch],
  );
  const redo = useMemo(
    () => () => dispatch({ type: StateHistoryCommand.REDO }),
    [dispatch],
  );

  return [history[currentHistoryPosition], { initialize, append, undo, redo }];
}
