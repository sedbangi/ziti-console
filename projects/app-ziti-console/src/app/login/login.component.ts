/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {Inject, Component, OnDestroy, OnInit} from '@angular/core';
import { Router } from '@angular/router';
import {SettingsServiceClass, LoginServiceClass, SETTINGS_SERVICE, ZAC_LOGIN_SERVICE} from "ziti-console-lib";
import {Subscription} from "rxjs";
import {isEmpty, isNil, get} from "lodash";

// @ts-ignore
const {growler, context} = window;

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
    edgeControllerList: any[] = [];
    username = '';
    password = '';
    edgeName: string = '';
    edgeUrl: string = '';
    edgeCreate = false;
    userLogin = false;
    selectedEdgeController: any;
    controllerHostname = '';
    edgeNameError = '';
    edgeUrlError = '';
    showEdge = false;
    isLoading = false;
    helpText;
    controllerInvalid = false;
    private subscription = new Subscription();

    constructor(
        @Inject(ZAC_LOGIN_SERVICE) public svc: LoginServiceClass,
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
        private router: Router,
        ) { }

    ngOnInit() {
        if (this.svc.originIsController !== false && this.svc.originIsController !== true) {
            this.checkOriginForController();
        }
        if (this.settingsService.hasSession()) {
            this.router.navigate(['/dashboard']);
        }
        this.subscription.add(
        this.settingsService.settingsChange.subscribe((results: any) => {
            if (results) this.settingsReturned(results);
        }));
    }

    checkOriginForController() {
        this.isLoading = true;
        this.svc.checkOriginForController().then((result) => {
            this.svc.originIsController = result;
            if (this.svc.originIsController) {
                this.svc.originIsController = true;
                this.edgeCreate = false;
                this.selectedEdgeController = window.location.origin;
                this.controllerHostname = window.location.hostname;
                this.settingsService.addContoller(this.controllerHostname, this.selectedEdgeController);
            } else {
                this.edgeChanged();
                this.initSettings();
            }
        }).finally(() => {
            this.isLoading = false;
        });
    }

    async login() {
        if(this.selectedEdgeController) {
            context.set("serviceUrl", this.selectedEdgeController);
            const apiVersions = this.settingsService.apiVersions;
            const prefix = apiVersions && apiVersions["edge-management"]?.v1?.path || '';
            this.svc.login(
                prefix,
                this.selectedEdgeController,
                this.username.trim(),
                this.password
            ).then((result) => {
                if (result.error) {
                    return;
                }
                context.set('serviceUrl', this.selectedEdgeController);
                this.settingsService.settings.selectedEdgeController = this.selectedEdgeController;
                this.settingsService.set(this.settingsService.settings);
            }).catch((error) => {
                this.handleControllerInvalid(error?.controllerInvalid);
            });
        }
    }

    handleControllerInvalid(controllerInvalid = false) {
        if (controllerInvalid) {
            this.helpText = `NOTE: The controller url is relative to the server running the Ziti Administration Console. \n 
                    For example, if you are running the ziti controller and ZAC inside docker, the controller URL should be reachable from the same server that's hosting ZAC. \n 
                    In this case, that would be the hostname of the container running the ziti controller image. \n `;
            this.controllerInvalid = true;
        } else {
            this.helpText = undefined;
            this.controllerInvalid = false;
        }
    }
    next() {
        if (this.edgeCreate) {
            this.create();
        } else {
            this.login();
        }
    }

    create() {
        if (this.isValid()) {
            this.settingsService.addContoller(this.edgeName, this.edgeUrl).then((result) => {
                if (result.error) {
                    this.handleControllerInvalid(true);
                    return;
                }
                context.set("serviceUrl", this.edgeUrl);
                this.settingsService.set(this.settingsService.settings);
            });
        } else growler.form();
    }

    isValid() {
        this.edgeNameError = '';
        this.edgeUrlError = '';
        if (this.edgeName.trim().length == 0) this.edgeNameError = '';
        if (this.edgeUrl.trim().length == 0) this.edgeUrlError = '';
        return!(this.edgeNameError || this.edgeUrlError);
    }

    reset() {
        this.edgeNameError = '';
        this.edgeUrlError = '';
        this.edgeCreate = false;
        this.userLogin = true;
    }

    edgeChanged(event?) {
        this.edgeNameError = '';
        this.edgeUrlError = '';
        if (this.selectedEdgeController) {
            this.edgeName = ''
            this.edgeUrl = ''
            this.edgeCreate = false;
            this.userLogin = true;
            this.settingsService.initApiVersions(this.selectedEdgeController)
        } else {
            this.edgeCreate = true;
            this.userLogin = false;
        }
        this.settingsService.settings.selectedEdgeController = this.selectedEdgeController;
    }

    initSettings() {
        this.settingsService.loadSettings();
    }

    settingsReturned(settings: any) {
        this.edgeControllerList = [];
        if (settings.edgeControllers?.length > 0) {
            this.edgeControllerList = [];
            settings.edgeControllers.forEach((controller) => {
                this.edgeControllerList.push({name:controller.name + ` (${controller.url})`, value: controller.url});
            });
            this.reset();
        } else {
            this.edgeCreate = true;
            this.userLogin = false;
        }
        const serviceUrl = localStorage.getItem("ziti-serviceUrl-value");
        if (this.svc.originIsController) {
            // the origin is already selected as the target ziti controller so no need to set it again.
            this.selectedEdgeController = settings.selectedEdgeController;
            return;
        }
        if (!isEmpty(serviceUrl)) {
            const lastUrl: any = JSON.parse(serviceUrl).data;
            this.selectedEdgeController = lastUrl.trim();
        } else {
            this.selectedEdgeController = settings.selectedEdgeController;
        }
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
