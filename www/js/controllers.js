angular.module('sweetchApp.controllers', ['openfb', 'geolocation', 'pubnub.angular.service'])

.controller('LoginCtrl', function ($scope, $state, $ionicLoading, $http, OpenFB, User, API) {

  $scope.facebookLogin = function () {

    OpenFB.login('public_profile,email').then(sucessSignin,
      function () {
        alert('OpenFB login failed');
      });

    $scope.toIntro = function(){
      $state.go('intro');
    }
  };

  $scope.show = function() {
    $scope.loading = $ionicLoading.show({
      content: 'Loading...'
    });
  };

  var sucessSignin = function () {
    console.log("Fetching user");
    $scope.show();
    OpenFB.get('/me')
      .success(function (user) {
          $scope.user = user;
          console.log('User name is ' + user.name);
          saveInBackend(user);
      })
      .error(function(data) {
          $ionicLoading.hide();
          alert(data.error.message);
      });
  }

  function saveInBackend(user) {
    console.log(angular.toJson(user));
    console.log("Sending request to backend");
    params = {
      "facebook_id": user.id,
      "token": window.sessionStorage['fbtoken'],
      "email": user.email,
      "first_name": user.first_name,
      "last_name": user.last_name,
      "gender": user.gender
    };

    API.post('/users', params).
    success(function(data, status, headers, config) {
      // Redirect to the Park Screen
      User.save(data["user"]);
      $ionicLoading.hide();
      if (data["user"]["phone"]) {
        $state.go('app.map');
      } else {
        $state.go('phone');
      }
    }).
    error(function(data, status, headers, config) {
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });
  };

})

.controller('LogoutCtrl', function($scope, $state) {
  window.sessionStorage.removeItem('fbtoken');
  $state.go('intro');
})

.controller('IntroCtrl', function($scope, $rootScope, $state, $ionicSlideBoxDelegate) {
 
  // Called to navigate to the main app
  $scope.startApp = function() {
    $state.go('login');
  };
  $scope.next = function() {
    $ionicSlideBoxDelegate.next();
  };
  $scope.previous = function() {
    $ionicSlideBoxDelegate.previous();
  };

  // Called each time the slide changes
  $scope.slideChanged = function(index) {
    $scope.slideIndex = index;
  };
})

