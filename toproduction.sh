mkdir -p ./production
cp -R -v *.html *.gif css js production
./setversion.sh
