// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
const R_EARTH = 6378000;

/**
 * Calculate density grid from an array of points
 * @param {array} points
 * @param {number} cellSize - cell size in meters
 * @param {function} getPosition - position accessor
 * @returns {object} - grid data, cell dimension
 */
export function pointToDensityGridData(points, cellSize, getPosition) {

  const {gridHash, gridOffset} = _pointsToGridHashing(points, cellSize, getPosition);
  const layerData = _getGridLayerDataFromGridHash(gridHash, gridOffset);

  return {
    gridOffset,
    layerData
  };
}

/**
 * Project points into each cell, return a hash table of cells
 * @param {array} points
 * @param {number} cellSize - unit size in meters
 * @param {function} getPosition - position accessor
 * @returns {object} - grid hash and cell dimension
 */
function _pointsToGridHashing(points, cellSize, getPosition) {

  // find the geometric center of sample points
  const allLat = points.map(p => getPosition(p)[1]);
  const latMin = Math.min.apply(null, allLat);
  const latMax = Math.max.apply(null, allLat);

  const centerLat = (latMin + latMax) / 2;

  const gridOffset = _calculateGridLatLonOffset(cellSize, centerLat);

  if (gridOffset.xOffset <= 0 || gridOffset.yOffset <= 0) {
    return {gridHash: {}, gridOffset};
  }
  // calculate count per cell
  const gridHash = points.reduce((accu, pt) => {
    const latIdx = Math.floor((getPosition(pt)[1] + 90) / gridOffset.yOffset);
    const lonIdx = Math.floor((getPosition(pt)[0] + 180) / gridOffset.xOffset);
    const key = `${latIdx}-${lonIdx}`;

    accu[key] = accu[key] || {count: 0, points: []};
    accu[key].count += 1;
    accu[key].points.push(pt);

    return accu;
  }, {});

  return {gridHash, gridOffset};
}

function _getGridLayerDataFromGridHash(gridHash, gridOffset) {
  return Object.keys(gridHash).reduce((accu, key, i) => {
    const idxs = key.split('-');
    const latIdx = parseInt(idxs[0], 10);
    const lonIdx = parseInt(idxs[1], 10);

    accu.push(Object.assign({
      index: i,
      position: [
        -180 + gridOffset.xOffset * lonIdx,
        -90 + gridOffset.yOffset * latIdx
      ]
    }, gridHash[key]));

    return accu;
  }, []);
}

/**
 * calculate grid layer cell size in lat lon based on world unit size
 * and current latitude
 * @param {number} cellSize
 * @param {number} latitude
 * @returns {object} - lat delta and lon delta
 */
function _calculateGridLatLonOffset(cellSize, latitude) {
  const yOffset = _calculateLatOffset(cellSize);
  const xOffset = _calculateLonOffset(latitude, cellSize);
  return {yOffset, xOffset};
}

/**
 * with a given x-km change, calculate the increment of latitude
 * based on stackoverflow http://stackoverflow.com/questions/7477003
 * @param {number} dy - change in km
 * @return {number} - increment in latitude
 */
function _calculateLatOffset(dy) {
  return (dy / R_EARTH) * (180 / Math.PI);
}

/**
 * with a given x-km change, and current latitude
 * calculate the increment of longitude
 * based on stackoverflow http://stackoverflow.com/questions/7477003
 * @param {number} lat - latitude of current location (based on city)
 * @param {number} dx - change in km
 * @return {number} - increment in longitude
 */
function _calculateLonOffset(lat, dx) {
  return (dx / R_EARTH) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
}
