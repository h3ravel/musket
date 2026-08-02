import type { Application } from './Application'
import type { Command } from '../Core/Command'

export type TGeneric<V = any, K extends string = string> = Record<K, V>

export type XGeneric<V = TGeneric, T = any> = {
    [key: string]: T
} & V

export type EventListener<T> = (payload: T) => void | Promise<void>

export interface CommandHandlingEvent<
    A extends Application = Application,
> {
    app: A
    command: Command<A>
}

export interface CommandHandledEvent<
    A extends Application = Application,
    R = unknown,
> extends CommandHandlingEvent<A> {
    result: R
}

export interface CommandHandleFailedEvent<
    A extends Application = Application,
> extends CommandHandlingEvent<A> {
    error: unknown
}