import { catchError, combineLatest, Observable, of, startWith, Subject, switchMap } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export type RxResourceCustom<T> =
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

// Helper type to extract the type of values emitted by an Observable
type ObservableValue<T> = T extends Observable<infer U> ? U : never;

export const rxResourceCustom = <T, TLoader extends Observable<unknown>[]>(data: {
  request: [...TLoader];
  loader: (values: {
    [K in keyof TLoader]: ObservableValue<TLoader[K]>;
  }) => Observable<T>;
}): Observable<RxResourceCustom<T>> => {
  return combineLatest(data.request).pipe(
    switchMap((values) =>
      //map((values) => data.loader(...values)
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
            } satisfies RxResourceCustom<T>),
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
      } satisfies RxResourceCustom<T>),
    ),
    // setup loading state
    startWith({
      state: 'loading',
      isLoading: true,
      data: null,
    } satisfies RxResourceCustom<T>),
  );
};

const test1$ = new Subject<number>();
const test2$ = new Subject<string>();
const res = rxResourceCustom({
  request: [test1$, test2$],
  loader: ([test1Val, test2Val]) => {
    console.log(test1Val, test2Val);
    return of({} as Todo);
  },
});

console.log('aaaa');
res.subscribe((r) => r);
