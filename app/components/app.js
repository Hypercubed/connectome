

(function() {
  'use strict';
  
  var app = angular
    .module('lrSpaApp', ['chieffancypants.loadingBar','localytics.directives','snap','LocalStorageModule','ui.bootstrap']);

  app
	.config(['localStorageServiceProvider', function(localStorageServiceProvider){
	  localStorageServiceProvider.setPrefix('lr');
	}]);

})();

