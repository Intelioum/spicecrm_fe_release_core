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
    Component, Input, OnInit,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import {Router} from '@angular/router';
import {Subject, Observable} from 'rxjs';

import {model} from '../../services/model.service';
import {modal} from '../../services/modal.service';
import {language} from '../../services/language.service';
import {view} from '../../services/view.service';
import {metadata} from '../../services/metadata.service';


@Component({
    templateUrl: './src/objectcomponents/templates/objecteditmodal.html',
    providers: [view]
})
export class ObjectEditModal implements OnInit {
    @ViewChild('modalContent', {read: ViewContainerRef}) private modalContent: ViewContainerRef;
    private componentconfig: any = {};
    private actionSetItems: any = [];
    private showDuplicates: boolean = false;

    private actionSubject: Subject<any> = new Subject<any>();
    private action$: Observable<any> = new Observable<any>();

    private doDuplicateCheck: boolean = true;
    private duplicates: any[] = [];

    @Input() public preventGoingToRecord = false;

    private self: any = {};

    constructor(
        private router: Router,
        private language: language,
        private model: model,
        private view: view,
        private metadata: metadata,
        private modal: modal
    ) {
        this.view.isEditable = true;
        this.view.setEditMode();

        this.action$ = this.actionSubject.asObservable();
    }

    public ngOnInit() {
        this.componentconfig = this.metadata.getComponentConfig(this.constructor.name, this.model.module);
        this.actionSetItems = this.metadata.getActionSetItems(this.componentconfig.actionset);
    }

    private closeModal() {
        // cancel Edit
        this.model.cancelEdit();

        // emit that we saved;
        this.actionSubject.next(false);
        this.actionSubject.complete();

        // destroy the component
        this.self.destroy();
    }

    get modalHeader() {
        if (this.showDuplicates) {
            return this.language.getLabel('LBL_DUPLICATES_FOUND');
        } else {
            return this.model.module != '' ? this.language.getModuleName(this.model.module, true) : '';
        }
    }

    private save(goDetail: boolean = false) {
        if ( this.preventGoingToRecord ) goDetail = false;
        if (this.model.validate()) {
            if (this.model.isNew && this.doDuplicateCheck && !this.showDuplicates && this.metadata.getModuleDuplicatecheck(this.model.module)) {
                this.model.duplicateCheck(true).subscribe(dupdata => {
                    if (dupdata.length > 0) {
                        this.duplicates = dupdata;
                        this.modalContent.element.nativeElement.scrollTop = 0;
                        this.showDuplicates = true;
                    } else {
                        this.saveModel(goDetail);
                    }
                });
            } else {
                this.saveModel(goDetail);
            }
        } else {
            console.warn(this.model.messages);
        }

    }

    private saveModel(goDetail: boolean = false) {
        this.modal.openModal('SystemLoadingModal').subscribe(modalRef => {
            modalRef.instance.messagelabel = 'LBL_SAVING_DATA';
            this.model.save(true).subscribe(status => {
                if (status) {
                    // emit that we saved;
                    this.actionSubject.next(this.model.data);
                    this.actionSubject.complete();

                    /// if go Deail go to record)
                    if (goDetail) {
                        this.model.goDetail();
                    }

                    // destroy the component
                    this.self.destroy();
                }
                modalRef.instance.self.destroy();
            },
                error => {
                    modalRef.instance.self.destroy();
                });
        });
    }

    private saveToRelated(related_module: string) {
        if (!this.model.validate()) {
            return false;
        }

        this.model.save().subscribe(
            status => {
                let parent = this.model.clone(); // has to be BEFORE closeModal()!
                this.closeModal();

                this.model.reset();
                this.model.module = related_module;

                this.model.initialize(parent);
                this.model.data.acl = {'edit': true}; // bwuäh...
                this.model.isNew = true;
                this.model.edit();
            }
        );
    }

    private saveAndGoToRelated(related_module: string, related_id) {
        if (!this.model.validate()) {
            return false;
        }

        this.model.save().subscribe(status => {
            this.closeModal();
            this.router.navigate(['/module/' + related_module + '/' + related_id]);
        });
    }

    private setModule(module) {
        this.model.module = module;
    }

    /*
     style function for the duplicate overlay
     */
    get duplicateStyle() {
        if (this.modalContent) {
            let rect = this.modalContent.element.nativeElement.getClientRects();
            return {
                height: rect[0].height + 'px',
                width: rect[0].width + 'px',
                top: '0px'
            };
        } else {
            return {
                height: '0px',
                width: '0px',
                top: '0px'
            };
        }
    }

    /*
     style function to prevent overflow to display scrollbar when duplicate check is displayed
     */
    get contentStyle() {
        if (this.showDuplicates) {
            return {
                'overflow-y': 'hidden'
            };
        }
    }
}