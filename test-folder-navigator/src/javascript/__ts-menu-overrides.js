Ext.override(Rally.ui.menu.DefaultRecordMenu, {
    _getMenuItems: function() {
        var record = this.getRecord();
        var items = [];
        
        items.push(
        {
                xtype: 'tsrecordmenuitemcascadedelete',
                view: this.view,
                record: record
            }
//            ,
//            {
//               // xtype:'rallyrecordmenuitemaddexistingtestcases'
//            }
        );
        
        return items;
    }
});

Ext.override(Rally.ui.menu.TestCaseRecordMenu, {
    _getMenuItems: function() {
        var record = this.getRecord();
        var items = [];
        
//        items.push({
//            xtype: 'tsrecordmenuitemcascadedelete',
//            view: this.view,
//            record: record
//        });
        
        return items;
    }
});

