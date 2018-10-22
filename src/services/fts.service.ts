/*
SpiceUI 1.1.0

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpResponse} from "@angular/common/http";

import {configurationService} from './configuration.service';
import {session} from './session.service';
import {modelutilities} from './modelutilities.service';
import {backend} from './backend.service';
import {metadata} from './metadata.service';
import {Router}   from '@angular/router';
import {Observable, Subject} from 'rxjs';
//import {isUndefined} from "util";

@Injectable()
export class fts {

    hits: Array<any> = [];
    found: number = 0;
    runningsearch: any = undefined;
    runningmodulesearch: any = undefined;
    searchTerm: string = '';
    searchSort: any = {};
    searchAggregates: any = {};
    searchModules: Array<any> = [];
    moduleSearchresults: Array<any> = [];
    lastSearchParams: any = {};

    gloablSearchResults: any = {};

    constructor(
        private backend: backend,
        private http: HttpClient,
        private configurationService: configurationService,
        private session: session,
        private modelutilities: modelutilities,
        private metadata: metadata,
    ) {
        this.getSearchModules();
    }

    private transformHits(hits) {
        let retArray = [];
        for (let hit of hits) {
            retArray.push(this.tranformHit(hit));
        }
        return retArray;
    }

    private tranformHit(hit) {
        // transform the fields
        for (let field in hit._source) {
            if (hit._source.hasOwnProperty(field) && typeof(hit._source[field]) == 'string') {
                // bugfix S&P gets translated later on anyway .. no need to do this here
                // hit._source[field] = this.modelutilities.backend2spice(hit._type, field, hit._source[field])
                hit._source[field] = hit._source[field];
            }
        }
        return hit;
    }

    search(searchterm, size: number = 5) {

        // set the searchterm
        this.searchTerm = searchterm;

        // if we have a running search cancel it ...
        if (this.runningsearch)
            this.runningsearch.unsubscribe();

        this.resetData();

        this.runningsearch = this.backend.getRequest(
            'fts/searchterm/' + encodeURIComponent(searchterm),
            {size: size},
        ).subscribe((response) => {
                this.hits = response['hits'].hits;
                this.found = response['hits'].total;
                this.runningsearch = undefined;
            });
    }

    searchByModules(searchterm:string, modules: Array<string> = [], size: number = 5, aggregates = {}, sortparams: any = {}, owner = false) {
        let retSubject = new Subject<any>();
        // if no module is passed .. search all modules
        if (modules.length === 0) modules = this.searchModules;

        if( searchterm.indexOf('%') != -1 )
            searchterm = searchterm.replace(/%/g, '*');
        searchterm = searchterm.trim();
        // set the searchterm
        this.searchTerm = searchterm;
        this.searchAggregates = aggregates;
        this.searchSort = sortparams;


        // todo: check if same search is done .. and then do nothing .. avoid too many calls

        // if we have a running search cancel it ...
        if (this.runningmodulesearch)
            this.runningmodulesearch.unsubscribe();

        // this.resetModuleData();
        //this.runningmodulesearch = this.http.post(this.configurationService.getBackendUrl() + '/fts/globalsearch' + (modules.length > 0 ? '/' + modules.join(',') : '') + (searchterm ? '/' + searchterm : '') + '?session_id=' + this.session.authData.sessionId + '&records=' + size, {aggregates: this.searchAggregates, sort: this.searchSort})
        this.runningmodulesearch = this.backend.postRequest('fts/globalsearch' + (modules.length > 0 ? '/' + modules.join(',') : '') + (searchterm ? '/' + encodeURIComponent(searchterm) : ''), {records: size, owner: owner}, {
            aggregates: this.searchAggregates,
            sort: this.searchSort
        }).subscribe(response => {
            // var response = res.json();
            this.moduleSearchresults = [];

            for (let module in response) {
                if (response.hasOwnProperty(module)) {
                    this.moduleSearchresults.push({
                        module: module,
                        data: {
                            hits: this.transformHits(response[module].hits),
                            max_score: response[module].max_score,
                            total: response[module].total
                        }
                    });
                }
            }

            // sort by releveance
            this.moduleSearchresults.sort((x, y) => {
                return y.data.max_score - x.data.max_score;
            })

            // set the last parameters
            this.lastSearchParams = {
                modules: modules,
                searchterm: searchterm,
                size: size
            };
            this.runningmodulesearch = undefined;

            retSubject.next(response);
            retSubject.complete();

        });

        return retSubject.asObservable();
    }

    loadMore() {
        let retSubject = new Subject<any>();
        // if we are in a serch ... do nothing
        if (this.runningmodulesearch)
            return;

        if (this.moduleSearchresults[0].data.hits.length >= this.moduleSearchresults[0].data.total)
            return;

        // this.runningmodulesearch = this.http.post(this.configurationService.getBackendUrl() + '/fts/globalsearch/' + this.lastSearchParams.modules.join(',') + (this.lastSearchParams.searchterm ? '/' + this.lastSearchParams.searchterm : '') + '?session_id=' + this.session.authData.sessionId + '&records=' + this.lastSearchParams.size + '&start=' + this.moduleSearchresults[0].data.hits.length, {aggregates: this.searchAggregates, sort: this.searchSort})
        //     .subscribe(res => {
        this.runningmodulesearch = this.backend.postRequest('fts/globalsearch/' + this.lastSearchParams.modules.join(',') + (this.lastSearchParams.searchterm ? '/' + encodeURIComponent(this.lastSearchParams.searchterm) : ''), {
            records: this.lastSearchParams.size,
            start: this.moduleSearchresults[0].data.hits.length
        }, {aggregates: this.searchAggregates, sort: this.searchSort})
            .subscribe(response => {
                // var response = res.json();
                for (let module of this.lastSearchParams.modules) {
                    for (let hit of response[module].hits)
                        this.moduleSearchresults[0].data.hits.push(this.tranformHit(hit));
                }
                this.runningmodulesearch = undefined;

                retSubject.next(response);
                retSubject.complete();
            });
        return retSubject.asObservable();
    }

    getSearchModules() {
        //this.http.get(this.configurationService.getBackendUrl() + '/fts/searchmodules?session_id=' + this.session.authData.sessionId)
        this.backend.getRequest('fts/searchmodules')
            .subscribe((response: any) => {
                for (let module of response.modules) {
                    if (this.metadata.checkModuleAcl(module, 'list'))
                        this.searchModules.push(module);
                }
            });
    }

    resetData() {
        this.found = 0;
        this.hits = [];
    }
}
