Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    projects: { target: null, source: null },
    stores: { target: null, source: null },
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'button_box',margin: 5, padding: 5, defaults: { margin: 5 }},
        {xtype:'container',itemId:'instructions_box',margin: 5, padding: 5, defaults: { margin: 5 }},
        {xtype:'container',layout: {type:'hbox'}, defaults:{ padding: 5, margin: 5 },items:[
             {xtype:'container',layout: {type: 'vbox'}, itemId:'source_box',flex:1, items: [
                    {xtype:'container',itemId:'source_selection_box', flex:1},
                    {xtype:'container',itemId:'source_folder_box', flex:1}
             ]}, 
             {xtype:'container',layout: {type: 'vbox'},itemId:'target_box',flex:1, items:[
                    {xtype:'container',itemId:'target_selection_box', flex:1},
                    {xtype:'container',itemId:'target_folder_box', flex:1}
             
             ]}
        ]},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._addProjectSelectors(this.down('#source_selection_box'),this.down('#target_selection_box'));
        this._addButtons();
    },
    _addButtons: function() {
        this.down('#button_box').add({
            xtype:'rallybutton',
            itemId: 'copy_button',
            text:'Copy to Target',
            disabled: true,
            scope: this,
            handler: this._copyFolders
        });
        this.down('#button_box').add({
            xtype:'rallybutton',
            itemId: 'move_button',
            text:'Move to Target',
            disabled: true,
            scope: this,
            handler: this._moveFolders
        });
        this.down('#button_box').add({
            xtype:'rallybutton',
            itemId:'clear_button',
            text:'Clear Target & Copy',
            scope: this,
            disabled: true,
            handler: this._clearAndCopyFolders
        });
        this.down('#instructions_box').add({
            xtype:'label',
            text: 'Please select a source project and a target project.  To copy a subset of test folders from the source project, select a test folder.  All decendent folders and cases of the selected source folder will be copied to the target project.  To copy ALL test folders that belong to the source project, leave all folders unselected.',
            style:'{color: #808080}',
            id: 'instructions'
        });
    },
    _addProjectSelectors:function(source_container,target_container) {        
        var workspace = this.getContext().getWorkspace();
        this.logger.log('_addProjectSelectors',workspace);
        this.logger.log(' project', this.getContext().getProject()._ref);
        source_container.add({
            fieldLabel: 'Source Project',
            labelCls: 'ts-column-header',
            labelAlign: 'top',
            xtype: 'rallyprojectpicker',
            value: this.getContext().getProject()._ref,
            workspace: workspace._ref,
            maxHeight: 300,
            listeners: {
                scope: this,
                change: function(picker) {
                    this.logger.log("source project ", picker.getSelectedRecord());
                    this._showTestFolders(picker.getSelectedRecord(),this.down('#source_folder_box'),'source');
                }
            }
        });
        target_container.add({
            fieldLabel: 'Target Project',
            labelCls: 'ts-column-header',
            labelAlign: 'top',
            xtype: 'rallyprojectpicker',
            workspace: workspace._ref,
            maxHeight: 300,
            listeners: {
                scope: this,
                change: function(picker) {
                    this.logger.log("target project ", picker.getSelectedRecord());
                    this._showTestFolders(picker.getSelectedRecord(),this.down('#target_folder_box'),'target');
                }
            }
        });
    },
    _showTestFolders:function(project,container,direction) {
        container.removeAll(); 
        this.logger.log('_showTestFolders',direction);
        this.stores[direction] = null;
        this.projects[direction] = project;
        this._updateButtonStates();
        this.stores[direction] = Ext.create('Rally.data.wsapi.Store',{
            autoLoad: true,
            model:'TestFolder',
            limit:'Infinity',
            fetch: true,
            sorters: [
                {
                    property: 'ObjectID',
                    direction: 'ASC'
                }
            ],
            context: {
                projectScopeDown: false,
                projectScopeUp: false,
                project: project.get('_ref')
            },
            listeners: {
                scope: this,
                load: function(store,records){
                    //this._addGrid(store,container,direction);
                    this._addTree(store,container,direction);
                    this._updateButtonStates();
                }
            }
        });
    },
    /*
     * make collabisibility and expanded choice configurable
     * 
     */
    _addTree: function(store,container,direction) {
        container.removeAll();
        container.add({
            xtype: 'tstestfoldertree',
            startExpanded: false,
            collapsible: true,
            topLevelStoreConfig: {
                context: store.context
            },
            isSource: (direction=='source')
        });
        
    },
    _addGrid: function(store,container,direction) {
        container.removeAll();
        container.add({
            xtype:'rallygrid',
            store: store,
            showPagingToolbar: false,
            showRowActionsColumn: false,
            columnCfgs: [
                {text:'id',dataIndex:'FormattedID'},
                {text:'Test Folders',dataIndex:'Name'}
            ]
        });
    },
    _updateButtonStates: function() {
        this.down('#copy_button').setDisabled(true);
        this.down('#clear_button').setDisabled(true);
        //this.down('#add_button').setDisabled(true);
        this.down('#move_button').setDisabled(true);
        
        var target_store = this.stores['target'];
        var source_store = this.stores['source'];
        var target_project = this.projects['target'];
        var source_project = this.projects['source'];
        
//        if ( target_store && source_store && source_project.get('_ref') != target_project.get('_ref') ) {
        if ( target_store && source_store && source_store.getTotalCount() > 0) {
            this.down('#copy_button').setDisabled(false);
            if ( source_project.get('_ref') != target_project.get('_ref') ) {
                this.down('#move_button').setDisabled(false);
                if ( target_store.getTotalCount() > 0 ) {
                    this.down('#clear_button').setDisabled(false);
                }
            }
        }
    },
    _clearAndCopyFolders: function() {
        var me = this;
        var target_project = this.projects['target'].get('_ref');
        this.setLoading("Clearing...");
        
        var f = function() { return me._clearFolders(target_project,me); }
        var g = function() { return me._clearTestCases(target_project,me); }
        var promises = [f,g];
        Deft.Chain.sequence(promises).then({
            scope: this,
            success: function(records){
                this._copyFolders();
            },
            failure: function(error) {
                alert("Problem removing folders " + error);
            }
        });
        
    },
    _clearFolders: function(target_project,me) {
        this.setLoading("Removing Folders...");
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            model:'TestFolder',
            limit:'Infinity',
            context: {
                projectScopeDown: false,
                projectScopeUp: false,
                project: target_project
            },
            autoLoad: true,
            listeners: {
                scope: me,
                load: function(store,folders){
                    var me = this;
                    var promises = [];
                    this.logger.log("Folders to remove", folders.length);
                    
                    Ext.Array.each(folders, function(folder){
                        var f = function() {
                            return me._deleteItem(folder, me);
                        };
                        promises.push(f);
                    });
                    Deft.Chain.sequence(promises).then({
                        success: function(records){
                            deferred.resolve([]);
                        },
                        failure: function(error) {
                            deferred.reject("Problem removing folders " + error);
                        }
                    });
                }
            }
        });
        return deferred;
    },
    _clearTestCases: function(target_project,me) {
        this.setLoading("Removing Test Cases...");
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            model:'TestCase',
            limit:'Infinity',
            context: {
                projectScopeDown: false,
                projectScopeUp: false,
                project: target_project
            },
            autoLoad: true,
            listeners: {
                scope: me,
                load: function(store,testcases){
                    var me = this;
                    var promises = [];
                    var number_of_testcases = testcases.length;
                    for ( var i=0;i<number_of_testcases;i++ ) {
                        var f = function() {
                            var testcase = testcases[0];
                            testcases.shift();
                            return me._deleteItem(testcase, me);
                        };
                        promises.push(f);
                    }
                    Deft.Chain.sequence(promises).then({
                        success: function(records){
                            deferred.resolve([]);
                        },
                        failure: function(error) {
                            deferred.reject("Problem removing test cases " + error);
                        }
                    });
                }
            }
        });
        return deferred;
    },
    _deleteItem: function(item, scope){
        var deferred = Ext.create('Deft.Deferred');
        var me = scope;
        if ( item && item !== undefined ) {
            me.logger.log('Removing', item.get('FormattedID'), item);
            
            item.destroy({
                callback: function(result, operation) {
                    if(operation.wasSuccessful()) {
                        deferred.resolve([]);
                    } else {
                        var message = item['Name'];
                        deferred.reject("Could not destroy " + message);
                    }
                }
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    },
    _getChildrenFolders: function(source_project,selected_record) {
        var deferred = Ext.create('Deft.Deferred');
        this.setLoading("Getting Test Folder Children..." + selected_record.get('FormattedID'));
        var filters =  [{property:'Parent.ObjectID', value:selected_record.get('ObjectID')}];
        
        Ext.create('Rally.data.wsapi.Store',{
            model:'TestFolder',
            limit:'Infinity',
            context: {
                projectScopeDown: false,
                projectScopeUp: false,
                project: source_project.get('_ref')
            },
            filters: filters,
            fetch: ['ObjectID','FormattedID','Name','Parent','Summary','TestCases'],
            autoLoad: true,
            listeners: {
                scope: this,
                load: function(store,testfolders){
                    var me = this;
                    var promises = [];
                    Ext.Array.each(testfolders,function(testfolder){
                        promises.push(this._getChildrenFolders(source_project,testfolder));
                    },this);
                    
                    if ( promises.length > 0 ) {
                        Deft.Promise.all(promises).then({
                            success: function(records){
                                deferred.resolve(Ext.Array.merge(Ext.Array.flatten(records),selected_record));
                            },
                            failure: function(error) {
                                deferred.reject("Problem finding test folders " + error);
                            }
                        });
                    } else {
                        deferred.resolve(selected_record)
                    }
                }
            }
        });
        return deferred;
    },
    _getSelectedFolderFamily: function(container)
    {
        var deferred = Ext.create('Deft.Deferred');
        //This function returns the parent folder plus any children, grandchildren, etc. for the item selected in the tree
        var tree = this.down(container).down('tstestfoldertree');
        var selected_records = tree.selectedRecords;
        
        if (tree.selectedRecords.length == 0)  //if no item is selected, then we will just get all the records 
        { 
            selected_records = this.stores['source'].getRecords();
            deferred.resolve(selected_records);
        } else {
            if ( selected_records[0].get('Children') && selected_records[0].get('Children').Count > 0 ) {
                this._getChildrenFolders(this.projects['source'], selected_records[0]).then({
                    success: function(records){
                        deferred.resolve(records);
                    },
                    failure: function(error) {
                        deferred.reject(error);
                    }
                });
            } else {
                deferred.resolve(selected_records);
            }
        }
               
        return deferred;
    },
    _copyFolders: function() {
        var me = this;
        this.logger.log("_copyFolders");
        var target_store = this.stores['target'];
        var source_store = this.stores['source'];
        var target_project = this.projects['target'];
        var source_project = this.projects['source'];
        
        //var source_folders = 
        this._getSelectedFolderFamily('#source_folder_box').then({
            scope: this,
            success: function(source_folders) {
                this.setLoading("Copying Folders");
                Rally.data.ModelFactory.getModel({
                    type: 'TestFolder',
                    success: function(model) {
                        var promises = [];
                        
                        Ext.Array.each( source_folders, function(source_folder){
                            me.logger.log("Promise for ", source_folder.get('FormattedID'));
                            // sequenced (to prevent collisions)
                            var f = function() {
                                return me._createItem(model,source_folder,{},me);
                            };
                            
                            promises.push(f);
                        });
                        Deft.Chain.sequence(promises).then({
                            success: function(records) {
                                // result is an array of arrays
                                var new_records_by_original_ref = {};
                                Ext.Array.each(records, function(pair){
                                    //console.log (pair[0].get('_ref'), pair[1]);
                                    new_records_by_original_ref[pair[0].get('_ref')] = pair[1];
                                });
                                
                                
                                me._setParentFolders(source_folders,new_records_by_original_ref,me);
                            },
                            failure: function(error) {
                                alert("There was a problem: " + error);
                            }
                        });
                    },
                    failure: function(error){
                         alert("There was a problem with source folders: " + error);
                    }
                });
            },
            failure: function(message) {
                alert("THere was a problem with getting source folders: " + message);
            }
        });
    },
    
    _moveFolders: function() {
        var me = this;
        this.logger.log("_moveFolders");
        var target_store = this.stores['target'];
        var source_store = this.stores['source'];
        var target_project = this.projects['target'];
        var source_project = this.projects['source'];
        
        this._getSelectedFolderFamily('#source_folder_box').then({
            scope: this,
            success: function(source_folders) {
                this.setLoading("Collecting Folders...");
                Rally.data.ModelFactory.getModel({
                    type: 'TestFolder',
                    success: function(model) {
                        var promises = [];
                        var folders_by_parent = {};
                        
                        Ext.Array.each( source_folders, function(source_folder){
                            me.logger.log("Promise for ", source_folder.get('FormattedID'));
                            // change so it can be sequenced (to prevent collisions)
                            var parent = source_folder.get('Parent');
                            
                            me.logger.log('parent', parent);
                            if ( parent && parent._ref ) {
                                me.logger.log(' --', parent._ref);
                                if ( !folders_by_parent[parent._ref] ) {
                                    folders_by_parent[parent._ref]=[];
                                }
                                folders_by_parent[parent._ref].push(source_folder);
                            }
                            var f = function() {
                                return me._moveFolder(source_folder,target_project,me);
                            };
                            
                            promises.push(f);
                        });
                        
                        me.logger.log("Folders by Parent: ", folders_by_parent);
                        
                        Deft.Chain.sequence(promises).then({
                            success: function(records) {
                                me._setParentFoldersForHash(folders_by_parent,me).then({
                                    success: function() {
                                        me._finishAndRedisplay(me);
                                    },
                                    failure: function(msg) {
                                        alert("There was a problem resetting test folder hierarchy: " + msg);
                                        me._finishAndRedisplay(me);
                                    }
                                });
                            },
                            failure: function(error) {
                                alert("There was a problem: " + error);
                            }
                        });
                    },
                    failure: function(error){
                         alert("There was a problem with source folders: " + error);
                    }
                });
            },
            failure: function(message) {
                alert("THere was a problem with getting source folders: " + message);
            }
        });
    },
    _moveTestCasesForFolder: function(source_folder, target_project, me) {
        var deferred = Ext.create('Deft.Deferred');
        me.setLoading("Move Test Cases For Folder " + source_folder.get('FormattedID'));

        Ext.create('Rally.data.wsapi.Store',{
            model: 'TestCase',
            limit: 'Infinity',
            filters: [{property:'TestFolder.ObjectID',value:source_folder.get('ObjectID')}],
            fetch: true,
            autoLoad: true,
            context: {
                project: null
            },
            listeners: {
                scope: me,
                load: function(store,testcases) {
                    me.logger.log("Test Cases: ", testcases);
                    var promises = [];
                    Ext.Array.each(testcases, function(testcase) {
                        me.logger.log("FormattedID: ", testcase.get('FormattedID'));
                        var f = function() {
                            return me._moveTestCase(testcase, source_folder, target_project, me);
                        };
                        promises.push(f);
                    });
                    Deft.Chain.sequence(promises).then({
                        success: function(records){ 
                            deferred.resolve(records);
                        },
                        failure: function(error) {
                            deferred.reject(error);
                        }
                    });
                }
            }
        });
        return deferred.promise;
    },
    
    _moveTestCase: function(test_case,source_folder, target_project,me) {
        var deferred = Ext.create('Deft.Deferred');
        me.logger.log("Move ", test_case.get('FormattedID')," to ",target_project.get("Name"));
        
        test_case.set("Project", target_project.get('_ref'));
        test_case.save({
            callback: function(result,operation){
                me.logger.log("--- moved ", test_case.get('FormattedID'), " to ", target_project.get("Name"));
                if(operation.wasSuccessful()) {
                    deferred.resolve(result);
                } else {
                    var message = "";
                    if ( test_case.get("FormattedID") ) {
                        message += "\n" + test_case.get("FormattedID");
                    }
                    
                    if ( operation.error.errors && operation.error.errors.length > 0 ) {
                        message += "\n" + operation.error.errors[0];
                    }
                    me.logger.log(" !! ERROR ", message, operation );
                    deferred.reject("Could not save " + message);
                }
            }
        });
        
        return deferred.promise;
    },
    
    _moveFolder: function(source_folder,target_project,me) {
        var deferred = Ext.create('Deft.Deferred');
        me.logger.log("Move ", source_folder.get('FormattedID')," to ",target_project.get("Name"));
        
        this._moveTestCasesForFolder(source_folder,target_project,me).then({
            success: function(testcases) {
                me.logger.log("Moved testcases: ", testcases);
                
                source_folder.set("TestCases", "");
                source_folder.set("Parent", "");
                source_folder.set("Project", target_project.get('_ref'));
                
                // TODO
                var target_tree = me.down('#target_folder_box').down('tstestfoldertree');
                var selected_records = target_tree.selectedRecords;
                if ( selected_records.length > 0 ) {
                    me.logger.log("target parent", selected_records);
                    source_folder.set('Parent',selected_records[0].get('_ref')); 
                }
                me.logger.log("----- moving ", source_folder.get('FormattedID'), " to ", target_project.get("Name"));

                source_folder.save({
                    callback: function(result,operation){
                        if(operation.wasSuccessful()) {
                            var promises = [];
                            Ext.Array.each( testcases, function(testcase) {
                                promises.push( function() { me._reparentTestCase(testcase,source_folder,me); });
                            });
                            
                            me.logger.log("Promises",promises.length);
                            
                            if ( promises.length === 0 ) {
                                deferred.resolve([]);
                            } else {
                                Deft.Chain.sequence(promises).then({
                                    success: function(result) {
                                        deferred.resolve(result);
                                    },
                                    failure: function(msg) {
                                        deferred.reject(msg);
                                    }
                                });
                            }
                        } else {
                            var message = "";
                            if ( source_folder.get("FormattedID") ) {
                                message += "\n" + source_folder.get("FormattedID");
                            }
                            
                            if ( operation.error.errors && operation.error.errors.length > 0 ) {
                                message += "\n" + operation.error.errors[0];
                            }
                            me.logger.log(" !! ERROR ", message, operation );
                            deferred.reject("Could not save " + message);
                        }
                    }
                });
            },
            failure: function(msg) {
                deferred.reject(msg);
            }
        });
        
        return deferred.promise;
    },
    
    _reparentTestCase: function(testcase,source_folder,me){
        me.logger.log("_reparentTestCase",testcase,source_folder);
        var deferred = Ext.create('Deft.Deferred');
        
        testcase.set("TestFolder", source_folder.get('_ref'));
        
        testcase.save({
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    deferred.resolve([result]);
                } else {
                    deferred.reject("Could not set folder on " + testcase.get('FormattedID'));
                }
            }
        });
        
        return deferred.promise;
    },
    
    _createItem: function(model,source_item,change_fields, scope){
        var deferred = Ext.create('Deft.Deferred');
        var me = scope;
        me.logger.log("Create  ", model.getName(), source_item.get('Name') );
        var item = me._cleanseItem(source_item.getData(),change_fields);
        var record = Ext.create(model, item );
        record.save({
            callback: function(result, operation) {
                me.logger.log(" -- Back from trying to create ", model.getName(), item['Name']);
                if(operation.wasSuccessful()) {
                    deferred.resolve([source_item,result]);
                } else {
                    var message = model.getName();
                    if ( item['Name'] ) {
                        message += "\n" + item['Name'];
                    }
                    
                    if ( operation.error.errors && operation.error.errors.length > 0 ) {
                        message += "\n" + operation.error.errors[0];
                    }
                    me.logger.log(" !! ERROR ", message, operation );
                    deferred.reject("Could not save " + message);
                }
            }
        });
        return deferred.promise;
    },
    _cleanseItem: function(original_item,change_fields){
        var item = Ext.clone(original_item);
        // remove unnecessary fields
        delete item['ObjectID'];
        delete item['Children'];
        delete item['CreationDate'];
        delete item['FormattedID'];
        delete item['Parent'];
        delete item['Subscription'];
        delete item['TestCases'];
        delete item['Workspace'];
        delete item['creatable'];
        delete item['updatable'];
        delete item['deletable'];
        delete item['_type'];
        delete item['_CreatedAt'];
        delete item['_objectVersion'];
        delete item['_p'];
        delete item['_ref'];
        delete item['_refObjectName'];
        // set project
        item['Project'] = this.projects['target'].get('_ref');
        // does it get a parent?
        if (original_item['_type'] == 'testfolder' ) {
            //TODO     
            var app = Rally.getApp();
            
            var tree = app.down('#target_folder_box').down('tstestfoldertree');
            var selected_records = tree.selectedRecords;
            if ( selected_records.length > 0 ) {
                app.logger.log("target parent", selected_records);
                change_fields['Parent'] = selected_records[0].get('_ref'); 
            }
        }
        
        return Ext.Object.merge(item, change_fields);;
    },
    _setParentFolders: function(source_folders,new_records_by_original_ref,scope){  
        var me = scope;
        me.logger.log("_setParentFolders",source_folders,new_records_by_original_ref);
        var promises = [];
        Ext.Array.each( source_folders, function(source_folder){
            var f = function() {
                me._setParentFolder(source_folder,new_records_by_original_ref,me);
            }
            promises.push(f);
        });
        Deft.Chain.sequence(promises).then({
            success: function(records) {
                me.logger.log("done with set parent folder promises");
                me._copyTestCases(source_folders,new_records_by_original_ref,me);
            },
            failure: function(error) {
                alert("There was a problem: " + error);
            }
        });
    },
    // folders_by_parent key = parent ref, value = array of child folders
    _setParentFoldersForHash:function(folders_by_parent,me){
        me.logger.log("_setParentFoldersForHash");
        var deferred = Ext.create('Deft.Deferred');

        me.setLoading("Restitching Folder Hierarchy...");
        var promises = [];
        Ext.Object.each(folders_by_parent, function(parent,folders){
            Ext.Array.each( folders, function(folder){
                folder.set("Parent",parent);
                promises.push( function() {
                    me._saveFolder(folder);
                } );
            });
        });
        
        if ( promises.length === 0 ) {
            deferred.resolve([]);
        } else {
            Deft.Chain.sequence(promises).then({
                success: function(records) {
                    me.logger.log("done with set parent folder promises");
                    deferred.resolve(records);
                },
                failure: function(error) {
                    deferred(error);
                }
            });
        }
        
        return deferred.promise;
    },

    _saveFolder: function(folder) {
        var deferred = Ext.create('Deft.Deferred');
        folder.save({
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    deferred.resolve([result]);
                } else {
                    deferred.reject("Could not save " + folder.get('FormattedID'));
                }
            }
        });
        return deferred.promise;
    },
    
    _setParentFolder: function(original_record,new_records_by_original_ref,scope){
        var me = scope;
        me.logger.log("_setParentFolder",original_record);
        this.setLoading("Setting Parent Folder");
        var deferred = Ext.create('Deft.Deferred');
        var original_parent = original_record.get('Parent');
        var original_ref = original_record.get('_ref');
        var record = new_records_by_original_ref[original_ref];
        if ( record && original_parent ) {
            me.logger.log("Original Parent", original_parent);
            var original_parent_ref = original_parent._ref;
            var new_parent = new_records_by_original_ref[original_parent_ref];
            if ( new_parent ) {
                record.set("Parent",new_parent.get('ObjectID'));
            }
            me.logger.log("Saving...");
            record.save({
                callback: function(result, operation) {
                    if(operation.wasSuccessful()) {
                        deferred.resolve([result]);
                    } else {
                        deferred.reject("Could not save " + item['Name']);
                    }
                }
            });
        } else {
            me.logger.log("No update");
            deferred.resolve([]);
        }
        
        return deferred.promise;
    },
    _copyTestCases: function(source_folders,new_records_by_original_ref,me){
        me.logger.log('_copyTestCases ',source_folders);
        me.setLoading("Copy Test Cases");
        var promises = [];
        var source_testcases = [];
        Rally.data.ModelFactory.getModel({
            type: 'TestCase',
            success: function(model) {
                Ext.Array.each( source_folders, function(source_folder){
                    me.logger.log(" TCs", source_folder.get('TestCases').Count, source_folder);
                    if ( source_folder.get('TestCases').Count > 0 ) {
                        var f = function() {
                            return me._copyTestCasesForFolder(source_folder,new_records_by_original_ref[source_folder.get('_ref')],model, me);
                        };
                        
                        promises.push(f);
                    }
                });
                if ( promises.length === 0 ) {
                    me.logger.log("No test cases to copy");
                    me._finishAndRedisplay(me);
                } else {
                    Deft.Chain.sequence(promises).then({
                        success: function(record_sets) {
                            var pairs = [];
                            Ext.Array.each(record_sets, function(received_pairs){
                                Ext.Array.each(received_pairs, function(pair){
                                    pairs.push(pair);
                                });
                            });
                            me.logger.log("done with copy test case promises");
                            me._copySteps(pairs,me).then({
                                success: function(results){
                                    me._copyAttachments(pairs,me);
                                },
                                failure: function(error){
                                    alert("There was a problem: " + error);
                                }
                            });
                            
                        },
                        failure: function(error) {
                            alert("There was a problem: " + error);
                            me._finishAndRedisplay(me);
                        }
                    });
                }
            }
        });
    },
    _finishAndRedisplay: function(scope) {
        scope._showTestFolders(scope.projects['source'],scope.down('#source_folder_box'),'source');
        scope._showTestFolders(scope.projects['target'],scope.down('#target_folder_box'),'target');
        scope.setLoading(false);
    },
    _copyTestCasesForFolder: function(source_folder, target_folder, model, scope) {
        var me = scope;
        var deferred = Ext.create('Deft.Deferred');
        me.setLoading("Copy Test Cases For Folder " + target_folder.get('FormattedID'));

        Ext.create('Rally.data.wsapi.Store',{
            model: 'TestCase',
            limit: 'Infinity',
            filters: [{property:'TestFolder.ObjectID',value:source_folder.get('ObjectID')}],
            fetch: true,
            autoLoad: true,
            context: {
                project: null
            },
            listeners: {
                scope: me,
                load: function(store,testcases) {
                    me.logger.log("Test Cases: ", testcases);
                    var promises = [];
                    Ext.Array.each(testcases, function(testcase) {
                        me.logger.log("FormattedID: ", testcase.get('FormattedID'));
                        var f = function() {
                            return me._createItem(model,testcase,{ TestFolder: target_folder.get('ObjectID') }, me);
                        };
                        promises.push(f);
                    });
                    Deft.Chain.sequence(promises).then({
                        success: function(records){                        
                            deferred.resolve(records);
                        },
                        failure: function(error) {
                            deferred.reject(error);
                        }
                    });
                }
            }
        });
        return deferred.promise;
    },
    _copySteps: function(pairs,me){
        me.logger.log("_copySteps", pairs);
        me.setLoading("Copying Test Steps");
        var deferred = Ext.create('Deft.Deferred');

        var promises = [];
        Rally.data.ModelFactory.getModel({
            type: 'TestCaseStep',
            success: function(model) {
                Ext.Array.each(pairs, function(pair){
                    var source_testcase = pair[0];
                    var target_testcase = pair[1];
                    me.logger.log(source_testcase.get('Steps').Count);
                    if ( source_testcase.get('Steps').Count > 0 ) {
                        var f = function() {
                            return me._copyStepsForTestCase(model, source_testcase, target_testcase, me);
                        };
                        promises.push(f);
                    }
                });
                if ( promises.length == 0 ) {
                    me.logger.log("No test case steps");
                    me._finishAndRedisplay(me);
                } else {
                    me.logger.log("ALL promises ready");
                    Deft.Chain.sequence(promises).then({
                        success: function(results) {
                            me.logger.log("done with copy test case step promises");
                            //me._copySteps(pairs,me);
                             deferred.resolve(results);
                        },
                        failure: function(error) {
                            deferred.reject(error);
                        }
                    });
                }
            }
        });
        return deferred.promise;
    },
    _copyAttachments: function(pairs,me){
        me.logger.log("_copyAttachments", pairs);
        me.setLoading("Copying Attachments");
        var promises = [];
        Rally.data.ModelFactory.getModel({
            type: 'Attachment',
            success: function(model) {
                Ext.Array.each(pairs, function(pair){
                    var source_testcase = pair[0];
                    var target_testcase = pair[1];
                    if ( source_testcase.get('Attachments').Count > 0 ) {
                        var f = function() {
                            return me._copyAttachmentsForTestCase(model, source_testcase, target_testcase, me);
                        };
                        promises.push(f);
                    }
                });
                if ( promises.length == 0 ) {
                    me.logger.log("No test case attachments");
                    me._finishAndRedisplay(me);
                } else {
                    me.logger.log("ALL promises ready");
                    Deft.Chain.sequence(promises).then({
                        success: function(results) {
                            me.logger.log("done with copy test case attachment promises");
                            //me._copySteps(pairs,me);
                            me._finishAndRedisplay(me);
                        },
                        failure: function(error) {
                            alert("There was a problem: " + error);
                            me._finishAndRedisplay(me);
                        }
                    });
                }
            }
        });
    },
    _copyStepsForTestCase: function(model, source_testcase, target_testcase, me){
        var deferred = Ext.create('Deft.Deferred');
        me.logger.log("_copyStepsForTestCase");
        source_testcase.getCollection('Steps').load({
            fetch: true,
            callback: function(steps, operation, success) {
                me.logger.log("Steps: ", steps);
                var promises = [];
                var number_of_steps = steps.length;
                // slow down the creation a bit
                for ( var i=0;i<number_of_steps;i++ ) {
                    var step_array = steps;
                    var f = function() {
                        var step = step_array[0];
                        step_array.shift();
                        return me._createItem(model,step,{ TestCase: target_testcase.get('ObjectID') }, me);
                    };
                    promises.push(f);
                }
                Deft.Chain.sequence(promises).then({
                    success: function(records){                        
                        deferred.resolve(records);
                    },
                    failure: function(error) {
                        deferred.reject(error);
                    }
                });
            }
        });
        return deferred.promise;
    },
    _copyAttachmentsForTestCase: function(model, source_testcase, target_testcase, me){
        var deferred = Ext.create('Deft.Deferred');
        me.logger.log("_copyAttachmentsForTestCase");
        source_testcase.getCollection('Attachments').load({
            fetch: ['Content','ContentType','Description','Name','Size','Summary'],
            callback: function(attachments, operation, success) {
                me.logger.log("Attachments: ", attachments);
                var promises = [];
                var number_of_items = attachments.length;
                // slow down the creation a bit
                for ( var i=0;i<number_of_items;i++ ) {
                    var item_array = attachments;
                    var f = function() {
                        var item = item_array[0];
                        item_array.shift();
                        return me._createAttachment(model,item,{ Artifact: target_testcase.get('ObjectID') }, me);
                    };
                    promises.push(f);
                }
                Deft.Chain.sequence(promises).then({
                    success: function(records){
                        deferred.resolve(records);
                    },
                    failure: function(error) {
                        deferred.reject(error);
                    }
                });
            }
        });
        return deferred.promise;
    },
    _createAttachment: function(model,source_item,change_fields, me){
        var deferred = Ext.create('Deft.Deferred');
        me.logger.log("Create Attachment ", model.getName(), source_item.get('Name') );
        
        if ( ! source_item.get('Content') ) { 
            deferred.resolve([]);
        } else {
            var content_oid = source_item.get('Content').ObjectID;
            
            Rally.data.ModelFactory.getModel({
                type: 'AttachmentContent',
                success: function(ac_model) {
                    ac_model.load(content_oid,{
                        fetch: ['Content'],
                        callback: function(result,operation) {
                            var content = result.get('Content');
                            
                            var copied_content = Ext.create(ac_model,{
                                Content: content
                            });
                            me.logger.log("Saving attachment CONTENT");
                            
                            copied_content.save({
                                callback: function(result,operation){
    
                                    if ( !result || !result.get('ObjectID') ) {
                                        deferred.resolve([]);
                                    } else {
                                        var content_oid = result.get('ObjectID');
                                        me.logger.log("Attachment content OID: ", content_oid);
                                        change_fields.Content = content_oid;
                                        var item = me._cleanseItem(source_item.getData(),change_fields);
                                        var record = Ext.create(model, item );
                                        me.logger.log("Saving attachment");
                                        record.save({
                                            callback: function(result, operation) {
                                                me.logger.log(" -- Back from trying to create ", model.getName(), item['Name']);
                                                if(operation.wasSuccessful()) {
                                                    deferred.resolve([source_item,result]);
                                                } else {
                                                    var message = model.getName();
                                                    if ( item['Name'] ) {
                                                        message += "\n" + item['Name'];
                                                    }
                                                    
                                                    if ( operation.error.errors && operation.error.errors.length > 0 ) {
                                                        message += "\n" + operation.error.errors[0];
                                                    }
                                                    me.logger.log(" !! ERROR ", message, operation );
                                                    deferred.reject("Could not save " + message);
                                                }
                                            }
                                        });
                                    }   
                                }
                            });
                        }
                    });
                }
            });
        }

        return deferred.promise;
    }

});
