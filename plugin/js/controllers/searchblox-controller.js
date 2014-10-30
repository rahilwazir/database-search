/**
 * Created by cselvaraj on 4/29/14.
 */
'use strict';
// CONTROLLER
angular.module('searchblox.controller', []).controller('searchbloxController', [
    '$rootScope',
    '$scope',
    '$http',
    '$location',
    'searchbloxService',
    'searchbloxFactory',
    'facetFactory',
    '$q',
    '$timeout',
    '$modal',
    '$parse',
    '$sce', function ($rootScope, $scope, $http, $location, searchbloxService, searchbloxFactory, facetFactory, $q, $timeout, $modal, $parse, $sce) {

    var searchUrl = '/searchblox/servlet/SearchServlet';
    var autoSuggestUrl = '/searchblox/servlet/AutoSuggest';
    var reportServletUrl = '/searchblox/servlet/ReportServlet';

    // Hard coded these values. This needs to be dynamic
    //var facet = 'on';
    //var xsl = "json";
    $scope.facetFields = "";
    // var dateFacet = "";

    $scope.rangeFilter = "";
    $scope.filterFields = "";
    $scope.selectedItems = [];
    //$scope.sortDir = "desc";
    // $scope.sortVal = "";
    $scope.from = 0;
    $scope.page = 1;
    $scope.prevPage = 1;
    //$scope.pageSize = 10;
    $scope.noOfSuggests = 5;
    //$scope.showAutoSuggest = true;

    $scope.paginationHtml = "";
    $scope.tagHtml = "";
    $scope.topHtml = "";
    $scope.startedSearch = false;
    $scope.initAds = 1;
    $scope.maxAdsLimit = 2;
    $scope.dataMap = new Object();
    $scope.inputClass = {};
    $scope.inputClass.name = "ngCustomInput col-sm-8 col-md-8 col-md-offset-2";

    // load autosuggest items
    $scope.loadItems = function (term) {
        var autoSuggestData = $q.defer();
        searchbloxFactory.getResponseData(autoSuggestUrl + '?limit=' + $scope.noOfSuggests + '&q=' + term).then(function (suggestionResults) {
            var suggtns = searchbloxService.parseAutoSuggestion(suggestionResults.data);
            $scope.timer = $timeout(function () {
                $rootScope.$apply(autoSuggestData.resolve(suggtns));
            }, 10);
        });
        return autoSuggestData.promise;
    };

    // Reads json data file and initializes the scope variables
    $scope.init = function () {
        facetFactory.get().$promise.then(function (data) {
            if (data !== null) {
                $scope.startedSearch = true;
                if (typeof($scope.dataMap['facetFields']) == "undefined" || $scope.dataMap['facetFields'] == null || $scope.dataMap['facetFields'] == "") {
                    $scope.dataMap['facetFields'] = searchbloxService.getFacetFields(data.facets);
                    $scope.facetMap = searchbloxService.facetFieldsMap;
                }

                if (typeof($scope.dataMap['sortVal']) == "undefined" || $scope.dataMap['sortVal'] == null || $scope.dataMap['sortVal'].trim() == "" || !searchbloxService.sortBtnExists($scope.dataMap['sortVal'].trim())) {
                    $scope.sortBtns = searchbloxService.getSortBtns(data.sortBtns);
                }

                if (typeof($scope.dataMap['collectionString']) == "undefined" || $scope.dataMap['collectionString'] == null || $scope.dataMap['collectionString'] === "") {
                    $scope.dataMap['collectionString'] = searchbloxService.getCollectionValues(data.collection);
                }

                if (typeof($scope.dataMap['collectionForAds']) == "undefined" || $scope.dataMap['collectionForAds'] == null || $scope.dataMap['collectionForAds'] === "") {
                    $scope.dataMap['collectionForAds'] = data.collectionForAds;
                }

                if (typeof($scope.dataMap['matchAny']) == "undefined" || $scope.dataMap['matchAny'] == null) {
                    $scope.dataMap['matchAny'] = data.matchAny;
                }

                if (typeof($scope.dataMap['sortDir']) == "undefined" || $scope.dataMap['sortDir'] == null) {
                    $scope.dataMap['sortDir'] = data.sortDir;
                }

                if (typeof($scope.dataMap['pageSize']) == "undefined" || $scope.dataMap['pageSize'] == null) {
                    $scope.dataMap['pageSize'] = data.pageSize;
                }

                if (typeof($scope.dataMap['filter']) == "undefined" || $scope.dataMap['filter'] == null) {
                    $scope.dataMap['filter'] = data.filter;
                }

                if (typeof($scope.dataMap['startDate']) == "undefined" || $scope.dataMap['startDate'] == null) {
                    if ((data.startDate !== undefined) && data.startDate !== null) {
                        $scope.dataMap['startDate'] = moment(data.startDate, 'MM-DD-YYYY').format("YYYYMMDDHHmmss");
                    }
                }

                if (typeof($scope.dataMap['endDate']) == "undefined" || $scope.dataMap['endDate'] == null) {
                    if ((data.endDate !== undefined) && data.endDate !== null) {
                        $scope.dataMap['endDate'] = moment(data.endDate, 'MM-DD-YYYY').format("YYYYMMDDHHmmss");
                    }
                }

                if (typeof($scope.showAutoSuggest) == "undefined" || $scope.showAutoSuggest == null) {
                    $scope.showAutoSuggest = data.showAutoSuggest;
                }


                $scope.dataMap['facet'] = 'on';
                $scope.dataMap['xsl'] = "json";

            }
        });
    };

    $scope.startSearch = function () {
        $scope.from = 0;
        $scope.page = 1;
        $scope.prevPage = 1;
        $scope.doSearch();
    };
    // Search function
    $scope.doSearch = function () {

        var urlParams = searchbloxService.getUrlParams(searchUrl, $scope.query,
            $scope.rangeFilter, $scope.filterFields, $scope.page, $scope.dataMap);
        searchbloxFactory.getResponseData(urlParams).then(function (searchResults) {
            $scope.parsedSearchResults = searchbloxService.parseResults(searchResults.data, $scope.facetMap, $scope.dataMap);
            $scope.bindGridSearchResults($scope.parsedSearchResults);
            $scope.parsedLinks = searchbloxService.parseLinks(searchResults.data, $scope.facetMap);
            $scope.startedSearch = true;
            $scope.inputClass.name = "ngCustomInput col-sm-6 col-md-6 col-md-offset-2";
        });
    };

    // Sort function
    $scope.doSort = function (sortVal) {
        $scope.dataMap['sortVal'] = sortVal;
        $scope.doSearch();
    };

    // Sort function
    $scope.doDirector = function (direction) {
        $scope.dataMap['sortDir'] = direction;
        $scope.doSearch();
    };

    // get tagcloud
    $scope.getTagCloud = function () {
        var taghtml = "<h3>Most Used Tags</h3></br><div id='facettagcloud'>";
        if ($scope.parsedSearchResults.facets != undefined && $scope.parsedSearchResults.facets != null && $scope.parsedSearchResults.facets[2].keywords != undefined && $scope.parsedSearchResults.facets[2].keywords != null)
            for (var a in $scope.parsedSearchResults.facets[2].keywords[1]) {
                var value = $scope.parsedSearchResults.facets[2].keywords[1][a];
                taghtml += "<a href='index.html?query=" + value['@name'] + "' tagrel='" + value['#text'] + "'>" + value['@name'] + " </a>";
            }
        taghtml += "</div>";
        $scope.tagHtml = $sce.trustAsHtml(taghtml);
        var list = document.getElementById("facettagcloud");
        if (list != undefined && list.childNodes.length > 0) {
            shuffleNodes(list);
            $.fn.tagcloud.defaults = {
                size: {start: 14, end: 18, unit: 'pt'},
                color: {start: '#cde', end: '#f52'}
            };
            $(function () {
                $('#facettagcloud a').tagcloud();
            });
        }
    }

    // get top clicked function
    $scope.getTopClicked = function () {
        searchbloxFactory.getResponseData(reportServletUrl + '?&gettopclicks=yes&nodocs=5&query=' + $scope.query).then(function (topClickedResults) {
            topClickedResults = topClickedResults.data;
            var temphtml = "<h3>Most Viewed</h3></br>";
            if (topClickedResults != "nodocs" && topClickedResults != "queryerror" && topClickedResults != "")
                for (var x in topClickedResults)
                    for (var y in topClickedResults[x])
                        temphtml += topClickedResults[x][y];
            if (topClickedResults != "nodocs" && topClickedResults != "queryerror" && topClickedResults != "")
                $scope.topHtml = $sce.trustAsHtml(temphtml);
        });
    }

    // adjust how many results are shown
    $scope.howmany = function () {
        var newhowmany = prompt('Currently displaying ' + $scope.pageSize + ' results per page. How many would you like instead?');
        if (newhowmany) {
            $scope.pageSize = parseInt(newhowmany);
            $scope.from = 0;
            $scope.dosearch();
        }
    };

    // adjust how many suggestions are shown
    var howmanynofsuggest = function () {
        var newhowmany = prompt('Currently displaying ' + $scope.noOfSuggests + ' suggestions per page. How many would you like instead?');
        if (newhowmany) {
            $scope.noOfSuggests = parseInt(newhowmany);
            $scope.from = 0;
            $scope.dosearch();
        }
    }

    // Function for search by filter.
    $scope.doSearchByFilter = function (filter, facetName) {
        $scope.page = 1;
        var filters = "";
        var filterName = filter['@name'];
        var filterRangeFrom = filter['@from'];
        var filterRangeTo = filter['@to'];
        var filterRangeCalendar = filter['@calendar'];
        var filterRangeValue = filter['@value'];
        var hasFilter = false;
        for (var i = 0, l = $scope.selectedItems.length; i < l; i++) {
            var obj = $scope.selectedItems[i];
            if (obj['filterRangeFrom'] !== undefined && obj['filterRangeTo'] !== undefined) {
                if ((obj['filterName'] === filterName) && (obj['facetName'] === facetName)
                    && obj['filterRangeFrom'] === filterRangeFrom
                    && obj['filterRangeTo'] === filterRangeTo
                ) {
                    hasFilter = true;
                }
                else {
                    filters = filters + '&f.' + obj['facetName'] + '.filter=[' + obj['filterRangeFrom'] + 'TO' + obj['filterRangeTo'] + ']';
                }
            }
            else if (obj['filterRangeCalendar'] !== undefined && obj['filterRangeValue'] !== undefined) {
                if ((obj['filterName'] === filterName) && (obj['facetName'] === facetName)
                    && obj['filterRangeCalendar'] === filterRangeCalendar
                    && obj['filterRangeValue'] === filterRangeValue
                ) {
                    hasFilter = true;
                }
                else {
                    filters = filters + '&f.' + obj['facetName'] + '.filter=[' + moment().subtract(obj['filterRangeCalendar'], obj['filterRangeValue']).format("YYYY-MM-DDTHH:mm:ss") + 'TO*]';
                }
            }
            else {
                if ((obj['filterName'] === filterName) && (obj['facetName'] === facetName)) {
                    hasFilter = true;
                }
                else {
                    filters = filters + "&f." + obj['facetName'] + ".filter=" + obj['filterName'];
                }
            }
        }

        if (!hasFilter) {
            var new_object = new Object();
            if (filterRangeFrom !== undefined && filterRangeTo !== undefined) {
                $scope.filterFields = filters + '&f.' + facetName + '.filter=[' + filterRangeFrom + 'TO' + filterRangeTo + ']';
            }
            else if (filterRangeCalendar !== undefined && filterRangeValue !== undefined) {
                $scope.filterFields = filters + '&f.' + facetName + '.filter=[' + moment().subtract(filterRangeCalendar, filterRangeValue).format("YYYY-MM-DDTHH:mm:ss") + 'TO*]';
            }
            else {
                $scope.filterFields = filters + "&f." + facetName + ".filter=" + filterName;
            }
            new_object["id"] = $scope.selectedItems.size;
            new_object['filterName'] = filterName;
            new_object['facetName'] = facetName;
            new_object['filterRangeFrom'] = filterRangeFrom;
            new_object['filterRangeTo'] = filterRangeTo;
            new_object['filterRangeCalendar'] = filterRangeCalendar;
            new_object['filterRangeValue'] = filterRangeValue;
            new_object['pageNo'] = $scope.prevPage;
            $scope.prevPage = $scope.page;
            //it's up to you how you want to structure the new_object.
            $scope.showInput = true;
            $scope.selectedItems.push(new_object);
        }

        $scope.doSearch();
    };

    // Function for removing filter
    $scope.removeItem = function (index) {
        var selected_object = $scope.selectedItems[index];
        $scope.page = selected_object['pageNo']
        $scope.selectedItems.splice(index, 1);
        var filters = "";
        for (var i = 0, l = $scope.selectedItems.length; i < l; i++) { // for(var obj in $scope.selectedItems){
            var obj = $scope.selectedItems[i];
            if (obj['filterRangeFrom'] !== undefined && obj['filterRangeTo'] !== undefined) {
                filters = filters + '&f.' + obj['facetName'] + '.filter=[' + obj['filterRangeFrom'] + 'TO' + obj['filterRangeTo'] + ']';
            }
            else if (obj['filterRangeCalendar'] !== undefined && obj['filterRangeValue'] !== undefined) {
                filters = filters + '&f.' + obj['facetName'] + '.filter=[' + moment().subtract(obj['filterRangeCalendar'], obj['filterRangeValue']).format("YYYY-MM-DDTHH:mm:ss") + 'TO*]';
            }
            else {
                filters = filters + "&f." + obj['facetName'] + ".filter=" + obj['filterName'];
            }
        }
        $scope.filterFields = filters;
        $scope.doSearch();
    };

    // Function for fetch page results.
    $scope.fetchPage = function (pageNo) {
        $scope.page = pageNo;
        $scope.prevPage = pageNo;
        $scope.doSearch();
    };

    // check if there is atleast one filter in the facet
    $scope.hasFacets = function () {

        if ($scope.parsedSearchResults !== undefined && $scope.parsedSearchResults !== null
            && $scope.parsedSearchResults.facets !== null) {

            for (var i in $scope.parsedSearchResults.facets) {
                //for (var i = 0, l = $scope.parsedSearchResults.facets.length; i < l; i++) {
                var facet = $scope.parsedSearchResults.facets[i];
                if (facet[facet['name']] !== undefined && facet[facet['name']] !== null
                    && facet[facet['name']][1] !== undefined && facet[facet['name']][1] !== null
                    && facet[facet['name']][1][0] !== undefined && facet[facet['name']][1][0] !== null) {
                    return true;
                }
            }
        }
        return false;
    };

    // check if there is atleast one filter in the facet
    $scope.hasInitAds = function () {
        if ($scope.parsedSearchResults !== undefined && $scope.parsedSearchResults !== null
            && $scope.parsedSearchResults.showAds) {
            if ($scope.parsedSearchResults.ads !== null && typeof($scope.parsedSearchResults.ads) !== "undefined" &&
                $scope.parsedSearchResults.ads.length >= $scope.initAds) {
                return true;
            }
        }
        return false;
    };

    $scope.hasMoreAds = function () {
        if ($scope.parsedSearchResults !== undefined && $scope.parsedSearchResults !== null
            && $scope.parsedSearchResults.showAds) {
            if ($scope.parsedSearchResults.ads !== null && typeof($scope.parsedSearchResults.ads) !== "undefined" &&
                $scope.parsedSearchResults.ads.length > $scope.maxAdsLimit) {
                return true;
            }
        }
        return false;
    };

    /**
     * Grid options
     */

    var footerTemplate = '<div class="ui-grid-bottom-panel">' +
        '<ul class="pager">' +
        '<li><a href="#" ng-click="getExternalScopes().gridApi.pagination.previousPage()">Previous</a></li>' +
        '<li><a href="#" ng-click="getExternalScopes().gridApi.pagination.nextPage()">Next</a></li>' +
        '<li>Page: {{ getExternalScopes().gridApi.pagination.getPage() }}</li>' +
        '<li>Total pages: {{ getExternalScopes().gridApi.pagination.getTotalPages() }}</li>' +
        '</ul></div>';

    var modalTemplate = function(c) {
        var id = c['@no'] || '',
            title = c.title || '',
            description = c.htmlDescription,
            lastModified = $scope.dUtils.getLastModified(c.lastmodified);

        var x = '<table class="table table-striped table-bordered"><tbody>';
        x += '<tr><th>Id:</th><td>'+id+'</td></tr>';
        x += '<tr><th>Title:</th><td>'+title+'</td></tr>';
        x += '<tr><th>Description:</th><td>'+description+'</td></tr>';
        x += '<tr><th>Last Modified:</th><td><i>'+lastModified+'</i></td></tr>';
        x += '</tbody></table>';
        return x;
    };

    $scope.gridOptions = {
        data: 'gridResultsData',
        rowHeight: 60,
        onRegisterApi: function (gridApi) {
            $scope.gridApi = gridApi;
        },
        showFooter: false,
        footerTemplate: footerTemplate
    };

    $scope.gridOptions.columnDefs = [
        {name: 'id', width: 50, field: '@no'},
        {
            name: 'title',
            cellTemplate: '<button class="text-left btn-link" data-ng-click="getExternalScopes().modal(row.entity)"><b ng-bind="COL_FIELD"></b></button>'
        },
        {name: 'description', field: 'context', cellTemplate: '<div ng-bind-html="row.entity.htmlDescription"></div>'},
        {
            name: 'Last modified',
            field: 'lastmodified',
            cellTemplate: '<i ng-bind="getExternalScopes().getLastModified(COL_FIELD)"></i>'
        }
    ];

    $scope.range = 50;

    $scope.translate = function (v) {
        console.log($scope.range, v);
    };

    $scope.dUtils = {
        getLastModified: function (lastmodified) {
            return moment(lastmodified).format("MMMM Do YYYY, h:mm:ss a");
        },
        formatData: function (obj) {
            if (!angular.isArray(obj))
                return [obj];
            else
                return obj;
        },
        modal: function(field) {
            $modal({
                title: field.title,
                content: modalTemplate(field),
                html: true
            })
        },
        gridApi: $scope.gridApi
    };

    $scope.bindGridSearchResults = function (v) {
        $scope.gridResultsData = [];

        if (v == null || !angular.isObject(v.records)) {
            return false
        }

        $scope.gridResultsData = v.records;
    };

}]);
