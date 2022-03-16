Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    columns: [],
    logger: new Rally.technicalservices.Logger(),
    defaults: { padding: 5, margin: 5 },
    items: [
        {xtype:'container',itemId:'message_box'},
        {xtype:'container',itemId:'grid_box'},
        {xtype:'tsinfolink',informationHtml:'Displays Test Cases that have either no value or duplicate values in a chosen field.'}
    ],
    launch: function() {
        this.columns = [
            {dataIndex:'FormattedID',text:'id', renderer: function(value,metaData,record) {
                    return Rally.ui.renderer.RendererFactory.renderRecordField( record, 'FormattedID' );
                }
            },
            {dataIndex:'Name',text:'Name',flex:1}
        ];
        if (typeof(this.getAppId()) == 'undefined' ) {
            // not inside Rally
            this._showExternalSettingsDialog(this.getSettingsFields());
        } else {
            this._getData();
        }
    },
    _getData: function() {
        this.logger.log("_getData");
        var scenario_id_field_name = this.getSetting('scenario_id_field_name');
        if ( typeof( scenario_id_field_name ) == 'undefined' ) {
            this.down('#message_box').update("Select 'Edit App Settings' from the gear menu to select a field to represent Scenario IDs");
        } else {
            this.logger.log("Field Name: ",scenario_id_field_name);
            
            this.columns.push({dataIndex:scenario_id_field_name,text:'Scenario ID',editor: 'rallytextfield'});
            
            var fetch = this._getFetchFields();
            this.setLoading("Fetching Test Cases");
            var wsapi_store = Ext.create('Rally.data.wsapi.Store',{
                model:'TestCase',
                autoLoad:true,
                limit:'Infinity',
                fetch:fetch,
                context: {
                    projectScopeDown: false,
                    projectScopeUp: false
                },
                listeners: {
                    scope: this,
                    load: function(store,test_cases){
                        this.logger.log("Found " + test_cases.length + " test cases");
                        var filtered_cases = this._getDuplicatesAndEmpties(test_cases);
                        this.setLoading(false);
                        this._makeGrid(filtered_cases);
                    }
                }
            });
        }
    },
    _getDuplicatesAndEmpties: function(records){
        var filtered_records = [];
        var scenario_id_field_name = this.getSetting('scenario_id_field_name');
        
        var records_by_scenario_id = {};
        Ext.Array.each(records,function(record){
            var id_value = record.get(scenario_id_field_name) || "None";
            if (!records_by_scenario_id[id_value]) {
                records_by_scenario_id[id_value] = [];
            }
            records_by_scenario_id[id_value].push(record);
        });
        filtered_records = records_by_scenario_id["None"];
        Ext.Object.each(records_by_scenario_id,function(key,collection){
            if (key !== "None" && collection.length > 1 ) {
                filtered_records = Ext.Array.push(filtered_records,collection);
            }
        });
        return filtered_records;
    },
    _makeGrid: function(test_cases){
        var me = this;
        var scenario_id_field_name = this.getSetting('scenario_id_field_name');

        var store = Ext.create('Rally.data.custom.Store',{
            data:test_cases,
            sorters: [{property:scenario_id_field_name,direction:'DESC'}]
        });
        
        this.down('#grid_box').removeAll();
        this.down('#grid_box').add({
            xtype:'rallygrid',
            columnCfgs:me.columns,
            store:store,
            enableRanking: false,
            showRowActionsColumn: false,
            pagingToolbarCfg: {
                store: store
            }
        });
    },
    _getFetchFields: function(){
        var fetch = [];
        Ext.Array.each(this.columns,function(column){
            fetch.push(column.dataIndex);
        });
        return fetch;
    },
    getSettingsFields: function() {
        return [{
            name: 'scenario_id_field_name',
            xtype: 'rallyfieldcombobox',
            model: 'TestCase',
            fieldLabel: 'ID Field Name',
            readyEvent: 'ready' //event fired to signify readiness
        }];
    },
    // ONLY FOR RUNNING EXTERNALLY
    _showExternalSettingsDialog: function(fields){
        var me = this;
        if ( this.settings_dialog ) { this.settings_dialog.destroy(); }
        this.settings_dialog = Ext.create('Rally.ui.dialog.Dialog', {
             autoShow: false,
             draggable: true,
             width: 400,
             title: 'Settings',
             buttons: [{ 
                text: 'OK',
                handler: function(cmp){
                    var settings = {};
                    Ext.Array.each(fields,function(field){
                        settings[field.name] = cmp.up('rallydialog').down('[name="' + field.name + '"]').getValue();
                    });
                    me.settings = settings;
                    cmp.up('rallydialog').destroy();
                    me._getData();
                }
            }],
             items: [
                {xtype:'container',html: "&nbsp;", padding: 5, margin: 5},
                {xtype:'container',itemId:'field_box', padding: 5, margin: 5}]
         });
         Ext.Array.each(fields,function(field){
            me.settings_dialog.down('#field_box').add(field);
         });
         this.settings_dialog.show();
    }
});
