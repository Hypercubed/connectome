
(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .controller('PanelCtrl', function ($scope, localStorageService) {

      this.state = {
        info: false,
        data: false
      };

      // Panel state
      localStorageService.bind($scope, 'panelState', this.state);

      $scope.gridOptions = {};

      $scope.itemClicked = function(row) {
        //console.log(row.selectionProvider.selectedItems);

        if (row.entity.locked) {
          row.entity.ticked = false;
        }

        //if(row.entity.receptor && row.entity.ligand) {
        //  row.entity.receptor.ticked = row.entity.ticked;
        //  row.entity.ligand.ticked = row.entity.ticked;
        //}

        if (row.selected === true) {
          row.selectionProvider.selectedItems.forEach(function(d) {
            d.ticked = row.entity.ticked;
            d.locked = row.entity.locked;

            //if(d.receptor && d.ligand) {
            //  d.receptor.ticked = row.entity.ticked;
            //  d.ligand.ticked = row.entity.ticked;
            //}

          });
        }
      };

      var defaults = {
        showFooter: true,
        enableSorting: true,
        multiSelect: true,
        showFilter: true,
        showColumnMenu: false,
        showGroupPanel: false,
        enableCellSelection: false,
        selectWithCheckboxOnly: false,
        showSelectionCheckbox: true,
        enableColumnResize: true,
        sortInfo: { fields: ['ticked'], directions: ['desc'] },
        //groups: ['locked'],
        //groupsCollapsedByDefault: true,
        //rowTemplate: 'rowTemplate',
        //menuTemplate: 'menuTemplate',
        //checkboxCellTemplate: '<div class="ngCellText"></div>',
        checkboxHeaderTemplate: 'checkboxHeaderTemplate.html',
        beforeSelectionChange: function(row, e) {  // Without shift or ctrl deselect previous
          if (!angular.isArray(row) && !e.ctrlKey && !e.shiftKey) {
            row.selectionProvider.toggleSelectAll(false,true);
          }
          return true;
        },
        columnDefs: [
          {
            field:'ticked',
            displayName:'Visible',
            width: 60,
            cellTemplate: 'cellTemplate',
            headerCellTemplate: 'visibleHeaderCellTemplate'
          }
        ]
      };

      $scope.gridOptions = {};

      $scope.gridOptions.cells = angular.extend({}, defaults, {
        data: 'data.cells',
        columnDefs: [
          defaults.columnDefs[0],
          {field:'name', displayName:'Cell Type'},
          {field:'meta.Ontology', displayName:'Ontology'}
        ]
      });

      $scope.gridOptions.genes = angular.extend({}, defaults, {
        data: 'data.genes',
        columnDefs: [
          defaults.columnDefs[0],
          {field:'name', displayName:'Gene Symbol'},
          {field:'description', width: '25%', displayName:'Gene Name'},
          {field:'class', displayName:'Class'},
          //{field:'age', displayName:'Age',cellFilter:'number'},
          //{field:'consensus', displayName:'Subcellular Localization'},
          {field:'hgncid', displayName:'HGNC ID',cellTemplate:'cellHGNCTemplate'},
          {field:'uniprotid', displayName:'UniProt ID', cellTemplate:'cellUniProtTemplate'},
          {field:'taxon', displayName:'Taxon'}
        ]
      });

      $scope.gridOptions.pairs = angular.extend({}, defaults, {
        data: 'data.pairs',
        columnDefs: [
          defaults.columnDefs[0],
          //{field:'ticked', displayName:'Visible', width: 60, cellTemplate: 'cellPairTemplate'},
          {field:'name', displayName:'Pair Name'},
          {field:'Ligand', displayName:'Ligand',cellTemplate: 'cellLigandTemplate'},
          {field:'Receptor', displayName:'Receptor',cellTemplate: 'cellReceptorTemplate'},
          {field:'source', displayName:'Source',cellTemplate: 'cellPubMedTemplate'}
        ]
      });

      //$scope.gridOptions.cells = angular.extend({}, defaultGridOptions,{
      //  data: 'data.cells',
      //  columnDefs: defaultGridOptions.columnDefs.concat([
      //    {field:'meta.Ontology', displayName:'Ontology'}
      //  ])
      //});

      /* $scope.gridOptions.genes = angular.extend({}, defaultGridOptions, {
        data: 'data.genes',
        columnDefs: defaultGridOptions.columnDefs.concat([
          {field:'class', displayName:'Type'},
          {field:'age', displayName:'Age'},
          {field:'taxon', displayName:'Taxon',cellFilter:'number'},
          {field:'consensus', displayName:'Consensus'},
          {field:'description', displayName:'Description'},
          {field:'hgncid', displayName:'HGNC ID'},
          {field:'uniprotid', displayName:'UniProt ID'}
        ])
      }); */

      /* $scope.gridOptions.pairs = angular.extend({}, defaultGridOptions, {
        data: 'data.pairs',
        columnDefs: defaultGridOptions.columnDefs.concat([
          {field:'Ligand', displayName:'Ligand',cellTemplate: 'cellLigandTemplate'},
          {field:'Receptor', displayName:'Receptor',cellTemplate: 'cellReceptorTemplate'},
        ])
      }); */

    });

})();
