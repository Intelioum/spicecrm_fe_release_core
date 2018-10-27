/*
SpiceUI 2018.10.001

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {Component, OnInit} from '@angular/core';
import {model} from '../../services/model.service';
import {view} from '../../services/view.service';
import {language} from '../../services/language.service';
import {metadata} from '../../services/metadata.service';
import {fieldGeneric} from './fieldgeneric';
import {Router}   from '@angular/router';

@Component({
    selector: 'field-multienum',
    templateUrl: './src/objectfields/templates/fieldmultienum.html'
})
export class fieldMultienum extends fieldGeneric implements OnInit
{
    options: Array<any> = [];

    constructor(
        public model: model,
        public view: view,
        public language: language,
        public metadata: metadata,
        public router: Router
    ) {
        super(model, view, language, metadata, router);
    }

    ngOnInit(){
        this.buildOptions();
    }

    get columns(){
        return this.fieldconfig.columns ? parseInt( this.fieldconfig.columns) : 4;
    }

    get displayCheckboxes(){
        return this.fieldconfig.displaycheckboxes ? true : false;
    }

    getValue(): String {
        //return this.language.getFieldDisplayOptionValue(this.model.module, this.fieldname, this.model.data[this.fieldname]);
        let retArray = [];
        let values = this.getValueArray();
        for (let value of values)
        {
            let val = this.language.getFieldDisplayOptionValue(this.model.module, this.fieldname, value);
            if(val)
                retArray.push(val);
        }

        return retArray.join(', ');
    }

    getValueArray(): Array<any> {
        try {
            return this.model.data[this.fieldname].substring(1, this.model.data[this.fieldname].length - 1).split('^,^');
        }catch(e) {
            return [];
        }
    }

    buildOptions()
    {
        let options = this.language.getFieldDisplayOptions(this.model.module, this.fieldname);

        let countEntries = 0;
        for (let item in options) {
            countEntries++;
        }

        let entriesPerRow = countEntries / this.columns;
        let row = 0;
        let rowArray = [];
        for (let optionVal in options) {
            rowArray.push({
                id: this.model.generateGuid(),
                value: optionVal,
                display: options[optionVal]
            });

            if (rowArray.length >= entriesPerRow) {
                this.options.push(rowArray);
                rowArray = [];
            }
        }

        // push what is left
        if (rowArray.length > 0)
            this.options.push(rowArray);

    }

}