Ext.override(Ext.data.TreeStore,{
    load: function(options) {        
        options = options || {};
        options.params = options.params || {};

        console.log('treestore load', options);
        
        var me = this,
            node = options.node || me.tree.getRootNode(),
            callback = options.callback,
            scope = options.scope,
            operation;

        // If there is not a node it means the user hasnt defined a rootnode yet. In this case let's just
        // create one for them.
        if (!node) {
            node = me.setRootNode({
                expanded: true
            }, true);
        }

        // If the node we are loading was expanded, we have to expand it after the load
        if (node.data.expanded) {
            node.data.loaded = false;

            // Must set expanded to false otherwise the onProxyLoad->fillNode->appendChild calls will update the view.
            // We ned to update the view in the callback below.
            if (me.clearOnLoad) {
                node.data.expanded = false;
            }
            options.callback = function() {

                // If newly loaded nodes are to be added to the existing child node set, then we have to collapse
                // first so that they get removed from the NodeStore, and the subsequent expand will reveal the
                // newly augmented child node set.
                if (!me.clearOnLoad) {
                    node.collapse();
                }
                node.expand();

                // Call the original callback (if any)
                Ext.callback(callback, scope, arguments);
            }
        }

        // Assign the ID of the Operation so that a ServerProxy can set its idParam parameter,
        // or a REST proxy can create the correct URL
        options.id = node.getId();

        options = Ext.apply({
            action: 'read',
            filters: me.filters.items,
            sorters: me.getSorters(),
            node: options.node || node
        }, options);
        
        me.lastOptions = options;

        operation = new Ext.data.Operation(options);

        if (me.fireEvent('beforeload', me, operation) !== false) {
             if (me.clearOnLoad) {
                if(me.clearRemovedOnLoad) {
                    // clear from the removed array any nodes that were descendants of the node being reloaded so that they do not get saved on next sync.
                    me.clearRemoved(node);
                }
                // temporarily remove the onNodeRemove event listener so that when removeAll is called, the removed nodes do not get added to the removed array
                me.tree.un('remove', me.onNodeRemove, me);
                // remove all the nodes
                node.removeAll(false);
                // reattach the onNodeRemove listener
                me.tree.on('remove', me.onNodeRemove, me);
            }
            me.loading = true;

            console.log('models:', me.models);
            console.log('root:', me.isRootNode(options.node));
            
            if ( !me.isRootNode(options.node) && me.models && me.models.length == 2 ) {
                /* If we have two models and they 
                 * don't both descend from the artifact 
                 * type (like test folder), we want to run
                 * the query twice and combine the results.
                 * 
                 * We have to make two new operations because
                 * each run modifies it
                 */
                console.log('taking alternate route');
                
                var o1 = Ext.create('Ext.data.Operation', options);
                o1.id = null;
                var o2 = Ext.create('Ext.data.Operation', options);
                o2.id = null;
                
                Deft.Chain.sequence([
                    function() {
                        var deferred = Ext.create('Deft.Deferred');
                        var model = me.models[1];
                        
                        o1.sorters = me.sorters_by_model[model.typePath];
                        
                        o1.filters = me._getFilterByModel(model.typePath);

                        console.log('o1',model.typePath, o1);
                        
                        model.getProxy().read(o1,function(op){
                            deferred.resolve(op);
                        },me);
                        
                        return deferred.promise;
                    },
                    function() {
                        var deferred = Ext.create('Deft.Deferred');
                        var model = me.models[0];
                                                
                        o2.filters = me._getFilterByModel(model.typePath);

                        o2.sorters = me.sorters_by_model[model.typePath];
                    
                        console.log('o2:',model.typePath, o2);
                        
                        model.getProxy().read(o2,function(op){
                            deferred.resolve(op);
                        },me);
                        
                        return deferred.promise;
                    }
                ]).then({
                    scope: me,
                    success: function(operation){
                        var records = Ext.Array.merge(operation[0].getRecords(), operation[1].getRecords());
                        var results = Ext.create('Ext.data.ResultSet',{ records: records });
                        
                        operation[0].resultSet = results;
                        
                        me.onProxyLoad(operation[0]);
                    },
                    failure: function(msg){
                        alert(msg);
                    }
                
                });
                
            } else {
                me.proxy.read(operation, me.onProxyLoad, me);
            }
        }

        if (me.loading && node) {
            node.set('loading', true);
        }

        return me;
    },
    
    _getFilterByModel: function(model_path) {
        var extra_filter = this.extra_filter_by_model[model_path];
        var base_filter = this.filter_by_model[model_path];
        console.log('_getFilterByModel', model_path, base_filter, extra_filter);
        
        var composite_filter = base_filter;
        if ( ! Ext.isEmpty( extra_filter ) ) {
            composite_filter = Ext.Array.merge(base_filter, extra_filter);
        }
        console.log(' - returning:', composite_filter);
        
        return composite_filter;
    }
});

