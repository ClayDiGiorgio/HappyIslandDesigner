/* eslint-disable no-case-declarations */
import paper from 'paper';
import { emitter } from './emitter';
import { colors, Color } from './colors';
import { toolState } from './tools/state';
import { toolCategoryDefinition } from './tools';
import { layers } from './layers';
import { layerDefinition } from './layerDefinition';
import { pathDefinition } from './pathDefinition';
import { getObjectData } from './helpers/getObjectData';
import { createObjectPreviewAsync } from './ui/createObject';

let brushSize = 2;
let brushPoints: Array<paper.Point>;
let brush: paper.Path;
let brushOutline: paper.Path;

let objectPreview;
let objectPreviewOutline;

const brushTypes = {
  rounded: 'rounded',
  square: 'square',
};
let brushLineForce = false;
let brushType = brushTypes.rounded;
let paintColor = colors.level1;

export function initBrush() {
  brush = new paper.Path();
  brushOutline = new paper.Path();
}

export function getCurrentBrushPoints() {
  return brushPoints;
}

export function getCurrentBrush() {
  return brush;
}

export function getCurrentBrushOutline() {
  return brushOutline;
}

export function getCurrentPaintColor() {
  return paintColor;
}

export function getCurrentBrushLineForce() {
  return brushLineForce;
}

export function getCurrentBrushSize() {
  return brushSize;
}

export function getCurrentObjectPreview() {
  return objectPreview;
}

export function getCurrentObjectPreviewOutline() {
  return objectPreviewOutline;
}

export function setBrushLineForce(isLine) {
  brushLineForce = isLine;
  emitter.emit('updateBrushLineForce', brushLineForce);
}

export function getObjectCenteredCoordinate(
  rawCoordinate: paper.Point,
  objectDefinition,
) {
  // hack for even sized brushes
  const sizeX = objectDefinition.size.width / 2;
  const sizeY = objectDefinition.size.height / 2;
  return rawCoordinate
    .subtract(new paper.Point(sizeX, sizeY))
    .add(new paper.Point(0.5, 0.5))
    .floor();
}

export function getBrushCenteredCoordinate(
  rawCoordinate: paper.Point,
): paper.Point {
  // hack for even sized brushes
  if (brushSize % 2 === 0) {
    return rawCoordinate
      .add(new paper.Point(0.5, 0.5))
      .floor()
      .subtract(new paper.Point(0.5, 0.5));
  }
  return rawCoordinate.floor();
}

export function updateObjectPreview() {
  if (toolState.activeTool && toolState.activeTool.tool) {
    let prevPos;
    let prevPosOutline;
    if (objectPreview && objectPreviewOutline) {
      objectPreview.remove();
      objectPreviewOutline.remove();
      prevPos = objectPreview.position;
      prevPosOutline = objectPreviewOutline.position;
    } else {
      prevPos = new paper.Point(0, 0);
      prevPosOutline = new paper.Point(0, 0);
    }

    const objectData = getObjectData(toolState.activeTool.tool);
    createObjectPreviewAsync(objectData, (object) => {
      objectPreview = object;
      object.locked = true;
      object.elements.bound.strokeColor.alpha = 0.6;
      object.opacity = 0.5;

      objectPreviewOutline = object.elements.bound.clone();
      objectPreviewOutline.strokeColor.alpha = 1;

      // todo: have a function that gets the most recent position of the mouse at any time
      objectPreview.position = prevPos;
      objectPreviewOutline.position = prevPosOutline;
    });
  }
}

export function updateCoordinateLabel(event) {
  const coordinate = layers.mapOverlayLayer.globalToLocal(event.point);
  // coordinateLabel.content = '' + event.point + '\n' + coordinate.toString();
  // coordinateLabel.position = rawCoordinate;

  brushOutline.position = coordinate;
  brush.position = getBrushCenteredCoordinate(coordinate);

  if (objectPreview) {
    objectPreview.position = getObjectCenteredCoordinate(
      coordinate,
      objectPreview.definition,
    );
  }
  if (objectPreviewOutline) {
    objectPreviewOutline.position = coordinate;
  }
}

