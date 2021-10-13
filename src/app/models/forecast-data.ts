import { faUserTag } from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject, combineLatest, Observable, ReplaySubject } from 'rxjs';
import { first, map, shareReplay } from 'rxjs/operators';
import { LocationLookupService } from '../services/location-lookup.service';
import { ForecastTarget } from './forecast-target';
import { LocationLookupItem } from './location-lookup';
import * as _ from 'lodash-es';
import { TruthData } from './truth-data';

export enum QuantileType {
  Q95,
  Q50
}

export enum QuantilePointType {
  Lower,
  Upper
}

export enum ForecastType {
  Observed = 'observed',
  Point = 'point',
  Quantile = 'quantile'
}

export interface ForecastData {
  forecast_date: Date;
  target: ForecastTargetDescription;
  location: string;
  type: ForecastType;
  quantile?: { type: QuantileType, point: QuantilePointType };
  value: number;
  timezero: Date;
  model: string;
}

export interface ForecastTargetDescription {
  time_ahead: number;
  target_type: ForecastTarget;
  end_date: Date;
}

export interface ForecastModelData {
  model: string;
  color: string;
  data: ForecastData[];
}

export class ForecastDataFilter {

  private userLocation$ = new BehaviorSubject<LocationLookupItem | undefined>(undefined);
  private defaultLocation$ = this.locationService.locations$.pipe(map(x => x.items[_.random(x.items.length - 1)])).pipe(shareReplay());
  location$ = combineLatest([this.userLocation$.asObservable(), this.defaultLocation$])
    .pipe(map(([userLocation, defaultLocation]) => {
      return userLocation ? userLocation : defaultLocation;
    }));

  // get location(): LocationLookupItem | undefined { return this.userLocation$.getValue(); }
  changeLocation(value: LocationLookupItem | undefined) { this.userLocation$.next(value); }

  private userTarget$ = new BehaviorSubject<ForecastTarget>(ForecastTarget.Cases);
  target$ = this.userTarget$.asObservable();

  getTarget(): ForecastTarget { return this.userTarget$.getValue(); }
  changeTarget(value: ForecastTarget) { this.userTarget$.next(value); }

  filter$ = combineLatest([this.location$, this.target$])
    .pipe(map(([location, target]) => { return { location, target }; }))
    .pipe(shareReplay(1));

  constructor(private locationService: LocationLookupService) {

  }

}

export class ForecastDisplaySettings {
  private userConfidenceInterval$ = new BehaviorSubject<QuantileType | undefined>(QuantileType.Q95);
  confidenceInterval$ = this.userConfidenceInterval$.asObservable();

  changeConfidenceInterval(value: QuantileType | undefined) { this.userConfidenceInterval$.next(value); }
  getConfidenceInterval(): QuantileType | undefined { return this.userConfidenceInterval$.getValue(); }


  // private userDisplayMode = new BehaviorSubject<ForecastDisplayMode>();

  private selectedDisplayMode$ = new BehaviorSubject<'date' | 'horizon'>('date');
  userDateDisplayMode$ = new BehaviorSubject<ForecastByDateDisplayMode | undefined>(undefined)
  private defaultDateDisplayMode$ = this.availableDates$.pipe(map(dates => ({ $type: 'ForecastByDateDisplayMode', forecastDate: _.first(dates) || new Date(), weeksShown: 2 } as ForecastDisplayMode)))
  dateDisplayMode$ = combineLatest([this.userDateDisplayMode$, this.defaultDateDisplayMode$]).pipe(map(([u, d]) => u ? u : d));
  horizonDisplayMode$ = new BehaviorSubject<ForecastByHorizonDisplayMode>({ $type: 'ForecastByHorizonDisplayMode', weeksAhead: 1 });
  yScale$ = new BehaviorSubject<'linear' | 'log'>('linear');
  yValue$ = new BehaviorSubject<'count' | 'incidence'>('count');

  displayMode$ = combineLatest([this.selectedDisplayMode$, this.dateDisplayMode$, this.horizonDisplayMode$]).pipe(map(([mode, date, horizon]) => {
    return mode === 'horizon' ? horizon : date;
  }));

  changeDisplayMode(value: 'date' | 'horizon') { this.selectedDisplayMode$.next(value); }
  changeDateDisplayMode(value: ForecastByDateDisplayMode | undefined) {
    this.userDateDisplayMode$.next(value);
  }
  changeHorizonDisplayMode(value: ForecastByHorizonDisplayMode) {
    this.horizonDisplayMode$.next(value);
  }
  changeYScale(value: 'linear' | 'log') {
    this.yScale$.next(value);
  }
  changeYValue(value: 'count' | 'incidence') {
    this.yValue$.next(value);
  }

  // get displayMode(): ForecastDisplayMode | undefined { return this.userDisplayMode$.getValue(); }

  settings$: Observable<DisplaySettings> = combineLatest([this.confidenceInterval$, this.displayMode$, this.yScale$, this.yValue$])
    .pipe(map(([ci, dm, ys, yv]) => {
      return { confidenceInterval: ci, displayMode: dm, yScale: ys, yValue: yv };
    }));

  constructor(private availableDates$: Observable<Date[]>) {

  }

}

export interface ForecastByDateDisplayMode {
  $type: 'ForecastByDateDisplayMode';

  forecastDate: Date;
  weeksShown: 1 | 2 | 3 | 4;
}

export interface ForecastByHorizonDisplayMode {
  $type: 'ForecastByHorizonDisplayMode';

  weeksAhead: 1 | 2 | 3 | 4;
}

export type ForecastDisplayMode = ForecastByDateDisplayMode | ForecastByHorizonDisplayMode;

interface DisplaySettings {
  confidenceInterval: QuantileType | undefined;
  displayMode: ForecastDisplayMode;
  yScale: 'linear' | 'log';
  yValue: 'count' | 'incidence';
}

export interface ChartDataView {
  displaySettings: DisplaySettings,
  filter: { target: ForecastTarget, location: LocationLookupItem },
  forecasts: ForecastModelData[],
  truthData: TruthData[],
  availableDates: Date[]
}
