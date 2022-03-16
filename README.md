rally-test-folder-apps
======================
Rally App that copies test folders and all the contents (test cases including test steps and attachments) from one project to another.   Relative hierarchy of parent and child projects will be maintained when copying a test folder that contains children.  

<b>Instructions:</b><br>
<ol>
<li>Select a source project.  All test folders that are children of the selected source project will be displayed.  Test folders for child projects will not be displayed.  

<li>Select the test folders to copy from the source project.  If a selected test folder has child test folders, those folders will be automatically selected.  To copy all folders from the source project, leave all folders unselected.  To unselect a selected folder, click on the parent of the selected folder(s).  

<li>Next, select a target project to copy the test folders to.  

<li>Finally, select a copy option:

<ul>
<li><i>Copy to Target</i> - This option will only be available if there are currently no test folders in the target project.  All selected folders will be copied to the target project.  

<li><i>Clear and Copy to Target</i> - This option will remove all test folders and contents from the target project and copy selected test folders and contents from the source project to the target project.  

<li><i>Add to Target</i> - This option will be available if test folders already exist in the target project.  This will copy selected test folders and contents from the source project to the root of the target project.  
</ul>

</ol>
