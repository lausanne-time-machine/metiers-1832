import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS.js';
import VectorTileSource from 'ol/source/VectorTile';
import { createXYZ } from 'ol/tilegrid';
import MVT from 'ol/format/MVT.js';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Circle from 'ol/style/Circle';
import Stroke from 'ol/style/Stroke';
import { defaults as defaultControls } from 'ol/control.js';

// Define the extent [minX, minY, maxX, maxY]
const extent = [732766.5159535911, 5861623.374137599, 748257.9790256999, 5877491.021729927];

// Define the layers
const baseLayer = new TileLayer({
  source: new OSM(),
  className: 'ol-osm',
  transition: 0,
  zIndex: 0,
});

const cadastreImageLayer = new TileLayer({
  source: new XYZ({
    url: 'https://geo-timemachine.epfl.ch/geoserver/www/tilesets/lausanne-1832/{z}/{x}/{y}.png',
    minZoom: 12,
    maxZoom: 20,
    transition: 0,
    attributions: '© <a href="https://archives-deux-sevres-vienne.fr/ark:/28387/vtac12d0108cfa39369" target="_blank">Archives dépertementales des Deux-Sèvres et Vienne</a>'
  }),
  extent: extent,
  preload: Infinity,
  zIndex: 1,
});

const cadastreWmsSource = new TileWMS({
  url: 'https://geo-timemachine.epfl.ch/geoserver/TimeMachine/ows',
  params: { 'LAYERS': 'TimeMachine:lausanne_cadastre_berney_v7_7', 'TILED': true },
  serverType: 'geoserver',
  minZoom: 12,
  maxZoom: 20,
  transition: 0,
});

const cadastreWmsLayer = new TileLayer({
  extent: extent,
  source: cadastreWmsSource,
  opacity: 0.5,
  zIndex: 2,
});

const cadastreVectorTileLayer = new VectorTileLayer({
  source: new VectorTileSource({
    tilePixelRatio: 1, // oversampling when > 1
    tileGrid: createXYZ({ minZoom: 12, maxZoom: 20 }),
    format: new MVT(),
    url: 'https://geo-timemachine.epfl.ch/geoserver/TimeMachine/gwc/service/tms/1.0.0/TimeMachine:lausanne_cadastre_berney_v7_7@EPSG:900913@pbf/{z}/{x}/{-y}.pbf',
    transition: 0,
  }),
  style: function () {
    return new Style({
      stroke: null,
      fill: new Fill({
        color: 'rgba(0, 0, 0, 0)'
      })
    });
  },
  extent: extent,
  zIndex: 3,
});

const almanachLayer = new VectorLayer({
  source: new VectorSource({
    url: 'https://geo-timemachine.epfl.ch/geoserver/TimeMachine/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TimeMachine%3A1832_almanach&outputFormat=application%2Fjson',
    format: new GeoJSON(),
    transition: 0,
  }),
  style: new Style({
    image: new Circle({
      radius: 5,
      fill: new Fill({
        color: 'white'
      }),
      stroke: new Stroke({
        color: 'darkgray',
        width: 1
      })
    })
  }),
  extent: extent,
  zIndex: 5,
});


// Create the view with the initial center and zoom level
const view = new View({
  zoom: 2,
  center: [732766.5159535911, 5861623.374137599]
});

// Create the map
const map = new Map({
  target: 'map',
  layers: [
    baseLayer,
    cadastreWmsLayer,
    cadastreVectorTileLayer,
    almanachLayer
  ],
  view: view,
  controls: defaultControls({ attribution: false })
});

// Checkbox event listeners
document.getElementById('baseLayer').addEventListener('change', function () {
  baseLayer.setVisible(this.checked);
});
document.getElementById('cadastreImageLayer').addEventListener('change', function () {
  cadastreImageLayer.setVisible(this.checked);
});
document.getElementById('cadastreWmsAndVectorLayers').addEventListener('change', function () {
  cadastreWmsLayer.setVisible(this.checked);
  cadastreVectorTileLayer.setVisible(this.checked);
  document.getElementById('legendContainer').style.display = this.checked ? 'block' : 'none';
});
document.getElementById('almanachLayer').addEventListener('change', function () {
  almanachLayer.setVisible(this.checked);
});

// Slider event listeners
// Get the slider element from the HTML
const opacitySlider = document.getElementById('cadastreOpacitySlider');

