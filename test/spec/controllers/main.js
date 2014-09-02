'use strict';

describe('Controller: MainCtrl', function () {

  // load the controller's module
  beforeEach(module('lrSpaApp'));

  var MainCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    MainCtrl = $controller('MainCtrl', {
      $scope: scope,
      loadedData: {
        pairs: [1,2,3],
        cells: [],
        genes: []
      }
    });
  }));

  it('should attach loaded data', function () {
    expect(scope.data.pairs.length).toBe(3);
  });
});
