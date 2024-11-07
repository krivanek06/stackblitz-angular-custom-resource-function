import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { delay, map } from 'rxjs';
import { Todo } from './model';

@Component({
  selector: 'app-resource-normal-example',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="grid gap-y-2">
      <h1>Resource Normal Example</h1>
      <button (click)="todosResource.reload()">refresh</button>
      <input type="number" [formControl]="limitControl" />

      @if (todosResource.isLoading()) {
        <div class="g-loading">Loading...</div>
      } @else if (todosResource.value()) {
        @for (item of todosResource.value() ?? []; track $index) {
          <div class="g-item" (click)="onRemove(item)">{{ item.id }} -{{ item.title }}</div>
        }
      } @else if (todosResource.error()) {
        <div class="g-error">
          {{ todosResource.error() }}
        </div>
      }
    </div>
  `,
})
export class ResourceNormalExample {
  private http = inject(HttpClient);
  limitControl = new FormControl<number>(10, { nonNullable: true });

  limitValue = toSignal(this.limitControl.valueChanges, {
    initialValue: this.limitControl.value,
  });

  todosResource = rxResource({
    request: this.limitValue,
    loader: ({ request: limit }) => {
      return this.http.get<Todo[]>(`https://jsonplaceholder.typicode.com/todos?_limit=${limit}`).pipe(
        map((res) => {
          if (limit === 13) {
            throw new Error('Error happened on the server');
          }
          return res;
        }),
        delay(1000),
      );
    },
  });

  onRemove(todo: Todo) {
    this.todosResource.update((d) => d?.filter((item) => item.id !== todo.id));
  }
}
