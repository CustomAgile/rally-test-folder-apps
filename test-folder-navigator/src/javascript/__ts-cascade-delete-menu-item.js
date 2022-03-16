Ext.define('Rally.technicalservices.ui.menu.item.CascadeDeleteMenuItem', {
    extend:  Rally.ui.menu.item.RecordMenuItem ,
    alias: 'widget.tsrecordmenuitemcascadedelete',

    clickHideDelay: 1,

    config: {

        /**
         * @cfg {Rally.data.wsapi.Model}
         * The record of the menu
         */
        record: undefined,

        /**
         * @cfg {Function}
         * This is called when a menu item is clicked
         */
        handler: function () {
            this._onCascadeDeleteClicked();
        },

        /**
         * @cfg {Function}
         *
         * A function that should return true if this menu item should show.
         * @param record {Rally.data.wsapi.Model}
         * @return {Boolean}
         */
        predicate: function (record) {
            return true;
        },

        /**
         * @cfg {String}
         * The display string
         */
        text: 'Cascade Delete'

    },

    constructor:function (config) {
        this.initConfig(config);
        this.callParent(arguments);
    },
    
    _onCascadeDeleteClicked: function() {
        var confirm_dialog = this._launchConfirmDialog();
        confirm_dialog.on('confirm',this._doDelete, this);
    },
    
    _doDelete: function() {
        var me = this;
        this.view.setLoading("Finding Records To Remove");
        
        this._getChildren(this.record).then({
            success: function(results) {                
                var testfolders = results[0];
                var testcases = Ext.Array.flatten(results[1]);
                
                var promises = [];
                Ext.Array.each(testcases, function(record) {
                    promises.push( function() { return me._destroyRecord(record); } );
                });
                
                Ext.Array.each(testfolders, function(record) {
                    promises.push( function() { return me._destroyRecord(record); } );
                });
                
                me.view.setLoading("Removing " + promises.length + " records");
                
                Deft.Chain.sequence(promises).then({
                    success: function(results) {
                        me.view.setLoading(false);
                    },
                    failure: function(message) {
                        Ext.msg.alert(message);
                    }
                });
            },
            failure: function(message) {
                Ext.msg.alert(message);
            }
        });
        
    },
    
    _destroyRecord: function(record) {
        var deferred = Ext.create('Deft.Deferred');
        record.destroy({
            callback: function(result,operation) {
                if (operation.wasSuccessful()) {
                    deferred.resolve(1);
                } else {
                    console.log(record.get("FormattedID"), operation);
                    deferred.reject("Could not destroy " + record.get('FormattedID'));
                }
            }
        });
        return deferred.promise;
    },
    
    _getChildren: function(record) {
        var deferred = Ext.create('Deft.Deferred');
        
        var testfolders = [record];  // TODO: stop cheating
        var me = this;
        
        Deft.Chain.pipeline([
            function() { return me._getChildTestFolders(record,testfolders); },
            function(results) {
                var d2 = Ext.create('Deft.Deferred');
                var promises = [];
                
                Ext.Array.each(testfolders,function(testfolder){
                    promises.push(me._getChildTestCases(testfolder));
                });
                
                Deft.Promise.all(promises).then({
                    success: function(results) { d2.resolve([testfolders,results]) },
                    failure: function(message) { d2.reject(message) }
                });
                return d2.promise;
            }
        ]).then({
            scope: this,
            success: function(results) {
                deferred.resolve(results);
            },
            failure: function(message) {
                deferred.reject(message);
            }
        });
        return deferred.promise;
    },
    
    _getChildTestCases: function(testfolder) {
        var deferred = Ext.create('Deft.Deferred');
        
        Ext.create('Rally.data.wsapi.Store',{
            limit: 'Infinity',
            model:'TestCase',
            filters: [{property:'TestFolder',value: testfolder.get('_ref')}],
            autoLoad: true,
            fetch: ['FormattedID'],
            listeners: {
                scope: this,
                load: function(store,records) {
                    deferred.resolve(records);
                }
            }
        });
        return deferred.promise;
    },
    
    _getChildTestFolders: function(record,children) {
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            limit: 'Infinity',
            model:'TestFolder',
            filters: [{property:'Parent',value: record.get('_ref')}],
            autoLoad: true,
            fetch: ['FormattedID'],
            listeners: {
                scope: this,
                load: function(store,records) {
                    var promises = [];
                    Ext.Array.each(records,function(record){
                        children.push(record);
                        promises.push(this._getChildTestFolders(record,children));
                    },this);
                    if ( promises.length > 0 ) {
                        Deft.Promise.all(promises).then({
                            success: function(more_records) {
                                children = Ext.Array.merge(children,more_records);
                                deferred.resolve(children);
                            },
                            failure: deferred.reject
                        });
                    } else {
                        //children.push(record);
                        deferred.resolve(children);
                    }
                }
            }
        });
        return deferred.promise;
    },
    
    _launchConfirmDialog: function() {
        console.log(this.record);
        var record_display_string = "<b>" + this.record.get('FormattedID') + ": " + this.record.get('Name') + "</b>";
        
        return Ext.create('Rally.ui.dialog.ConfirmDialog', {
            title: 'Cascade Delete',
            message: "Are you sure? <br/><br/>This will delete <em>all of</em> this folder's descendant folders and test cases, " +
                    "regardless of your filter setting.<br/><br/>  " +
                    "The chosen folder is: " + record_display_string + "<br/><br/>" + 
                    "THERE IS NO UNDO.",
            confirmLabel: 'OK'
        });
    }
});