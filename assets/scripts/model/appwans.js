/*
Copyright 2020 Netfoundry, Inc.
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

var appwans = {
	name: "app-wans",
	page: 1,
	limit: 25,
	data: [],
	meta: {},
	sort: "name",
	order: "ASC",
	filter: "",
	current: {
		services: [],
		identities: []
	},
	init: function() {
		this.events();
		this.get();
	},
	events: function() {
		$(".sort").click(this.doSort);
	},
	getParams: function() {
		return {
			type: this.name,
			paging: {
				page: this.page,
				total: this.limit,
				sort: this.sort,
				order: this.order,
				filter: this.filter
			}
		};
	},
	doSort: function(e) {
		var sortBy = $(e.currentTarget).data("by");
		if (appwans.sort==sortBy) {
			if (appwans.order=="ASC") appwans.order = "DESC";
			else appwans.order = "ASC";
		} else appwans.order = "ASC";
		appwans.sort = sortBy;
		$(".asc").removeClass("asc");
		$(".desc").removeClass("desc");
		$(e.currentTarget).addClass(appwans.order.toLowerCase());
		appwans.get();
	},
	get: function() {
		var params = this.getParams();
		service.call("data", params, this.getReturned);
	},
	getReturned: function(e) {
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
			appwans.data = e.data;
			appwans.meta = e.meta;
			context.set(appwans.name, appwans.data);
		}
	},
	save: function(name, identities, services, tags, id, removal) {
		var params = this.getParams();
		params.save = {
			name: name,
			tags: tags
		};
		params.additional = {
			services: services,
			identities: identities
		};
		if (id.trim().length>0) {
			params.id = id;
			params.save.services = services;
			params.save.identities = identities;
			params.removal = removal;
		}
		service.call("dataSave", params, this.saveReturned);
	},
	saveReturned: function(e) {
		if (e.data) {
			if (page) page.reset();
			modal.close();
			appwans.data = e.data;
			appwans.meta = e.meta;
			context.set(appwans.name, appwans.data);
		} else growler.error("Error saving "+appwans.name, e.error);
	},
	getSubs: function(id, type, url) {
		var params = {
			id: id,
			type: type,
			url: url
		};
		service.call("dataSubs", params, this.subsReturned);
	},
	subsReturned: function(e) {
		if (e.error) growler.error(e.error);
		else context.set(e.type+"sub", e.data);
	},
	setSub: function(id, type, items) {
		for (var i=0; i<appwans.data.length; i++) {
			if (appwans.data[i].id===id) {
				appwans.data[i][type] = items;
				break;
			}
		}
	},
	details: function(id) {
		for (var i=0; i<this.data.length; i++) {
			if (this.data[i].id==id) return this.data[i];
		}
		return null;
	},
	delete: function(ids) {
		var params = this.getParams();
		params.ids = ids;
		service.call("delete", params, this.getReturned);
	},
	start: function() {
		if (this.page==1) return 1;
		else return ((this.page-1)*this.limit)+1;
	},
	end: function() {
		if (this.page==1) return this.data.length;
		else return (this.start()-1)+this.data.length;
	},
	total: function() {
		return this.meta.pagination.totalCount;
	},
	isFirst: function() {
		return this.meta.pagination.offset==0;
	},
	isLast: function() {
		return (this.meta.pagination.offset+this.meta.pagination.limit)>=this.meta.pagination.totalCount;
	},
	next: function() {
		if (!appwans.isLast()) {
			appwans.page = appwans.page+1;
			appwans.get();
		}
	},
	prev: function() {
		if (!appwans.isFirst()) {
			appwans.page = appwans.page-1;
			appwans.get();
		}
	}
}