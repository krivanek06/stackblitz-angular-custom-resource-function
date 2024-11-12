import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  combineLatestWith,
  exhaustMap,
  Observable,
  of,
  shareReplay,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// Helper type to extract the type of values emitted by an Observable
type ObservableValue<T> = T extends Observable<infer U> ? U : never;

type RxResourceCustomResult<T> = {
  state: 'loading' | 'loaded' | 'error';
  isLoading: boolean;
  data: T | null;
  error?: unknown;
};

// type RxResourceCustomResult<T> = {
//   state: 'loading'
// } | {
//   state: 'loaded',
//   data: T | null;
// } | {
//   state: 'error',
//   error: unknown;
// }

// -------------------------------

export const rxResourceCustomBasic = <T, TLoader extends Observable<unknown>[]>(data: {
  request: [...TLoader];
  loader: (values: {
    [K in keyof TLoader]: ObservableValue<TLoader[K]>;
  }) => Observable<T>;
}): Observable<RxResourceCustomResult<T>> => {
  return combineLatest(data.request).pipe(
    switchMap((values) =>
      data
        .loader(
          values as {
            [K in keyof TLoader]: ObservableValue<TLoader[K]>;
          },
        )
        .pipe(
          switchMap((result) =>
            of({
              state: 'loaded',
              isLoading: false,
              data: result,
            } satisfies RxResourceCustomResult<T>),
          ),
          // setup loading state
          startWith({
            state: 'loading',
            isLoading: true,
            data: null,
          } satisfies RxResourceCustomResult<T>),
          // handle error state
          catchError((error) =>
            of({
              state: 'error',
              isLoading: false,
              error,
              data: null,
            } satisfies RxResourceCustomResult<T>),
          ),
        ),
    ),
    // share the observable
    shareReplay(1),
  );
};

// -------------------------------
// EXAMPLE WITH RELOADING DATA

export type RxResourceCustom<T> = {
  /**
   * Trigger a reload of the resource
   */
  reload: () => void;
  /**
   * @returns the current result of the resource
   */
  result: () => T | null;
  /**
   * @param updateFn - function to update the current data
   */
  update: (updateFn: (current: T) => T) => void;
  /**
   * @param data - set the data of the resource
   */
  set: (data: T) => void;
  /**
   * Observable of the resource state
   */
  result$: Observable<RxResourceCustomResult<T>>;
};

export const rxResourceCustom = <T, TLoader extends Observable<unknown>[]>(data: {
  request: [...TLoader];
  loader: (values: {
    [K in keyof TLoader]: ObservableValue<TLoader[K]>;
  }) => Observable<T>;
}): RxResourceCustom<T> => {
  // Subject to trigger reloads
  const reloadTrigger$ = new Subject<void>();

  // hold the latest result of type `T | null`
  const resultState$ = new BehaviorSubject<RxResourceCustomResult<T>>({
    state: 'loading',
    isLoading: true,
    data: null,
  });

  const result$ = reloadTrigger$.pipe(
    startWith(null),
    combineLatestWith(...data.request),
    exhaustMap(([_, ...values]) =>
      data
        .loader(
          values as {
            [K in keyof TLoader]: ObservableValue<TLoader[K]>;
          },
        )
        .pipe(
          switchMap((result) =>
            of({
              state: 'loaded',
              isLoading: false,
              data: result,
            } satisfies RxResourceCustomResult<T>),
          ),

          // setup loading state
          startWith({
            state: 'loading',
            isLoading: true,
            data: null,
          } satisfies RxResourceCustomResult<T>),

          // handle error state
          catchError((error) =>
            of({
              state: 'error',
              isLoading: false,
              error,
              data: null,
            } satisfies RxResourceCustomResult<T>),
          ),
        ),
    ),
  );

  // subscribe to the result and update the state
  result$.pipe(takeUntilDestroyed()).subscribe((state) => resultState$.next(state));

  return {
    result$: resultState$.asObservable(),
    reload: () => reloadTrigger$.next(),
    result: () => resultState$.value.data,
    update: (updateFn: (current: T) => T) => {
      const current = resultState$.value;
      if (current?.data) {
        resultState$.next({
          state: 'loaded',
          isLoading: false,
          data: updateFn(current.data),
        });
      }
    },
    set: (data) => {
      resultState$.next({
        state: 'loaded',
        isLoading: false,
        data: data,
      });
    },
  };
};
