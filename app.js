const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

window.addEventListener('load', () => {
  // ✅ Move this up
  const isReload = sessionStorage.getItem('reloaded');
  sessionStorage.setItem('reloaded', 'true'); // <-- immediately set

  const savedDrawing = localStorage.getItem('autosaveDrawing');

  if (savedDrawing && isReload) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = savedDrawing;
  } else {
    drawGuide();
    localStorage.removeItem('autosaveDrawing');
  }
});

let drawing = false;
let currentTool = 'pencil';
let brushColor = '#000000';
let brushSize = 5;
let startX, startY;
let savedImageData = null;
const overlayImage = new Image();
let overlayVisible = true;

const overlay = document.getElementById('canvasOverlay');
const toolbar = document.querySelector('.toolbar');

function hideOverlay() {
  if (!overlayVisible) return;
  overlayVisible = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}


// Hide when clicking anywhere in toolbar or canvas
canvas.addEventListener('mousedown', hideOverlay, { once: true });
toolbar.addEventListener('click', hideOverlay, { once: true });


// Undo/Redo stacks
const undoStack = [];
const redoStack = [];

// Tool controls
const toolSelect = document.getElementById('tool');
const colorPicker = document.getElementById('color');
const brushSizeInput = document.getElementById('brushSize');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const saveBtn = document.getElementById('save');
const loadBtn = document.getElementById('load');
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/png, image/jpeg';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

overlayImage.src = 'assets/background.png';

const savedDrawing = localStorage.getItem('autosaveDrawing');
const isReload = sessionStorage.getItem('reloaded');

overlayImage.onload = () => {
  if (!savedDrawing || !isReload) {
    drawRoundedImage(overlayImage, 0, 0, canvas.width, canvas.height, 12);
  }
};


function drawRoundedImage(img, x, y, width, height, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
}


toolSelect.addEventListener('change', (e) => currentTool = e.target.value);
colorPicker.addEventListener('input', (e) => brushColor = e.target.value);
brushSizeInput.addEventListener('input', (e) => {
  brushSize = e.target.value;
  // Update the background position of the range input
  const percent = (brushSize - brushSizeInput.min) / (brushSizeInput.max - brushSizeInput.min) * 100;
  brushSizeInput.style.background = `linear-gradient(to right, #2e7d32 0%, #2e7d32 ${percent}%, #c8e6c9 ${percent}%, #c8e6c9 100%)`;
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function saveState(stack, keepRedo = false) {
  if (!keepRedo) redoStack.length = 0;
  stack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function restoreState(stackFrom, stackTo) {
  if (stackFrom.length === 0) return;
  saveState(stackTo, true);
  const imageData = stackFrom.pop();
  ctx.putImageData(imageData, 0, 0);
}

undoBtn.addEventListener('click', () => restoreState(undoStack, redoStack));
redoBtn.addEventListener('click', () => restoreState(redoStack, undoStack));

canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  const pos = getMousePos(e);
  startX = pos.x;
  startY = pos.y;

  if (currentTool === 'pencil' || currentTool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    saveState(undoStack);
  } else if (currentTool === 'brush') {
    ctx.globalAlpha = 0.4; // Increased opacity for better visibility
    ctx.lineWidth = brushSize * 2; // Thicker line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    saveState(undoStack);
  } else if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
    savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
});


function drawShape(tool, startX, startY, endX, endY) {
  ctx.beginPath();
  if (tool === 'line') {
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
  } else if (tool === 'rectangle') {
    ctx.rect(startX, startY, endX - startX, endY - startY);
  } else if (tool === 'circle') {
    const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
  }
  ctx.stroke();
}

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;

  const pos = getMousePos(e);
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = currentTool === 'eraser' ? '#fff' : brushColor;
  ctx.fillStyle = brushColor;
  ctx.lineCap = 'round';

  if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
    if (currentTool === 'brush') {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = brushSize * 2;
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  } else if (['line', 'rectangle', 'circle'].includes(currentTool)) {
    // Restore clean canvas to remove temporary shapes
    ctx.putImageData(savedImageData, 0, 0);
    
    // Use your helper function now
    drawShape(currentTool, startX, startY, pos.x, pos.y);
  }
});


