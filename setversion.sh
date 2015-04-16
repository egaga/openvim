#!/bin/bash
export version=`git rev-parse HEAD`
echo "Replace version number in $1 with git rev-parse HEAD " $version
perl -pi -e 's/{VERSION}/'$version'/g' production/*.html
