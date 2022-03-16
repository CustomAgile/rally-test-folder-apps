#Test Folder Navigator

![folders](./images/screenshot.png "screenshot")

Buttons:
* Blue backgrounds on the filter and search buttons indicate that they are engaged
* Filter (left): For folders that are showing, display only test cases that match the filter.  When the filter is engaged, selecting a folder for adding to test set will only add test cases that match the filter.
* Search (right): Display selected folder in its tree.  If this and the filter are engaged, this will show the folders that belong to the same tree as the selected folder and their test cases that match the filter.
* Add columns (three lines and a plus sign): Choose columns to display.

Menu Items:

* Single folder menu - Cascade delete:  Remove all the folders and test cases from this point down
* Bulk menu - Add to test set: Add test cases in the folder and all the children folders to a test set.  If you choose a folder, all the test cases (that meet the filter) are added, whether or not you tick their tickboxes.  However, you can also tick each test case tickbox individually WITHOUT choosing the folder and they will be added.  If you choose a folder, all the test cases (that meet the filter) are added, whether or not you tick their tickboxes. 

Note: Cascade delete ignores the filter setting. 

## Development Notes

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  Server is only used for debug,
  name, className and sdk are used for both.
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to run the
  slow test specs.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.
