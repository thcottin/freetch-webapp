angular.module('sweetchApp.services', [])

.factory('User', function() {
  var user;

  function getUser() {
    user = angular.fromJson(window.localStorage["user"]);
    return user;
  }

  return {
    save: function(user) {
      console.log("Saving user locally");
      console.log(user["email"]);
      var savedUser = {
        id: user.id,
        email: user["email"],
        facebook_id: user["facebook_id"],
        first_name: user["first_name"],
        last_name: user["last_name"],
        token: window.sessionStorage['fbtoken'],
        count_sweetch: user["count_sweetch"],
        credits: user["credits"],
        is_customer: user["is_customer"],
        phone: user["phone"]
      };

      window.localStorage['user'] = angular.toJson(savedUser);
    },

    get: function() {
      return getUser();
    },

    update: function(attrs) {
      getUser();
      if (attrs.phone) {
        user.phone = attrs.phone;
      }
      window.localStorage['user'] = angular.toJson(user);
      return user;
    }
  }
})


.factory('SweetchModel', function() {
  var sweetchObject = {}

  function saveObject() {
    window.localStorage['sweetch'] = angular.toJson(sweetchObject);
  }

  function getSweetch() {
    sweetchObject = angular.fromJson(window.localStorage['sweetch']);
  }

  return {
    new: function(attrs) {
      sweetchObject = {
        id: attrs["id"],
        leaver_lat: attrs["lat"],
        leaver_lng: attrs["lng"],
        parker_lat: attrs["parker_lat"],
        parker_lng: attrs["parker_lng"],
        state: attrs["state"]
      }
      return sweetchObject;
    },
    update: function(json) {
      console.log(json);
      getSweetch();
      if (json["leaver_lat"]) {
        sweetchObject.leaver_lat = json["leaver_lat"];
      }
      if (json["leaver_lng"]) {
        sweetchObject.leaver_lng = json["leaver_lng"];
      }
      if (json["parker_lng"]) {
        sweetchObject.parker_lng = json["parker_lng"];
      }
      if (json["parker_lat"]) {
        sweetchObject.parker_lat = json["parker_lat"];
      }
      if (json["state"]) {
        sweetchObject.state = json["state"];
      }
      saveObject();
      return sweetchObject;
    },
    save: function() {
      saveObject();
      return true;
    },
    get: function() {
      return angular.fromJson(window.localStorage["sweetch"]);
    },
    delete: function() {
      window.localStorage.removeItem('sweetch');
      return true;
    }
  }
})

.factory('Driver', function() {
  function saveObject(driverObject) {
    window.localStorage['driver'] = angular.toJson(driverObject);
  }

  function getDriver() {
    return angular.fromJson(window.localStorage['driver']);
  }

  return {
    save: function(driver) {
      var driverObject = {};
      driverObject.facebook_id = driver.facebook_id;
      driverObject.phone = driver.ph;
      driverObject.first_name = driver.first_name;
      driverObject.lat = driver.lat;
      driverObject.lng = driver.lng;
      driverObject.eta = driver.eta;
      saveObject(driverObject);
      return driverObject;
    },
    get: function() {
      return getDriver();
    },
    delete: function() {
      window.localStorage.removeItem('driver');
      return true;
    }
  }
})

.factory('API', function($http) {
  var baseUrl = 'API_URL'

  var serialize = function (obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }

  var postRequest = function(path, params) {
    return $http({
      method: 'POST',
      url: baseUrl + path,
      data: serialize(params),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
    });
  }

  var putRequest = function(path, params) {
    console.log(params)
    return $http({
      method: 'PUT',
      url: baseUrl + path,
      data: serialize(params),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
    });
  }

  return {
    post: function(path, params) { 
      return postRequest(path, params); 
    },
    put: function(path, params) {
      return putRequest(path,params);
    }
  }

});