import { QuantileType, YScale, YValue } from "./forecast-data";
import * as _ from 'lodash-es';
import { ForecastTarget } from "./forecast-target";

export class UrlParamNames {
    static readonly Location = 'location';
    static readonly Target = 'target';
    static readonly PredictionInterval = 'pi';
    static readonly yScale = 'yscale';
    static readonly yValue = 'yvalue';
    static readonly DisplayMode = 'displaymode';
    static readonly WeeksShown = 'weeksshown';
    static readonly WeeksAhead = 'weeksahead';
    static readonly ForecastDate = 'date';
    static readonly VisibleModels = 'models';
}

export class DefaultValues {
    static readonly Target = ForecastTarget.Cases;
    static readonly PredictionInterval = QuantileType.Q95;
    static readonly YScale: YScale = 'linear';
    static readonly YValue: YValue = 'count';
    static readonly DisplayMode: 'date' | 'horizon' = 'date';
    static readonly WeeksShown = 2;
    static readonly WeeksAhead = 1;
    static readonly ForecastDate = new Date();
}

const urlMap: [QuantileType | undefined, string][] = [
    [QuantileType.Q50, '50'],
    [QuantileType.Q95, '95'],
    [undefined, 'none']
];
export function mapQuantileTypeToUrl(q: QuantileType | undefined): string | null {
    const found = _.find(urlMap, ([qt]) => qt === q);
    if (found) return found[1];

    return null;
}

export function mapUrlToQuantileType(q: string): QuantileType | undefined | null {
    const found = _.find(urlMap, ([, s]) => s === q);
    if (found) return found[0];

    return null;
}