# jasmine-jenkins

Hi.  I'm trying to make it easier to report jasmine test results in jenkins.

## Dependencies

jasemine-jenkins assumes you have [node.js](http://nodejs.org/) installed.

## Usage

Using your favorite shell, from the `src` folder: `node index.js -t`

## Results

Results will be written, one for each jasmine spec, to the `src` folder with the prefix "TEST" and the .xml extension.

