'use strict';

describe('Service: ligandReceptorData', function () {

  // load the service's module
  beforeEach(module('lrSpaApp'));

  // instantiate service
  var $httpBackend, ligandReceptorData;

  beforeEach(function() {

    inject(function (_$httpBackend_, _ligandReceptorData_) {

      $httpBackend = _$httpBackend_;
      ligandReceptorData = _ligandReceptorData_;

      var pairs = ['Ligand','Receptor','Source'].join('\t')+'\n';
      pairs += ['l1','r1','putative'].join('\t')+'\n';
      pairs += ['l2','r2','putative'].join('\t')+'\n';

      var expr = ['gene','c1','c2'].join('\t')+'\n';
      expr += ['l1','0','100'].join('\t')+'\n';
      expr += ['r1','11','0'].join('\t')+'\n';
      expr += ['l2','9','0'].join('\t')+'\n';
      expr += ['r2','5','11'].join('\t')+'\n';

      var ont = ['Cell','Ontology'].join('\t')+'\n';
      ont += ['c1','mesenchymal'].join('\t')+'\n';
      ont += ['c2','mesenchymal'].join('\t')+'\n';

      var genes = ['ApprovedSymbol','ApprovedName','Class','UniProtID','HGNCID','Taxon'].join('\t')+'\n';
      genes += ['l1','l1-name','ligand','id','id','tax'].join('\t')+'\n';
      genes += ['r1','r1-name','receptor','id','id','tax'].join('\t')+'\n';
      genes += ['l2','l2-name','ligand','id','id','tax'].join('\t')+'\n';
      genes += ['r2','r2-name','receptor','id','id','tax'].join('\t')+'\n';

      $httpBackend.expectGET('data/LR.pairs.txt').respond(pairs);
      $httpBackend.expectGET('data/LR.expr.txt').respond(expr);
      $httpBackend.expectGET('data/ontology.txt').respond(ont);
      $httpBackend.expectGET('data/LR.genes.txt').respond(genes);

    });
  });

  it('should load files', function () {

    ligandReceptorData.load().then(function(data) {
      expect(data.expr.length).toEqual(5);
      expect(data.cells.length).toEqual(2);
      expect(data.pairs.length).toEqual(2);
      expect(data.genes.length).toEqual(4);

      console.log(data.genes.map(_F('median')));
    });

    $httpBackend.flush();
  });

  describe('getExpressionValues', function() {
    it('should return correct results', function () {

      ligandReceptorData.load().then(function() {
        expect(ligandReceptorData.getExpressionValues({}).length).toEqual(5);
        expect(ligandReceptorData.getExpressionValues({},2).length).toEqual(2);
        expect(ligandReceptorData.getExpressionValues({ligandMin: 10, receptorMin: 10}).length).toEqual(3);
        expect(ligandReceptorData.getExpressionValues({cell: {name:'c1'} }).length).toEqual(3);
        expect(ligandReceptorData.getExpressionValues({cell: {name:'c2'} }).length).toEqual(2);
      });

      $httpBackend.flush();
    });
  });

  describe('getPathways', function() {
    it('should return correct results', function () {

      ligandReceptorData.load().then(function() {
        expect(ligandReceptorData.getPathways({}).length).toEqual(1);
        expect(ligandReceptorData.getPathways({ligandMin: 1, receptorMin: 1}).length).toEqual(3);
        expect(ligandReceptorData.getPathways({ligandMin: 1, receptorMin: 1},2).length).toEqual(2);
      });

      $httpBackend.flush();
    });
  });

});
