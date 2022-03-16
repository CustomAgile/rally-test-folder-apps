Ext.define('Rally.technicalservices.plugin.GridBoardCustomTestCaseFilterControl',{
    alias: 'plugin.tsgridboardcustomtestcasefiltercontrol',
    extend: 'Rally.ui.gridboard.plugin.GridBoardCustomFilterControl',
    
    getControlCmpConfig: function() {
        var config = Ext.merge({
            xtype: 'container',
            width: 72,
            layout: 'hbox',
            items: [
                Ext.merge({
                    xtype: 'rallycustomfilterbutton',
                    context: this.cmp.getContext(),
                    listeners: {
                        customfilter: {
                            fn: this._onFilterButtonStateAvailable,
                            single: true,
                            scope: this
                        }
                    },
                    toolTipConfig: {
                        html: 'TestCase Filter',
                        anchor: 'top',
                        mouseOffset: [-9, -2]
                    },
                    margin: '3 9 3 30'
                }, this.filterControlConfig)
            ]
        }, this.containerConfig);

        if (this.showOwnerFilter) {
            config.width += 210;

            config.items.push(Ext.merge({
                xtype: 'rallyownerfilter',
                margin: '3px 10px 0px 0px',
                listConfig: {
                    width: 200
                },
                context: this.cmp.getContext(),
                width: 200,
                clearFilterText: '-- Clear Filter --',
                listeners: {
                    initalvalueset: {
                        fn: this._onOwnerFilterStateAvailable,
                        single: true
                    },
                    select: this._applyFilter,
                    scope: this
                }
            }, this.ownerFilterControlConfig));
        }

        return config;
    },
    
    _applyFilter: function() {
        var filters = _.compact(Ext.Array.merge(this.filterButton.getFilters(), this.ownerFilter && this.ownerFilter.getFilter())),
            modifiedFilters = Rally.data.wsapi.filter.FilterModificationator.modifyFilters(filters, this.filterChildren),
            filterArgs = {
                types: this.filterButton.getTypes(),
                filters: modifiedFilters
                
            };
        console.log('filter sends: ', filterArgs);
            
        this.cmp.applyCustomFilter(filterArgs);
    }
});