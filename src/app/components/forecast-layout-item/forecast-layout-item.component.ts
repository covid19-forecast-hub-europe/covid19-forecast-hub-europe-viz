import { TemplatePortal } from '@angular/cdk/portal';
import { Component, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-forecast-layout-item',
  templateUrl: './forecast-layout-item.component.html',
  styleUrls: ['./forecast-layout-item.component.scss']
})
export class ForecastLayoutItemComponent implements OnInit {

  @ViewChild(TemplateRef, {static: true}) _implicitContent: TemplateRef<any> | null = null;

  @Input() position: 'target' | 'location' | 'predictionInterval' | 'displayMode' | 'chart' | 'legend' | 'quickAccess' | 'header' | 'yAxis' = 'target';

  private _contentPortal: TemplatePortal | null = null;

  get content(): TemplatePortal | null {
    return this._contentPortal;
  }

  constructor(private _viewContainerRef: ViewContainerRef) { }

  ngOnInit(): void {
    this._contentPortal = this._implicitContent && new TemplatePortal(this._implicitContent, this._viewContainerRef);
  }
}
