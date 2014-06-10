'use strict';

var bus_app = angular.module('bus_app', []);
 
bus_app.controller('MainCtrl', function($scope) {
  $scope.message = 'World';
});