.controller('PhoneCtrl', function($scope, $ionicLoading, $state, API, User) {
  $scope.phone = "";
  var user = User.get();

  $scope.savePhone = function() {
    $scope.phone
    params = {
      phone: $scope.phone,
      auth_token: user.token
    }

    console.log(params);

    API.post('users/' + user.id, params).
    success(function(data, status, headers, config) {
      User.update({ phone: $scope.phone });
      $state.go('app.map');
    }).
    error(function(data, status, headers, config) {
      console.log(status);
    });
  }
})
.controller('MapCtrl', function($scope, $rootScope, $ionicActionSheet, $ionicPopup, $stateParams, $state, $ionicLoading, geolocation, $http, OpenFB, PubNub, User, API, Driver, SweetchModel) {

  $scope.leaveMode = function() {
    console.log("Sweetching to Leave mode")
    $scope.userMode = "leaver";
    $scope.userState = "parked";
    $scope.buttonStyle = "royal";
    $scope.requestString = "Leave a spot";
    $rootScope.displayPin = true;
    $scope.spotMarker;
    $scope.driverMarker;
  }

  $scope.parkMode = function() {
    $scope.userMode = "parker";
    $scope.userState = "driving";
    $scope.buttonStyle = "positive";
    $scope.requestString = "Find nearest spot";
    $rootScope.displayPin = false;
  }

  $scope.parker = function() {
    $scope.userMode === "parker";
  }

  $scope.leaver = function() {
    $scope.userMode === "leaver";
  }

  $scope.userStateIdle = function() {
    if ($scope.userMode === "leaver") {
      $rootScope.displayPin = true;
      $scope.userState = "parked";
      if ($scope.driverMarker) {
        $scope.driverMarker.setMap(null);
      }
      if ($scope.spotMarker) {
        $scope.spotMarker.setMap(null);
      }
    } else if ($scope.userMode === "parker") {
      $scope.userState = "driving";
    }
  }

  $scope.userStateRequesting = function() {
    if ($scope.userMode === "leaver") {
      $rootScope.displayPin = false;
    }
    $scope.userState = "requesting";
  }

  $scope.userStateSweetching = function() {
    $scope.userState = "sweetching";
  }

  $scope.userStateDriving = function() {
    $scope.userState = "driving";
  }

  $scope.requestSweetch = function() {
    // Takes user location
    console.log("Requesting a Sweetch");
    $scope.userStateRequesting();

    if ($scope.userMode === "parker") {
      $ionicLoading.show({
        content: 'Contacting drivers (2)...',
        showBackdrop: false
      });

      geolocation.getLocation().then(function(data){
        $scope.coords = {lat:data.coords.latitude, lng:data.coords.longitude};
        console.log($scope.coords);
        requestSweetchInBackend();
      });
    } else if ($scope.userMode === "leaver") {
      $ionicLoading.show({
        content: 'Give us 5 minutes to find a match',
        showBackdrop: false
      });
      var mapCenter = $scope.map.getCenter();
      // $scope.coords = new google.maps.LatLng($scope.map.getCenter())
      $scope.coords = { lat: mapCenter.lat(), lng: mapCenter.lng() };
      $scope.spotMarker = addMarker($scope.coords);
      requestSweetchInBackend();
    }
  }

  // Cancels the spot request to the backend
  $scope.cancel = function () {
    if ($scope.userState == "sweetching") {
      showCancelOptions();
    } else if ($scope.userState == "requesting") {
      $scope.unsubscribe();
      $scope.cancelSweetchInBackend($scope.sweetch.id);
      $ionicLoading.hide();
      SweetchModel.delete();
      $scope.userStateIdle();
    }
  }

  $scope.confirmSweetch = function () {
    $scope.userStateDriving();
    $scope.spotMarker.setMap(null);
    $scope.driverMarker.setMap(null);
    $scope.alertUser("confirmed");
    confirmInBackend($scope.sweetch.id);
  }


  function init() {
    $scope.parkMode();
  }

  function requestSweetchInBackend() {
    console.log("Sending request to backend");
    subscribe();
    var params = {
      auth_token: window.sessionStorage['fbtoken']
    }
    if ($scope.userMode === "parker") {
      params.parker_lat = $scope.coords.lat;
      params.parker_lng = $scope.coords.lng;
    } else if ($scope.userMode === "leaver") {
      params.leaver_lat = $scope.coords.lat;
      params.leaver_lng = $scope.coords.lng;
    }
    console.log(params);

    // Post request to create Sweetch
    API.post('sweetches', params).
    success(function(data, status, headers, config) {
      // Display the spot on map if the sweetch is in progress
      // Otherwise wait for a notification through pubnub channel
      console.log(data)
      sweetch = data["sweetch"];
      $scope.sweetch = SweetchModel.new(sweetch);
      SweetchModel.save();
      if (sweetch["state"] == "in_progress") {
        sweetchObject = angular.fromJson(sweetch);

        // Define other driver
        if ($scope.userMode === "parker") {
          $scope.driver = Driver.save({
            facebook_id: sweetchObject.leaver_facebook_id,
            first_name: sweetchObject.leaver_first_name,
            ph: sweetchObject.leaver_ph,
          });
        } else if ($scope.userMode === "leaver") {
          $scope.driver = Driver.save({
            facebook_id: sweetchObject.parker_facebook_id,
            first_name: sweetchObject.parker_first_name,
            ph: sweetchObject.parker_ph,
            eta: sweetchObject.eta
          });
        }

        // Load view with all the elements for Sweetching
        loadSweetchingView();
      }
    }).
    error(function(data, status, headers, config) {
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });
  }

  function confirmInBackend() {
    params = { auth_token: window.sessionStorage['fbtoken'], state: "validated" };
    API.post('sweetches/' + $scope.sweetch.id, params).
    success(function(data, status, headers, config) {
      console.log("API: Validated Sweetch");
    }).
    error(function(data, status, headers, config) {
      console.log("API: Error, could not validate Sweetch");
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });
  };

  function loadSweetchingView() {
    $ionicLoading.hide();
    $scope.userStateSweetching();
    // Draw route to spot
    if ($scope.userMode === "parker") {
      $scope.spotLocation = new google.maps.LatLng($scope.sweetch.leaver_lat, $scope.sweetch.leaver_lng);
      $scope.drawRouteToSpot($scope.userLocation, $scope.spotLocation);
      $state.reload();
    } else if ($scope.userMode === "leaver") {
      $scope.parkerLocation = new google.maps.LatLng($scope.sweetch.parker_lat, $scope.sweetch.parker_lng);
      setDriverMarker($scope.parkerLocation);
    }
  }

  function subscribe() {
    PubNub.ngSubscribe({
        channel: $scope.myChannel,
        message: function (m) { notificationReceived(m[0]) }
    });
  }

  //***** Received notification *****//
  function notificationReceived(notif) {
    console.log('Notification received: ' + notif.title);
    console.log(notif.data);
    if (notif.title == "Match Found") {
      // Update the Sweetch locally
      if ($scope.userMode === "parker") {
        // Update the Sweetch object
        $scope.sweetch = SweetchModel.update({leaver_lat: notif.data.lat, leaver_lng: notif.data.lng, state: "in_progress"});
      } else if ($scope.userMode === "leaver") {
        // Update the Sweetch object
        $scope.sweetch = SweetchModel.update({parker_lat: notif.data.p_lat, parker_lng: notif.data.p_lng, state: "in_progress"});
      }
      // Set information about the leaver
      $scope.driver = Driver.save(notif.data);
      loadSweetchingView();
    } else if (notif.title == "Match Not Found") {
      $ionicLoading.hide();
      $scope.userStateIdle();
      SweetchModel.delete();
      $scope.alertUser("not_found");
    } else if (notif.title == "Sweetch Validated") {
      if ($scope.userState == "sweetching") {
        $scope.userState = "parked";
        $scope.alertUser("validated");
      }
    } else if (notif.title == "Sweetch Failed") {
      if ($scope.userState == "sweetching") {
        $scope.userStateIdle();
        $scope.alertUser("failed");
      }
    }
  }

  // Triggered on a button click, or some other target
  function showCancelOptions() {
    if ($scope.userMode === "parker") {
      var cancelOptions = [{ text: 'I could not find the car' }, { text: 'I found another spot' }, { text: 'I did not get the spot' }];
    } else if ($scope.userMode === "leaver") {
      var cancelOptions = [{ text: 'I had to leave' }, { text: 'The driver did not come' }];
    }

    $ionicActionSheet.show({
      buttons: cancelOptions,
      titleText: 'Tell us what went wrong',
      cancelText: 'Cancel',
      cancel: function() {},
      buttonClicked: function(index) {
        $scope.userStateIdle();
        $scope.failSweetch(index, $scope.sweetch.id);
        return true;
      },
      destructiveButtonClicked: function() { return true; }
    });
  };

  function addMarker(coords) {
    return new google.maps.Marker({
      position: coords,
      map: $scope.map,
      title: "Your Spot"
    })
  }

  function setDriverMarker(pos) {
    var driver_name = Driver.get().first_name;
    var infowindow = new google.maps.InfoWindow({
      content: driver_name + ' is here'
    })

    $scope.driverMarker = new google.maps.Marker({
      position: pos,
      map: $scope.map,
      icon: 'img/carPin.png',
      title: 'Your Sweetch buddy',
      visible: true
    })
    infowindow.open($scope.map, $scope.driverMarker);
    google.maps.event.addListener($scope.driverMarker, 'click', function() {
      infowindow.open($scope.map, $scope.driverMarker);
    });
  }

  init();

})

