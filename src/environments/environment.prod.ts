export const environment = {
  production: true,
  base_href: '/covid19-forecast-hub-europe-viz/',
  urls: {
    defaultSettings: {
      modelNames: 'https://covid19-forecasthub-cdn.azureedge.net/data/settings_model_selection.json'
    },
    lookups: {
      location: 'https://raw.githubusercontent.com/epiforecasts/covid19-forecast-hub-europe/main/data-locations/locations_eu.csv'
    },
    forecastData: {
      csv: 'https://raw.githubusercontent.com/jbracher/covid19-forecast-hub-europe/main/viz/forecasts_to_plot.csv',
      json: 'https://covid19-forecasthub-cdn.azureedge.net/data/forecasts_to_plot.json'
    },
    truthData: 'https://covid19-forecasthub-cdn.azureedge.net/data/truth_to_plot.csv',
    metadata: 'https://covid19-forecasthub-cdn.azureedge.net/data/metadata.json'
  }
};
