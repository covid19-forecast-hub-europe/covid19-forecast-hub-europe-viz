export const environment = {
  production: true,
  // base_href: '/forecast-europe/',
  urls: {
    defaultSettings: {
      modelNames: 'https://covid19-forecasthub-eu-cdn-dkbuc4bverhgftfx.z01.azurefd.net/data/settings_model_selection.json'
    },
    lookups: {
      location: 'https://covid19-forecasthub-eu-cdn-dkbuc4bverhgftfx.z01.azurefd.net/data/locations_eu.csv'
    },
    forecastData: {
      json: 'https://covid19-forecasthub-eu-cdn-dkbuc4bverhgftfx.z01.azurefd.net/data/forecasts_to_plot.json'
    },
    truthData: 'https://covid19-forecasthub-eu-cdn-dkbuc4bverhgftfx.z01.azurefd.net/data/truth_to_plot.csv',
    metadata: 'https://covid19-forecasthub-eu-cdn-dkbuc4bverhgftfx.z01.azurefd.net/data/metadata.json'
  }
};
