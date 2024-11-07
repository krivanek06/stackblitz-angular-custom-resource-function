import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ResourceCustomExampleComponent } from './resource-custom-example.component.ts.component';
import { ResourceNormalExample } from './resource-normal-example.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ResourceNormalExample, ResourceCustomExampleComponent],
  template: `
    <h1>Hello from {{ name }}!</h1>
    <div class="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-10">
      <app-resource-normal-example />

      <div>
        <app-resource-custom-example />
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
