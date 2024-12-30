import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  combineLatestWith,
  exhaustMap,
  map,
  Observable,
  of,
  retry,
  startWith,
  Subject,
  switchMap,
  timeout,
} from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// Helper type to extract the type of values emitted by an Observable
type ObservableValue<T> = T extends Observable<infer U> ? U : never;

type RxResourceCustomResult<T> = {
  /**
   * states:
   * - `loading` - the resource is loading
   * - `loaded` - the resource has been loaded
   * - `error` - an error occurred while loading the resource
   * - `local` - the resource has been set/modified locally
   */
  state: 'loading' | 'loaded' | 'error' | 'local';
  isLoading: boolean;
  data: T | null;
  error?: unknown;
};

// export const rxResourceCustomBasic = (data: {
//   request: any[];
//   loader: (values: any) => Observable<any>;
// }): Observable<RxResourceCustomResult<any>> => {
// 	// todo ....
//   return of({} as RxResourceCustomResult<any>);
// }

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
  // listen to all the requests observables
  return combineLatest(data.request).pipe(
    exhaustMap((values) =>
      // execute the loader function provided by the user
      data
        .loader(
          values as {
            [K in keyof TLoader]: ObservableValue<TLoader[K]>;
          },
        )
        .pipe(
          switchMap((result) => of({ state: 'loaded' as const, data: result, isLoading: false })),
          // setup loading state
          startWith({ state: 'loading' as const, data: null, isLoading: true }),
          // handle error state
          catchError((error) =>
            of({
              state: 'error' as const,
              isLoading: false,
              error,
              data: null,
            }),
          ),
        ),
    ),
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
  value: () => T | null;
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
  const resultState$ = new BehaviorSubject<{
    state: RxResourceCustomResult<T>['state'];
    data: T | null;
  }>({
    state: 'loading' as const,
    data: null,
  });

  const result$ = reloadTrigger$.pipe(
    startWith(null),
    // listen to all the requests observables
    combineLatestWith(...data.request),
    // prevent request cancellation
    exhaustMap(([_, ...values]) =>
      // execute the loader function provided by the user
      data
        .loader(
          values as {
            [K in keyof TLoader]: ObservableValue<TLoader[K]>;
          },
        )
        .pipe(
          switchMap((result) =>
            of({
              state: 'loaded' as const,
              data: result,
            }),
          ),

          // setup loading state
          startWith({
            state: 'loading' as const,
            data: null,
          }),

          // retry the request 2 times
          retry(2),

          // cancel the request after 3 seconds
          timeout(3000),

          // handle error state
          catchError((error) =>
            of({
              state: 'error' as const,
              error,
              data: null,
            }),
          ),
        ),
    ),
  );

  // subscribe to the result and update the state
  result$.pipe(takeUntilDestroyed()).subscribe((state) => resultState$.next(state));

  return {
    result$: resultState$.asObservable().pipe(
      map((state) => ({
        ...state,
        isLoading: state.state === 'loading',
      })),
    ),
    reload: () => reloadTrigger$.next(),
    value: () => resultState$.value.data,
    update: (updateFn: (current: T) => T) => {
      const current = resultState$.value;
      if (current?.data) {
        resultState$.next({
          state: 'local',
          data: updateFn(current.data),
        });
      }
    },
    set: (data) => {
      resultState$.next({
        state: 'local',
        data: data,
      });
    },
  };
};