// Add an event listener to the slider
opacitySlider.addEventListener('input', function () {
  // Get the value of the slider
  const opacityValue = parseFloat(opacitySlider.value);

  // Set the opacity of the layer
  cadastreWmsLayer.setOpacity(opacityValue);
});

// Set the map's view
map.setView(view);

// After the map becomes "stable" for the first time, fit the view to the specified extent
map.once('postrender', function () {
  // Hide the loading message
  document.getElementById('loading').style.display = 'none';
  view.fit(extent, {
    padding: [50, 50, 50, 50], // Optional: padding around the edges
    duration: 0 // Optional: animation duration in milliseconds
  });
  map.addLayer(cadastreImageLayer);

  // Initial legend
  const resolution = map.getView().getResolution();
  updateLegend(resolution);
});

// // Update the legend when the resolution changes
// map.getView().on('change:resolution', function (event) {
//   const resolution = event.target.getResolution();
//   updateLegend(resolution);
// });

const updateLegend = function (resolution) {
  const graphicUrl = cadastreWmsSource.getLegendUrl(resolution);
  const img = document.getElementById('legend');
  img.src = graphicUrl;
};

map.on('click', showFeatureInfo);

function showFeatureInfo(event) {
  const features = map.getFeaturesAtPixel(event.pixel);
  const featureInfo = document.getElementById('featureInfo');
  const featureInfoContent = document.getElementById('featureInfoContent');
  featureInfoContent.innerHTML = '';
  if (features.length === 0) {
    featureInfoContent.innerText = '';
    featureInfo.style.opacity = 0;
    setTimeout(() => featureInfo.classList.add('hidden'), 100);
    return;
  }

  // // Highlight the feature
  // features[0].setStyle(new Style({
  //   stroke: new Stroke({
  //     color: 'black',
  //     width: 2
  //   }),
  //   fill: new Fill({
  //     color: 'rgba(255, 255, 255, 0.5)'
  //   })
  // }));

  const properties = features[0].getProperties();

  if (properties.hasOwnProperty('area')) {
    const cadastre_item_model = createCadastreItem(properties);
    const tableElement = document.createElement('table');
    for (const key in cadastre_item_model) {
      const rowElement = document.createElement('tr');
      const labelElement = document.createElement('td');
      const valueElement = document.createElement('td');
      if (cadastre_item_model[key].value !== '') {
        labelElement.textContent = cadastre_item_model[key].label[0].fr + ':';
        valueElement.textContent = cadastre_item_model[key].value;
        rowElement.appendChild(labelElement);
        rowElement.appendChild(valueElement);
        tableElement.appendChild(rowElement);
      }
    }
    featureInfoContent.appendChild(tableElement);
  } else if (properties.hasOwnProperty('field_1')) {
    const almanach_item_model = createAlmanachItem(properties);
    const tableElement = document.createElement('table');
    for (const key in almanach_item_model) {
      const rowElement = document.createElement('tr');
      const labelElement = document.createElement('td');
      const valueElement = document.createElement('td');
      labelElement.textContent = almanach_item_model[key].label[0].fr + ':';
      valueElement.textContent = almanach_item_model[key].value;
      rowElement.appendChild(labelElement);
      rowElement.appendChild(valueElement);
      tableElement.appendChild(rowElement);
    }
    featureInfoContent.appendChild(tableElement);
  }
  featureInfo.style.opacity = 1;
  featureInfo.classList.remove('hidden');
  // Re-bind the close button event listener
  document.getElementById('closeFeatureInfo').addEventListener('click', function () {
    featureInfo.style.opacity = 0;
    setTimeout(() => featureInfo.classList.add('hidden'), 100);
  });
}

document.getElementById('closeFeatureInfo').addEventListener('click', function () {
  const featureInfo = document.getElementById('featureInfo');
  featureInfo.style.opacity = 0;
  setTimeout(function () {
    featureInfo.classList.add('hidden');
  }, 100); // Match the CSS transition duration
});

document.getElementById('infoButton').addEventListener('click', function () {
  var popover = document.getElementById('infoPopOver');
  if (popover.classList.contains('hidden')) {
    popover.classList.remove('hidden'); // Remove the hidden class to make it interactable
    setTimeout(function () {
      popover.style.opacity = 1; // Fade in
    }, 10); // Short timeout to start transition after element is visible
  } else {
    popover.style.opacity = 0; // Fade out
    setTimeout(function () {
      popover.classList.add('hidden'); // Add hidden class after transition completes
    }, 300); // Match the duration of the CSS transition
  }
});

