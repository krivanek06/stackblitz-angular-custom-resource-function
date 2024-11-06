import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ResourceNormalExample } from './resource-normal-example.component';
import { provideHttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ResourceNormalExample],
  template: `
    <h1>Hello from {{ name }}!</h1>
    <app-resource-normal-example />
  `,
})
export class App {
  name = 'Angular';
}

bootstrapApplication(App, {
  providers: [provideHttpClient()],
});
