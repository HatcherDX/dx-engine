export type MessageObj<T> = {
  [K in keyof T]: (...args: never[]) => unknown
}
