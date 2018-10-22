/*
SpiceUI 1.1.0

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {Component, ElementRef, Renderer, ViewChild, ViewContainerRef} from '@angular/core';
import {model} from '../../services/model.service';
import {popup} from '../../services/popup.service';
import {view} from '../../services/view.service';
import {language} from '../../services/language.service';
import {metadata} from '../../services/metadata.service';
import {fieldGeneric} from './fieldgeneric';
import {Router} from '@angular/router';
import {userpreferences} from "../../services/userpreferences.service";

declare var moment: any;

@Component({
    selector: 'field-date-time',
    templateUrl: './src/objectfields/templates/fielddatetime.html',
    providers: [popup]
})
export class fieldDateTime extends fieldGeneric {
    @ViewChild('timefield', {read: ViewContainerRef}) private timefield: ViewContainerRef;

    private showDatePicker: boolean = false;
    private showTimePicker: boolean = false;
    private isValid: boolean = true;
    private errorMessage: String = '';
    private popupSubscription: any = undefined;
    private clickListener: any = undefined;
    private dropdownTimes: Array<any> = [];

    constructor(public model: model, public view: view, public language: language, public metadata: metadata, public router: Router, private popup: popup, private renderer: Renderer, private elementRef: ElementRef, private userpreferences: userpreferences) {
        super(model, view, language, metadata, router);
        let i = 0;
        while (i < 24) {
            let timeString = '';
            if (i < 10) {
                timeString += '0' + i + ':';
            } else {
                timeString = i + ':';
            }

            this.dropdownTimes.push(timeString + '00');
            this.dropdownTimes.push(timeString + '15');
            this.dropdownTimes.push(timeString + '30');
            this.dropdownTimes.push(timeString + '45');

            i++;
        }
    }

    /*
     * toggle the datepicker and subscribe to the close event
     */
    private toggleDatePicker() {
        this.showDatePicker = !this.showDatePicker;
        if (this.showDatePicker) {
            this.clickListener = this.renderer.listenGlobal('document', 'click', (event) => this.onClick(event));
            this.popupSubscription = this.popup.closePopup$.subscribe(event => {
                this.showDatePicker = false;
                this.clickListener();
                this.popupSubscription.unsubscribe();
            });
        } else {
            this.popupSubscription.unsubscribe();
        }
    }

    private toggleTimePicker() {
        this.showTimePicker = !this.showTimePicker;
        if (this.showTimePicker) {
            this.clickListener = this.renderer.listenGlobal('document', 'click', (event) => this.onClick(event));
        }
    }

    public onClick(event: MouseEvent): void {
        const clickedInside = this.elementRef.nativeElement.contains(event.target);
        if (!clickedInside) {
            this.clickListener();
            this.showDatePicker = false;
            this.showTimePicker = false;
        }
    }

    // overwrite get Field Class
    public getFieldClass() {
        let classes: Array<string> = [];
        if (!this.isValid) {
            classes.push('slds-has-error');
        }
        return classes;
    }

    /*
     get the positon for the time dropdown
     */
    get timefieldStyle() {
        let rect = this.timefield.element.nativeElement.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top + rect.height
        };
    }

    get displayValue() {
        try {
            if (this.model.getField(this.fieldname)) {
                let date = this.model.getField(this.fieldname);
                if (date.isValid()) {
                    if (this.fieldconfig.displayfromnow) {
                        return date.fromNow();
                    } else {
                        return date.format(this.userpreferences.getDateFormat() + ' ' + this.userpreferences.getTimeFormat());
                    }
                } else {
                    return '';
                }
            } else {
                return '';
            }
        } catch (e) {
            return '';
        }
    }


    get displaySpan() {
        try {
            if (this.model.getField(this.fieldname)) {
                let date = this.model.getField(this.fieldname);
                if (date.isValid()) {
                    return date.fromNow();
                } else {
                    return '';
                }
            } else {
                return '';
            }
        } catch (e) {
            return '';
        }
    }

    get displayDate() {
        try {
            if (this.model.getField(this.fieldname)) {
                let date = this.model.getField(this.fieldname);
                if (date.isValid()) {

                    return date.format(this.userpreferences.getDateFormat());
                } else {
                    return '';
                }
            } else {
                return '';
            }
        } catch (e) {
            return '';
        }
    }

    get displayTime() {
        try {
            if (this.model.getField(this.fieldname)) {
                let date = this.model.getField(this.fieldname);
                if (date.isValid()) {

                    return date.format(this.userpreferences.getTimeFormat());
                } else {
                    return '';
                }
            } else {
                return '';
            }
        } catch (e) {
            return '';
        }
    }


    set editDate(e: string) {
        let setDate = moment(e, this.userpreferences.getDateFormat(), true);
        if (setDate.isValid()) {

            // set the time
            if (this.model.getField(this.fieldname) && !isNaN(this.model.getField(this.fieldname).hour())) {
                setDate.hour(this.model.getField(this.fieldname).hour());
                setDate.minute(this.model.getField(this.fieldname).minute());
                setDate.second(0);
            }

            this.value = setDate;

            // set the data so rules and emitter get triggered
            this.model.setFieldValue(this.fieldname, setDate);

            this.isValid = true;
            this.errorMessage = '';
        } else {
            // if (e.length !== 10) {
            this.isValid = false;
            this.errorMessage = e + ' is not a valid date';
        }
    }

    get editDate() {
        try {
            if (this.model.getField(this.fieldname)) {
                let date = this.model.getField(this.fieldname);
                if (date.isValid()) {
                    return date.format(this.userpreferences.getDateFormat());
                } else {
                    return '';
                }
            } else {
                return '';
            }
        } catch (e) {
            return '';
        }
    }

    get editTime() {

        try {
            if (this.model.getField(this.fieldname)) {
                let time = new moment(this.model.getField(this.fieldname));
                if (time.isValid()) {
                    return time.format('HH:mm');
                } else {
                    return '';
                }
            } else {
                return '';
            }
        } catch (e) {
            return '';
        }
    }

    set editTime(value) {
        let setTime = new moment(value, this.userpreferences.getTimeFormat(), true);
        setTime.second(0);
        if (setTime.isValid()) {
            // set the date
            if (this.model.getField(this.fieldname) && !isNaN(this.model.getField(this.fieldname).year())) {
                setTime.year(this.model.getField(this.fieldname).year());
                setTime.month(this.model.getField(this.fieldname).month());
                setTime.date(this.model.getField(this.fieldname).date());
            }


            this.value = setTime;

            // set the data so rules and emitter get triggered
            this.model.setFieldValue(this.fieldname, setTime);

            this.isValid = true;
            this.errorMessage = '';
        } else {
            this.isValid = false;
            this.errorMessage = value + ' is not a valid time';
        }
    }

    private setTime(value) {
        this.editTime = value;
        this.showTimePicker = false;
    }

    set pickerDate(date: any) {
        this.editDate = date.format(this.userpreferences.getDateFormat());
    }

    get pickerDate() {
        let pickerDate = new moment(this.model.getField(this.fieldname));
        if (pickerDate.isValid()) {
            return new moment(this.model.getField(this.fieldname));
        } else {
            return new moment();
        }
    }

    get highlightdate() {
        return (this.fieldconfig.highlightpast == 1 || this.fieldconfig.highlightpast === true) && this.editDate && new moment() > new moment(this.model.getField(this.fieldname)) ? true : false;
    }
}
