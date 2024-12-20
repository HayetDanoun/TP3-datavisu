// Paramètres de base
const width = 800;
const height = 600;

// Années disponibles
const years = [2009, 2011, 2013, 2015, 2017, 2019, 2021];

// Création du SVG
const svg = d3
  .select("#map-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Tooltip
const tooltip = d3.select(".tooltip");

// Projection de la carte
const projection = d3
  .geoConicConformal()
  .center([2.454071, 46.279229])
  .scale(2800)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

let geojsonData;
let csvData;
let dataByDept = {};
let color;

// Chargement des données
Promise.all([
  d3.json("departements-version-simplifiee.geojson"),
  d3.csv("mesDonnes.csv")
]).then(([geojson, data]) => {
  geojsonData = geojson;

  // Nettoyage des données CSV
  data.forEach((d) => {
    d.TONNAGE_T = parseFloat(d.TONNAGE_T.replace(",", "."));
    d.C_DEPT = d.C_DEPT.padStart(2, "0");
  });

  csvData = data;

  // Regrouper par département et par année
  csvData.forEach((d) => {
    if (d.L_TYP_REG_DECHET === "DEEE") {
      if (!dataByDept[d.C_DEPT]) {
        dataByDept[d.C_DEPT] = {};
      }
      dataByDept[d.C_DEPT][d.ANNEE] = d.TONNAGE_T;
    }
  });

  // Dessin initial de la carte (année 2009)
  drawMap(2009);

  // Mise à jour via le slider
  const slider = d3.select("#slider");
  slider.on("input", function () {
    const yearIndex = +this.value;
    const selectedYear = years[yearIndex];
    updateViz(selectedYear);
  });
});

function updateViz(selectedYear) {
  d3.select("#day").html(selectedYear);
  drawMap(selectedYear);
}

// Fonction drawMap
function drawMap(currentYear) {
  // Extraire les données pour l'année courante
  const currentYearData = [];
  for (let dept in dataByDept) {
    if (dataByDept[dept][currentYear] !== undefined) {
      currentYearData.push(dataByDept[dept][currentYear]);
    }
  }

  // Déterminer min et max
  const minValue = d3.min(currentYearData) || 0;
  const maxValue = d3.max(currentYearData) || 20000;

  // Échelle de couleurs
  color = d3
    .scaleQuantize()
    .domain([minValue, maxValue])
    .range(["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#2171b5"]);

  // Mise à jour du GeoJSON
  geojsonData.features.forEach((feature) => {
    const departementCode = feature.properties.code;
    const value = dataByDept[departementCode]
      ? dataByDept[departementCode][currentYear]
      : null;
    feature.properties.value = value;
  });

  // Dessin de la carte
  const carte = svg.selectAll("path").data(geojsonData.features);

  carte
    .join("path")
    .attr("class", "departement")
    .attr("d", path)
    .style("fill", (d) => {
      const value = d.properties.value;
      return value ? color(value) : "#ccc";
    })
    .on("mouseover", function (event, d) {
      // Affiche le tooltip
      tooltip.classed("hidden", false);
      // Colorie la région en gris
      d3.select(this).style("fill", "grey");
    })
    .on("mousemove", function (event, d) {
      const [x, y] = d3.pointer(event);
      tooltip
        .classed("hidden", false)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px")
        .html(
          d.properties.value
            ? `${d.properties.nom} (${
                d.properties.code
              })<br>${d.properties.value.toFixed(2)} tonnes en ${currentYear}`
            : `${d.properties.nom} (${d.properties.code})<br>Aucune donnée pour ${currentYear}`
        );
    })
    .on("mouseout", function (event, d) {
      tooltip.classed("hidden", true);
      // Réinitialise la couleur du département
      const value = d.properties.value;
      d3.select(this).style("fill", value ? color(value) : "#808080");
    });

  svg.on("mouseleave", function () {
    tooltip.classed("hidden", true);
  });
}