function getBrushPoints(size) {
  // square
  const sizeX = size;
  const sizeY = size;
  const offset = new paper.Point(0, 0);
  if (size === 0) {
    return [
      new paper.Point(0, 0),
      new paper.Point(0, 1),
      new paper.Point(1, 0),
    ];
  }
  switch (brushType) {
    default:
    case brushTypes.square:
      return [
        offset.add(new paper.Point(0, 0)),
        offset.add(new paper.Point(0, sizeY)),
        offset.add(new paper.Point(sizeX, sizeY)),
        offset.add(new paper.Point(sizeX, 0)),
      ];
    case brushTypes.rounded:
      // return diamond if 2
      if (size === 1) {
        return [
          new paper.Point(0, 0),
          new paper.Point(0, 1),
          new paper.Point(1, 1),
          new paper.Point(1, 0),

          // new paper.Point(0, 0),
          // new paper.Point(0, 10),
          // new paper.Point(10, 10),
          // new paper.Point(10, 9),
          // new paper.Point(1, 9),
          // new paper.Point(1, 1),
          // new paper.Point(10, 1),
          // new paper.Point(10, 0),
        ];
      }
      // return diamond if 2
      if (size === 2) {
        return [
          new paper.Point(1, 0),
          new paper.Point(2, 1),
          new paper.Point(1, 2),
          new paper.Point(0, 1),
        ];
      }

      // add straight edges if odd number
      const ratio = 0.67;
      const diagonalSize = Math.floor((size / 2) * ratio);
      const straightSize = size - 2 * diagonalSize;

      const minPoint = diagonalSize;
      const maxPoint = diagonalSize + straightSize;

      return [
        offset.add(new paper.Point(minPoint, 0)),
        offset.add(new paper.Point(maxPoint, 0)),
        offset.add(new paper.Point(size, minPoint)),
        offset.add(new paper.Point(size, maxPoint)),
        offset.add(new paper.Point(maxPoint, size)),
        offset.add(new paper.Point(minPoint, size)),
        offset.add(new paper.Point(0, maxPoint)),
        offset.add(new paper.Point(0, minPoint)),
      ];
  }
}

export function updatePaintColor(colorData: Color) {
  paintColor = colorData;
  brush.fillColor = colorData.color.clone();
  // activeColor.fillColor = paintColor;

  // todo: separate viewfrom logic
  if (
    (toolState.activeTool &&
      toolState.activeTool.type === toolCategoryDefinition.terrain.type) ||
    toolState.activeTool.type === toolCategoryDefinition.path.type
  ) {
    if (toolState.activeTool.definition.iconMenu) {
      let toolCategory;
      if (layerDefinition[colorData.key]) {
        toolCategory = toolCategoryDefinition.terrain.type;
      } else if (pathDefinition[colorData.key]) {
        toolCategory = toolCategoryDefinition.path.type;
      }
      if (toolState.activeTool.type !== toolCategory) {
        toolState.switchToolType(toolCategory);
      }

      toolState.activeTool.definition.iconMenu.data.update(colorData.key);
    }
  }
}

export function updateBrush() {
  brushPoints = getBrushPoints(brushSize);

  const prevPosOutline = brushOutline.position;

  // brush.layer = uiLayer;
  brush.segments = brushPoints.map(s => new paper.Segment(s));
  brush.pivot = new paper.Point(brushSize / 2 - 0.5, brushSize / 2 - 0.5);
  brush.position = getBrushCenteredCoordinate(prevPosOutline);
  brush.opacity = 0.6;
  brush.closed = true;
  brush.fillColor = paintColor.color;
  brush.locked = true;

  brushOutline.segments = brushPoints.map(s => new paper.Segment(s));
  brushOutline.position = prevPosOutline;
  brushOutline.closed = true;
  brushOutline.strokeColor = new paper.Color('#fff');
  brushOutline.strokeWidth = 0.1;
  brushOutline.locked = true;

  emitter.emit('updateBrush');
}

export function cycleBrushHead() {
  const heads = Object.keys(brushTypes).sort((a, b) => {
    if (a === b) {
      return 0;
    }
    if (a < b) {
      return -1;
    }
    return 1;
  });
  const index = heads.indexOf(brushType);
  brushType = heads[(index + 1) % heads.length];
  updateBrush();
}

export function decrementBrush() {
  brushSize = Math.max(brushSize - 1, 1);
  updateBrush();
}

export function incrementBrush() {
  brushSize = Math.max(brushSize + 1, 1);
  updateBrush();
}
