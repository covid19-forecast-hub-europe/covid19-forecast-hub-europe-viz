import { faUserTag } from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject, combineLatest, Observable, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, first, map, shareReplay, tap } from 'rxjs/operators';
import { LocationLookupService } from '../services/location-lookup.service';
import { ForecastTarget } from './forecast-target';
import { LocationLookupItem } from './location-lookup';
import * as _ from 'lodash-es';
import { TruthData } from './truth-data';
import { DefaultValues, mapQuantileTypeToUrl, mapUrlToQuantileType, UrlParamNames } from './url-param-names';
import { isValid } from 'date-fns';
import { DateHelper } from '../util/date-helper';

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

// function createUserDefaultUrlPipe<T>(userValue$: Observable<T>, defaultValue$: Observable<NonNullable<T>>, urlName: string, updateUrlQueryParams: (params: { [k: string]: any }) => void): Observable<NonNullable<T>> {
//   const urlUpdatingUserValue$ = userValue$.pipe(tap(x => { if (x) { updateUrlQueryParams({ [urlName]: x }); } }));
//   return combineLatest([urlUpdatingUserValue$, defaultValue$])
//     .pipe(map(([userValue, defaultValue]) => {
//       return userValue ? userValue : defaultValue;
//     })) as Observable<NonNullable<T>>;
// }

export class UserDefaultValue<T> {
  private userValue$ = new BehaviorSubject<T | null>(null);
  value$ = combineLatest([this.userValue$.pipe(tap(x => console.log("User emited", x))), this.defaultValue$.pipe(tap(x => console.log("Default emited", x)))])
    .pipe(map(([u, d]) => u !== null ? u : d))
    .pipe(distinctUntilChanged((prev, curr) => {
      if(this.dateGuard(prev) && this.dateGuard(curr)) return DateHelper.sameDate(prev, curr);
      return prev === curr;
    }))
    .pipe(tap(x => console.log("combined used and default", x)))
    .pipe(shareReplay(1));

  constructor(private defaultValue$: Observable<T>, private userValueChanged?: (x: T | null) => void) {
  }

  changeValue(value: T | null) {
    this.userValue$.next(value);
    if (this.userValueChanged) this.userValueChanged(value);
  }

  private dateGuard(d: any): d is Date {
    return d instanceof Date && isValid(d);
  }
}

// export class ForecastDataFilter {

//   private userLocation$ = new BehaviorSubject<LocationLookupItem | undefined>(undefined);
//   location$ = createUserDefaultUrlPipe(this.userLocation$.asObservable(), this.defaultLocation$, UrlParamNames.Location, this.updateUrlQueryParams);

//   // combineLatest([this.userLocation$.asObservable()
//   //   .pipe(tap(x => {
//   //     if (x) {
//   //       this.updateUrlQueryParams({ [UrlParamNames.Location]: x?.id });
//   //     }
//   //   })), this.defaultLocation$])
//   //   .pipe(map(([userLocation, defaultLocation]) => {
//   //     return userLocation ? userLocation : defaultLocation;
//   //   }));

//   changeLocation(value: LocationLookupItem | undefined) { this.userLocation$.next(value); }

//   private userTarget$ = new BehaviorSubject<ForecastTarget | undefined>(undefined);
//   target$ = createUserDefaultUrlPipe(this.userTarget$.asObservable(), this.defaultTarget$, UrlParamNames.Target, this.updateUrlQueryParams);

//   // combineLatest([this.userTarget$.asObservable()
//   //   .pipe(tap(x => {
//   //     if (x) {
//   //       this.updateUrlQueryParams({ [UrlParamNames.Target]: x });
//   //     }
//   //   })), this.defaultTarget$])
//   //   .pipe(map(([userTarget, defaultTarget]) => {
//   //     return userTarget ? userTarget : defaultTarget;
//   //   }));


//   changeTarget(value: ForecastTarget) { this.userTarget$.next(value); }

//   filter$ = combineLatest([this.location$, this.target$])
//     .pipe(map(([location, target]) => { return { location, target }; }))
//     .pipe(shareReplay(1));



