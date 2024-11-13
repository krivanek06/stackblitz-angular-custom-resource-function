import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { delay, map } from 'rxjs';
import { Todo } from './model';

@Component({
  selector: 'app-resource-normal-example',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="grid gap-y-2">
      <h1>Resource Normal Example</h1>
      <button (click)="todosResource.reload()">refresh</button>
      <input type="number" [ngModel]="limitControl()" (ngModelChange)="limitControl.set($event)" />

      <!-- loading state -->
      @if (todosResource.isLoading()) {
        <div class="g-loading">Loading...</div>
      }

      <!-- error state -->
      @else if (todosResource.error()) {
        <div class="g-error">
          {{ todosResource.error() }}
        </div>
      }

      <!-- display data -->
      @else if (todosResource.hasValue()) {
        @for (item of todosResource.value() ?? []; track $index) {
          <div class="g-item" (click)="onRemove(item)">{{ item.id }} -{{ item.title }}</div>
        }
      }
    </div>
  `,
})
export class ResourceNormalExample {
  private http = inject(HttpClient);
  limitControl = signal<number>(5);

  todosResource = rxResource({
    request: this.limitControl,
    loader: ({ request: limit }) => {
      return this.http.get<Todo[]>(`https://jsonplaceholder.typicode.com/todos?_limit=${limit}`).pipe(
        map((res) => {
          if (limit === 8) {
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