Ext.override(Rally.data.wsapi.TreeStore,{
    
    load: function(options) {
        console.log("wsapi treestore load",options);
        this.recordLoadBegin({description: 'tree store load', component: this.requester});
        
        this._hasErrors = false;

        this.on('beforeload', function(store, operation) {
            delete operation.id;
        }, this, { single: true });

        options = this._configureLoad(options);
        options.originalCallback = options.callback;

        var deferred = Ext.create('Deft.Deferred'),
            me = this;

        options.callback = function (records, operation, success) {
            me.dataLoaded = true;

            if(me.isRootNode(options.node) && operation.resultSet && operation.resultSet.sums) {
                me.setSums(operation.resultSet.sums);
            }

            if (me._pageIsEmpty(operation)) {
                me._reloadEmptyPage(options).then({
                    success: function (records) {
                        me._resolveLoadingRecords(deferred, records, options, operation, success);
                    },
                    failure: function() {
                        me._rejectLoadingRecord(deferred, options, operation);
                    }
                });
            } else {
                me._resolveLoadingRecords(deferred, records, options, operation, success);
            }
        };

        if (this._isViewReady()) {
            this._beforeInitialLoad(options);
        }

        this.callParent([options]);
        
        return deferred.promise;
    },
    // when we run the queries, need to consolidate the results
    temp_records: null, 
    
    _resolveLoadingRecords: function(deferred, records, options, operation, success) {
        delete options.callback; // Don't call me again, Susan.

        if ( ! this.temp_records || this.temp_records == null) { 
            this.temp_records = records; 
        } else {
            records = Ext.Array.merge(this.temp_records,records);
            this.temp_records = null;
            this.fred = false;
            
            if (options.originalCallback) {
                Ext.callback(options.originalCallback, options.scope || this, [records, operation, success]);
            }

            deferred.resolve(records);
        }
    },
    
    extra_filter_by_model: {},
    
    filter_by_model: {},
    
    sorters_by_model: {
        'testfolder': [{property:'ObjectID'}],
        'testcase':   [{property:'DragAndDropRank'}]
    
    },
    
    _getChildNodeFilters: function(node) {
        console.log("Getting child node filters",node);
        
        var parentType = node.self.typePath,
            childTypes = this._getChildTypePaths([parentType]),
            parentFieldNames = this._getParentFieldNames(childTypes, parentType);

        Ext.Array.each(childTypes, function(childType){            
            var parentFieldName = this.mapper.getParentFieldForChild(childType,parentType);
            
            if ( parentFieldName ) {
                this.filter_by_model[childType] = [ Ext.create('Rally.data.wsapi.Filter',{
                    property: parentFieldName,
                    operator: '=',
                    value: node.get('_ref')
                }) ];
            }
        },this);
        
        if (parentFieldNames.length) {
            return [
                Rally.data.wsapi.Filter.or(_.map(parentFieldNames, function(parentFieldName) {
                    return {
                        property: parentFieldName,
                        operator: '=',
                        value: node.get('_ref')
                    };
                }))
            ];
        }
        
        return [];
    },
    
    _getRankField: function(model) {
        console.log("Model:",model);
        return Rally.data.Ranker.getRankField(model);
    },
    
    _getDefaultChildSorters: function() {
            return [
                {
                    property: 'TaskIndex',
                    direction: 'ASC'
                },
                {
                    property: this._getRankField(this.model),
                    direction: 'ASC'
                }];
        }
        
});

