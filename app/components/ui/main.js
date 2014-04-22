
(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .config(function(snapRemoteProvider) {
      snapRemoteProvider.globalOptions = {
        disable: 'right',
        maxPosition: 350,
        tapToClose: false,
        touchToDrag: false
      };
    });

  app
    .controller('MainCtrl', function () {

  });

})();