
Ext.define('TestFolderNavigator', {
    extend: 'Rally.app.GridBoardApp',
    cls: 'testfolder-app',
    modelNames: ['TestFolder'],
    statePrefix: 'ts-testfolder',

    enableXmlExport: false,
    
    integrationHeaders : {
        name : "TestFolderNavigator"
    },
            
    logger: Ext.create('Rally.technicalservices.Logger'),
    
    getPermanentFilters: function () {
        return [
            Rally.data.wsapi.Filter.or([
                { property: 'Parent', operator: '=', value: "" }
            ])
        ];
    },

    getFieldPickerConfig: function () {
        var config = this.callParent(arguments);
        config.gridFieldBlackList = _.union(config.gridFieldBlackList, [
            'VersionId',
            'Parent',
            'TestCases',
            'Recycled',
            'TestFolder',
            'Steps',
            'Objective',
            'PostConditions',
            'PreConditions',
            'Results',
            'TestSets',
            'ValidationExpectedResult',
            'ValidationInput'
        ]);
        return _.merge(config, {
           _getModels: function() {
                console.log('models for picker', this.cmp.getModels());
                
                return _.reduce(this.cmp.getModels(), function(accum, model) {
                    if (model.typePath === 'artifact') {
                        accum = accum.concat(model.getArtifactComponentModels());
                    } else {
                        accum.push(model);
                    }
                    return accum;
                }, []);
            },
            gridAlwaysSelectedValues: ['FormattedID','Name']
        });
    },
    
    getGridStores: function () {
        return this._getTreeGridStore();
    },
    
    _getTreeGridStore: function () {
        return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build(_.merge({
            autoLoad: false,
            sorters: [{ property: 'ObjectID', direction: 'ASC'}],
            childPageSizeEnabled: true,
            mapper: Ext.create('Rally.technicalservices.TFParentChildMapper'),
            enableHierarchy: true,
            fetch: _.union(['Workspace','Name'], this.columnNames),
            models: _.clone(this.models),
            pageSize: 25,
            remoteSort: true,
            root: {expanded: true},
//                storeType: 'Rally.technicalservices.data.wsapi.testfolder.Store',
            getParentFieldNamesByChildType: this._getParentFieldNamesByChildType,
            childLevelSorters: [{ property: 'FormattedID',direction: 'ASC'}]

        }, this.getGridStoreConfig())).then({
            success: function (treeGridStore) {
                treeGridStore.enableHierarchy = true;
                //treeGridStore.on('load', this.publishComponentReady, this, { single: true });
                return { gridStore: treeGridStore };
            },
            scope: this
        });
    },

    _getParentFieldNamesByChildType: function(childType, parentType) {
        var model = this.model.getArtifactComponentModel(childType);
        return(['Parent']);
        return _.transform(this.mapper.getParentFields(childType, parentType), function(acc, field) {
            var typePath = field.typePath,
                fieldName = field.fieldName,
                hasFieldModel = this.model.getArtifactComponentModel(typePath) || model.hasField(fieldName);

            if (hasFieldModel) {
                acc.push(fieldName.replace(/\s+/g, ''));
            }
        }, [], this);
        
    },
    
    getAddNewConfig: function () {
        return Ext.merge(this.callParent(arguments), {
            showRank: false,
            showAddWithDetails: false,
            openEditorAfterAddFailure: false,
            minWidth: 800
        });
    },
    
    getGridBoardPlugins: function () {
        return [
//                {
//                    ptype: 'rallygridboardaddnew',
//                    context: this.getContext()
//                    
//                },
            {
                ptype: 'tsgridboardcustomtestcasefiltercontrol',
                filterControlConfig: {
                    modelNames: ['TestCase'],
                    stateful: false
                },
                showOwnerFilter: false
            },
            {
                ptype: 'tsgridboardsearchcontrol',
                searchControlConfig: Ext.Object.merge({},this.getSearchControlConfig())
            },
            _.merge({
                ptype: 'rallygridboardfieldpicker',
                headerPosition: 'left'
            }, this.getFieldPickerConfig())
        ]
        .concat(this.enableGridBoardToggle ? 'rallygridboardtoggleable' : [])/*
        .concat(this.getActionsMenuConfig())*/;
    },

    getSearchControlConfig: function() {
        return {};
    },
    
    getColumnCfgs: function() {
        return _.isEmpty(this.columnNames) ? ['Name']: this.columnNames;
    },
    
    getGridConfig: function (options) {
        return {
            xtype: 'rallytreegrid',
            alwaysShowDefaultColumns: true,
            columnCfgs: this.getColumnCfgs(),
            enableBulkEdit: true,
            enableRanking: Rally.data.ModelTypes.areArtifacts(this.modelNames),
            expandAllInColumnHeaderEnabled: true,
            plugins: this.getGridPlugins(),
            stateId: this.getScopedStateId('grid'),
            stateful: true,
            showPagingToolbar: false,
            store: options && options.gridStore,
            storeConfig: {
                autoLoad: true,
                filters: this.getPermanentFilters()

            },
            useFilterCollection: false,
            summaryColumns: [],
            listeners: {
                afterrender: this.publishComponentReady,
                storeload: {
                    fn: function () {
                        this.fireEvent('contentupdated', this);
                    },
                    single: true
                },
                scope: this
            }
        };
    },
    
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }
});