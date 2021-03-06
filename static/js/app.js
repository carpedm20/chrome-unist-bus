'use strict';

var busApp = angular.module('busApp', ['ngRoute']);
var x2js = new X2JS();

var defaultStopId = 0;
chrome.storage.sync.get('stopId', function(result) {
  defaultStopId = result.stopId;
});

function saveBusStop(stopId) {
  chrome.storage.sync.set({'stopId': stopId}, function() {
    //message('Settings saved');
  });
}

function newTab(link) {
  chrome.tabs.create({'url': link});
}

busApp.config(function($routeProvider) {
  $routeProvider
    // route for the home page
    .when('/', {
      templateUrl : '/html/templates/main.html',
      controller  : 'busController'
    })
});

busApp.controller('busController', function($scope, $http) {
  $scope.model = { selectedIndex: defaultStopId,
                   includeFromDirection: true,
                   includeToDirection: true };

  $scope.showBusRoute = function (link) {
    chrome.tabs.create({'url': link});
  }

  $scope.notifyBusArrival = function (busId) {
    busId *= 1;
    
    var details = {
      type:    "basic",
      iconUrl: "/static/img/icon128_active.png",
      title:   busId,
      message: "우왕 온닫!"
    };

    chrome.notifications.create(busId, details, function(notifId) {
      setTimeout(function() {
        destroyNotification(notifId);
      }, 8000);
    });
  }

  $scope.refreshBusStop = function (option) {
  	if (option === 0) {
  		$scope.model.includeFromDirection = !$scope.model.includeFromDirection;
  	}
  	else if (option === 1)
  		$scope.model.includeToDirection = !$scope.model.includeToDirection;

  	$scope.selectBusStop($scope.model.selectedIndex);
  }

  $scope.selectBusStop = function (index) {
    saveBusStop(index);

    $scope.model.selectedIndex = index;

    for (var i in $scope.busStops[index]["stopid"]) {
      var url = "http://apis.its.ulsan.kr:8088/Service4.svc/AllBusArrivalInfo.xo?stopid=" + $scope.busStops[index]["stopid"][i]+'&i='+i;
      // http://apis.its.ulsan.kr:8088/m/002/001/arrInfo.do?brtNo=133&brtDirection=1&brtClass=0&bnodeOldid=15441
      $http.get(url).then(function(response) {
        var xml = x2js.xml_str2json(response.data);
        var busInfo = xml.RouteArrivalInfoResponse.AllBusArrivalInfoResult.AllBusArrivalInfo.MsgBody.BUSINFO.CurrentAllBusArrivalInfo.AllBusArrivalInfoTable;

        for (var j in busInfo) {
          var currentData = busInfo[j];
          var currentBus = $scope.busStops[index]['buses'][currentData.ROUTEID];

          if (currentBus) {
            if (currentData.STOPID == 0) {
              var time = currentData.REMAINTIME;
              currentBus["remainTime"] = time.substr(0,2) + "시 " + time.substr(2,2) + "분 출발";
            } else if (currentData.BUSNO == 0) {
              currentBus["remainTime"] = "운행 종료";
            } else {
              currentBus["remainTime"] = ((currentData.REMAINTIME/60) | 0) + "분 후 도착";
            }
            currentBus["fStopName"] = currentData.FSTOPNAME;
            currentBus["tStopName"] = currentData.TSTOPNAME;

            if (currentBus["direction"]) {
            	//currentBus["tStopName"] += "귀향";
            } else {
            	//currentBus["tStopName"] += "외출";
            }

            currentBus["nextRemainTime"] = "...";

            var i = response.config.url.slice(-1);
            var nextUrl = 'http://apis.its.ulsan.kr:8088/m/002/001/arrInfo.do?brtNo='+$scope.buses[currentData.ROUTEID]['name']+'&brtDirection=1&brtClass=0&bnodeOldid='+$scope.busStops[index]["oldstopid"][i]+'&ROUTEID='+currentData.ROUTEID;
            
            $http.get(nextUrl).then(function(response) {
              var id = response.config.url.match(/ROUTEID=([^&]+)/)[1];

              var currentBus = $scope.busStops[index]['buses'][id];
              var leftTime = $($(response.data).find('.strong')[1]).text();
              
              if (leftTime == "") {
                var tmp = $($(response.data).find(".col.bu").slice(-1)).text();
                if (tmp == "기점출발시간")
                  tmp = "기점 출발 시간"
                if (tmp == "통과위치")
                  currentBus["nextRemainTime"] = "정보 없음"
                else
                  currentBus["nextRemainTime"] = leftTime + tmp + " " + $($(response.data).find("dd").slice(-1)).text();
              } else {
                currentBus["nextRemainTime"] = leftTime + " 후 도착";
              }
            });
          }
        }
      });
    }
  }

  $http.get('/buses/bus_stops.json').success(function(data) {
    $scope.busStops = data;
    $scope.selectBusStop($scope.model.selectedIndex);

    $('.help').twipsy({delayIn:1500,offset:1});
  });

  $http.get('/buses/buses.json').success(function(data) {
    $scope.buses = data;
  });

  $scope.directionFilter = function(buses) {
  	var result = {};

    angular.forEach(buses, function(data, no) {
        if ($scope.buses[no]["direction"] === 1 && $scope.model.includeFromDirection) {
            result[no] = data;
        } else if ($scope.buses[no]["direction"] === 0 && $scope.model.includeToDirection) {
        	result[no] = data;
        }
    });
    return result;
  };
});

busApp.directive('busMenu', function() {
  return {
    restrict: 'E',
    templateUrl: '/html/templates/menu.html'
  };
});