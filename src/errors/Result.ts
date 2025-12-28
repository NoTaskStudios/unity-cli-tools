import { UnityError } from "./UnityError.js";

/**
 * Represents a successful result
 */
export interface Success<T> {
  readonly success: true;
  readonly value: T;
}

/**
 * Represents a failed result
 */
export interface Failure<E extends UnityError> {
  readonly success: false;
  readonly error: E;
}

/**
 * Result type that represents either success or failure
 * This pattern eliminates the need for exceptions in most cases
 * and makes error handling explicit and type-safe.
 */
export type Result<T, E extends UnityError = UnityError> = Success<T> | Failure<E>;

/**
 * Creates a successful result
 * @param value - The success value
 * @returns A Success result
 */
export function ok<T>(value: T): Success<T> {
  return { success: true, value };
}

/**
 * Creates a failed result
 * @param error - The error
 * @returns A Failure result
 */
export function err<E extends UnityError>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Type guard to check if a result is successful
 * @param result - The result to check
 * @returns True if the result is successful
 */
export function isOk<T, E extends UnityError>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard to check if a result is a failure
 * @param result - The result to check
 * @returns True if the result is a failure
 */
export function isErr<T, E extends UnityError>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Unwraps a successful result or throws the error
 * Use with caution - prefer pattern matching with isOk/isErr
 * @param result - The result to unwrap
 * @returns The success value
 * @throws The error if the result is a failure
 */
export function unwrap<T, E extends UnityError>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwraps a successful result or returns a default value
 * @param result - The result to unwrap
 * @param defaultValue - The default value to return if the result is a failure
 * @returns The success value or the default value
 */
export function unwrapOr<T, E extends UnityError>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Maps a successful result to a new value
 * @param result - The result to map
 * @param fn - The mapping function
 * @returns A new result with the mapped value
 */
export function map<T, U, E extends UnityError>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Maps a failed result to a new error
 * @param result - The result to map
 * @param fn - The mapping function
 * @returns A new result with the mapped error
 */
export function mapErr<T, E extends UnityError, F extends UnityError>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chains operations that return Results
 * @param result - The result to chain
 * @param fn - The function to apply if the result is successful
 * @returns The result of the function or the original error
 */
export function andThen<T, U, E extends UnityError>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Returns the first successful result or the last error
 * @param results - Array of results
 * @returns The first successful result or the last error
 * @throws If the results array is empty
 */
export function firstOk<T, E extends UnityError>(results: Result<T, E>[]): Result<T, E> {
  if (results.length === 0) {
    throw new Error("Cannot call firstOk on empty array");
  }

  for (const result of results) {
    if (isOk(result)) {
      return result;
    }
  }

  return results[results.length - 1];
}

/**
 * Combines multiple results into a single result
 * If all are successful, returns an array of values
 * If any fail, returns the first error
 * @param results - Array of results to combine
 * @returns A result containing an array of values or the first error
 */
export function combine<T, E extends UnityError>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
}
