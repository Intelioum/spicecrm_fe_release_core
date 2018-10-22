/*
SpiceUI 1.1.0

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {Component, ElementRef, Renderer, Input, Output, OnDestroy, EventEmitter} from '@angular/core';
import {metadata} from '../../services/metadata.service';
import {language} from '../../services/language.service';
import {model} from '../../services/model.service';
import {popup} from '../../services/popup.service';
import {view} from '../../services/view.service';
import {broadcast} from '../../services/broadcast.service';
import { helper } from '../../services/helper.service';

@Component({
    selector: 'object-action-menu',
    templateUrl: './src/objectcomponents/templates/objectactionmenu.html',
    providers: [popup, helper],
    host: {
        //    '(document:click)': 'onClick($event)'
    }
})
export class ObjectActionMenu implements OnDestroy {

    @Input() buttonsize: string = '';
    @Input() addactions: Array<any> = [];
    @Input() addeditactions: Array<any> = [];
    @Input() standardactions: boolean = true;
    @Input() standardeditactions: boolean = true;
    @Output() action: EventEmitter<string> = new EventEmitter<string>();
    isOpen: boolean = false;
    popupSubscription: any;
    clickListener: any;

    constructor(private language: language, private broadcast: broadcast, private model: model, private view: view, private metadata: metadata, private elementRef: ElementRef, private renderer: Renderer, private popup: popup, private helper: helper ) {
        this.popupSubscription = this.popup.closePopup$.subscribe(close => {
            this.isOpen = false;
        })
    }

    ngOnDestroy() {
        this.popupSubscription.unsubscribe();
    }

    isEditMode() {
        return this.view.isEditMode();
    }

    hasNoActions()
    {
        // because of custom actions can't be checked if they are enabled... return false
        if(this.addactions.length > 0)
            return false;

        if (this.standardactions) {
            if (this.model.data.acl && this.model.data.acl.edit === false && this.model.data.acl.delete === false)
                return true;
        }

        return false;
        /*
        if (this.standardactions) {
            if (this.model.data.acl && this.model.data.acl.edit === false && this.model.data.acl.delete === false)
                return this.addactions.length == 0;
            else
                return false;
        } else {
            return this.addactions.length == 0;
        }
        */
    }

    canEdit() {
        return this.model.data.acl.edit;
    }

    canDelete() {
        return this.model.data.acl.delete;
    }

    cancelEdit() {
        this.model.cancelEdit();
        this.view.setViewMode();
    }

    saveModel() {
        this.model.save(true).subscribe(data => {
            this.view.setViewMode();
        })
    }

    toggleOpen() {
        this.isOpen = !this.isOpen;

        // toggle the listener
        if (this.isOpen) {
            this.clickListener = this.renderer.listenGlobal('document', 'click', (event) => this.onClick(event));
        } else if (this.clickListener)
            this.clickListener();

    }

    public onClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen = false;
        }
    }

    editModel() {
        this.model.edit(true);
    }

    confirmDelete(){
        this.helper.confirm(this.language.getLabel('LBL_DELETE_RECORD'), this.language.getLabel('MSG_DELETE_CONFIRM')).subscribe(answer =>{
            if(answer){
                this.deleteModel();
            }
        });
    }

    deleteModel() {
        this.isOpen = false;
        this.model.delete().subscribe(status => {
            if (status) {
                // this.broadcast.broadcastMessage('model.delete', {id: this.model.id});
            }
        })
    }

    doCustomAction(action) {
        this.action.emit(action);
        this.isOpen = false;
    }

    getButtonSizeClass() {
        if (this.buttonsize !== '')
            return 'slds-button--icon-' + this.buttonsize;
    }

    getDropdownLocationClass() {
        let rect = this.elementRef.nativeElement.getBoundingClientRect();
        if (window.innerHeight - rect.bottom < 100)
            return 'slds-dropdown--bottom';
    }
}