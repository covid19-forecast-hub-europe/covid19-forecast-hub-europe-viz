import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, shareReplay } from 'rxjs/operators';
import * as Papa from 'papaparse';
import * as _ from 'lodash';
import { ForecastData, ForecastTargetDescription, ForecastType, QuantilePointType, QuantileType } from '../models/forecast-data';
import { ForecastTarget } from '../models/forecast-target';
import { combineLatest, Observable, of } from 'rxjs';
import { LocationLookupItem } from '../models/location-lookup';
import { environment } from '../../environments/environment';
import { ForecastDataSerivce } from './forecast-data.service';

interface RawForecastToPlot {
  scenario: string;
  model: string;
  location: string;
  forecast_date: string;
  timezero: string;
  target: string;
  target_end_date: string;
  type: string;
  quantile: string;
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class ForecastCsvDataService extends ForecastDataSerivce {
  private forecastData$: Observable<{ [locationId: string]: { [target: string]: { data: ForecastData[], availableForecastDates: Date[] } } }>;

  constructor(private http: HttpClient) {
    super();

    this.forecastData$ = this.http.get(environment.urls.forecastData.csv, { responseType: 'text' })
      .pipe(map(data => {
        const parsed = Papa.parse<RawForecastToPlot>(data, { header: true, skipEmptyLines: true });
        const forecastData = parsed.data.map((row, i) => {
          try {
            return this.toForecastData(row, i)
          }
          catch (e) {
            return null;
          }
        }).filter(x => x !== null) as Array<ForecastData>;

        return _.chain(forecastData).groupBy(x => x.location).map((locationGroup, locationKey) => {
          const targetObj = _.fromPairs(_.map(_.groupBy(locationGroup, x => x.target.target_type), (targetGroup, targetKey) => {
            const availableForecastDates = _.orderBy(_.uniqBy(targetGroup, x => x.timezero.toISOString()).map(x => x.timezero), x => x, 'desc');
            return [targetKey, { data: targetGroup, availableForecastDates }];
          }))

          return [locationKey, targetObj]
        }).fromPairs().value();
      }))
      .pipe(shareReplay(1));
  }

  createForecastDataObservable(filter$: Observable<{ target: ForecastTarget; location: LocationLookupItem; }>): Observable<{ availableForecastDates: Date[], data: ForecastData[], filter: { target: ForecastTarget, location: LocationLookupItem } }> {
    return combineLatest([this.forecastData$, filter$]).pipe(map(([rawData, f]) => {
      return { ...rawData[f.location.id][f.target], filter: { location: f.location, target: f.target } };
    }));
  }

  private toForecastData(input: RawForecastToPlot, index: number): ForecastData {
    const parseType: (t: string) => ForecastType = (t) => {
      switch (t) {
        case 'observed': return ForecastType.Observed;
        case 'point': return ForecastType.Point;
        case 'quantile': return ForecastType.Quantile;
        default:
          throw new Error(`Unknown ForecastType.type '${t}' (expected: 'observed' | 'point' | 'quantile') at position '${index}' in '${JSON.stringify(input)}'.`);
      }
    }

    const parseTarget: (t: string, end_date: Date, index: number) => ForecastTargetDescription = (t, end_date, index) => {
      const parseRegEx = /(-?\d{1,3})\s(wk)\sahead\s(inc death|inc case)/;
      const parsed = parseRegEx.exec(t);

      if (parsed !== null && parsed.length === 4) {
        const timeAheadStr = parsed[1];
        const timeUnitStr = parsed[2];
        const valueTypeStr = parsed[3];

        if (timeUnitStr !== 'wk') {
          throw new Error(`Unknown time_unit (expected: 'wk') in target '${t}' at position '${index}' in '${JSON.stringify(input)}'.`);
        }

        let value_type = ForecastTarget.Cases;
        switch (valueTypeStr) {
          case 'inc death': value_type = ForecastTarget.Death; break;
          case 'inc case': value_type = ForecastTarget.Cases; break;
          default: throw new Error(`Unknown value_type (expected: 'inc death' | 'inc case') in target '${t}' at position '${index}' in object '${JSON.stringify(input)}'.`);
        }

        return {
          time_ahead: parseInt(timeAheadStr),
          target_type: value_type,
          end_date
        };
      }

      throw new Error(`Unable to parse target '${t}' at position '${index}' in '${JSON.stringify(input)}'.`);
    }

    const parseQuantile: (q: string) => { type: QuantileType, point: QuantilePointType } = (q) => {
      switch (q) {
        case '0.975':
          return { type: QuantileType.Q95, point: QuantilePointType.Upper };
        case '0.025':
          return { type: QuantileType.Q95, point: QuantilePointType.Lower };
        case '0.75':
          return { type: QuantileType.Q50, point: QuantilePointType.Upper };
        case '0.25':
          return { type: QuantileType.Q50, point: QuantilePointType.Lower };
        default:
          throw new Error(`Unknown quantile '${q}' (expected: '0.975' | '0.025' | '0.75' | '0.25') at position '${index}' in object '${JSON.stringify(input)}'. `)
      }
    }

    const type = parseType(input.type)

    return {
      forecast_date: new Date(input.forecast_date),
      target: parseTarget(input.target, new Date(input.target_end_date), index),
      location: input.location,
      type: type,
      quantile: type === ForecastType.Quantile ? parseQuantile(input.quantile) : undefined,
      value: parseFloat(input.value),
      timezero: new Date(input.timezero),
      model: input.model
    };
  }
}
