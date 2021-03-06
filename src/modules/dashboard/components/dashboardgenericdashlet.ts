/*
SpiceUI 2018.10.001

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {Component, AfterViewInit, OnInit, ViewChild, ViewContainerRef, ElementRef} from "@angular/core";
import {model} from "../../../services/model.service";
import {view} from "../../../services/view.service";
import {metadata} from "../../../services/metadata.service";
import {language} from "../../../services/language.service";
import {backend} from "../../../services/backend.service";

@Component({
    selector: "dashboard-generic-dashlet",
    templateUrl: "./src/modules/dashboard/templates/dashboardgenericdashlet.html",
    providers: [model, view]
})
export class DashboardGenericDashlet implements OnInit {
    private loading: boolean = true;
    private records: Array<any> = [];
    private recordcount: number = 0;
    private dashletconfig: any = null;
    private dashletModule: string = undefined;
    private dashletLabel: string = undefined;
    private dashletFields: Array<any> = [];
    private dashletFieldSet: any = undefined;
    private canLoadMore: boolean = true;
    private loadLimit: number = 20;

    @ViewChild("tablecontainer", {read: ViewContainerRef}) private tablecontainer: ViewContainerRef;
    @ViewChild("headercontainer", {read: ViewContainerRef}) private headercontainer: ViewContainerRef;

    constructor(private language: language, private metadata: metadata, private backend: backend, private model: model, private elementRef: ElementRef) {

    }

    public ngOnInit() {
        // set the module on the model
        this.model.module = this.dashletModule;
        this.loadLimit = this.dashletconfig.limit || this.loadLimit;

        // load the dashlet records
        this.loadRecords();
    }

    get dashletTitle() {
        return this.language.getLabel(this.dashletLabel);
    }

    get islarge() {
        return window.innerWidth > 768;
    }

    get tableContainerStyle() {
        return {
          width: '100%',
          height: `calc(100% - ${this.headercontainer.element.nativeElement.getBoundingClientRect().height}px)`
        };
    }

    private loadRecords() {
        let params = this.params;
        if (this.dashletModule) {
            this.backend.getRequest("module/" + this.dashletModule, params).subscribe((records: any) => {
                this.records = records.list;
                this.recordcount = +records.list.length;
                this.loading = false;
                if (records.list.length < this.loadLimit) {
                    this.canLoadMore = false;
                }
            });
        }
    }

    get params() {
        let fieldArray: string[] = [];
        let params: any = {fields: fieldArray};

        if (this.dashletconfig) {
            if (this.dashletconfig.fieldset) {
                this.dashletFields = this.metadata.getFieldSetFields(this.dashletconfig.fieldset);
                for (let field of this.dashletFields) {
                    fieldArray.push(field.field);
                }
                this.dashletFieldSet = this.dashletconfig.fieldset;
            }
            if (this.dashletconfig.filters) {
                for (let filter in this.dashletconfig.filters) {
                    params[filter] = this.dashletconfig.filters[filter];
                }
            }
            if (this.dashletconfig.modulefilter) {
                params.modulefilter = this.dashletconfig.modulefilter;
            }
        }
        params.limit = this.loadLimit;

        return params;
    }

    get tablestyle() {
        let element = this.headercontainer.element.nativeElement;
        return {height: `calc(98% - ${element.clientHeight}px`};

    }

    private onScroll() {
        let element = this.tablecontainer.element.nativeElement;
        if (element.scrollTop + element.clientHeight >= element.scrollHeight) {
            this.loadMore();
        }
    }

    private loadMore() {
        if (this.canLoadMore) {
            this.loading = true;
            let params: any = this.params;
            params.offset = this.records.length;
            this.backend.getRequest("module/" + this.dashletModule, params).subscribe((records: any) => {
                this.records = this.records.concat(records.list);
                this.recordcount += +records.list.length;
                if (records.list.length < this.loadLimit) {
                    this.canLoadMore = false;
                }
                this.loading = false;
            });
        }
    }


}