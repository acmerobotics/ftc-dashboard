/// <reference types="vite-plugin-svgr/client" />

export type Values<T> = T[keyof T];
export type Extends<T, U extends T> = U;
