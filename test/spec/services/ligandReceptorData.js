/* global _F */

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

      var pairs = ['Ligand','Receptor','Source','Databases'].join('\t')+'\n';
      pairs += ['l1','r1','source1','none'].join('\t')+'\n';
      pairs += ['l2','r2','source2','none'].join('\t');

      var expr = ['gene','c1','c2','c3'].join('\t')+'\n';
      expr += ['l1','0','100','11'].join('\t')+'\n';
      expr += ['r1','11','0','0'].join('\t')+'\n';
      expr += ['l2','9','0','0'].join('\t')+'\n';
      expr += ['r2','5','11','0'].join('\t');

      var ont = ['Cell','Ontology'].join('\t')+'\n';
      ont += ['c1','mesenchymal'].join('\t')+'\n';
      ont += ['c2','mesenchymal'].join('\t')+'\n';
      ont += ['c3','mesenchymal'].join('\t');

      var genes = ['ApprovedSymbol','ApprovedName','Class','UniProtID','HGNCID','Taxon'].join('\t')+'\n';
      genes += ['l1','l1-desc','ligand','id','id','tax'].join('\t')+'\n';
      genes += ['r1','r1-desc','receptor','id','id','tax'].join('\t')+'\n';
      genes += ['l2','l2-desc','ligand','id','id','tax'].join('\t')+'\n';
      genes += ['r2','r2-desc','receptor','id','id','tax'].join('\t')+'\n';

      $httpBackend.expectGET('data/LR.pairs.txt').respond(pairs);
      $httpBackend.expectGET('data/LR.expr.txt').respond(expr);
      $httpBackend.expectGET('data/ontology.txt').respond(ont);
      $httpBackend.expectGET('data/LR.genes.txt').respond(genes);

    });
  });

  it('should load files', function () {

    ligandReceptorData.load().then(function(data) {
      expect(data.expr.length).toEqual(5);
      //expect(data.cells.length).toEqual(3);
      //expect(data.pairs.length).toEqual(2);
      //expect(data.genes.length).toEqual(4);

      expect(data.cells.map(_F('name'))).toEqual(['c1','c2','c3']);
      expect(data.genes.map(_F('name'))).toEqual(['l1','r1','l2','r2']);
      expect(data.pairs.map(_F('name'))).toEqual(['l1-r1','l2-r2']);
      expect(data.genes.map(_F('median'))).toEqual([11, 0, 0, 5]);
    });

    $httpBackend.flush();
  });

  describe('getCells', function() {
    it('should return correct results', function () {

      ligandReceptorData.load().then(function() {
        expect(ligandReceptorData.getCells({}).length).toEqual(3);
        expect(ligandReceptorData.getCells({ name: 'c1' }).length).toEqual(1);
        expect(ligandReceptorData.getCells({ name: 'c4' }).length).toEqual(0);
      });

      $httpBackend.flush();
    });
  });

  describe('getGenes', function() {
    it('should return correct results', function () {

      ligandReceptorData.load().then(function() {
        expect(ligandReceptorData.getGenes({}).length).toEqual(4);
        expect(ligandReceptorData.getGenes({ name: 'l1' }).length).toEqual(1);
        expect(ligandReceptorData.getGenes({ name: 'l3' }).length).toEqual(0);
        expect(ligandReceptorData.getGenes({ class: 'ligand' }).length).toEqual(2);
      });

      $httpBackend.flush();
    });
  });

  describe('getPairs', function() {
    it('should return correct results', function () {

      ligandReceptorData.load().then(function() {
        expect(ligandReceptorData.getPairs({}).length).toEqual(2);
        expect(ligandReceptorData.getPairs({ name: 'l1-r1' }).length).toEqual(1);
        expect(ligandReceptorData.getPairs({ name: 'l2-r1' }).length).toEqual(0);
        expect(ligandReceptorData.getPairs({ ligand: {}, receptor: {} }).length).toEqual(2);
        expect(ligandReceptorData.getPairs({ ligand: { name: 'l1' } }).length).toEqual(1);
        expect(ligandReceptorData.getPairs({ ligand: { name: 'l1' }, receptor: { name: 'r1' } }).length).toEqual(1);
        expect(ligandReceptorData.getPairs({ ligand: { name: 'l1' }, receptor: { name: 'r2' } }).length).toEqual(0);
      });

      $httpBackend.flush();
    });
  });

  describe('getExpressionValues', function() {
    it('should return correct results', function () {

      ligandReceptorData.load().then(function() {
        expect(ligandReceptorData.getExpressionValues({}).length).toEqual(6);
        expect(ligandReceptorData.getExpressionValues({},2).length).toEqual(2);
        expect(ligandReceptorData.getExpressionValues({ligandMin: 10, receptorMin: 10}).length).toEqual(4);
        expect(ligandReceptorData.getExpressionValues({cell: {name:'c1'} }).length).toEqual(3);
        expect(ligandReceptorData.getExpressionValues({cell: {name:'c2'} }).length).toEqual(2);
        expect(ligandReceptorData.getExpressionValues({cell: {name:'c3'} }).length).toEqual(1);
        expect(ligandReceptorData.getExpressionValues({cell: {name:['c1','c2']} }).length).toEqual(5);
      });

      $httpBackend.flush();
    });
  });

  describe('getPathways', function() {
    it('should return correct results', function () {

      ligandReceptorData.load().then(function() {
        expect(ligandReceptorData.getPathways({}).length).toEqual(2);
        expect(ligandReceptorData.getPathways({ligandMin: 1, receptorMin: 1}).length).toEqual(4);
        expect(ligandReceptorData.getPathways({ligandMin: 1, receptorMin: 1},2).length).toEqual(2);
      });

      $httpBackend.flush();
    });
  });

});
