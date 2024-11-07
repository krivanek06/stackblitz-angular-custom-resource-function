import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
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

// -------------------------------
// BASIC EXAMPLE - NO RELOAD

export type RxResourceCustomBasic<T> =
  | {
      state: 'loading';
      isLoading: true;
      data: null;
    }
  | {
      state: 'loaded';
      isLoading: false;
      data: T;
    }
  | {
      state: 'error';
      isLoading: false;
      data: null;
      error: unknown;
    };

export const rxResourceCustomBasic = <T, TLoader extends Observable<unknown>[]>(data: {
  request: [...TLoader];
  loader: (values: {
    [K in keyof TLoader]: ObservableValue<TLoader[K]>;
  }) => Observable<T>;
}): Observable<RxResourceCustomBasic<T>> => {
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
            } satisfies RxResourceCustomBasic<T>),
          ),
        ),
    ),
    // handle error state
    catchError((error) =>
      of({
        state: 'error',
        isLoading: false,
        error,
        data: null,
      } satisfies RxResourceCustomBasic<T>),
    ),
    // setup loading state
    startWith({
      state: 'loading',
      isLoading: true,
      data: null,
    } satisfies RxResourceCustomBasic<T>),

    // share the observable
    shareReplay(1),
  );
};

// -------------------------------
// EXAMPLE WITH RELOADING DATA
type RxResourceCustomResult<T> =
  | {
      state: 'loading';
      isLoading: true;
      data: null;
    }
  | {
      state: 'loaded';
      isLoading: false;
      data: T;
    }
  | {
      state: 'error';
      isLoading: false;
      data: null;
      error: unknown;
    };
export type RxResourceCustom<T> = {
  reload: () => void;
  result: () => T | null;
  update: (updateFn: (current: T) => T) => void;
  set: (data: T) => void;
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
    switchMap(() =>
      combineLatest(data.request).pipe(
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
                  state: 'loaded' as const,
                  isLoading: false as const,
                  data: result,
                }),
              ),

              // setup loading state
              startWith({
                state: 'loading' as const,
                isLoading: true as const,
                data: null,
              }),

              // handle error state
              catchError((error) =>
                of({
                  state: 'error' as const,
                  isLoading: false as const,
                  error,
                  data: null,
                }),
              ),
            ),
        ),
      ),
    ),
  );

  // subscribe to the result and update the state
  result$.pipe(takeUntilDestroyed()).subscribe((state) => resultState$.next(state));

  return {
    result$: resultState$,
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
