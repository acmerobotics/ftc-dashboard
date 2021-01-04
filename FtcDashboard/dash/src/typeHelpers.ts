export type Values<T> = T[keyof T];
export type Extends<T, U extends T> = U;

export type WithChildren<T = Record<string, unknown>> = T & {
  children?: React.ReactNode;
};
