import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ResourceNormalExample } from './resource-normal-example.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ResourceNormalExample],
  template: `
    <h1>Hello from {{ name }}!</h1>
    <div class="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-10">
      <app-resource-normal-example />

      <div>
        Todo
        <div></div>
      </div>
    </div>
  `,
})
export class App {
  name = 'Angular';
}

bootstrapApplication(App, {
  providers: [provideHttpClient()],
});
