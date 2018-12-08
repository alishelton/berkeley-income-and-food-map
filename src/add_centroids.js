var berkeley_json = require('./berkeley-map/berkeley.json');
var polylabel = require('polylabel');
var fs = require('fs');

for (var i = 0; i < berkeley_json.features.length; i++) {
  berkeley_json.features[i].geometry.centroid =
    polylabel(berkeley_json.features[i].geometry.coordinates);
}

fs.writeFile('./berkeley-map/berkeley-w-centroids.json', JSON.stringify(berkeley_json), function(err) {
    if (err) {
        console.log(err);
    }
});
