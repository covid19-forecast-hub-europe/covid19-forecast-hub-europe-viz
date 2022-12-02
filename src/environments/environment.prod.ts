export const environment = {
  production: true,
  // base_href: '/forecast-europe/',
  urls: {
    defaultSettings: {
      modelNames: 'https://raw.githubusercontent.com/epiforecasts/covid19-forecast-hub-europe/main/viz/settings_model_selection.json'
    },
    lookups: {
      location: 'https://raw.githubusercontent.com/epiforecasts/covid19-forecast-hub-europe/main/data-locations/locations_eu.csv'
    },
    forecastData: {
      json: 'https://covid19forecasthubecdc.blob.core.windows.net/data/forecasts_to_plot.json'
    },
    truthData: 'https://covid19forecasthubecdc.blob.core.windows.net/data/truth_to_plot.csv',
    metadata: 'https://covid19forecasthubecdc.blob.core.windows.net/data/metadata.json'
  }
};
