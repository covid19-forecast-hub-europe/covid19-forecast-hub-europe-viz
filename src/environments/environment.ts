// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // base_href: '',
  urls: {
    defaultSettings: {
      modelNames: 'https://raw.githubusercontent.com/epiforecasts/covid19-forecast-hub-europe/main/viz/settings_model_selection.json'
    },
    lookups: {
      location: 'https://raw.githubusercontent.com/epiforecasts/covid19-forecast-hub-europe/main/data-locations/locations_eu.csv'
    },
    forecastData: {
      json: 'https://covid19-forecasthub-cdn.azureedge.net/data/forecasts_to_plot.json'
    },
    truthData: 'https://covid19-forecasthub-cdn.azureedge.net/data/truth_to_plot.csv',
    metadata: 'https://covid19-forecasthub-cdn.azureedge.net/data/metadata.json'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
