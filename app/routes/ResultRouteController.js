/// <reference path="../../typings/main.d.ts" />
"use strict";
var ResultRouteController = (function () {
    function ResultRouteController(api) {
        this.api = null;
        this.api = api;
    }
    ResultRouteController.prototype.getResults = function (skip, limit, callback) {
        this.api.getResults(skip, skip + limit, callback);
    };
    return ResultRouteController;
}());
module.exports = ResultRouteController;
