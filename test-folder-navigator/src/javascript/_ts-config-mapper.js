Ext.define('Rally.technicalservices.TFParentChildMapper',{
    extend: 'Rally.data.wsapi.ParentChildMapper',
    constructor: function() {
        this.parentChildTypeMap = {
            testfolder: [
                {typePath: 'testcase', collectionName: 'TestCases', parentField: 'TestFolder'},
                {typePath: 'testfolder', collectionName: 'Children', parentField: 'Parent'}
            ],
            hierarchicalrequirement: [
                {typePath: 'defect', collectionName: 'Defects', parentField: 'Requirement'},
                {typePath: 'task', collectionName: 'Tasks', parentField: 'WorkProduct'},
                {typePath: 'testcase', collectionName: 'TestCases', parentField: 'WorkProduct'},
                {typePath: 'hierarchicalrequirement', collectionName: 'Children', parentField: 'Parent'}
            ],
            defect: [
                {typePath: 'task', collectionName: 'Tasks', parentField: 'WorkProduct'},
                {typePath: 'testcase', collectionName: 'TestCases', parentField: 'WorkProduct'}
            ],
            defectsuite: [
                {typePath: 'defect', collectionName: 'Defects', parentField: 'DefectSuites'},
                {typePath: 'task', collectionName: 'Tasks', parentField: 'WorkProduct'},
                {typePath: 'testcase', collectionName: 'TestCases', parentField: 'WorkProduct'}
            ],
            testset: [
                {typePath: 'task', collectionName: 'Tasks', parentField: 'WorkProduct'},
                {typePath: 'testcase', collectionName: 'TestCases', parentField: 'TestSets'}
            ]
        };
    },
    
    getParentFieldForChild: function(childType,parentType) {        
        var map_array = this.parentChildTypeMap[parentType];
        var parent_field = null;
        if (map_array) {
            Ext.Array.each(map_array, function(map){
                if ( map.typePath == childType && map.parentField ) {
                    parent_field =  map.parentField;
                }
            });
        }
        
        return parent_field;
        
    }
});
