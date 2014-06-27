angular.module('sweetchApp', ['ionic', 'sweetchApp.controllers', 'sweetchApp.directives', 'sweetchApp.services','openfb'])

.run(function ($rootScope, $state, $ionicPlatform, $window, OpenFB) {

  OpenFB.init('FB_APP_ID', 'http://localhost:8100/oauthcallback.html');

  $ionicPlatform.ready(function () {
    console.log('Platform ready');
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });

  $rootScope.$on('$stateChangeStart', function(event, toState) {
    if (toState.name !== "login" && toState.name !== "intro" && toState.name !== "phone" && toState.name !== "logout" && !$window.sessionStorage['fbtoken']) {
      event.preventDefault();
      $state.go('intro');
    } else if ((toState.name === "login" || toState.name === "intro") && $window.sessionStorage['fbtoken']) {
      event.preventDefault();
      $state.go('app.home');
    }

    if (toState.name !== "app.leave") {
      $rootScope.displayPin = false;
    }
  });

  $rootScope.displayPin = false;

  $rootScope.$on('OAuthException', function() {
    $state.go('login');
  });

})

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('app', {
    url: "/app",
    abstract: true,
    templateUrl: "templates/menu.html",
    controller: "AppCtrl"
  })
  .state('intro', {
    url: '/',
    templateUrl: 'templates/intro.html',
    controller: 'IntroCtrl'
  })
  .state('phone', {
    url: '/phone',
    templateUrl: 'templates/add-phone.html',
    controller: 'PhoneCtrl'
  })
  .state('login', {
    url: "/login",
    templateUrl: "templates/login.html",
    controller: "LoginCtrl"
  })
  .state('logout', {
    url: "/logout",
    template: '<div>Logging you out...</div>',
    controller: "LogoutCtrl"
  })
  .state('app.map', {
    url: "/map",
    views: {
      'menuContent': {
        templateUrl: "templates/map.html",
        controller: "MapCtrl"
      }
    }
  })
  .state('app.leave', {
    url: "/leave",
    views: {
      'menuContent': {
        templateUrl: "templates/leave.html",
        controller: "LeaveCtrl"
      }
    }
  });

  $urlRouterProvider.otherwise("/");

});