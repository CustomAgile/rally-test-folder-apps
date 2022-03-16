// OVERRIDE so the gear menu doesn't show all the standard things
Ext.override(Rally.ui.menu.DefaultRecordMenu,{
    _getMenuItems: function() {
        var record = this.getRecord();
        var items = [
            {
                xtype: 'rallyrecordmenuitemedit',
                record: record,
                beforeAction: this.getOnBeforeRecordMenuEdit(),
                actionScope: this
            },
            {
                xtype: 'rallyrecordmenuitemcopy',
                record: record,
                beforeAction: this.getOnBeforeRecordMenuCopy(),
                afterAction: this.getOnRecordMenuCopy(),
                actionScope: this
            }
        ];
        if (this.showAddTasks !== false) {
            items.push({
                xtype: 'rallyrecordmenuitemaddtask',
                record: record
            });
        }

        items.push(
            {
                xtype: 'rallyrecordmenuitemaddchild',
                record: record
            }
//            {
//                xtype: 'menuseparator'
//            },
//            {
//                xtype: 'rallyrecordmenuitemrankextreme',
//                rankRecordFinder: this.getRankRecordFinder(),
//                rankPosition: 'highest',
//                record: record,
//                beforeAction: this.getOnBeforeRecordMenuRankHighest(),
//                actionScope: this
//            },
//            {
//                xtype: 'rallyrecordmenuitemrankextreme',
//                rankRecordFinder: this.getRankRecordFinder(),
//                rankPosition: 'lowest',
//                record: record,
//                beforeAction: this.getOnBeforeRecordMenuRankLowest(),
//                actionScope: this
//            },
//            {
//                xtype: 'menuseparator'
//            },
//            {
//                xtype: 'rallyrecordmenuitemsplit',
//                record: record
//            },
//            {
//                xtype: 'menuseparator'
//            },
//            {
//                xtype: 'rallyrecordmenuitemdelete',
//                record: record,
//                beforeAction: this.getOnBeforeRecordMenuDelete(),
//                afterAction: this.getOnRecordMenuDelete(),
//                actionScope: this
//            }
        );
        return items;
    }
});