.controller('AppCtrl', function ($scope, $ionicLoading, $ionicPopup, $state, User, PubNub, SweetchModel, OpenFB, Driver, API) {

  $scope.user = User.get();
  $scope.myChannel = 'sweetch-' + $scope.user.id;
  $scope.directionsDisplay = new google.maps.DirectionsRenderer();
  $scope.directionsService = new google.maps.DirectionsService();


  //***** Pubnub *****//
  PubNub.init({
    publish_key:'pub-c-dd92ddd0-2263-4fbc-839d-8fa215f5a96c',
    subscribe_key:'sub-c-e34dadde-ecd9-11e3-b601-02ee2ddab7fe'
  });

  $scope.unsubscribe = function() {
    PubNub.ngUnsubscribe({ channel: $scope.myChannel });
  }

  //***** Map setup *****//


  $scope.mapCreated = function(map) {
    $scope.map = map;
    $scope.centerOnMe();
  };

  $scope.centerOnMe = function () {
    if (!$scope.map) {
      return;
    }

    $scope.loading = $ionicLoading.show({
      content: 'Getting current location...',
      showBackdrop: false
    });

    navigator.geolocation.getCurrentPosition(function (pos) {
      setUserLocation(pos);
      $scope.map.setCenter($scope.userLocation);
      $scope.updateUserMarker();
      $ionicLoading.hide();
    }, function (error) {
      alert('Unable to get location: ' + error.message);
    });
  };

  function setUserLocation(pos) {
    if ($scope.userLocation) {
      $scope.userLocation = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    } else {
      $scope.userLocation = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      $scope.$broadcast('userLocationUpdated');
    }
  }

  $scope.drawRouteToSpot = function(start, end) {
    console.log("Drawing Route to Spot")
    console.log(start)
    console.log(end)
    $scope.directionsDisplay.setMap($scope.map);

    var request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING
    };
    $scope.directionsService.route(request, function(response, status) {
      console.log(response)
      if (status == google.maps.DirectionsStatus.OK) {
        console.log("OK")
        $scope.directionsDisplay.setDirections(response);
      }
    });
  }

  $scope.updateUserMarker = function() {
    console.log("MAP: Updating user marker");
    if (!$scope.posMarker) {
      $scope.posMarker = new google.maps.Marker({
        position: $scope.userLocation,
        map: $scope.map,
        icon: '/img/blueDot.png',
        title: 'You'
      });
    } else {
      $scope.posMarker.setPosition($scope.userLocation);
    }
  }

  $scope.alertUser = function(type) {
    $scope.unsubscribe();
    switch(type) {
      case "not_found":
        var alertPopup = $ionicPopup.alert({
          title: 'Sorry',
          template: 'Nobody is leaving their spot right now.'
        });
        alertPopup.then(function(res) {
          $scope.userState = "driving";
          $scope.leaverState = "parked";
          $scope.directionsDisplay.setDirections({routes: []});
          $scope.centerOnMe();
        });
        break;
      case "failed": 
        var alertPopup = $ionicPopup.alert({
          title: 'Sorry',
          template: 'Your Sweetch buddy can\'t make it anymore'
        });
        alertPopup.then(function(res) {
          $scope.directionsDisplay.setDirections({routes: []});
          $scope.userState = "driving";
          $scope.leaverState = "parked";
          $scope.centerOnMe();
        });
        break;
      case "validated":
        var alertPopup = $ionicPopup.alert({
          title: 'Confirmation',
          template: 'Your Sweetch buddy confirmed you took the spot. We hope you liked the experience.'
        });
        alertPopup.then(function(res) {
          $scope.userState = "parked";
          $scope.leaverState = "driving";
          $scope.directionsDisplay.setDirections({routes: []});
          SweetchModel.delete();
          Driver.delete();
          $scope.centerOnMe();
        });
        break;
      case "confirmed":
        var alertPopup = $ionicPopup.alert({
          title: 'Confirmation',
          template: 'Thanks for helping a Sweetch buddy. $4 have been added to your account.'
        });
        alertPopup.then(function(res) {
          SweetchModel.delete();
          Driver.delete();
          $scope.centerOnMe();
        });
        break;
    }
  }

  $scope.failSweetch = function(index, sweetchId) {
    if ($scope.directionsDisplay) {
      $scope.directionsDisplay.setDirections({routes: []});
    }
    $scope.centerOnMe();

    params = {
      auth_token: $scope.user.token,
      state: "failed",
      feedback_id: index + 3
    }

    API.post('sweetches/' + sweetchId, params).
    success(function(data, status, headers, config) {
      console.log("API: Failed Sweetch");
      SweetchModel.delete();
    }).
    error(function(data, status, headers, config) {
      console.log("API: Error, could not fail Sweetch");
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });
  }

  $scope.cancelSweetchInBackend = function (id) {
    params = { auth_token: window.sessionStorage['fbtoken'], state: "cancelled" };
    API.post('sweetches/' + id, params).
    success(function(data, status, headers, config) {
      console.log("API: Cancelled Sweetch");
    }).
    error(function(data, status, headers, config) {
      console.log("API: Error, could not cancel Sweetch");
      // called asynchronously if an error occurs
      // or server returns response with an error status.
    });
  };


  $scope.logout = function () {
      OpenFB.logout();
      $state.go('login');
  };

  $scope.revokePermissions = function () {
      OpenFB.revokePermissions().then(
          function () {
              $state.go('login');
          },
          function () {
              alert('Revoke permissions failed');
          });
  };
});