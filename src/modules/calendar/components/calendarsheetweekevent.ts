/*
SpiceUI 2018.10.001

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {
    AfterViewInit, ComponentFactoryResolver, Component, ElementRef, NgModule, ViewChild, ViewContainerRef, Input,
    OnInit, Renderer2, Output, EventEmitter
} from '@angular/core';
import {HttpClient, HttpHeaders, HttpResponse} from "@angular/common/http";
import {model} from '../../../services/model.service';
import {metadata} from '../../../services/metadata.service';
import {view} from '../../../services/view.service';
import {language} from '../../../services/language.service';
import {broadcast} from '../../../services/broadcast.service';
import {navigation} from '../../../services/navigation.service';
import {calendar} from '../services/calendar.service';

declare var moment: any;

@Component({
    selector: 'calendar-sheet-week-event',
    templateUrl: './src/modules/calendar/templates/calendarsheetweekevent.html',
    providers:[model, view],
    host:{
        'class' : 'slds-is-absolute',
        '(dragstart)' : 'this.dragStart($event)',
        '(dragend)' : 'this.dragEnd($event)'
    }
})
export class CalendarSheetWeekEvent implements OnInit{
    @Input() event: any = {};
    @Output() rearrange: EventEmitter<any> = new EventEmitter<any>();

    componentconfig: any = {};
    fields: Array<any> = [];

    mouseMoveListener: any = undefined;
    mouseUpListener: any = undefined;
    mouseStart: any = undefined;
    mouseLast: any = undefined;

    sheetHourHeight: number = 60;
    lastMoveTimeSpan: number = 0;

    constructor(private language: language, private metadata: metadata, private broadcast: broadcast, private calendar: calendar, private elementRef: ElementRef, private model: model, private renderer: Renderer2) {
        // this.calendar.sheetHourHeight = this.calendar.sheetHourHeight;
    }

    ngOnInit(){
        this.model.module = this.event.module;
        this.model.id = this.event.id;
        this.model.data = this.event.data;

        // load the config and the fieldset
        this.componentconfig = this.metadata.getComponentConfig('CalendarSheetDayEvent', this.event.module);
        if (this.componentconfig.fieldset)
            this.fields = this.metadata.getFieldSetFields(this.componentconfig.fieldset);
    }

    getEventStyle(){
        try {
            return {
                'background-color': this.componentconfig.colors.default ? this.componentconfig.colors.default : '#d5e4f0'
            }
        } catch(e){
            return {
                'background-color': '#d5e4f0'
            }
        }
    }

    dragStart(event){
        this.event.dragging = true;
    }

    dragEnd(event){
        this.event.dragging = false;
    }

    onMouseDown(e) {

        this.mouseStart = e;
        this.mouseLast = e;

        this.mouseUpListener = this.renderer.listen('document', 'mouseup', (event) => this.onMouseUp());
        this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (event) => this.onMouseMove(event));

        event.preventDefault();
    }

    onMouseMove(e) {
        this.mouseLast = e;

        let moved = (this.mouseLast.pageY - this.mouseStart.pageY)

        let span = Math.floor(moved / 15);
        if(this.lastMoveTimeSpan !== span){
            this.lastMoveTimeSpan = span;
            this.event.end = new moment(this.event.start).add(this.event.data.duration_hours * 60 + this.event.data.duration_minutes + this.lastMoveTimeSpan * 15, 'm' );
        }

    }

    onMouseUp() {
        this.mouseUpListener();
        this.mouseMoveListener();

        this.mouseStart = undefined;
        this.mouseLast = undefined;

        let durationMinutes = parseInt(this.event.data.duration_hours) * 60 + parseInt(this.event.data.duration_minutes) + this.lastMoveTimeSpan * 15;
        this.event.data.duration_hours = Math.floor(durationMinutes / 60);
        this.event.data.duration_minutes = durationMinutes - this.event.data.duration_hours * 60;

        // save the event
        this.event.saving = true;
        this.model.save().subscribe(data => {
            this.event.saving = false;
        });

        // emit to rearrange on the sheet
        this.rearrange.emit();

        this.lastMoveTimeSpan = 0;

    }
}