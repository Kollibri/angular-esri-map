(function(angular) {
    'use strict';
    //AppDirectives.directive('feed',['FeedService',function(feedService) {
    angular.module('esri.map')
        .directive('esriToc', ['$document', '$q', '$compile', '$http', function($document, $q, $compile, $http, esriRegistry) {
            return {
                restrict: 'E',
                //scope: {},
                replace: true,
                link: function(scope, element, attrs) {
                    var tocDeferred = $q.defer();
                    //tree id
                    var treeId = attrs.treeId;


                    scope.buildTOC = function(layerInfos) {
                        var layer = {};
                        scope.tocArray = [];
                        scope.tocArray.loaded = false;

                        // IF ALL LAYERS ARE IN LAYERINFOS, THEN SET LOADED PROPERTY TO TRUE
                        var layerElements = $document[0].getElementsByTagName('esri-dynamic-map-service-layer');
                        if (layerElements.length === layerInfos.length) {
                            angular.forEach(layerInfos, function(parentValue, parentKey) {
                                var legendDeferred = $q.defer();
                                var layersDeferred = $q.defer();
                                var layerUrl = layerInfos[parentKey].layer.url;
                                legendDeferred = $http.get(layerUrl + '/legend?f=pjson');
                                layersDeferred = $http.get(layerUrl + '?f=pjson');
                                $q.all([legendDeferred, layersDeferred]).then(function(response) {
                                    var legendResponse = response[0];
                                    var layerResponse = response[1];

                                    var layerList = layerResponse.data;
                                    var legendList = legendResponse.data;
                                    var tocLayers = layerElements[parentKey].attributes['toc-Layers'].nodeValue;
                                    var visibleLayers = layerElements[parentKey].attributes['visible-Layers'].nodeValue;
                                    var mapServiceLayerId = layerInfos[parentKey].layer.id;
                                    scope.mergedLists = [];
                                    var parentCounter = 0;
                                    angular.forEach(layerList.layers, function(value, key) {
                                        // IF LAYER EXISTS IN tocLayers, THEN ADD TO TOC
                                        if (tocLayers.indexOf(value.id) !== -1) {
                                            layer = {};
                                            layer.collapsed = true;
                                            // IF LAYER EXISTS IN visibleLayers THEN CHECK IT
                                            layer.checked = (visibleLayers.indexOf(value.id) !== -1);
                                            // IF CHECKED, CHECK PARENT(S)
                                            if (layer.checked) {
                                                scope.checkParents(value);
                                            }

                                            layer.layerId = value.id;
                                            layer.mapServiceLayerId = mapServiceLayerId;
                                            layer.layerName = value.name;
                                            layer.subLayerIds = value.subLayerIds;
                                            layer.parentLayerId = value.parentLayerId;
                                            if (!angular.isObject(layer.subLayerIds)) {
                                                layer.legend = legendList.layers[key - parentCounter].legend;
                                            } else {
                                                parentCounter++;
                                            }

                                            scope.mergedLists.push(layer);
                                        }
                                    });

                                    var rootLayer = {};
                                    rootLayer.layerId = -1;
                                    rootLayer.checked = true;
                                    rootLayer.collapsed = true;
                                    rootLayer.layerName = layerInfos[parentKey].title;
                                    rootLayer.mapServiceLayerId = mapServiceLayerId;
                                    var tocLayer = {};
                                    tocLayer = scope.buildTreeforTOC(rootLayer);
                                    scope.tocArray.push(tocLayer);
                                    scope.tocArray.loaded = true;

                                });
                            });
                        }
                    };

                    scope.checkParents = function(childLayer) {
                        angular.forEach(scope.mergedLists, function(value) {
                            if (value.layerId === childLayer.parentLayerId) {
                                value.checked = true;
                                scope.checkParents(value);
                            }
                        });
                    };

                    scope.buildTreeforTOC = function(parentLayer) {
                        angular.forEach(scope.mergedLists, function(value) {
                            if (value.parentLayerId === parentLayer.layerId) {
                                var childLayer = value;
                                if (parentLayer.subLayers) {
                                    parentLayer.subLayers.push(childLayer);
                                } else {
                                    parentLayer.subLayers = [childLayer];
                                }
                                if (childLayer.subLayerIds !== null) {
                                    scope.buildTreeforTOC(childLayer);
                                }
                            }
                        });
                        if (parentLayer.layerId === -1) {
                            //scope.toc = parentLayer;
                            return parentLayer;
                        }
                    };



                    scope.refreshTOC = function(treeModel) {
                        var mapId = attrs.mapId;
                        //tree model
                        if (angular.isDefined(attrs.treeModel)) {
                            treeModel = attrs.treeModel;
                        }
                        //tree template
                        var template =
                            '<p ng-show="!tocArray.loaded">Loading...</p>' +
                            '<ul>' +
                            '<li ng-repeat="parentNode in ' + treeModel + '">' +
                            '<div ng-if="parentNode.subLayers && parentNode.layerId == -1">' +
                            '<input type="checkbox" ng-click="' + treeId + '.toggleParentCheckbox(parentNode)" checked="true" value="-1">' +
                            '<i class="glyphicon glyphicon-plus" ng-show="parentNode.collapsed" ng-click="' + treeId + '.selectNodeHead(parentNode)"></i>' +
                            '<i class="glyphicon glyphicon-minus" ng-show="!parentNode.collapsed" ng-click="' + treeId + '.selectNodeHead(parentNode)"></i>' +
                            '<label>{{parentNode.layerName}}</label>' +
                            '</div>' +
                            '<ul ng-hide="parentNode.collapsed">' +
                            '<li data-ng-repeat="node in parentNode.subLayers">' +
                            '<input type="checkbox" ng-click="' + treeId + '.toggleNodeCheckbox(node);" ng-checked="{{node.checked}}" value="{{node.layerId}}">' +
                            '<i class="glyphicon glyphicon-plus" ng-show="(node.subLayers.length || node.legend.length > 1) && node.collapsed" ng-click="' + treeId + '.selectNodeHead(node)"></i>' +
                            '<i class="glyphicon glyphicon-minus" ng-show="(node.subLayers.length || node.legend.length > 1) && !node.collapsed" ng-click="' + treeId + '.selectNodeHead(node)"></i>' +

                            '<label ng-if="!node.legend">' +
                            '{{node.layerName}}</label>' +

                            '<label ng-if="node.legend.length == 1">' +
                            '<img src="data:{{node.legend[0].contentType}};base64,{{node.legend[0].imageData}}"/>' +
                            '{{node.layerName}}</label>' +

                            '<label ng-if="node.legend.length > 1">{{node.layerName}}</label>' +
                            '<ul ng-hide="node.collapsed" ng-if="node.legend.length > 1">' +
                            '<li ng-repeat="legendNode in node.legend">' +
                            '<img src="data:{{legendNode.contentType}};base64,{{legendNode.imageData}}"/>' +
                            '<span>{{(legendNode.label != "") ? legendNode.label : node.layerName }}</span>' +
                            '</li>' +
                            '</ul>' +
                            '<esri-toc ng-hide="node.collapsed"' +
                            'tree-id="' + treeId + '"' +
                            'map-id="' + mapId + '"' +
                            'tree-model="[node]">' +
                            '</esri-toc>' +
                            '</li>' +
                            '</ul>' +
                            '</li>' +
                            '</ul>';

                        //check tree id, tree model
                        if (treeId && treeModel) {

                            //root node
                            if (attrs.rootNode) {
                                var mapController = angular.element($document[0].getElementById(mapId)).controller('esriMap');


                                //create tree object if not exists
                                scope[treeId] = scope[treeId] || {};

                                //if node head clicks,
                                scope[treeId].selectNodeHead = scope[treeId].selectNodeHead || function(selectedNode) {

                                    //Collapse or Expand
                                    selectedNode.collapsed = !selectedNode.collapsed;
                                };

                                //if node label clicks,
                                scope[treeId].toggleNodeCheckbox = scope[treeId].toggleNodeCheckbox || function(selectedNode) {

                                    mapController.getMap().then(function(map) {
                                        angular.forEach(map.layerIds, function(layerId) {
                                            // DON'T PUT BASEMAPS INTO TOC
                                            var currentVisibleLayers = [];
                                            var layersToToggle = [];
                                            var parentsChecked = false;
                                            var firstLevelChildrenChecked = false;
                                            if ((map.basemapLayerIds.indexOf(layerId) === -1) && layerId === selectedNode.mapServiceLayerId) {
                                                var currentLayer = map.getLayer(layerId);
                                                currentVisibleLayers = currentLayer.visibleLayers.map(function(item) {
                                                    return parseInt(item, 10);
                                                });
                                                var returnValue = [];
                                                selectedNode.checked = !selectedNode.checked;
                                                layersToToggle = scope[treeId].getLeafSubLayers(selectedNode, returnValue);
                                                parentsChecked = scope[treeId].areAllParentsChecked(scope.tocArray, selectedNode, selectedNode.layerId, true);
                                                firstLevelChildrenChecked = scope[treeId].areAllFirstLevelChildrenChecked(selectedNode);
                                                angular.forEach(layersToToggle, function(layer) {
                                                    var indexOfMatchingLayer = currentVisibleLayers.indexOf(layer.layerId);
                                                    if (selectedNode.checked && layer.checked && indexOfMatchingLayer === -1 &&firstLevelChildrenChecked && parentsChecked) {
                                                      currentVisibleLayers.push(layer.layerId);
                                                    } else if (indexOfMatchingLayer !== -1) {
                                                        currentVisibleLayers.splice(indexOfMatchingLayer, 1);
                                                    }
                                                });

                                                if (currentVisibleLayers.length === 0) {
                                                    currentVisibleLayers = [-1];
                                                }
                                                console.log('currentVisibleLayers:' + currentVisibleLayers);
                                                currentLayer.setVisibleLayers(currentVisibleLayers);
                                            }
                                        });

                                    });


                                };

                                scope[treeId].getLeafSubLayers = function(node, returnValue) {
                                    var o = {};
                                    o.layerId = node.layerId;
                                    o.checked = node.checked;
                                    returnValue.push(o);

                                    angular.forEach(node.subLayers, function(value) {
                                        scope[treeId].getLeafSubLayers(value, returnValue);
                                    });

                                    return returnValue;

                                };

                                scope[treeId].areAllParentsChecked = function(list, node, originalLayerId, returnValue) {
                                    angular.forEach(list, function(value) {
                                        if (value.mapServiceLayerId === node.mapServiceLayerId) {
                                            if (value.layerId === node.parentLayerId) {
                                                if (value.checked) {
                                                    returnValue = returnValue && true;
                                                } else {
                                                    returnValue = returnValue && false;
                                                    return returnValue;
                                                }
                                            }
                                            if (value.layerId !== originalLayerId) {
                                                returnValue = scope[treeId].areAllParentsChecked(value.subLayers, node, originalLayerId, returnValue);
                                            }
                                        }
                                    });
                                    return returnValue;

                                };

                                scope[treeId].areAllFirstLevelChildrenChecked = function(node) {
                                    var returnValue = true;
                                    angular.forEach(node.subLayers, function(value) {
                                        returnValue = returnValue && node.checked;
                                    });
                                    return returnValue;

                                };

                                //if parent node label clicks,
                                scope[treeId].toggleParentCheckbox = scope[treeId].toggleParentCheckbox || function(selectedNode) {

                                    mapController.getMap().then(function(map) {
                                        angular.forEach(map.layerIds, function(layerId) {
                                            // DON'T PUT BASEMAPS INTO TOC
                                            if (map.basemapLayerIds !== layerId && layerId === selectedNode.mapServiceLayerId) {
                                                var currentLayer = map.getLayer(layerId);
                                                currentLayer.setVisibility(!currentLayer.visible);
                                            }
                                        });

                                    });


                                };


                                var targetId = attrs.targetId;
                                angular.element($document[0].getElementById(targetId)).html('').append($compile(template)(scope));
                            } else {
                                //Rendering template.
                                element.html('').append($compile(template)(scope));
                            }

                        }
                    };

                    if (angular.isDefined(attrs.mapId) && angular.isDefined(attrs.rootNode)) {
                        var mapId = attrs.mapId;
                        var mapController = angular.element($document[0].getElementById(mapId)).controller('esriMap');
                        scope.$watchCollection(function() {
                            return mapController.getLayerInfos();
                        }, function(newValue, oldValue, watchScope) {
                            scope.layerInfos = newValue;
                            if (angular.isDefined(scope.layerInfos)) {
                                scope.buildTOC(scope.layerInfos);
                                scope.refreshTOC('tocArray');
                                tocDeferred.resolve();
                            }
                        });
                    } else {
                        scope.refreshTOC();
                    }








                }

            };
        }]);

})(angular);
