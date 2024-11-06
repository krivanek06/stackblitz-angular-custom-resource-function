import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, ResourceStatus } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { delay } from 'rxjs';
import { Todo } from './model';

@Component({
  selector: 'app-resource-normal-example',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>Resource Normal Example</h1>
    <button (click)="todosResource.reload()"> refresh </button>
    <input type="number" [formControl]="limitControl" />

    @if(todosResource.isLoading()){
      loading
    } @else if(todosResource.value()){

    @for(item of (todosResource.value() ?? []); track $index){
      <div>
      {{item.id}} --
          {{item.title }} 
    </div>
    }
  }
  `,
})
export class ResourceNormalExample {
  private http = inject(HttpClient);
  limitControl = new FormControl<number>(10);

  limitValue = toSignal(this.limitControl.valueChanges);

  todosResource = rxResource({
    request: this.limitValue,
    loader: ({ request: limit }) => {
      console.log('limit', limit);
      return this.http
        .get<Todo[]>(
          `https://jsonplaceholder.typicode.com/todos?_limit=${limit}`
        )
        .pipe(delay(1000));
    },
  });

  todosResourceee = effect(() => {
    console.log('limitValue', this.limitValue());
    console.log(ResourceStatus[this.todosResource.status()]);
    console.log(this.todosResource.value());
  });

  constructor() {
    // this.limitControl.valueChanges.subscribe(console.log);
  }
}
