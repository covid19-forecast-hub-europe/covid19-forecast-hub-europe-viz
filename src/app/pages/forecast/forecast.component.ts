import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, Injector, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { differenceInDays, formatISO, isEqual, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import * as _ from 'lodash-es';
import { BehaviorSubject, Observable, combineLatest, iif, of } from 'rxjs';
import { shareReplay, debounceTime, map, distinctUntilChanged, delay } from 'rxjs/operators';
import { ColorPicker } from 'src/app/models/color-picker';
import { ChartDataView, ForecastModelData, QuantileType, ForecastByHorizonDisplayMode, ForecastByDateDisplayMode, ForecastDisplayMode, DisplaySettings, YScale, YValue, UserDefaultValue, ForecastData } from 'src/app/models/forecast-data';
import { ForecastTarget } from 'src/app/models/forecast-target';
import { LocationLookupItem } from 'src/app/models/location-lookup';
import { TruthData } from 'src/app/models/truth-data';
import { DefaultValues, mapQuantileTypeToUrl, mapUrlToQuantileType, UrlParamNames } from 'src/app/models/url-param-names';
import { DateToPrevSaturdayPipe } from 'src/app/pipes/date-to-prev-saturday.pipe';
import { TargetLabelPipe } from 'src/app/pipes/target-label.pipe';
import { DefaultSettingsService } from 'src/app/services/default-settings.service';
import { ForecastDataSerivce } from 'src/app/services/forecast-data.service';
import { LocationLookupService } from 'src/app/services/location-lookup.service';
import { TruthDataService } from 'src/app/services/truth-data.service';
import { DateHelper } from 'src/app/util/date-helper';

class DataPipeline {
  locationValueMap$: Observable<Map<string, number>>;
  availableDates$: Observable<Date[]>;
  truthDataSet$: Observable<{ filter: { location: LocationLookupItem; target: ForecastTarget; }; truthData: TruthData[]; }>;
  forecastDataSet$: Observable<{ filter: { target: ForecastTarget; location: LocationLookupItem; }; availableForecastDates: Date[]; data: ForecastData[]; }>;


  constructor(
    private truthData$: Observable<{ [locationId: string]: { [target: string]: TruthData[] } }>,
    private forecastService: ForecastDataSerivce,
    private filterValues: { location$: Observable<LocationLookupItem>, target$: Observable<ForecastTarget> }
  ) {
    const filter$ = combineLatest([this.filterValues.location$, this.filterValues.target$])
      .pipe(map(([location, target]) => { return { location, target }; }))
      .pipe(shareReplay(1));

    this.truthDataSet$ = combineLatest([this.truthData$, filter$])
      .pipe(map(([truthData, filter]) => {
        const data = truthData[filter.location.id][filter.target];
        return {
          filter: filter,
          truthData: data
        };
      }))
      .pipe(shareReplay(1));

    this.forecastDataSet$ = this.forecastService.createForecastDataObservable(filter$).pipe(shareReplay(1));
    this.availableDates$ = this.forecastDataSet$.pipe(map(x => x.availableForecastDates)).pipe(shareReplay(1));

    this.locationValueMap$ = combineLatest([this.truthData$, this.filterValues.target$])
      .pipe(map(([data, target]) => {
        return new Map<string, number>(_.map(data, (d, locationKey) => {

          const maxDateItem = _.maxBy(d[target], x => x.date);
          return [locationKey, maxDateItem ? maxDateItem.value : 0];
        }));
      }))
      .pipe(shareReplay(1));
  }
}

class DataViewPipeline {

  colorPicker = new ColorPicker();
  dataView$: Observable<ChartDataView>;
  allModelNames$: Observable<string[]>;

  constructor(
    private truthData$: Observable<{ filter: { target: ForecastTarget, location: LocationLookupItem }, truthData: TruthData[] }>,
    private forecastData$: Observable<{ filter: { target: ForecastTarget, location: LocationLookupItem }, availableForecastDates: Date[], data: ForecastData[] }>,
    private displaySettings$: Observable<DisplaySettings>
  ) {
    const forecastModelsDataView$ = combineLatest([forecastData$, displaySettings$])
      .pipe(map(([dataView, displaySettings]) => {
        const modelMap = _.reduce(dataView.data, (prev, curr) => {
          if (!prev.has(curr.model)) {
            prev.set(curr.model, { model: curr.model, color: this.colorPicker.pick(curr.model), data: [] });
          }

          const modelSeries = prev.get(curr.model)!;

          if (displaySettings.displayMode.$type === 'ForecastByDateDisplayMode') {
            if (DateHelper.sameDate(curr.timezero, displaySettings.displayMode.forecastDate) && curr.target.time_ahead <= displaySettings.displayMode.weeksShown) {
              modelSeries.data.push(curr);
            }
          }
          else if (displaySettings.displayMode.$type === 'ForecastByHorizonDisplayMode') {
            if (curr.target.time_ahead <= displaySettings.displayMode.weeksAhead) {
              modelSeries.data.push(curr);
            }
          }

          return prev;
        }, new Map<string, ForecastModelData>());
        return {
          displaySettings,
          availableDates: dataView.availableForecastDates,
          data: _.orderBy([...modelMap.values()], x => x.model)
        }
      }))
      .pipe(shareReplay(1));

    this.allModelNames$ = forecastModelsDataView$.pipe(map(x => x.data.map(d => d.model)));

    this.dataView$ = combineLatest([forecastModelsDataView$, truthData$])
      .pipe(debounceTime(50))
      .pipe(map(([forecastModelsDataView, truthData]) => {
        return {
          displaySettings: forecastModelsDataView.displaySettings,
          forecasts: forecastModelsDataView.data,
          truthData: truthData.truthData,
          filter: truthData.filter,
          availableDates: forecastModelsDataView.availableDates
        };
      }))
      .pipe(shareReplay(1));
  }
}

@Component({
  selector: 'app-forecast',
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss']
})
export class ForecastRebuildComponent implements OnInit {
  ForecastTargetEnum = ForecastTarget;
  QuantileTypeEnum = QuantileType;

  private targetLabelPipe = new TargetLabelPipe();
  private forecastDatePipe = new DateToPrevSaturdayPipe();
  // private userVisibleModels$ = new BehaviorSubject<string[] | undefined>(undefined);

  dataView$: Observable<ChartDataView>;
  locationsOrderedById$: Observable<LocationLookupItem[]>;
  locations$: Observable<LocationLookupItem[]>;
  locationValueMap$: Observable<Map<string, number>>;
  // visibleModels$: Observable<string[]>;
  allModelNames$: Observable<string[]>;
  ensembleModelNames$: Observable<string[]>;
  mapLegendHeader$: Observable<string>;

  targetValue: UserDefaultValue<ForecastTarget>;
  locationValue: UserDefaultValue<LocationLookupItem>;
  predictionIntervalValue: UserDefaultValue<QuantileType | undefined>;
  yScaleValue: UserDefaultValue<YScale>;
  yValueValue: UserDefaultValue<YValue>;
  displayModeValue: UserDefaultValue<"date" | "horizon">;
  dateDisplayModeValue: UserDefaultValue<ForecastDisplayMode>;
  horizonDisplayModeValue: UserDefaultValue<ForecastByHorizonDisplayMode>;
  dateDisplayModeWeeksShownValue: UserDefaultValue<1 | 2 | 3 | 4>;
  horizonDisplayModeWeeksAheadValue: UserDefaultValue<1 | 2 | 3 | 4>;
  forecastDateValue: UserDefaultValue<Date>;
  visibleModelsValue: UserDefaultValue<string[]>;

  constructor(private router: Router, private route: ActivatedRoute, private forecastService: ForecastDataSerivce, public locationService: LocationLookupService, private truthDataService: TruthDataService, private defaultSettingService: DefaultSettingsService) {
    this.ensembleModelNames$ = this.defaultSettingService.ensembleModelNames$;
    this.locationsOrderedById$ = this.locationService.locations$.pipe(map(x => _.orderBy(x.items, 'id')));
    this.locations$ = this.locationService.locations$.pipe(map(x => x.items));

    const defaultLocation$ =
      combineLatest([locationService.locations$, route.queryParamMap.pipe(distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.Location)))])
        .pipe(map(([loc, params]) => {
          if (params.has(UrlParamNames.Location)) {
            const locParam = params.get(UrlParamNames.Location)!;
            if (loc.has(locParam)) {
              return loc.get(locParam)!
            }
          }
          return loc.items[_.random(loc.items.length - 1)];
        }));
    const defaultTarget$ = route.queryParamMap.pipe(
      distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.Target)),
      map(params => {
        if (params.has(UrlParamNames.Target)) {
          const targetParam = params.get(UrlParamNames.Target)!.toLowerCase();
          if ([ForecastTarget.Cases.toLowerCase(), ForecastTarget.Death.toLowerCase(), ForecastTarget.Hospitalisation.toLowerCase()].indexOf(targetParam) > -1) {
            return targetParam as ForecastTarget;
          }
        }
        return DefaultValues.Target;
      }));
    this.locationValue = new UserDefaultValue(defaultLocation$, x => {
      this.updateUrlQueryParams({ [UrlParamNames.Location]: x?.id });
    });
    this.targetValue = new UserDefaultValue(defaultTarget$, x => {
      const val = x === DefaultValues.Target || x === null ? undefined : x;
      this.updateUrlQueryParams({ [UrlParamNames.Target]: val });
    });

    const dataPipeline = new DataPipeline(this.truthDataService.truthData$, this.forecastService, { location$: this.locationValue.value$, target$: this.targetValue.value$ });
    this.locationValueMap$ = dataPipeline.locationValueMap$;

    const defaultPredictionInterval$ = route.queryParamMap.pipe(
      distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.PredictionInterval)),
      map(params => {
        if (params.has(UrlParamNames.PredictionInterval)) {
          const paramValue = params.get(UrlParamNames.PredictionInterval)!.toLowerCase();
          const mapped = mapUrlToQuantileType(paramValue);
          if (mapped !== null) return mapped;
        }
        return DefaultValues.PredictionInterval;
      }));
    const defaultYScale$ = route.queryParamMap.pipe(
      distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.yScale)),
      map(params => {
        if (params.has(UrlParamNames.yScale)) {
          const paramValue = params.get(UrlParamNames.yScale)!.toLowerCase();
          if (_.includes(['linear', 'log'], paramValue)) {
            return paramValue as YScale;
          }
        }
        return DefaultValues.YScale;
      }));
    const defaultYValue$ = route.queryParamMap.pipe(
      distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.yValue)),
      map(params => {
        if (params.has(UrlParamNames.yValue)) {
          const paramValue = params.get(UrlParamNames.yValue)!.toLowerCase();
          if (_.includes(['count', 'incidence'], paramValue)) {
            return paramValue as YValue;
          }
        }
        return DefaultValues.YValue;
      }));
    const defaultDisplayMode$ = route.queryParamMap.pipe(
      distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.DisplayMode)),
      map(params => {
        if (params.has(UrlParamNames.DisplayMode)) {
          const paramValue = params.get(UrlParamNames.DisplayMode)!.toLowerCase();
          if (_.includes(['date', 'horizon'], paramValue)) {
            return paramValue as 'date' | 'horizon';
          }
        }
        return DefaultValues.DisplayMode;
      }));
    const defaultWeeksShow$ = route.queryParamMap.pipe(
      distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.WeeksShown)),
      map(params => {
        if (params.has(UrlParamNames.WeeksShown)) {
          const paramValue = parseInt(params.get(UrlParamNames.WeeksShown)!);
          if (_.isNumber(paramValue) && _.includes([1, 2, 3, 4], paramValue)) {
            return paramValue as 1 | 2 | 3 | 4;
          }
        }
        return DefaultValues.WeeksShown;
      }));
    const defaultForecastDate$ = combineLatest([route.queryParamMap.pipe(distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.ForecastDate))), dataPipeline.availableDates$])
      .pipe(map(([params, dates]) => {
        if (params.has(UrlParamNames.ForecastDate)) {
          const paramValue = parseISO(params.get(UrlParamNames.ForecastDate)!);
          if (isValid(paramValue)) {
            const closestDate = _.minBy(dates, x => Math.abs(differenceInDays(x, paramValue)));
            if (closestDate) {
              return closestDate;
            }
          }
        }

        return _.first(dates) || DefaultValues.ForecastDate;
      }));
    const defaultWeeksAhead$ = route.queryParamMap.pipe(
      distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.WeeksAhead)),
      map(params => {
        if (params.has(UrlParamNames.WeeksAhead)) {
          const paramValue = parseInt(params.get(UrlParamNames.WeeksAhead)!);
          if (_.isNumber(paramValue) && _.includes([1, 2, 3, 4], paramValue)) {
            return paramValue as 1 | 2 | 3 | 4;
          }
        }
        return DefaultValues.WeeksAhead;
      }));

    this.predictionIntervalValue = new UserDefaultValue(defaultPredictionInterval$, x => {
      const urlVal = x === DefaultValues.PredictionInterval || x === null
        ? undefined
        : mapQuantileTypeToUrl(x) || undefined;
      this.updateUrlQueryParams({ [UrlParamNames.PredictionInterval]: urlVal });
    });
    this.yScaleValue = new UserDefaultValue(defaultYScale$, x => {
      const urlVal = x === DefaultValues.YScale || x === null
        ? undefined
        : x;
      this.updateUrlQueryParams({ [UrlParamNames.yScale]: urlVal });
    });
    this.yValueValue = new UserDefaultValue(defaultYValue$, x => {
      const urlVal = x === DefaultValues.YValue || x === null
        ? undefined
        : x;
      this.updateUrlQueryParams({ [UrlParamNames.yValue]: urlVal });
    });
    this.displayModeValue = new UserDefaultValue(defaultDisplayMode$, x => {
      const urlVal = x === DefaultValues.DisplayMode || x === null
        ? undefined
        : x;
      this.updateUrlQueryParams({ [UrlParamNames.DisplayMode]: urlVal });
    });
    this.dateDisplayModeWeeksShownValue = new UserDefaultValue(defaultWeeksShow$, x => {
      const urlVal = x === DefaultValues.WeeksShown || x === null
        ? undefined
        : x.toString();
      this.updateUrlQueryParams({ [UrlParamNames.WeeksShown]: urlVal });
    });
    this.forecastDateValue = new UserDefaultValue(defaultForecastDate$, x => {
      const urlVal = x === null || DateHelper.sameDate(x, DefaultValues.ForecastDate) ? undefined : formatISO(this.forecastDatePipe.transform(x), { representation: 'date' });
      this.updateUrlQueryParams({ [UrlParamNames.ForecastDate]: urlVal });
    });
    this.horizonDisplayModeWeeksAheadValue = new UserDefaultValue(defaultWeeksAhead$, x => {
      const urlVal = x === DefaultValues.WeeksAhead || x === null
        ? undefined
        : x.toString();
      this.updateUrlQueryParams({ [UrlParamNames.WeeksAhead]: urlVal });
    });

    const defaultDateDisplayMode$ = combineLatest([this.forecastDateValue.value$, this.dateDisplayModeWeeksShownValue.value$])
      .pipe(map(([date, weeks]) => ({ $type: 'ForecastByDateDisplayMode', forecastDate: date, weeksShown: weeks } as ForecastDisplayMode)));
    this.dateDisplayModeValue = new UserDefaultValue(defaultDateDisplayMode$);

    this.horizonDisplayModeValue = new UserDefaultValue(this.horizonDisplayModeWeeksAheadValue.value$
      .pipe(map(weeks => { return { $type: 'ForecastByHorizonDisplayMode', weeksAhead: weeks } as ForecastByHorizonDisplayMode }))
    );

    const displaySettings$: Observable<DisplaySettings> = combineLatest([
      this.predictionIntervalValue.value$,
      combineLatest([this.displayModeValue.value$, this.dateDisplayModeValue.value$, this.horizonDisplayModeValue.value$]).pipe(map(([mode, date, horizon]) => {
        return mode === 'horizon' ? horizon : date;
      })),
      this.yScaleValue.value$,
      this.yValueValue.value$
    ]).pipe(map(([ci, dm, ys, yv]) => {
      return { confidenceInterval: ci, displayMode: dm, yScale: ys, yValue: yv };
    }));

    const dataViewPipeline = new DataViewPipeline(dataPipeline.truthDataSet$, dataPipeline.forecastDataSet$, displaySettings$);
    this.dataView$ = dataViewPipeline.dataView$.pipe(delay(1000000));
    this.allModelNames$ = dataViewPipeline.allModelNames$;

    const defaultVisibleModels$ = combineLatest([route.queryParamMap.pipe(distinctUntilChanged((prev, curr) => !curr.has(UrlParamNames.VisibleModels))), this.defaultSettingService.defaultModelNames$, dataViewPipeline.allModelNames$])
      .pipe(map(([params, d, a]) => {
        if (params.has(UrlParamNames.VisibleModels)) {
          const paramValue = params.getAll(UrlParamNames.VisibleModels)!;
          const onlyValid = paramValue.filter(x => _.includes(a.map(m => m.toLowerCase()), x.toLowerCase()));
          if (onlyValid.length > 0) {
            return onlyValid;
          }
        }
        return d || a
      }));

    this.visibleModelsValue = new UserDefaultValue(defaultVisibleModels$, x => {
      const urlVal = x === null || x.length === 0 ? undefined : x;
      this.updateUrlQueryParams({ [UrlParamNames.VisibleModels]: urlVal });
    });

    // this.visibleModels$ = 

    this.mapLegendHeader$ = this.targetValue.value$
      .pipe(map(x => {
        return `<b>${this.targetLabelPipe.transform(x)}</b><i> / 100,000 inhabitants</i>`;
      }));
  }

  ngOnInit(): void {
    // console.log("SNAP", this.route.snapshot);
  }

  changeTarget(target: ForecastTarget) {
    this.targetValue.changeValue(target);
  }

  changeLocation(location: LocationLookupItem) {
    this.locationValue.changeValue(location);
  }

  compareDates(l: Date, r: Date) {
    return DateHelper.sameDate(l, r);
  }

  changeConfidenceInterval(ci: QuantileType | undefined) {
    this.predictionIntervalValue.changeValue(ci);
  }

  changeYScale(value: YScale) {
    this.yScaleValue.changeValue(value);
  }

  changeYValue(value: YValue) {
    this.yValueValue.changeValue(value);
  }

  changeDisplayMode(type: 'ForecastByDateDisplayMode' | 'ForecastByHorizonDisplayMode') {
    const newMode = type === 'ForecastByHorizonDisplayMode' ? 'horizon' : 'date';
    this.displayModeValue.changeValue(newMode);
  }

  changeHorizonWeeksAhead(update: 1 | 2 | 3 | 4) {
    this.horizonDisplayModeWeeksAheadValue.changeValue(update);
  }

  changeDateWeeksShown(update: 1 | 2 | 3 | 4) {
    this.dateDisplayModeWeeksShownValue.changeValue(update);
  }

  canExecPrev(currentDisplaMode: ForecastDisplayMode, availableDates: Date[]) {
    return currentDisplaMode.$type === 'ForecastByDateDisplayMode' && this.getAvailableDateByDir('prev', currentDisplaMode, availableDates) !== undefined;
  }

  canExecNext(currentDisplaMode: ForecastDisplayMode, availableDates: Date[]) {
    return currentDisplaMode.$type === 'ForecastByDateDisplayMode' && this.getAvailableDateByDir('next', currentDisplaMode, availableDates) !== undefined;
  }

  private getAvailableDateByDir(dir: 'prev' | 'next', currentDisplaMode: ForecastDisplayMode, availableDates: Date[]): Date | undefined {
    if (currentDisplaMode.$type === 'ForecastByDateDisplayMode') {
      const searchDate = currentDisplaMode.forecastDate;
      const foundIndex = _.findIndex(availableDates, d => DateHelper.sameDate(d, searchDate));
      if (foundIndex !== -1) {
        const newDateIndex = dir === 'next' ? foundIndex - 1 : foundIndex + 1;
        if (newDateIndex >= 0 && newDateIndex < availableDates.length) {
          return availableDates[newDateIndex];
        }
      }
    }

    return undefined;
  }

  changeForecastDateByDir(dir: 'prev' | 'next', currentDisplaMode: ForecastDisplayMode, availableDates: Date[]) {
    const newDate = this.getAvailableDateByDir(dir, currentDisplaMode, availableDates);
    if (newDate) {
      this.changeForecastDate(newDate, availableDates);
    }
  }

  changeForecastDate(date: Date, dates: Date[]) {
    if (dates) {
      const closestDate = _.minBy(dates, x => Math.abs(differenceInDays(x, date)));
      if (closestDate && Math.abs(differenceInDays(closestDate, date)) <= 7) {
        this.forecastDateValue.changeValue(closestDate);
      }
    }
  }

  changeVisibleModels(visibleModels: string[]) {
    this.visibleModelsValue.changeValue(visibleModels);
  }

  updateUrlQueryParams(params: { [key: string]: string | string[] | undefined }) {
    this.router.navigate(['.'], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  @ViewChild(CdkScrollable) scroller?: CdkScrollable;

  scrollDown() {
    if (this.scroller) {
      const currentTop = this.scroller.measureScrollOffset('top');
      const newTop = currentTop + 42;
      this.scroller.scrollTo({ behavior: 'smooth', top: newTop });
    }
  }

  scrollUp() {
    if (this.scroller) {
      const currentTop = this.scroller.measureScrollOffset('top');
      const newTop = currentTop - 42;
      this.scroller.scrollTo({ behavior: 'smooth', top: newTop });
    }
  }
}