canvas.addEventListener('mouseup', (e) => {
  if (!drawing) return;
  drawing = false;
  const pos = getMousePos(e);
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = currentTool === 'eraser' ? '#fff' : brushColor;
  ctx.fillStyle = brushColor;
  ctx.lineCap = 'round';

  if (['line', 'rectangle', 'circle'].includes(currentTool)) {
    ctx.putImageData(savedImageData, 0, 0);
    drawShape(currentTool, startX, startY, pos.x, pos.y); // Use helper
    saveState(undoStack);
  }

  ctx.closePath();

  // 👇 Add this to reset brush-specific changes
  if (currentTool === 'brush') {
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = brushSize;
  }
    const imageDataURL = canvas.toDataURL();
  localStorage.setItem('autosaveDrawing', imageDataURL);
});


canvas.addEventListener('mouseleave', () => {
  drawing = false;
  ctx.closePath();
});

saveBtn.addEventListener('click', () => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.fillStyle = '#fff';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(canvas, 0, 0);
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
});

loadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      saveState(undoStack);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveState(undoStack);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}); 

function resizeCanvas() {
  const container = canvas.parentElement;
  const toolbarHeight = toolbar.offsetHeight;

  const availableHeight = window.innerHeight - toolbarHeight - 20;
  const availableWidth = window.innerWidth - 20;

  const aspectRatio = 4 / 3;
  let newWidth, newHeight;

  if (availableWidth / availableHeight > aspectRatio) {
    newHeight = availableHeight;
    newWidth = newHeight * aspectRatio;
  } else {
    newWidth = availableWidth;
    newHeight = newWidth / aspectRatio;
  }

  // Save current canvas content as image
  const prevWidth = canvas.width;
  const prevHeight = canvas.height;
  const prevImage = ctx.getImageData(0, 0, prevWidth, prevHeight);

  // Resize canvas
  canvas.width = newWidth;
  canvas.height = newHeight;
  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;

  // Scale previous content
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = prevWidth;
  tempCanvas.height = prevHeight;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(prevImage, 0, 0);

  // Draw scaled content on resized canvas
  ctx.save();
  ctx.imageSmoothingEnabled = false;  // ⬅️ Disable smoothing
  ctx.scale(newWidth / prevWidth, newHeight / prevHeight);
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.restore();
}


window.addEventListener("resize", resizeCanvas);
window.addEventListener("DOMContentLoaded", resizeCanvas);

function adjustCanvasMargin() {
  const header = document.querySelector('.header');
  const wrapper = document.querySelector('.canvas-wrapper');
  const headerHeight = header.offsetHeight;
  wrapper.style.paddingTop = `${headerHeight + 20}px`; // 20px for spacing
}

window.addEventListener("resize", adjustCanvasMargin);
window.addEventListener("DOMContentLoaded", adjustCanvasMargin);

// Draw background image
backgroundImage.onload = () => {
  if (showBackground) {
    // Clear the canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the background image with adjusted positions
    // Parameters: image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight
    ctx.drawImage(
      backgroundImage,
      0, 0, backgroundImage.width, backgroundImage.height,  // Source rectangle
      0, -100, canvas.width, canvas.height + 150  // Destination rectangle (moved up by 100px)
    );
  }
};

// Modify beforeunload to only save on reload
window.addEventListener('beforeunload', () => {
  if (sessionStorage.getItem('reloaded')) {
    const imageDataURL = canvas.toDataURL();
    localStorage.setItem('autosaveDrawing', imageDataURL);
  }
});

// Initialize brush size gradient on load
window.addEventListener('DOMContentLoaded', () => {
  const brushSize = document.getElementById('brushSize');
  const percent = (brushSize.value - brushSize.min) / (brushSize.max - brushSize.min) * 100;
  brushSize.style.background = `linear-gradient(to right, #2e7d32 0%, #2e7d32 ${percent}%, #c8e6c9 ${percent}%, #c8e6c9 100%)`;
});

