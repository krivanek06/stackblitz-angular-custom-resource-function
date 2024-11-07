import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { delay, map, startWith } from 'rxjs';
import { rxResourceCustom, Todo } from './model';

@Component({
  selector: 'app-resource-custom-example',
  standalone: true,
  imports: [ReactiveFormsModule, AsyncPipe],
  template: `
    <div class="grid gap-y-2">
      <h1>Resource Custom Example</h1>
      <button (click)="todosResource.reload()">refresh</button>
      <input type="number" [formControl]="limitControl" />

      @if (todosResource.result$ | async; as data) {
        @if (data.isLoading) {
          <div class="g-loading">Loading...</div>
        } @else if (data.data) {
          @for (item of data.data; track $index) {
            <div class="g-item" (click)="onRemove(item)">{{ item.id }} -{{ item.title }}</div>
          }
        } @else if (data.error) {
          <div class="g-error">
            {{ data.error }}
          </div>
        }
      }
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceCustomExampleComponent {
  private http = inject(HttpClient);
  limitControl = new FormControl<number>(5, { nonNullable: true });

  private limitValue$ = this.limitControl.valueChanges.pipe(startWith(this.limitControl.value));

  todosResource = rxResourceCustom({
    request: [this.limitValue$],
    loader: ([limit]) => {
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