//   constructor(private defaultLocation$: Observable<LocationLookupItem>, private defaultTarget$: Observable<ForecastTarget>, private updateUrlQueryParams: (params: { [k: string]: any }) => void) {

//   }

// }

export type YScale = 'linear' | 'log';

export type YValue = 'count' | 'incidence';

// export class ForecastDisplaySettings {
//   private userConfidenceInterval$ = new BehaviorSubject<QuantileType | undefined>(undefined);
//   // confidenceInterval$ = createUserDefaultUrlPipe(this.userConfidenceInterval$.asObservable(), this.defaults.ci$, UrlParamNames.PredictionInterval, this.updateUrlQueryParams)

//   confidenceInterval$ = combineLatest([this.userConfidenceInterval$.asObservable().pipe(tap(x => {
//     // updateUrlQueryParams({ [urlName]: x });  
//     const urlParam = x === DefaultValues.PredictionInterval
//       ? undefined
//       : mapQuantileTypeToUrl(x);

//     this.updateUrlQueryParams({ [UrlParamNames.PredictionInterval]: mapQuantileTypeToUrl(x) });

//   })), this.defaults.ci$])
//     .pipe(map(([userValue, defaultValue]) => {
//       return userValue ? userValue : defaultValue;
//     }));
//   // combineLatest([this.defaults.ci$, this.userConfidenceInterval$.asObservable()])



//   changeConfidenceInterval(value: QuantileType | undefined) { this.userConfidenceInterval$.next(value); }
//   // getConfidenceInterval(): QuantileType | undefined { return this.userConfidenceInterval$.getValue(); }


//   // private userDisplayMode = new BehaviorSubject<ForecastDisplayMode>();

//   private selectedDisplayMode$ = new BehaviorSubject<'date' | 'horizon'>('date');
//   userDateDisplayMode$ = new BehaviorSubject<ForecastByDateDisplayMode | undefined>(undefined)
//   private defaultDateDisplayMode$ = this.availableDates$.pipe(map(dates => ({ $type: 'ForecastByDateDisplayMode', forecastDate: _.first(dates) || new Date(), weeksShown: 2 } as ForecastDisplayMode)))
//   dateDisplayMode$ = combineLatest([this.userDateDisplayMode$, this.defaultDateDisplayMode$]).pipe(map(([u, d]) => u ? u : d));
//   horizonDisplayMode$ = new BehaviorSubject<ForecastByHorizonDisplayMode>({ $type: 'ForecastByHorizonDisplayMode', weeksAhead: 1 });
//   yScale$ = new BehaviorSubject<YScale>('linear');
//   yValue$ = new BehaviorSubject<YValue>('count');

//   displayMode$ = combineLatest([this.selectedDisplayMode$, this.dateDisplayMode$, this.horizonDisplayMode$]).pipe(map(([mode, date, horizon]) => {
//     return mode === 'horizon' ? horizon : date;
//   }));

//   changeDisplayMode(value: 'date' | 'horizon') { this.selectedDisplayMode$.next(value); }
//   changeDateDisplayMode(value: ForecastByDateDisplayMode | undefined) {
//     this.userDateDisplayMode$.next(value);
//   }
//   changeHorizonDisplayMode(value: ForecastByHorizonDisplayMode) {
//     this.horizonDisplayMode$.next(value);
//   }
//   changeYScale(value: YScale) {
//     this.yScale$.next(value);
//   }
//   changeYValue(value: YValue) {
//     this.yValue$.next(value);
//   }

//   // get displayMode(): ForecastDisplayMode | undefined { return this.userDisplayMode$.getValue(); }

//   settings$: Observable<DisplaySettings> = combineLatest([this.confidenceInterval$, this.displayMode$, this.yScale$, this.yValue$])
//     .pipe(map(([ci, dm, ys, yv]) => {
//       return { confidenceInterval: ci, displayMode: dm, yScale: ys, yValue: yv };
//     }));

//   constructor(private defaults: { ci$: Observable<QuantileType | undefined>, yScale$: Observable<YScale>, yValue$: Observable<YValue> }, private availableDates$: Observable<Date[]>, private updateUrlQueryParams: (params: { [k: string]: any }) => void) {

//   }

// }

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

export interface DisplaySettings {
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
