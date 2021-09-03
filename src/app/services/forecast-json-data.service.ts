import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import { ForecastData, ForecastDataFilter, ForecastType, QuantilePointType, QuantileType } from '../models/forecast-data';
import { environment } from '../../environments/environment';
import { map, shareReplay } from 'rxjs/operators';
import * as _ from 'lodash-es';
import { ForecastTarget } from '../models/forecast-target';
import { ForecastDataSerivce } from './forecast-data.service';
import { LocationLookupItem } from '../models/location-lookup';

interface RawForecastToPlotDataItem {
  forecast_date: string,
  location: string,
  model: string,
  quantile: number | null,
  target: {
    end_date: string,
    time_ahead: number,
    type: 'cases' | 'death' | 'hosp'
  },
  timezero: string,
  type: 'observed' | 'point' | 'quantile',
  value: number
}

interface RawForecastToPlot {
  [location: string]: {
    [target: string]: {
      availableDates: Date[],
      data: RawForecastToPlotDataItem[]
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class ForecastJsonDataService extends ForecastDataSerivce {
  rawForecastData$: Observable<RawForecastToPlot>;

  constructor(private http: HttpClient) {
    super();
    this.rawForecastData$ = this.http.get<RawForecastToPlot>(environment.urls.forecastData.json, { responseType: 'json' })
      .pipe(shareReplay(1));
  }

  createForecastDataObservable(filter: ForecastDataFilter): Observable<{ availableForecastDates: Date[], data: ForecastData[], filter: { target: ForecastTarget, location: LocationLookupItem } }> {
    return combineLatest([this.rawForecastData$, filter.filter$])
      .pipe(map(([rawData, f]) => {
        const locationEntry = rawData[f.location.id];

        const emptyResult = { filter: f, availableForecastDates: [], data: [] };
        if (!locationEntry) {
          return emptyResult;
        }

        const entry = locationEntry[f.target];
        if (!entry) {
          return emptyResult;
        }

        // console.log("found entry for", f, entry);

        return {
          filter: f,
          availableForecastDates: _.orderBy(entry.availableDates.map(x => new Date(x)), x => x, 'desc'),
          data: entry.data.map(x => this.createForecastData(x))
        };
      }));
  }

  private createForecastData(item: RawForecastToPlotDataItem): ForecastData {
    const forecastType = this.parseForecastType(item.type);
    return {
      type: forecastType,
      forecast_date: new Date(item.forecast_date),
      location: item.location,
      model: item.model,
      target: {
        end_date: new Date(item.target.end_date),
        target_type: this.parseTargetType(item.target.type),
        time_ahead: item.target.time_ahead
      },
      timezero: new Date(item.timezero),
      value: item.value,
      quantile: forecastType == ForecastType.Quantile && item.quantile ? this.parseQuantile(item.quantile) : undefined
    }
  }
  private parseForecastType(type: string): ForecastType {
    switch (type) {
      case 'quantile':
        return ForecastType.Quantile;
      case 'point':
        return ForecastType.Point;
      case 'observed':
        return ForecastType.Observed;
      default:
        throw new Error(`Unknown forecast type '${type}' (expected: 'quantile' | 'point' | 'observed').`);
    }
  }
  private parseTargetType(type: string): ForecastTarget {
    switch (type) {
      case 'cases':
        return ForecastTarget.Cases;
      case 'death':
        return ForecastTarget.Death;
      case 'hosp':
        return ForecastTarget.Hospitalisation;
      default:
        throw new Error(`Unknown target type '${type}' (expected: 'cases' | 'death' | 'hosp').`);
    }
  }
  private parseQuantile(q: number): { type: QuantileType, point: QuantilePointType } {
    switch (q) {
      case 0.975:
        return { type: QuantileType.Q95, point: QuantilePointType.Upper };
      case 0.025:
        return { type: QuantileType.Q95, point: QuantilePointType.Lower };
      case 0.75:
        return { type: QuantileType.Q50, point: QuantilePointType.Upper };
      case 0.25:
        return { type: QuantileType.Q50, point: QuantilePointType.Lower };
      default:
        throw new Error(`Unknown quantile '${q}' (expected: 0.975 | 0.025 | 0.75 | 0.25). `)
    }
  }
}
