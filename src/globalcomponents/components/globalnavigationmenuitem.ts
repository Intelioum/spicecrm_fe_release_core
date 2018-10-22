/*
SpiceUI 1.1.0

Copyright (c) 2016-present, aac services.k.s - All rights reserved.
Redistribution and use in source and binary forms, without modification, are permitted provided that the following conditions are met:
- Redistributions of source code must retain this copyright and license notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- If used the SpiceCRM Logo needs to be displayed in the upper left corner of the screen in a minimum dimension of 31x31 pixels and be clearly visible, the icon needs to provide a link to http://www.spicecrm.io
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {
    AfterViewInit, ComponentFactoryResolver, Component, Input, ElementRef, Renderer2, NgModule, ViewChild,
    ViewContainerRef, OnInit, OnDestroy
} from '@angular/core';
import {Router}   from '@angular/router';
import {broadcast} from '../../services/broadcast.service';
import {popup} from '../../services/popup.service';
import {model} from '../../services/model.service';
import {recent} from '../../services/recent.service';
import {favorite} from '../../services/favorite.service';
import {language} from '../../services/language.service';
import {navigation} from '../../services/navigation.service';
import {metadata} from '../../services/metadata.service';

interface menuItem {
    module: string;
    name: string;
}


@Component({
    selector: 'global-navigation-menu-item',
    templateUrl: './src/globalcomponents/templates/globalnavigationmenuitem.html',
    host: {
        '[class.slds-context-bar__item]': 'true',
        '[class.slds-is-active]': 'isActive()',
    },
    providers: [popup, model]
})
export class GlobalNavigationMenuItem implements AfterViewInit, OnInit, OnDestroy {


    @ViewChild('menulist', {read: ViewContainerRef}) menulist: ViewContainerRef;
    @ViewChild('menucontainer', {read: ViewContainerRef}) menucontainer: ViewContainerRef;

    clickListener: any;
    @Input() itemtext: string = 'test';
    @Input() item: menuItem = {
        module: null,
        name: null
    };

    isOpen: boolean = false;
    isInitialized: boolean = false;

    itemMenu: Array<any> = [];
    favorites: Array<any> = [];
    recentItems: Array<any> = [];
    menucomponents: Array<any> = [];

    constructor(private metadata: metadata,
                private language: language,
                private router: Router,
                private elementRef: ElementRef,
                private broadcast: broadcast,
                private navigation: navigation,
                private popup: popup,
                private model: model,
                private recent: recent,
                private favorite: favorite,
                private renderer: Renderer2) {
    }

    executeMenuItem(id) {
        this.itemMenu.some((item, index) => {
            if (item.id === id) {
                switch (item.action) {
                    case 'add':
                        this.isOpen = false;
                        this.model.addModel();
                        break;
                }
                return true
            }
        });
    };

    navigateTo() {
        this.isOpen = false;
        this.router.navigate(['/module/' + this.item['module']]);
    }

    navigateRecent(recentid) {
        this.isOpen = false;
        this.router.navigate(['/module/' + this.item['module'] + '/' + recentid]);
    }

    editRecent(recentid) {
        this.isOpen = false;
        this.model.id = recentid;
        this.model.edit(true);
    }

    ngOnInit() {
        this.itemMenu = this.metadata.getModuleMenu(this.item.module);
        this.model.module = this.item.module;
    }

    toggleOpen() {
        if (!this.isInitialized) this.initialize();
        this.isOpen = !this.isOpen;

        // toggle the listener
        if (this.isOpen) {
            this.favorites = this.getFavorites();
            this.recentItems = this.recentitems;
            this.buildMenu();
            this.clickListener = this.renderer.listen('document', 'click', (event) => this.onClick(event));
        } else if (this.clickListener)
            this.clickListener();
    }


    initialize() {
        // get recent .. if it is an observable .. wait ..
        let recent = this.recent.getModuleRecent(this.item.module);
        if (recent instanceof Array)
            this.isInitialized = true;
        else
            recent.subscribe(recentItems => {
                this.isInitialized = true;
            });
    }

    get recentitems() {
        return this.recent.moduleItems[this.item.module] ? this.recent.moduleItems[this.item.module] : [];
    }

    getFavorites() {
        return this.favorite.getFavorites(this.item.module);
    }

    private onClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target) || (this.elementRef.nativeElement.contains(event.target) && this.menulist.element.nativeElement.contains(event.target)) ) {
            this.isOpen = false;
        }
    }

    hasMenu() {
        return this.itemMenu.length > 0 || this.metadata.getModuleTrackflag(this.item.module);
    }

    getMenuLabel(menuitem) {
        return this.language.getModuleLabel(this.item.module, menuitem);
    }

    isActive(): boolean {
        if (this.navigation.activeModule == this.item.module)
            return true;
        else
            return false;
    }

    ngAfterViewInit() {
        this.broadcast.broadcastMessage('navigation.itemadded', {
            module: this.item.module,
            width: this.elementRef.nativeElement.offsetWidth
        })


        this.model.module = this.item.module;
    }

    buildMenu() {
        this.destroyMenu();
        for (let menuitem of this.itemMenu) {
            switch (menuitem.action) {
                case 'NEW':
                    if(this.metadata.checkModuleAcl(this.item.module, 'create')) {
                        this.metadata.addComponent('GlobalNavigationMenuItemNew', this.menucontainer).subscribe(item => {
                            this.menucomponents.push(item);
                        });
                    }
                    break;
                case 'ROUTE':
                    this.metadata.addComponent('GlobalNavigationMenuItemRoute', this.menucontainer).subscribe(item => {
                        item.instance['actionconfig'] = menuitem.actionconfig;
                        this.menucomponents.push(item);
                    });
                    break;
            }
        }
    }

    destroyMenu() {
        // destroy all components
        for (let component of this.menucomponents) {
            component.destroy();
        }
    }

    ngOnDestroy() {
        this.destroyMenu();
    }
}
