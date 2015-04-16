#!/bin/bash
export version=`hg id -n`
echo "Replace version number in $1 with hg id -n " $version
perl -pi -e 's/{VERSION}/'$version'/g' production/*.html
