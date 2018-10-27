/*
SpiceUI 2018.10.001

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {Injectable, NgZone} from '@angular/core';
declare var moment: any;

import {configurationService} from './configuration.service';
import {session} from './session.service';
import {model} from './model.service';
import {modelutilities} from './modelutilities.service';
import {backend} from './backend.service';
import {broadcast} from './broadcast.service';


@Injectable()
export class activitiyTimeLineService {

    parent: model;
    serviceSubscriptions: Array<any> = [];
    filters: any = {
        objectfilters: [],
        own: ''
    };

    // some config data
    defaultLimit = 5;
    modules: Array<string> = ['Activities', 'History'];
    timelineModules: Array<string> = ['Calls', 'Meetings', 'Tasks', 'Emails', 'Notes'];
    activeStates: Array<string> = ['Planned', 'In Progress', 'Not Started', 'Pending Input'];
    sortDates: any = {
        Calls: 'date_start',
        Meetings: 'date_start',
        Tasks: 'date_due',
        Emails: 'date_entered',
        Notes: 'date_entered'
    }

    activities: any = {
        Activities: {
            loading: false,
            list: [],
            totalcount: 0
        },
        History: {
            loading: false,
            list: [],
            totalcount: 0
        }
    };

    constructor(private backend: backend, private modelutilities: modelutilities, private configurationService: configurationService, private session: session, private broadcast: broadcast) {
        this.serviceSubscriptions.push(this.broadcast.message$.subscribe(message => this.handleMessage(message)));
    }

    stopSubscriptions() {
        for (let subscription of this.serviceSubscriptions) {
            subscription.unsubscribe();
        }
    }

    handleMessage(message: any) {
        let messageType = message.messagetype.split('.');
        if (messageType[0] === 'model') {

            // handle the message type
            switch (messageType[1]) {
                case 'save':
                    // decide if the bean is in activities or History
                    let module = 'History';
                    if (message.messagedata.data.status && this.activeStates.indexOf(message.messagedata.data.status) >= 0) {
                        module = 'Activities';
                    } else {
                        this.activities.Activities.list.some((item, index) => {
                            if (item.id == message.messagedata.id) {
                                this.activities.Activities.list.splice(index, 1);
                                return true;
                            }
                        });
                    }

                    if ((message.messagedata.data.parent_id === this.parent.id || message.messagedata.data.contact_id === this.parent.id) && this.timelineModules.indexOf(message.messagedata.module) >= 0) {
                        let foundItem = false;
                        this.activities[module].list.some((item, index) => {
                            if (item.id == message.messagedata.id) {
                                foundItem = true;
                                this.activities[module].list[index].data = message.messagedata.data;

                                return true;
                            }
                        });

                        if (!foundItem) {
                            this.activities[module].list.push({
                                module: message.messagedata.module,
                                id: message.messagedata.id,
                                data: message.messagedata.data
                            });
                            this.activities[module].totalcount++;
                        }

                        // reschuffle the list
                        this.sortListdata(module);
                    }
                    break;
                case 'delete':
                    let deleted = false;
                    if (this.timelineModules.indexOf(message.messagedata.module) >= 0) {
                        this.activities.Activities.list.some((item, index) => {
                            if (item.module === message.messagedata.module, item.id === message.messagedata.id) {
                                this.activities.Activities.list.splice(index, 1);
                                deleted = true;
                                return true;
                            }
                        })
                        if (deleted) return;
                        if (this.activities.History.list) {
                            this.activities.History.list.some((item, index) => {
                                if (item.module === message.messagedata.module, item.id === message.messagedata.id) {
                                    this.activities.History.list.splice(index, 1);
                                    deleted = true;
                                    return true;
                                }
                            })
                        }
                    }
                    break;
            }
        }
    }

    reload(){
        for(let module of this.modules) {
            this.getTimeLineData(module);
        }
    }

    getTimeLineData(module) {
        this.resetListData(module);
        this.activities[module].loading = true;

        let params = {
            count: true,
            limit: this.defaultLimit,
            objects: JSON.stringify(this.filters.objectfilters),
            own: this.filters.own
        };

        this.backend.getRequest('module/' + module + '/' + this.parent.module + '/' + this.parent.id, params)
            .subscribe((response : any) => {
                if (response) {
                    for(let item of response.items){
                        item.data = this.modelutilities.backendModel2spice(item.module, item.data);
                        /*for(let fieldName in item.data){
                            item[fieldName] = this.modelutilities.backend2spice(item.module, fieldName, item.data[fieldName]);
                        }
                        */
                    }
                    this.activities[module].list = response.items;
                    this.activities[module].list.totalcount = parseInt(response.count);
                }
                this.activities[module].loading = false;
            });
    }

    getMoreTimeLineData(module, addCount = 5) {
        if(!this.canLoadMore(module) || this.activities[module].loading)
            return;

        let params = {
            start: this.activities[module].list.length,
            limit: addCount,
            objects: JSON.stringify(this.filters.objectfilters),
            own: this.filters.own
        };

        this.activities[module].loading = true;

        this.backend.getRequest('module/' + module + '/' + this.parent.module + '/' + this.parent.id, params)
            .subscribe((response : any)=> {
                for (let item of response.items) {
                    // transform the data
                    item.data = this.modelutilities.backendModel2spice(item.module, item.data);

                    // add it
                    this.activities[module].list.push(item);
                }

                this.activities[module].loading = false;
            });
    }

    resetListData(module) {
        this.activities[module] = {
            loading: false,
            list: [],
            totalcount: 0
        };
    }

    canLoadMore(module){
        return this.activities[module].list.totalcount > this.activities[module].list.length;
    }

    sortListdata(module){
        this.activities[module].list.sort((a, b) => {
            let aDate = new moment(a.data[this.sortDates[a.module]]);
            let bDate = new moment(b.data[this.sortDates[b.module]]);

            return module !== 'Activities' ? aDate.isBefore(bDate) : aDate.isAfter(bDate);
        });
    }
}
