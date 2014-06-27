angular.module('sweetchApp.directives', [])

.directive('map', function() {
  return {
    restrict: 'E',
    scope: {
      onCreate: '&'
    },
    link: function ($scope, $element, $attr) {
      var mapOptions = {
        center: new google.maps.LatLng(37.749, -122.419),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      var map = new google.maps.Map($element[0], mapOptions);
  
      $scope.onCreate({map: map});

      // Stop the side bar from dragging when mousedown/tapdown on the map
      google.maps.event.addDomListener($element[0], 'mousedown', function (e) {
        e.preventDefault();
        return false;
      });
    }
  }
});

// .directive('changeMode', function() {
//   return {
//     restrict: 'C',
//     templateUrl: 'templates/change-mode.html',
//     scope: {
//       userMode: '=',
//       userState: '='
//     },
//     link: function(scope) {
//       console.log(userMode);
//       if (userMode === 'leaver') {
//         var toMode = "Park";
//         var allowed = (userState === 'parked' || userState === 'driving');
//         var buttonStyle = "positive";
//       } else if (userMode === 'parker') {
//         var toMode = "Leave";
//         var allowed = (userState === 'cruising' || userState === 'parked');
//         var buttonStyle = "royal";
//       }
//     }
//   }
// });
