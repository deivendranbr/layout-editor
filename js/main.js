    /** Custom Seats **/
    function showSeatForm() {
      overlay.style.display = "block";
      seatForm.style.display = "block";
      seatNumberInput.value = `S${elementsStack.length + 1}`;
      seatPriceInput.value = "";
      seatIconInput.value = "👤";
    }
    function hideSeatForm() {
      overlay.style.display = "none";
      seatForm.style.display = "none";
      seatToPlace = null;
    }
    const addSeatBtn = document.getElementById('addSeatBtn');
    addSeatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showSeatForm();
    });
    cancelSeatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideSeatForm();
    });

    submitSeatBtn.addEventListener('click', async (e) => {
      e.stopPropagation();

      const file = document.getElementById('seatSVGInput').files[0];
      let svgIcon = null;

      if (file && file.type === "image/svg+xml") {
        svgIcon = await file.text(); // Read SVG content
      }

      const seatData = {
        number: seatNumberInput.value.trim() || `S${elementsStack.length + 1}`,
        label: seatLabelInput.value.trim(),
        type: seatTypeInput.value.trim(),
        type1: seatType1Input.value,
        price: parseFloat(seatPriceInput.value.trim()) || 0,
        icon: seatIconInput.value.trim() || "👤",
        svg: svgIcon
      };

      seatToPlace = seatData;

      if (seatToPlace) {
        const savedSeats = JSON.parse(localStorage.getItem('customSeats') || '[]');
        savedSeats.push({
          number: seatToPlace.number,
          label: seatToPlace.label,
          type: seatToPlace.type,
          type1: seatToPlace.type1,
          price: seatToPlace.price,
          icon: seatToPlace.icon,
          svg: seatToPlace.svg || null
        });
        localStorage.setItem('customSeats', JSON.stringify(savedSeats));

        if (seatToPlace.svg) {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(seatToPlace.svg, "image/svg+xml");
          const svgElement = svgDoc.documentElement;
          svgElement.setAttribute("width", "24");
          svgElement.setAttribute("height", "24");
          svgElement.setAttribute("x", "-12");
          svgElement.setAttribute("y", "-12");
          document.querySelector('.custom_seats_btn').appendChild(svgElement);
        } else {
          const seatText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          seatText.classList.add("seat-icon");
          seatText.textContent = seatToPlace.svg || "👤";
          seatText.setAttribute("y", 2);
          document.querySelector('.custom_seats_btn').appendChild(seatText);
        }
      }
      hideSeatForm();
      seatToPlace = null;
    });

    /** Custom Seats end **/

    function loadCustomSeats() {
      const savedSeats = JSON.parse(localStorage.getItem('customSeats') || '[]');
      savedSeats.forEach(seat => {
        /* const seatGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        seatGroup.classList.add("draggable");
        seatGroup.setAttribute("transform", `translate(${seat.x},${seat.y})`);
       
        const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bgCircle.setAttribute("r", 15);
        bgCircle.setAttribute("fill", seat.type1 === "vip" ? "#FFD700" : seat.type1 === "accessible" ? "#90EE90" : "#87CEEB");
        bgCircle.setAttribute("stroke", "#333");
        bgCircle.setAttribute("stroke-width", 2);
        seatGroup.appendChild(bgCircle);
       
        const seatText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        seatText.classList.add("seat-icon");
        seatText.textContent = seat.icon || "👤";
        seatText.setAttribute("y", 2);
        seatGroup.appendChild(seatText);
       
        svg.appendChild(seatGroup);
        elementsStack.push(seatGroup); */

        if (seat.svg) {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(seat.svg, "image/svg+xml");
          const svgElement = svgDoc.documentElement;
          svgElement.setAttribute("width", "24");
          svgElement.setAttribute("height", "24");
          svgElement.setAttribute("x", "-12");
          svgElement.setAttribute("y", "-12");
          document.querySelector('.custom_seats_btn').appendChild(svgElement);
        } else {
          const seatText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          seatText.classList.add("seat-icon");
          seatText.textContent = seat.icon || "👤";
          seatText.setAttribute("y", 2);
          document.querySelector('.custom_seats_btn').appendChild(seatText);
        }
      });
      //updateUndoRedoButtons();
    }

    // loadCustomSeats();

    const svg = document.getElementById('svgCanvas');
    const buttons = document.querySelectorAll('.buttons button[data-type]');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    let currentType = null;

    let drawing = false;
    let startX, startY;
    let currentShape = null;

    let selectedElement = null;
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    // For polygon/polyline/curve/parabola multi-point drawing
    let points = [];
    let tempPoints = [];
    let isMultiPointDrawing = false;

    // Stacks for undo/redo
    const elementsStack = [];
    const redoStack = [];

    function getIconForType(type) {
      switch (type) {
        case "vip": 
        return "👑";
        case "accessible": return "♿";
        default: return "👤";
      }
    }

    function updateUndoRedoButtons() {
      undoBtn.disabled = elementsStack.length === 0;
      redoBtn.disabled = redoStack.length === 0;
    }

    function clearSelection() {
      if (selectedElement) {
        selectedElement.classList.remove('selected');
        selectedElement = null;
        deleteBtn.disabled = true;
      }
    }

    function selectElement(el) {
      clearSelection();
      selectedElement = el;
      selectedElement.classList.add('selected');
      deleteBtn.disabled = false;
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentType = btn.getAttribute('data-type');
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        svg.style.cursor = (["rect", "circle", "line", "polygon", "polyline", "curve", "parabola"].includes(currentType)) ? 'crosshair' : 'pointer';
        clearSelection();
        cancelMultiPointDrawing();
      });
    });

    function getMousePosition(evt) {
      const CTM = svg.getScreenCTM();
      return {
        x: (evt.clientX - CTM.e) / CTM.a,
        y: (evt.clientY - CTM.f) / CTM.d
      };
    }

    function createTempPointCircle(x, y) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x);
      c.setAttribute("cy", y);
      c.setAttribute("r", 4);
      c.setAttribute("fill", "red");
      c.setAttribute("pointer-events", "none");
      svg.appendChild(c);
      tempPoints.push(c);
    }
    function clearTempPoints() {
      tempPoints.forEach(c => svg.removeChild(c));
      tempPoints = [];
    }

    function cancelMultiPointDrawing() {
      isMultiPointDrawing = false;
      points = [];
      clearTempPoints();
      if (currentShape) {
        svg.removeChild(currentShape);
        currentShape = null;
      }
    }

    // ---- Parabola math ----
    function solveParabolaCoefficients(p1, p2, p3) {
      const x1 = p1.x, y1 = p1.y;
      const x2 = p2.x, y2 = p2.y;
      const x3 = p3.x, y3 = p3.y;

      const denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
      if (denom === 0) return null;

      const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
      const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
      const c = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;

      return { a, b, c };
    }
    function drawParabola(a, b, c, minX, maxX) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      let d = "";
      for (let i = 0; i <= 50; i++) {
        const x = minX + (i / 50) * (maxX - minX);
        const y = a * x * x + b * x + c;
        d += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
      }
      path.setAttribute("d", d);
      path.setAttribute("stroke", "blue");
      path.setAttribute("stroke-width", 2);
      path.setAttribute("fill", "none");
      path.classList.add("draggable");
      svg.appendChild(path);
      elementsStack.push(path);
      redoStack.length = 0;
      updateUndoRedoButtons();
    }

    svg.addEventListener('mousedown', (e) => {
      const pt = getMousePosition(e);
      if (e.target === svg) {
        clearSelection();
        if (!currentType) return;
        redoStack.length = 0;
        updateUndoRedoButtons();

        // -------- normal single shapes ----------
        if (["rect", "circle", "line"].includes(currentType)) {
          drawing = true; startX = pt.x; startY = pt.y;
          if (currentType === "rect") {
            currentShape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            currentShape.setAttribute("x", startX);
            currentShape.setAttribute("y", startY);
            currentShape.setAttribute("width", 0);
            currentShape.setAttribute("height", 0);
            currentShape.setAttribute("fill", "rgba(255,165,0,0.5)");
            currentShape.setAttribute("stroke", "orange");
            currentShape.classList.add("draggable");
            svg.appendChild(currentShape);
          } else if (currentType === "circle") {
            currentShape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            currentShape.setAttribute("cx", startX);
            currentShape.setAttribute("cy", startY);
            currentShape.setAttribute("r", 0);
            currentShape.setAttribute("fill", "rgba(0,150,136,0.5)");
            currentShape.setAttribute("stroke", "#009688");
            currentShape.classList.add("draggable");
            svg.appendChild(currentShape);
          } else if (currentType === "line") {
            currentShape = document.createElementNS("http://www.w3.org/2000/svg", "line");
            currentShape.setAttribute("x1", startX);
            currentShape.setAttribute("y1", startY);
            currentShape.setAttribute("x2", startX);
            currentShape.setAttribute("y2", startY);
            currentShape.setAttribute("stroke", "black");
            currentShape.setAttribute("stroke-width", 2);
            currentShape.classList.add("draggable");
            svg.appendChild(currentShape);
          }
        }
        // -------- polygon/polyline/curve/parabola ----------
        else if (["polygon", "polyline", "curve", "parabola"].includes(currentType)) {
          if (!isMultiPointDrawing) {
            isMultiPointDrawing = true;
            points = [pt];
            createTempPointCircle(pt.x, pt.y);
            if (currentType === "polygon") {
              currentShape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
              currentShape.setAttribute("fill", "rgba(255,0,255,0.3)");
              currentShape.setAttribute("stroke", "purple");
            } else if (currentType === "polyline") {
              currentShape = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
              currentShape.setAttribute("fill", "none");
              currentShape.setAttribute("stroke", "purple");
            } else if (currentType === "curve" || currentType === "parabola") {
              currentShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
              currentShape.setAttribute("fill", "none");
              currentShape.setAttribute("stroke", currentType === "curve" ? "blue" : "blue");
            }
            currentShape.classList.add("draggable");
            svg.appendChild(currentShape);
            if (currentType === "polygon" || currentType === "polyline") {
              currentShape.setAttribute("points", `${pt.x},${pt.y}`);
            }
          } else {
            points.push(pt);
            createTempPointCircle(pt.x, pt.y);
            if (currentType === "polygon") {
              currentShape.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
            } else if (currentType === "polyline") {
              currentShape.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
            } else if (currentType === "curve") {
              currentShape.setAttribute("d", generateSmoothCubicBezierPath(points));
            } else if (currentType === "parabola" && points.length === 3) {
              const coeffs = solveParabolaCoefficients(points[0], points[1], points[2]);
              if (coeffs) {
                const minX = Math.min(points[0].x, points[2].x);
                const maxX = Math.max(points[0].x, points[2].x);
                drawParabola(coeffs.a, coeffs.b, coeffs.c, minX, maxX);
              }
              cancelMultiPointDrawing();
            }
          }
        }
        // -------- seats ----------
        else {
          const seatGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          seatGroup.classList.add("draggable");
          seatGroup.setAttribute("transform", `translate(${pt.x},${pt.y})`);
          const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          bgCircle.setAttribute("r", 15);
          bgCircle.setAttribute("fill", currentType === "vip" ? "#FFD700" : currentType === "accessible" ? "#90EE90" : "#87CEEB");
          bgCircle.setAttribute("stroke", "#333");
          bgCircle.setAttribute("stroke-width", 2);
          seatGroup.appendChild(bgCircle);
          const seatText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          seatText.classList.add("seat-icon");
          seatText.textContent = getIconForType(currentType);
          seatText.setAttribute("y", 2);
          seatGroup.appendChild(seatText);
          svg.appendChild(seatGroup);
          elementsStack.push(seatGroup);
          updateUndoRedoButtons();
        }
      } else {
        let el = e.target.closest('.draggable');
        if (el) {
          selectElement(el);
          isDragging = true;
          const transform = el.getAttribute('transform') || '';
          const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
          let tx = 0, ty = 0;
          if (match) { tx = parseFloat(match[1]); ty = parseFloat(match[2]); }
          offset.x = pt.x - tx;
          offset.y = pt.y - ty;
        } else clearSelection();
      }
    });

    svg.addEventListener('mousemove', (e) => {
      const pt = getMousePosition(e);
      if (drawing && currentShape) {
        if (currentShape.tagName === 'rect') {
          const w = pt.x - startX, h = pt.y - startY;
          currentShape.setAttribute('width', Math.abs(w));
          currentShape.setAttribute('height', Math.abs(h));
          currentShape.setAttribute('x', w < 0 ? pt.x : startX);
          currentShape.setAttribute('y', h < 0 ? pt.y : startY);
        } else if (currentShape.tagName === 'circle') {
          const dx = pt.x - startX, dy = pt.y - startY;
          currentShape.setAttribute('r', Math.max(5, Math.sqrt(dx * dx + dy * dy)));
        } else if (currentShape.tagName === 'line') {
          currentShape.setAttribute('x2', pt.x);
          currentShape.setAttribute('y2', pt.y);
        }
      } else if (isDragging && selectedElement) {
        const x = pt.x - offset.x, y = pt.y - offset.y;
        selectedElement.setAttribute('transform', `translate(${x},${y})`);
      }
    });

    svg.addEventListener('mouseup', (e) => {
      if (drawing && currentShape) {
        elementsStack.push(currentShape);
        updateUndoRedoButtons();
        drawing = false; currentShape = null;
      }
      if (isDragging) isDragging = false;
    });

    svg.addEventListener('dblclick', () => {
      if (isMultiPointDrawing) {
        if (currentType === "polygon" && points.length >= 3) finishMultiPointShape();
        else if (currentType === "polyline" && points.length >= 2) finishMultiPointShape();
        else if (currentType === "curve" && points.length >= 3) {
          currentShape.setAttribute("d", generateSmoothCubicBezierPath(points));
          elementsStack.push(currentShape);
          updateUndoRedoButtons();
          clearTempPoints(); points = []; currentShape = null; isMultiPointDrawing = false;
        }
      }
    });

    function finishMultiPointShape() {
      if (!currentShape) return;
      if (currentType === "polygon") {
        currentShape.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
        currentShape.setAttribute("fill", "rgba(255,0,255,0.5)");
      } else if (currentType === "polyline") {
        currentShape.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
        currentShape.setAttribute("fill", "none");
      }
      elementsStack.push(currentShape);
      updateUndoRedoButtons();
      clearTempPoints(); points = []; currentShape = null; isMultiPointDrawing = false;
    }

    undoBtn.addEventListener('click', () => {
      if (!elementsStack.length) return;
      const el = elementsStack.pop();
      svg.removeChild(el);
      redoStack.push(el);
      clearSelection();
      updateUndoRedoButtons();
    });
    redoBtn.addEventListener('click', () => {
      if (!redoStack.length) return;
      const el = redoStack.pop();
      svg.appendChild(el);
      elementsStack.push(el);
      updateUndoRedoButtons();
    });
    deleteBtn.addEventListener('click', () => {
      if (!selectedElement) return;
      svg.removeChild(selectedElement);
      const idx = elementsStack.indexOf(selectedElement);
      if (idx > -1) elementsStack.splice(idx, 1);
      clearSelection();
      updateUndoRedoButtons();
      clearTempPoints(); points = []; currentShape = null; isMultiPointDrawing = false;
    });

    window.addEventListener('keydown', e => {
      if (e.key === "Escape") cancelMultiPointDrawing();
    });

    function generateSmoothCubicBezierPath(pts) {
      if (pts.length < 2) return "";
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    }

    const exportBtn = document.getElementById('exportSvgBtn');

    exportBtn.addEventListener('click', () => {
      // Serialize SVG content
      const svgData = new XMLSerializer().serializeToString(svg);

      // Save in localStorage
      localStorage.setItem('exportedSVG', svgData);

      // Open display page
      window.open('display.html', '_blank');
    });
