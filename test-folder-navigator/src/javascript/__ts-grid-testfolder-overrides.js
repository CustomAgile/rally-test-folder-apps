Ext.override(Rally.ui.grid.CheckboxModel,{

    _recordIsSelectable: function(record) {
        return true;
    }

});

Ext.override(Rally.ui.menu.bulk.RecordMenu,{

    _getMenuItems: function () {
        var records = this.getRecords();
        var items = [
            {
                text: 'Bulk Actions (' + records.length + ' items)',
                canActivate: false,
                cls: 'menu-item-read-only'
            }
        ].concat(this.items);

        items.push({xtype: 'rallyrecordmenubulktestset'});
  

        _.each(items, function (item) {
            Ext.apply(item, {
                records: records,
                store: this.store,
                onBeforeAction: this.onBeforeAction,
                onActionComplete: this.onActionComplete,
                context: this.getContext()
            });
        }, this);

        return items;
    }
});

Ext.override(Rally.ui.gridboard.GridBoard,{
    
    _applyGridFilters: function(grid, filterObj) {
        var me = this;
        
        var filter_for_testcase = false;
        
        console.log('_applyGridFilters', filterObj);
        
        if (!_.isEmpty(filterObj.types)) {
            //grid.store.parentTypes = filterObj.types;
            if ( filterObj.types.length == 1 && filterObj.types[0] == "testcase" ) {
                grid.store.extra_filter_by_model["testcase"] = filterObj.filters;
                filter_for_testcase = true;
            }
        }
        
        console.log('filter for testcase:', filter_for_testcase);
        
        grid.store.clearFilter(true);
        var filters = this._getConfiguredFilters(filterObj.filters || [], filterObj.types || []);
        
        if ( filter_for_testcase ) {
            filters = this._getConfiguredFilters([],filterObj.types || []);
        }
        
        if ( this.expandTo !== null && this.expandTo !== undefined ) {
            console.log("Expand To: ", this.expandTo);
            
            grid.store.on('load', function() { 
                me._showRecord(me.expandTo);
                me.expandTo = null;
                
            }, this, { single: true });
        }
        
        if ( ! Ext.isEmpty(this.searchFilter) ) {
            filters = Ext.Array.merge(this.searchFilter);
        }
        console.log("Using filters: ", filters);
        grid.store.filter(filters);
        
    },
    
    _getConfiguredFilters: function(extraFilters, types) {
        var isBoard = this.getToggleState() === 'board';
        
        // want to see if we can decide to only apply the permanent filter if extra is empty
        if ( !extraFilters ) { extraFilters = []; }
        
        console.log('extraFilters', extraFilters);
        
        var filters =  _.compact(Ext.Array.merge(
                    this.storeConfig && this.storeConfig.filters,
                    isBoard && this.cardBoardConfig.storeConfig && this.cardBoardConfig.storeConfig.filters,
                    !isBoard && this.gridConfig.storeConfig && this.gridConfig.storeConfig.filters,
                    extraFilters));
                    
        if ( extraFilters.length != 0 ) {
            filters = extraFilters;
        }
        
        return filters;
    },

    _showRecord: function(item) {
        if ( !item ) {
            return;
        }
        this.setLoading("Finding " + item.get("FormattedID") + "...");
        console.log("show", item);
        var me = this;
        this.grid.collapseAll();
        Rally.data.ModelFactory.getModel({
            type: 'TestFolder',
            success: function(model) {
                model.load(item.get('_ref'), {
                    fetch: ['FormattedID', 'Name', 'ObjectID', 'Parent'],
                    callback: function(record) {
                        me._buildAncestorArray(record,[record]).then({
                            success: function(records) {
                                me._expandNode(records);
                            },
                            failure: function(msg) {
                                console.log("oops," + msg);
                            }
                        });
                    },
                    scope: this
                });
            }
        });

        
        
    },
    
   applyCustomFilter: function(filterObj) {
        console.log('applyCustomFilter',filterObj);
        
        // add if statement to keep from getting duplicates
        if ( filterObj.types && filterObj.types.length > 0 ) {
            var gridOrBoard = this.getGridOrBoard();
    
            this.currentCustomFilter = filterObj;
    
            if (gridOrBoard) {
                if (this.getToggleState() === 'board') {
                    this._applyBoardFilters(gridOrBoard, filterObj);
                } else {
                    this._applyGridFilters(gridOrBoard, filterObj);
                }
            }
        }
    },
        
    _expandNode: function(ancestor_array, page) {
        this.setLoading("Expanding...", page);
        if ( ancestor_array.length > 0 ) {
            var top_record = ancestor_array[ancestor_array.length - 1];
            var node = this.grid.getStore().findExactRecord(top_record);

            if ( !node ) {
                console.log("Top Record not in current page:", top_record);
                //
                console.log(this.grid.getStore());
                
                var store = this.grid.getStore();
                var old_filters = store.filters;
                
                var record_id = top_record.get('ObjectID');
                
                this.searchFilter = [ Ext.create('Rally.data.wsapi.Filter',{
                    property: 'ObjectID', 
                    value: record_id
                }) ];
                
                this.expandTo = ancestor_array[0];
                
                this.applyCustomFilter({ filters: [] });
                this.setLoading(false);
                return;
            }
            
            if ( node && ancestor_array.length > 1) {
                ancestor_array.pop();
                
                if ( !node.isExpanded() ) {
                    node.on('expand', function() {
                        this._expandNode(ancestor_array);
                    }, this, {single: true});
                    node.expand(false);
                } else {
                    this._expandNode(ancestor_array);
                }
            } else {
                this.grid.getSelectionModel().select([node]);
                
                this.grid.getView().focusNode(node);

                this.setLoading(false);
            }
        }
    },
    
    // Ancestor array is in reverse order (top of tree is last item)
    _buildAncestorArray: function(record,ancestor_array) {
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        
        var parent = record.get("Parent");
        if ( parent ) {
            this._getFolderByObjectID(parent.ObjectID).then({
                success: function(records) {
                    var record = records[0];
                    ancestor_array.push(record);

                    me._buildAncestorArray(record,ancestor_array).then({
                        success: function(ancestors) {
                            deferred.resolve(ancestors);
                        },
                        failure: function(msg) {
                            deferred.reject(msg);
                        }
                    });
                },
                failure: function(msg) {
                    deferred.reject(msg);
                }
            });
        } else {
            deferred.resolve(ancestor_array);
        }
        return deferred.promise;
    },
    
    _getFolderByObjectID: function(objectID){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            filters: [{property:'ObjectID',value:objectID}],
            fetch: ['FormattedID','Name','Parent','ObjectID'],
            model: 'TestFolder'
        }).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    deferred.reject('Problem getting folders: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _clearSearch: function() {
        var filter = this.gridConfig.storeConfig.filters;
        
        this.expandTo = null;
        this.searchFilter = null;
        
        this.applyCustomFilter({ filters: filter });
        return;
    },
    
    _addGrid: function() {
        var grid = this.add(this._getGridConfig());
        
        this.mon(grid, 'afterproxyload', this._onGridOrBoardLoad, this);

        if (!this.useFilterCollection && this.currentCustomFilter) {
            this._applyGridFilters(grid, this.currentCustomFilter);
        }
        
        this.on('recordSelect',this._showRecord, this);
        this.on('clearSearch', this._clearSearch, this);
        
        this.grid = grid;
        return grid;
    }
        
});