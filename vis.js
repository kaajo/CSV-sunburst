// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
} else {
    alert('The File APIs are not fully supported in this browser.');
}

var width = 960,
    height = 700,
    radius = (Math.min(width, height) / 2) - 10;

var x = d3.scale.linear()
    .range([0, 2 * Math.PI]);

var y = d3.scale.sqrt()
    .range([0, radius]);

var color = d3.scale.category20c();

var partition = d3.layout.partition()
    .value(function (d) { return 1; });

var minDx = 0.0;

var priorityOfAttr = [];

var fileData;

var createdMenu = false;

var arc = d3.svg.arc()
    .startAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function (d) { return Math.max(0, y(d.y)); })
    .outerRadius(function (d) { return Math.max(0, y(d.y + d.dy)); });

var svg = d3.select("#sunburst").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")");

document.getElementById('fileUpload').value = "";
document.getElementById('fileUpload').addEventListener('change', onFileChange, false);

//functions

function addCombobox(name, option) {
    if (name.length == 0) {
        name = "<noname>";
    }

    var label = d3.select("#combos")
        .append('label')
        .attr('for', name)
        .text(name);

    var select = d3.select("#combos")
        .append('select')
        .attr('id', name)
        .on('change', onChange);

    var options = select
        .selectAll('option')
        .attr("name", options)
        .data(option).enter()
        .append('option')
        .text(function (d) { return d; });

}

function createMenu(csv_data) {
    if (!createdMenu) {
        Object.keys(csv_data[0]).forEach(function (key) {
            addCombobox(key, _.range(Object.keys(csv_data[0]).length));
        });
        createdMenu = true;
    }
}

function removeMenu() {

    d3.select("#combos").selectAll("select").remove("*");
    d3.select("#combos").selectAll("label").remove("*");
    createdMenu = false;
}

function replaceInJSONNode(element, oldKey, newKey) {
    if (typeof element !== 'object') {
        return;
    }
    if (oldKey in element) {
        element[newKey] = element[oldKey];
        delete element[oldKey];
    }
    if (Array.isArray(element)) {
        element.forEach(function (el2) {
            replaceInJSONNode(el2, oldKey, newKey);
        });
    } else {
        Object.keys(element).forEach(function (key) {
            replaceInJSONNode(element[key], oldKey, newKey);
        });
    }

}

function click(d) {

    svg.transition()
        .duration(750)
        .tween("scale", function () {
            var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                yd = d3.interpolate(y.domain(), [d.y, 1]),
                yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
            return function (t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
        })
        .selectAll("path")
        .attrTween("d", function (d) { return function () { return arc(d); }; });
}

function textForDepth(d) {
    if (d.depth == 0) {
        return "root: " + "(" + d.value + "/100%)";
    }
    else if (d.depth > priorityOfAttr.length) {
        return d.name;
    }
    else {
        return priorityOfAttr[d.depth - 1].id + ": " + d.name + " (" + + d.value + "/" + (d.value / d.parent.value * 100.0).toFixed(2) + "%)"
    }
}

function createNestingFunction(propertyName) {
    return function (d) {
        return d[propertyName];
    };
}

function createVisualization(orderedkeys) {
    var fd = d3.csv.parse(fileData);

    minDx = 1.0 / (fd.length - 1);

    createMenu(fd);

    var nested_data = d3.nest();

    for (var i = 0; i < orderedkeys.length; i++) {
        nested_data = nested_data.key(createNestingFunction(orderedkeys[i]));
    }

    nested_data = nested_data
        .entries(fd);

    replaceInJSONNode(nested_data, "key", "name");
    replaceInJSONNode(nested_data, "values", "children");

    var root = {};
    root.name = "graph";
    root.children = nested_data;

    var nodes = partition.nodes(root)
        .filter(function (d) {
            return (d.dx > minDx);
        });

    svg.selectAll("path")
        .data(nodes)
        .enter().append("path")
        .attr("d", arc)
        .style("fill", function (d) { return color((d.children ? d : d.parent).name); })
        .on("click", click)
        .append("title")
        .text(textForDepth);
}

function removeVisualization() {
    svg.selectAll("*").remove();
}

function onChange() {
    var elems = d3.select("#combos").selectAll("select");

    priorityOfAttr = [];

    elems[0].forEach(function (element) {
        if (element.selectedIndex > 0) {
            priorityOfAttr.push(element);
        }
    });
    priorityOfAttr.sort(function (a, b) { return a.selectedIndex > b.selectedIndex; })

    removeVisualization();
    createVisualization(priorityOfAttr.map(function (a) { return a.id }));
}

function onFileChange(fileContent) {

    var file = fileContent.target.files[0];

    var reader = new FileReader();

    reader.onload = function (event) {
        fileData = this.result;
        removeMenu();
        onChange();
    }

    reader.readAsText(file);
}
