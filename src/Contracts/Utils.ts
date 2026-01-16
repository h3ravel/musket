export type TGeneric<V = any, K extends string = string> = Record<K, V>

export type XGeneric<V = TGeneric, T = any> = {
    [key: string]: T
} & V