Ext.define('Rally.ui.menu.bulk.TestSet', {
    alias: 'widget.rallyrecordmenubulktestset',
    extend:  Rally.ui.menu.bulk.MenuItem ,


    config: {
        text: 'Add to TestSet...',
        handler: function() {
            this._onMenuItemChosen();
        },
        
        predicate: function(records) {
            return records;
        },

        prepareRecords: function(records, args) {
            return records;
        },
        
        /**
         * 
         * @cfg {Rally.data.wsapi.TreeStore}
         * 
         *  The store on the underlying grid
         */
        baseStore: null
    },     

    _onMenuItemChosen: function() {
        Ext.create('Rally.technicalservices.dialog.BulkAddToTestSetDialog', {
            listeners: {
                artifactchosen: this._testsetchosen,
                scope: this
            }
        });
        
        console.log('created dialog');
    },     

    _testsetchosen: function(dialog, testset) {
        console.log('Chose test set:',testset);
        var me = this;
        
        if (this.onBeforeAction(this.records) === false) {
            return;
        }
        var records = this.records;
        
        if ( records.length > 0 ) { 
            this.baseStore = records[0].store;
        }
        
        var promises = [];
        Ext.Array.each( records, function(record){
            promises.push( function(){
                return me._addToTestSet(record,testset);
            });
        },this);
        
        Deft.Chain.sequence(promises).then({
            scope: this,
            success: function(results) {
                console.log('done', results);
                this.onSuccess (Ext.Array.flatten(results), []);
            },
            failure: function(message) {
                Ext.Msg.alert('Problem saving to test set: ', message);
            }
        });
    },     
   
    // add one record at a time to the testset
    _addToTestSet: function(record, testset) {
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        
        console.log('Adding ', record.get('_type'), record.get('FormattedID'), testset.get('FormattedID'), testset.get('_ref'));
        if ( record.get('_type') == "testfolder" ) {
            // go get the testcases
            Deft.Chain.parallel([ 
                function() { return me._getTestFoldersInFolder(record) },
                function() { return me._getTestCasesInFolder(record) }
            ]).then({
                scope: me,
                success: function(folders_and_cases) {
                    var promises = [];
                    Ext.Array.each( Ext.Array.flatten(folders_and_cases), function(item){
                        promises.push( function(){
                            return me._addToTestSet(item,testset);
                        });
                    },this);
                    
                    Deft.Chain.sequence(promises).then({
                        scope: this,
                        success: function(results) {
                            deferred.resolve(results);
                        },
                        failure: function(message) {
                            deferred.reject(message);
                        }
                    });
                },
                failure: function(message) {
                    deferred.reject(message);
                }
            });
            
        } else {
            // add the testcase
            var store = testset.getCollection('TestCases');
            store.load({
                callback: function() {
                    console.log('adding ', record.get('_ref'), ' to ', store);
                    store.add([{ "_ref": record.get('_ref') }]);
                    store.sync({
                        callback: function() {
                            deferred.resolve(record);
                        }
                    });
                }
            });
        }
        return deferred.promise;
    },
    _getTestCasesInFolder: function(record) {
        var deferred = Ext.create('Deft.Deferred');
        
        var filters = [{property:'TestFolder.ObjectID',value:record.get('ObjectID')}];
        
        if ( this.baseStore && ! Ext.isEmpty( this.baseStore.extra_filter_by_model['testcase'] ) ) {
            filters = Ext.Array.merge(filters, this.baseStore.extra_filter_by_model['testcase'] );
        }
        
        Ext.create('Rally.data.wsapi.Store',{
            model: 'TestCase',
            autoLoad: true,
            filters: filters,
            sorters: [{property:'DragAndDropRank',direction:'ASC'}],
            limit: 'Infinity',
            listeners: {
                load: function(store,records,success){
                    Ext.Array.each(records,function(record){ console.log(record.get('FormattedID')); });
                    
                    deferred.resolve(records);
                }
            }
        });
        
        return deferred.promise;
    },
    _getTestFoldersInFolder: function(record) {
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            model: 'TestFolder',
            autoLoad: true,
            filters: [{property:'Parent.ObjectID',value:record.get('ObjectID')}],
            limit: 'Infinity',
            listeners: {
                load: function(store,records,success){
                    deferred.resolve(records);
                }
            }
        });
        
        return deferred.promise;
    },
    /**    
     * @override
     * @inheritdoc
     */     
    onSuccess: function (successfulRecords, unsuccessfulRecords, args, errorMessage) {
        var changes = {};
        Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords, changes]);
    }
});