// test folders aren't artifacts
Ext.override(Rally.data.wsapi.ModelBuilder,{
    buildCompositeArtifact: function(models, context, wsapiVersion) {
        
        var typePath = 'testfolder',
            displayName = 'TestFolder',
            typeDefMetaData = Ext.create('Rally.data.TypeDefinitionMetaData', {
                requested: typePath,
                context: context,
                wsapiVersion: wsapiVersion
            }),
            typeDefinition = {
                Attributes: this._getAttributeDefinitionsFromModels(models),
                TypePath: typePath,
                DisplayName: displayName,
                Parent: null,
                ElementName: displayName,
                Restorable: false
            };
        
        var model = this.build(typeDefMetaData, typeDefinition);

        model.getArtifactComponentModels = function() {
            return models;
        };

        model.getModelsForField = function(field) {
            return _.transform(this.getArtifactComponentModels(), function(matchingModels, model) {
                if (_.find(model.getFields(), {name: field.name})){
                   matchingModels.push(model);
                }
            }, []);
        };

        var modelsByType = _.indexBy(model.getArtifactComponentModels(), 'typeName');
        
        model.getArtifactComponentModel = function(type) {
            var canonicalType = type.toLowerCase();
            return modelsByType[canonicalType];
        };
        return model;
    },
    
    /*
     * given the typedef response from the wsapi, build an Ext Model
     * @param {Rally.data.TypeDefinitionMetaData} typeDefMetaData TypeDefinition MetaData
     * @param {Object} typeDefinition The JSON representation of a Type Definition as
     *                                responded by the server
     */
    build: function(typeDefMetaData, typeDefinition) {
        var attributes = typeDefinition.Attributes,
            commonWsapiFields = _.map(
                Rally.data.FieldFactory.getCommonWsapiFields().concat(Rally.data.FieldFactory.getVirtualWsapiFields(typeDefinition)),
                this._createWsapiField
            ),
            fields = commonWsapiFields.concat(
                Rally.data.FieldFactory.buildFieldsFromTypeDefinitionAttributes(attributes)
            ),
            validations = Rally.data.FieldFactory.buildValidationsFromTypeDefinitionAttributes(attributes),
            typePath = typeDefinition.TypePath,
            metadataTypePath = typeDefMetaData.getTypePath().toLowerCase();

        _.each(fields, function(field) {
            field.modelType = typePath.toLowerCase();
        });

        return Ext.define(typeDefMetaData.getFullyQualifiedName(), {
            extend: 'Rally.data.wsapi.Model',
                fields: fields,
                validations: validations,
                statics: {
                    /**
                     * E.g., 'hierarchicalrequirement' or 'defect' or 'testcase'
                     */
                    typeName: metadataTypePath,

                    /**
                     * Type typeName, but replaces hierarchicalrequirment with userstory. Useful when building URLs
                     */
                    prettyTypeName: metadataTypePath === 'hierarchicalrequirement' ? 'userstory' : metadataTypePath,

                    /**
                     * E.g., 'portfolioitem/theme' or 'defect'
                     */
                    typePath: typePath.toLowerCase(),

                    /**
                     * E.g., 'User Story'
                     */
                    displayName: typeDefinition.DisplayName,

                    /**
                     * E.g., 'Portfolio Item' if a Theme
                     */
                    parentTypeName: typeDefinition.Parent && typeDefinition.Parent._refObjectName,

                    /**
                     * E.g., 'Theme' or 'HierarchicalRequirement'
                     */
                    elementName: typeDefinition.ElementName,

                    /**
                     * If a Dynamic Type (like Feature, a type of Portfolio Item), contains the level, e.g. 0 if the lowest
                     * -1 if not a dynamic type, like Defect.
                     */
                    ordinal: typeDefinition.Ordinal,
                    /**
                     * E.g.
                     * { workspace: '/workspace/123' }
                     */
                    context: typeDefMetaData.context,
                    /**
                     * E.g. true if a delete of this type should move it to the recycle bin
                     */
                    restorable: typeDefinition.Restorable,

                    /**
                     * E.g. 1.37 - the wsapi version from which this model was built
                     */
                    wsapiVersion: typeDefMetaData.wsapiVersion,

                    /**
                     * The ObjectID of the type definition the model was built by
                     */
                    typeDefOid: typeDefinition.ObjectID,

                    /**
                     * The name of type definition
                     */
                    typeDefName: typeDefinition.Name
                },

                proxy: Rally.data.wsapi.ModelFactory.buildProxy(Rally.data.wsapi.ModelFactory.buildProxyUrl(typePath, typeDefMetaData.wsapiVersion), typeDefinition.ElementName, null, typeDefMetaData.wsapiVersion)
            });
    }
});

// override treegrid so that all the models can be given to the picker
Ext.override(Rally.ui.grid.TreeGrid, {
    getModels: function() {        
        return this.store.models || [this.store.model];
    }
});