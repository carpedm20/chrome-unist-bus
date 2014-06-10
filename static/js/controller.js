'use strict';

/* Controllers */

var bus_controller = angular.module('bus_controller', []);

bus_controller.controller('BusListCtrl', ['$scope', '$http',
  function($scope, $http) {
    $http.get('buses/busstops.json').success(function(data) {
      $scope.busstops = data;
    });

    $scope.orderProp = 'age';
  }]);