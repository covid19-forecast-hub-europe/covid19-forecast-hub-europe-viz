# CovidForecastEcdc

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.0.2.

## Pull Request notes
- Don't change any ecdc specfic value (like base-href) in PRs!
## Improvements
- When YScale = 'log' values <= 0 breaks the chart (log(0), log(-n)). Workaround => if value <= 0 is present, then min of axis = 0.01;
    - Check for new echart versions which adresses this issue => update echarts package (ngx-echarts if neccessary) 
- Change `"optimization": { "fonts": false }` to true to embde fonts into html. im unable to do this because of proxy.
## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Deploy

Run `npm run deploy` to automatically build the app and push the output to the `gh-pages` branch.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