// Models
function createCadastreItem(properties) {
  return {
    own_name: {
      label: [
        { fr: 'Nom propriétaire' },
        { en: 'Owner Name' }
      ],
      value: properties.own_name,
    },
    own_surnam: {
      label: [
        { fr: 'Prénom propriétaire' },
        { en: 'Owner Surname' }
      ],
      value: properties.own_surnam,
    },
    own_compl: {
      label: [
        { fr: 'Complément propriétaire' },
        { en: 'Owner Complement' }
      ],
      value: properties.own_compl,
    },
    own_desc: {
      label: [
        { fr: 'Description propriétaire' },
        { en: 'Owner Description' }
      ],
      value: properties.own_desc,
    },
    own_share: {
      label: [
        { fr: 'Part propriétaire' },
        { en: 'Owner Share' }
      ],
      value: properties.own_share,
    },
    own_type: {
      label: [
        { fr: 'Type propriétaire' },
        { en: 'Owner Type' }
      ],
      value: properties.own_type,
    },
    own_col_de: {
      label: [
        { fr: 'Propriétaires (décompte)' },
        { en: 'Owners (count)' }
      ],
      value: properties.own_col_de,
    },
    own_col_ty: {
      label: [
        { fr: 'Propriétaires (type)' },
        { en: 'Owners (type)' }
      ],
      value: properties.own_col_ty,
    },
    main_use: {
      label: [
        { fr: 'Utilisation principale' },
        { en: 'Main Use' }
      ],
      value: properties.main_use,
    },
    use: {
      label: [
        { fr: 'Utilisation' },
        { en: 'Use' }
      ],
      value: properties.use,
    },
    category: {
      label: [
        { fr: 'Catégorie' },
        { en: 'Category' }
      ],
      value: properties.category,
    },
    class: {
      label: [
        { fr: 'Classe' },
        { en: 'Class' }
      ],
      value: properties.class,
    },
    subclass: {
      label: [
        { fr: 'Sous-classe' },
        { en: 'Subclass' }
      ],
      value: properties.subclass,
    },
    area: {
      label: [
        { fr: 'Surface' },
        { en: 'Area' }
      ],
      value: properties.area + ' m²',
    },
    page: {
      label: [
        { fr: 'Page' },
        { en: 'Page' }
      ],
      value: properties.page,
    },
    number: {
      label: [
        { fr: 'Numéro' },
        { en: 'Number' }
      ],
      value: properties.number,
    },
    identifier: {
      label: [
        { fr: 'Identifiant' },
        { en: 'Identifier' }
      ],
      value: properties.identifier,
    },
    // symbol: {
    //   label: [
    //     { fr: 'Symbole' },
    //     { en: 'Symbol' }
    //   ],
    //   value: properties.symbol,
    // }
  }
};

function createAlmanachItem(properties) {
  return {
    nom: {
      label: [
        { fr: 'Nom' },
        { en: 'Name' }
      ],
      value: properties.nom,
    },
    metier: {
      label: [
        { fr: 'Métier' },
        { en: 'Occupation' }
      ],
      value: properties.metier,
    },
    categ: {
      label: [
        { fr: 'Catégorie' },
        { en: 'Category' }
      ],
      value: properties.categ,
    },
    // MacroClass: {
    //   label: [
    //     { fr: 'Classe' },
    //     { en: 'Class' }
    //   ],
    //   value: properties.MacroClass,
    // },
    nomrue: {
      label: [
        { fr: 'Nom de rue' },
        { en: 'Street Name' }
      ],
      value: properties.nomrue,
    },
    numrue: {
      label: [
        { fr: 'Numéro de rue' },
        { en: 'Street Number' }
      ],
      value: properties.numrue,
    },
    field_1: {
      label: [
        { fr: 'Field 1' },
        { en: 'Field 1' }
      ],
      value: properties.field_1,
    },
    id: {
      label: [
        { fr: 'ID' },
        { en: 'ID' }
      ],
      value: properties.id,
    },
    wkt: {
      label: [
        { fr: 'Coordonnées' },
        { en: 'Coordinates' }
      ],
      value: properties.wkt,
    },
    point_info: {
      label: [
        { fr: 'Information sur le point' },
        { en: 'Point Information' }
      ],
      value: properties.point_info,
    }
  }
};