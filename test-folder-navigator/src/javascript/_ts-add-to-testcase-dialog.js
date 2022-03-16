Ext.define('Rally.technicalservices.dialog.BulkAddToTestSetDialog',{
    extend: 'Rally.ui.dialog.ArtifactChooserDialog',
    alias: 'widget.tsaddtotestsetdialog',
    
    config: {
        autoShow: true,
        title: 'Choose a TestSet',
        artifactTypes: 'TestSet',
        multiple: false,
        
        columns: [
            {
                text: 'ID',
                dataIndex: 'FormattedID',
                renderer: _.identity
            },
            'Name',
            'Iteration',
            'Project'
        ]
    }
    
});