 Ext.override(Rally.ui.picker.project.ProjectPicker, {
    createPicker: function () {

        var items = [];

        var height = this.maxHeight || 300;
        
        if (this.getShowMostRecentlyUsedProjects()) {
            this.recents = this._createMostRecentlyUsedProjects();
            items.push(this.recents);
            height = height - 200;
        }

        console.log("max:", this.maxHeight);
        var container = items.push({ 
            xtype:'container',
            height: height,
            maxHeight: height,  // override to keep from freezing on the bottom
            autoScroll:true, 
            items: [this.tree]
        });

        if (this.getShowProjectScopeUpAndDown()) {
            this.projectScopeUpDownField = this._createProjectScopeUpDownField();
            items.push(this.projectScopeUpDownField);
        }

        
        this.picker = Ext.widget('container', {
            cls: 'rui-project-picker-container',
            itemId: 'projectPickerContainer',
            floating: true,
            shadow: false,
            hidden: true,
            minWidth: 250,
            items: items
        });

        return this.picker;
    }
 });