// app.js - 사각형 실험실 애플리케이션 메인 로직

document.addEventListener("DOMContentLoaded", () => {
  // --- 상태 관리 ---
  const state = {
    // 꼭짓점 초기 좌표 (Convex general quadrilateral)
    vertices: [
      { x: 160, y: 130 }, // A
      { x: 440, y: 110 }, // B
      { x: 410, y: 320 }, // C
      { x: 130, y: 330 }  // D
    ],
    draggedIdx: null,
    dragOffset: { x: 0, y: 0 },
    
    // 설정 옵션들
    snapToGrid: false,
    showDiagonals: true,
    showLengths: true,
    showAngles: true,
    
    // 잠금 상태
    activeLock: "none", // none, trapezoid, isosceles_trapezoid, parallelogram, rectangle, rhombus, square
    
    // 현재 분석 결과
    analysis: null,
    
    // 미션 관련 상태
    currentMissionIdx: 0,
    missionPassed: false
  };

  // --- 미션 데이터 정의 ---
  const missions = [
    {
      title: "사다리꼴 만들기",
      badge: "미션 1",
      desc: "꼭짓점을 드래그하여 최소 한 쌍의 대변이 마주보고 평행한 사다리꼴을 만들어보세요.",
      check: (analysis) => analysis.hierarchy.includes("trapezoid"),
      checklist: (analysis) => [
        { text: "최소 한 쌍의 대변이 평행함 (AB ∥ CD 또는 BC ∥ DA)", done: analysis.properties.parallelPairs >= 1 }
      ],
      hint: "마주보는 한 쌍의 변(예: AB와 CD)의 방향이 같아지도록 드래그해보세요. 평행하면 변 위에 노란색 화살표(▶) 기호가 나타납니다.",
      successDesc: "좋습니다! 마주보는 한 쌍의 변이 평행한 사각형을 '사다리꼴'이라고 부릅니다."
    },
    {
      title: "평행사변형 만들기",
      badge: "미션 2",
      desc: "마주보는 두 쌍의 대변이 각각 평행하도록 만들어 평행사변형을 완성해 보세요.",
      check: (analysis) => analysis.hierarchy.includes("parallelogram"),
      checklist: (analysis) => [
        { text: "첫 번째 쌍 대변 평행 (AB ∥ CD)", done: analysis.properties.parallelAB_CD },
        { text: "두 번째 쌍 대변 평행 (BC ∥ DA)", done: analysis.properties.parallelBC_DA }
      ],
      hint: "한 쌍을 평행하게 만든 뒤, 다른 한 쌍의 변도 기울기가 일치하도록 미세 조정해보세요. 두 쌍이 모두 평행하면 '평행사변형'이 완성됩니다.",
      successDesc: "완벽해요! 마주보는 두 쌍의 대변이 각각 평행한 사각형이 바로 '평행사변형'입니다. 두 대각선이 서로를 이등분하는 성질도 실시간 분석 탭에서 확인해 보세요."
    },
    {
      title: "마름모 만들기",
      badge: "미션 3",
      desc: "네 변의 길이가 모두 같거나 두 대각선이 서로 수직으로 만나는 마름모를 완성해 보세요.",
      check: (analysis) => analysis.hierarchy.includes("rhombus"),
      checklist: (analysis) => [
        { text: "마주보는 변 평행 (평행사변형 조건)", done: analysis.hierarchy.includes("parallelogram") },
        { text: "대각선 수직 (AC ⊥ BD) 또는 네 변의 길이 같음", done: analysis.properties.diagonalsPerpendicular || analysis.properties.equalAllSides }
      ],
      hint: "평행사변형 상태에서 두 대각선이 직각으로 만나도록 드래그해보세요. 대각선 교점에 수직(∟) 기호가 나타나면 마름모가 완성됩니다.",
      successDesc: "대단합니다! 네 변의 길이가 같고 두 대각선이 서로를 수직이등분하는 평행사변형이 바로 '마름모'입니다."
    },
    {
      title: "직사각형 만들기",
      badge: "미션 4",
      desc: "네 내각의 크기가 모두 90도이거나 두 대각선의 길이가 같은 직사각형을 만들어 보세요.",
      check: (analysis) => analysis.hierarchy.includes("rectangle"),
      checklist: (analysis) => [
        { text: "마주보는 변 평행 (평행사변형 조건)", done: analysis.hierarchy.includes("parallelogram") },
        { text: "네 내각의 크기가 모두 90도 또는 대각선 길이 같음 (AC = BD)", done: analysis.properties.allAnglesRight || analysis.properties.diagonalsEqual }
      ],
      hint: "각 모서리가 반듯한 직각이 되도록 맞춰보세요. 모든 내각이 90도에 가까워지면 직사각형으로 판별됩니다.",
      successDesc: "참 잘했습니다! 네 내각의 크기가 모두 같아 90도이고, 두 대각선의 길이가 같은 평행사변형이 '직사각형'입니다."
    },
    {
      title: "정사각형 만들기",
      badge: "미션 5",
      desc: "네 변의 길이가 모두 같고 네 내각이 모두 90도인 완벽한 정사각형을 완성해 보세요.",
      check: (analysis) => analysis.hierarchy.includes("square"),
      checklist: (analysis) => [
        { text: "직사각형 성질 만족", done: analysis.hierarchy.includes("rectangle") },
        { text: "마름모 성질 만족 (네 변의 길이 같음 및 대각선 수직)", done: analysis.hierarchy.includes("rhombus") }
      ],
      hint: "직사각형 상태를 유지하면서 대각선이 서로 수직이 되도록 하거나, 마름모 상태에서 각도를 90도로 맞춰보세요. '조건 잠금' 탭에서 직사각형이나 마름모를 잠근 채로 드래그하면 훨씬 쉽게 만들 수 있습니다!",
      successDesc: "대성공입니다! 직사각형(네 각이 90도)과 마름모(네 변의 길이 같음)의 성질을 동시에 지니는 가장 특수한 사각형이 바로 '정사각형'입니다!"
    }
  ];

  // --- 노드 클릭 세부 설명 데이터 ---
  const nodeDetails = {
    quadrilateral: {
      title: "일반 사각형 (Quadrilateral)",
      desc: "평면 위에 4개의 선분으로 둘러싸인 도형입니다.",
      rules: [
        "네 내각의 합은 항상 360도입니다.",
        "오목하지 않은 볼록 사각형이어야 교육 과정에서 다루는 기하학적 성질들이 안정적으로 나타납니다."
      ]
    },
    trapezoid: {
      title: "사다리꼴 (Trapezoid)",
      desc: "마주보는 한 쌍의 대변이 평행한 사각형입니다.",
      rules: [
        "정의: 한 쌍의 대변이 평행한 사각형",
        "평행한 변들의 엇각과 동위각 성질을 이용해 동측내각의 합이 180도가 됨을 이해할 수 있습니다."
      ]
    },
    isosceles_trapezoid: {
      title: "등변사다리꼴 (Isosceles Trapezoid)",
      desc: "사다리꼴 중에서 밑각의 크기가 같은 사각형입니다.",
      rules: [
        "정의: 밑변의 양 끝각(밑각)의 크기가 같은 사다리꼴",
        "성질 1: 평행하지 않은 한 쌍의 대변의 길이가 같습니다.",
        "성질 2: 두 대각선의 길이가 서로 같습니다."
      ]
    },
    parallelogram: {
      title: "평행사변형 (Parallelogram)",
      desc: "마주보는 두 쌍의 대변이 각각 평행한 사각형입니다.",
      rules: [
        "정의: 두 쌍의 대변이 각각 평행한 사각형",
        "판정 조건 (성질):",
        "1. 두 쌍의 대변의 길이가 각각 같다.",
        "2. 두 쌍의 대각의 크기가 각각 같다.",
        "3. 두 대각선이 서로를 이등분한다.",
        "4. 한 쌍의 대변이 평행하고 그 길이가 같다."
      ]
    },
    rectangle: {
      title: "직사각형 (Rectangle)",
      desc: "네 내각의 크기가 모두 같은 사각형입니다.",
      rules: [
        "정의: 네 내각의 크기가 모두 같은(90도인) 사각형",
        "평행사변형이 직사각형이 되는 조건 (택 1):",
        "  - 한 내각이 직각이다.",
        "  - 두 대각선의 길이가 같다."
      ]
    },
    rhombus: {
      title: "마름모 (Rhombus)",
      desc: "네 변의 길이가 모두 같은 사각형입니다.",
      rules: [
        "정의: 네 변의 길이가 모두 같은 사각형",
        "평행사변형이 마름모가 되는 조건 (택 1):",
        "  - 이웃하는 두 변의 길이가 같다.",
        "  - 두 대각선이 서로 수직이다."
      ]
    },
    square: {
      title: "정사각형 (Square)",
      desc: "네 변의 길이가 모두 같고 네 내각의 크기가 모두 같은 사각형입니다.",
      rules: [
        "정의: 네 변의 길이가 같고 네 각의 크기가 같은 사각형",
        "직사각형이 정사각형이 되기 위한 조건: 마름모의 조건 추가 필요",
        "마름모가 정사각형이 되기 위한 조건: 직사각형의 조건 추가 필요"
      ]
    }
  };

  // --- DOM 요소 캐싱 ---
  const svg = document.getElementById("geo-canvas");
  const quadShape = document.getElementById("quad-shape");
  const diagAC = document.getElementById("diag-ac");
  const diagBD = document.getElementById("diag-bd");
  const diagPerpMark = document.getElementById("diag-perp-mark");
  const diagIntersection = document.getElementById("diag-intersection");
  
  const angleSectors = {
    A: document.getElementById("angle-sector-a"),
    B: document.getElementById("angle-sector-b"),
    C: document.getElementById("angle-sector-c"),
    D: document.getElementById("angle-sector-d")
  };
  
  const labels = {
    AB: document.getElementById("label-ab"),
    BC: document.getElementById("label-bc"),
    CD: document.getElementById("label-cd"),
    DA: document.getElementById("label-da"),
    AC: document.getElementById("label-ac"),
    BD: document.getElementById("label-bd"),
    angles: {
      A: document.getElementById("label-angle-a"),
      B: document.getElementById("label-angle-b"),
      C: document.getElementById("label-angle-c"),
      D: document.getElementById("label-angle-d")
    }
  };

  const vertexGroups = [
    document.getElementById("vertex-a"),
    document.getElementById("vertex-b"),
    document.getElementById("vertex-c"),
    document.getElementById("vertex-d")
  ];

  const paraMarks = {
    AB: document.getElementById("para-mark-ab"),
    BC: document.getElementById("para-mark-bc"),
    CD: document.getElementById("para-mark-cd"),
    DA: document.getElementById("para-mark-da")
  };

  const tickMarks = {
    AB: document.getElementById("tick-mark-ab"),
    BC: document.getElementById("tick-mark-bc"),
    CD: document.getElementById("tick-mark-cd"),
    DA: document.getElementById("tick-mark-da")
  };

  // UI 컴포넌트
  const shapeBadge = document.getElementById("shape-badge");
  const badgeDot = document.getElementById("badge-dot");
  const badgeText = document.getElementById("badge-text");
  
  const btnContrast = document.getElementById("btn-contrast-toggle");
  const btnClassroom = document.getElementById("btn-classroom");
  const btnReset = document.getElementById("btn-reset");
  
  const btnToggleDiagonals = document.getElementById("btn-toggle-diagonals");
  const btnToggleLengths = document.getElementById("btn-toggle-lengths");
  const btnToggleAngles = document.getElementById("btn-toggle-angles");
  const btnToggleSnap = document.getElementById("btn-toggle-snap");

  // 모달
  const classroomModal = document.getElementById("classroom-modal");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnCloseModalOk = document.getElementById("btn-close-modal-ok");

  // 실시간 분석 패널 수치
  const valAB = document.getElementById("val-ab");
  const valBC = document.getElementById("val-bc");
  const valCD = document.getElementById("val-cd");
  const valDA = document.getElementById("val-da");
  const valAngA = document.getElementById("val-ang-a");
  const valAngB = document.getElementById("val-ang-b");
  const valAngC = document.getElementById("val-ang-c");
  const valAngD = document.getElementById("val-ang-d");
  const valDiagLens = document.getElementById("val-diag-lens");
  const valDiagPerp = document.getElementById("val-diag-perp");
  const valDiagBisect = document.getElementById("val-diag-bisect");
  const satisfiedList = document.getElementById("satisfied-list");

  // 미션 패널
  const missionDotsContainer = document.getElementById("mission-dots");
  const mBadge = document.getElementById("m-badge");
  const mTitle = document.getElementById("m-title");
  const mDesc = document.getElementById("m-desc");
  const mChecklist = document.getElementById("m-checklist");
  const btnMissionHint = document.getElementById("btn-mission-hint");
  const successLayer = document.getElementById("success-layer");
  const successDesc = document.getElementById("success-desc");
  const btnNextMission = document.getElementById("btn-next-mission");

  // 관계 설명 카드
  const nodeInfoTitle = document.getElementById("node-info-title");
  const nodeInfoDesc = document.getElementById("node-info-desc");

  // --- 이벤트 핸들러 바인딩 ---
  
  // 탭 전환 핸들러
  document.querySelectorAll(".panel-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".panel-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      
      tab.classList.add("active");
      const targetPane = document.getElementById(`pane-${tab.dataset.tab}`);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // 조건 잠금 선택 핸들러
  document.querySelectorAll(".lock-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".lock-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      state.activeLock = card.dataset.lock;
      
      // 잠금을 활성화하는 순간 도형을 해당 제약조건에 강제로 맞춤
      if (state.activeLock !== "none") {
        state.vertices = Geometry.projectToConstraint(
          state.vertices[0], state.vertices[1], state.vertices[2], state.vertices[3],
          state.activeLock, 0
        );
      }
      updateDrawing();
    });
  });

  // 다이어그램 노드 클릭 핸들러
  document.querySelectorAll(".tree-node").forEach(node => {
    node.addEventListener("click", () => {
      const nodeName = node.dataset.node;
      const info = nodeDetails[nodeName];
      if (info) {
        nodeInfoTitle.textContent = info.title;
        nodeInfoDesc.innerHTML = `
          <p style="margin-bottom: 0.5rem;">${info.desc}</p>
          <ul style="padding-left: 1.2rem; color: var(--text-secondary);">
            ${info.rules.map(r => `<li>${r}</li>`).join("")}
          </ul>
        `;
      }
    });
  });

  // 툴바 보조 기능 토글
  btnToggleDiagonals.addEventListener("click", () => {
    state.showDiagonals = !state.showDiagonals;
    btnToggleDiagonals.classList.toggle("active", state.showDiagonals);
    updateDrawing();
  });

  btnToggleLengths.addEventListener("click", () => {
    state.showLengths = !state.showLengths;
    btnToggleLengths.classList.toggle("active", state.showLengths);
    updateDrawing();
  });

  btnToggleAngles.addEventListener("click", () => {
    state.showAngles = !state.showAngles;
    btnToggleAngles.classList.toggle("active", state.showAngles);
    updateDrawing();
  });

  btnToggleSnap.addEventListener("click", () => {
    state.snapToGrid = !state.snapToGrid;
    btnToggleSnap.classList.toggle("active", state.snapToGrid);
  });

  // 화면 테마 토글 (고대비 모드)
  btnContrast.addEventListener("click", () => {
    document.body.classList.toggle("high-contrast");
    const isHigh = document.body.classList.contains("high-contrast");
    btnContrast.innerHTML = isHigh ? "<span>☀️</span> 기본 모드" : "<span>🌓</span> 고대비 모드";
  });

  // 리셋 버튼
  btnReset.addEventListener("click", () => {
    state.vertices = [
      { x: 160, y: 130 },
      { x: 440, y: 110 },
      { x: 410, y: 320 },
      { x: 130, y: 330 }
    ];
    state.activeLock = "none";
    document.querySelectorAll(".lock-card").forEach(c => c.classList.remove("active"));
    document.querySelector('.lock-card[data-lock="none"]').classList.add("active");
    
    updateDrawing();
  });

  // 모달 제어
  btnClassroom.addEventListener("click", () => classroomModal.classList.add("active"));
  btnCloseModal.addEventListener("click", () => classroomModal.classList.remove("active"));
  btnCloseModalOk.addEventListener("click", () => classroomModal.classList.remove("active"));

  // 미션 탐색 닷 클릭
  document.querySelectorAll(".step-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.dataset.step) - 1;
      state.currentMissionIdx = idx;
      setupMission();
    });
  });

  // 힌트 버튼 클릭
  btnMissionHint.addEventListener("click", () => {
    const cur = missions[state.currentMissionIdx];
    alert(`💡 힌트:\n${cur.hint}`);
  });

  // 다음 미션 진행
  btnNextMission.addEventListener("click", () => {
    successLayer.style.display = "none";
    if (state.currentMissionIdx < missions.length - 1) {
      state.currentMissionIdx++;
      setupMission();
    } else {
      alert("🎉 모든 미션을 완료했습니다! 사각형의 가족 관계를 완벽하게 탐구하셨네요.");
    }
  });

  // --- 드래그 앤 드롭 꼭짓점 제어 구현 ---
  
  vertexGroups.forEach(grp => {
    const startDrag = (e) => {
      e.preventDefault();
      state.draggedIdx = parseInt(grp.dataset.idx);
      
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      const rect = svg.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;
      
      state.dragOffset.x = mouseX - state.vertices[state.draggedIdx].x;
      state.dragOffset.y = mouseY - state.vertices[state.draggedIdx].y;

      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", endDrag);
      document.addEventListener("touchmove", onDrag, { passive: false });
      document.addEventListener("touchend", endDrag);
    };

    grp.addEventListener("mousedown", startDrag);
    grp.addEventListener("touchstart", startDrag, { passive: false });
  });

  const onDrag = (e) => {
    if (state.draggedIdx === null) return;
    
    // Y축 방향 캔버스 스크롤 및 기본 동작 금지
    if (e.cancelable) e.preventDefault();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const rect = svg.getBoundingClientRect();
    let newX = clientX - rect.left - state.dragOffset.x;
    let newY = clientY - rect.top - state.dragOffset.y;
    
    // 격자 스냅 처리 (20픽셀 격자 단위 정렬)
    if (state.snapToGrid) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
    }

    // 꼭짓점이 캔버스 밖으로 나가지 않도록 범위 바인딩
    newX = Math.max(20, Math.min(rect.width - 20, newX));
    newY = Math.max(20, Math.min(rect.height - 20, newY));

    // 드래그된 점 좌표 갱신
    state.vertices[state.draggedIdx] = { x: newX, y: newY };

    // 제약 조건 잠금이 활성화된 경우 다른 꼭짓점들 교정
    if (state.activeLock !== "none") {
      state.vertices = Geometry.projectToConstraint(
        state.vertices[0], state.vertices[1], state.vertices[2], state.vertices[3],
        state.activeLock, state.draggedIdx
      );
    }

    updateDrawing();
  };

  const endDrag = () => {
    state.draggedIdx = null;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", endDrag);
    document.removeEventListener("touchmove", onDrag);
    document.removeEventListener("touchend", endDrag);
  };

  // --- 화면 렌더링 및 UI 업데이트 ---
  
  function updateDrawing() {
    const [A, B, C, D] = state.vertices;
    
    // 1. 다각형 그리기
    quadShape.setAttribute("points", `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`);

    // 2. 기하 정보 해석 연산 수행
    const analysis = Geometry.analyzeQuadrilateral(A, B, C, D);
    state.analysis = analysis;

    // 3. 꼭짓점 원형 핸들 배치
    vertexGroups[0].setAttribute("transform", `translate(${A.x},${A.y})`);
    vertexGroups[1].setAttribute("transform", `translate(${B.x},${B.y})`);
    vertexGroups[2].setAttribute("transform", `translate(${C.x},${C.y})`);
    vertexGroups[3].setAttribute("transform", `translate(${D.x},${D.y})`);

    // 시계방향 여부 계산 (라벨 및 각도 영역 보정에 필요)
    const ccw = Geometry.Vec.cross(Geometry.Vec.sub(B, A), Geometry.Vec.sub(D, A)) < 0; 
    // 실제 CCW 여부
    const actualCCW = isCCW(A, B, C, D);

    // 4. 내각 각도 부채꼴 아크 그리기
    if (state.showAngles) {
      angleSectors.A.style.display = "";
      angleSectors.B.style.display = "";
      angleSectors.C.style.display = "";
      angleSectors.D.style.display = "";

      angleSectors.A.setAttribute("d", drawAngleArc(A, D, B, actualCCW));
      angleSectors.B.setAttribute("d", drawAngleArc(B, A, C, actualCCW));
      angleSectors.C.setAttribute("d", drawAngleArc(C, B, D, actualCCW));
      angleSectors.D.setAttribute("d", drawAngleArc(D, C, A, actualCCW));

      // 각도 레이블 위치 및 수치
      updateAngleLabel(labels.angles.A, A, D, B, analysis.angles.A, actualCCW);
      updateAngleLabel(labels.angles.B, B, A, C, analysis.angles.B, actualCCW);
      updateAngleLabel(labels.angles.C, C, B, D, analysis.angles.C, actualCCW);
      updateAngleLabel(labels.angles.D, D, C, A, analysis.angles.D, actualCCW);
    } else {
      angleSectors.A.style.display = "none";
      angleSectors.B.style.display = "none";
      angleSectors.C.style.display = "none";
      angleSectors.D.style.display = "none";
      
      labels.angles.A.textContent = "";
      labels.angles.B.textContent = "";
      labels.angles.C.textContent = "";
      labels.angles.D.textContent = "";
    }

    // 5. 변의 길이 및 평행 기호, 길이 기호 렌더링
    const center = {
      x: (A.x + B.x + C.x + D.x) / 4,
      y: (A.y + B.y + C.y + D.y) / 4
    };

    if (state.showLengths) {
      updateSideLabel(labels.AB, A, B, center, analysis.lengths.AB);
      updateSideLabel(labels.BC, B, C, center, analysis.lengths.BC);
      updateSideLabel(labels.CD, C, D, center, analysis.lengths.CD);
      updateSideLabel(labels.DA, D, A, center, analysis.lengths.DA);
    } else {
      labels.AB.textContent = "";
      labels.BC.textContent = "";
      labels.CD.textContent = "";
      labels.DA.textContent = "";
    }

    // 평행 화살표 표시
    updateParallelMarkers(analysis.properties);
    // 길이 일치 빗금 표시
    updateTickMarks(analysis.properties);

    // 6. 대각선 그리기 및 라벨링
    if (state.showDiagonals) {
      diagAC.style.display = "";
      diagBD.style.display = "";
      
      diagAC.setAttribute("x1", A.x); diagAC.setAttribute("y1", A.y);
      diagAC.setAttribute("x2", C.x); diagAC.setAttribute("y2", C.y);
      
      diagBD.setAttribute("x1", B.x); diagBD.setAttribute("y1", B.y);
      diagBD.setAttribute("x2", D.x); diagBD.setAttribute("y2", D.y);

      if (analysis.intersection) {
        diagIntersection.style.display = "";
        diagIntersection.setAttribute("cx", analysis.intersection.x);
        diagIntersection.setAttribute("cy", analysis.intersection.y);

        // 직교 표시 사각형
        if (analysis.properties.diagonalsPerpendicular) {
          diagPerpMark.style.display = "";
          diagPerpMark.setAttribute("d", drawPerpMark(analysis.intersection, A, B));
        } else {
          diagPerpMark.style.display = "none";
        }
      } else {
        diagIntersection.style.display = "none";
        diagPerpMark.style.display = "none";
      }

      // 대각선 길이 표시 (텍스트가 겹치지 않게 O 기준 2/5, 3/5 지점에 배치)
      if (state.showLengths) {
        const midAC = Geometry.Vec.mult(Geometry.Vec.add(A, C), 0.5);
        const textACPos = Geometry.Vec.add(midAC, { x: 0, y: -10 });
        labels.AC.setAttribute("x", textACPos.x);
        labels.AC.setAttribute("y", textACPos.y);
        labels.AC.textContent = `AC: ${Math.round(analysis.diagonals.AC)}`;

        const midBD = Geometry.Vec.mult(Geometry.Vec.add(B, D), 0.5);
        const textBDPos = Geometry.Vec.add(midBD, { x: 0, y: 15 });
        labels.BD.setAttribute("x", textBDPos.x);
        labels.BD.setAttribute("y", textBDPos.y);
        labels.BD.textContent = `BD: ${Math.round(analysis.diagonals.BD)}`;
      } else {
        labels.AC.textContent = "";
        labels.BD.textContent = "";
      }
    } else {
      diagAC.style.display = "none";
      diagBD.style.display = "none";
      diagIntersection.style.display = "none";
      diagPerpMark.style.display = "none";
      labels.AC.textContent = "";
      labels.BD.textContent = "";
    }

    // 7. 상단 도형 분류 배지 업데이트
    updateBadge(analysis.classification);

    // 8. 실시간 속성 텍스트 수치 업데이트
    updatePropertiesPanel(analysis);

    // 9. 관계 트리 하이라이트 업데이트
    updateHierarchyTree(analysis.hierarchy);

    // 10. 미션 성공 조건 실시간 검증
    verifyMission();
  }

  // --- 보조 그리기 및 UI 포맷팅 함수들 ---

  /**
   * 내각을 그리기 위한 SVG Arc path 문자열 생성
   */
  function drawAngleArc(pCurr, pPrev, pNext, ccw) {
    const r = 25; // 각도 부채꼴 반경
    const vNext = Geometry.Vec.normalize(Geometry.Vec.sub(pNext, pCurr));
    const vPrev = Geometry.Vec.normalize(Geometry.Vec.sub(pPrev, pCurr));
    
    const aNext = Math.atan2(vNext.y, vNext.x);
    let aPrev = Math.atan2(vPrev.y, vPrev.x);
    
    let diff = aPrev - aNext;
    if (diff < 0) diff += 2 * Math.PI;
    
    let sweep = 1;
    if (!ccw) {
      sweep = 0;
    }
    
    const deg = (diff * 180) / Math.PI;
    const isLarge = (!ccw ? (360 - deg) : deg) > 180 ? 1 : 0;
    
    const startX = pCurr.x + r * Math.cos(aNext);
    const startY = pCurr.y + r * Math.sin(aNext);
    const endX = pCurr.x + r * Math.cos(aPrev);
    const endY = pCurr.y + r * Math.sin(aPrev);
    
    return `M ${pCurr.x} ${pCurr.y} L ${startX} ${startY} A ${r} ${r} 0 ${isLarge} ${sweep} ${endX} ${endY} Z`;
  }

  /**
   * 대각선 수직(직교) 표시 꺾쇠 그리기
   */
  function drawPerpMark(P, A, B) {
    const d = 12;
    const u1 = Geometry.Vec.normalize(Geometry.Vec.sub(A, P));
    const u2 = Geometry.Vec.normalize(Geometry.Vec.sub(B, P));
    
    const p1 = Geometry.Vec.add(P, Geometry.Vec.mult(u1, d));
    const p2 = Geometry.Vec.add(p1, Geometry.Vec.mult(u2, d));
    const p3 = Geometry.Vec.add(P, Geometry.Vec.mult(u2, d));
    
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;
  }

  /**
   * 꼭짓점 순서가 CCW인지 판별 (Y축 방향 스크린 좌표 기준)
   */
  function isCCW(A, B, C, D) {
    const sum = (B.x - A.x) * (B.y + A.y) +
                (C.x - B.x) * (C.y + B.y) +
                (D.x - C.x) * (D.y + C.y) +
                (A.x - D.x) * (A.y + D.y);
    return sum < 0;
  }

  /**
   * 내각 텍스트 레이블 위치 설정 및 수치 업데이트
   */
  function updateAngleLabel(labelEl, pCurr, pPrev, pNext, valueDeg, ccw) {
    const vNext = Geometry.Vec.normalize(Geometry.Vec.sub(pNext, pCurr));
    const vPrev = Geometry.Vec.normalize(Geometry.Vec.sub(pPrev, pCurr));
    let bisector = Geometry.Vec.normalize(Geometry.Vec.add(vNext, vPrev));
    
    if (Geometry.Vec.len(bisector) < 0.1) {
      bisector = { x: -vNext.y, y: vNext.x };
    }
    
    // 볼록각 영역 밖(아웃사이드)으로 레이블 배치하기 위해 neg 방향 설정
    let dir = Geometry.Vec.mult(bisector, -1);
    
    // 점 A, B, C, D에 따른 미세 라벨 오프셋
    const textPos = Geometry.Vec.add(pCurr, Geometry.Vec.mult(dir, -40)); // 약 40px 내부 투영

    labelEl.setAttribute("x", textPos.x);
    labelEl.setAttribute("y", textPos.y + 4); // Y축 텍스트 폰트 높이 정렬 보정
    labelEl.textContent = `${Math.round(valueDeg)}°`;
  }

  /**
   * 변 길이 텍스트 레이블 위치 설정 및 수치 업데이트
   */
  function updateSideLabel(labelEl, p1, p2, center, length) {
    const mid = Geometry.Vec.mult(Geometry.Vec.add(p1, p2), 0.5);
    const v = Geometry.Vec.sub(p2, p1);
    const norm = Geometry.Vec.normalize({ x: -v.y, y: v.x });
    
    // 중심점 방향의 반대(도형의 바깥 방향)로 라벨 배치
    const toCenter = Geometry.Vec.sub(center, mid);
    const dot = Geometry.Vec.dot(norm, toCenter);
    const offsetDir = dot < 0 ? norm : Geometry.Vec.mult(norm, -1);
    
    const textPos = Geometry.Vec.add(mid, Geometry.Vec.mult(offsetDir, 18));
    
    labelEl.setAttribute("x", textPos.x);
    labelEl.setAttribute("y", textPos.y + 4);
    labelEl.textContent = Math.round(length);
  }

  /**
   * 평행 표시 기호(화살표) 업데이트
   */
  function updateParallelMarkers(props) {
    const [A, B, C, D] = state.vertices;
    
    // 초기화
    paraMarks.AB.style.display = "none";
    paraMarks.BC.style.display = "none";
    paraMarks.CD.style.display = "none";
    paraMarks.DA.style.display = "none";

    if (props.parallelAB_CD) {
      paraMarks.AB.style.display = "";
      paraMarks.CD.style.display = "";
      paraMarks.AB.setAttribute("d", getParallelArrowPath(A, B, 1));
      paraMarks.CD.setAttribute("d", getParallelArrowPath(D, C, 1)); // 마주보는 평행 방향 맞춤
    }

    if (props.parallelBC_DA) {
      paraMarks.BC.style.display = "";
      paraMarks.DA.style.display = "";
      
      const count = props.parallelAB_CD ? 2 : 1; // 기호 겹침 방지 (한 쌍만 평행하면 1개, 두 쌍 모두 평행하면 두 번째 쌍은 화살표 2개)
      paraMarks.BC.setAttribute("d", getParallelArrowPath(B, C, count));
      paraMarks.DA.setAttribute("d", getParallelArrowPath(A, D, count));
    }
  }

  function getParallelArrowPath(p1, p2, count) {
    const mid = Geometry.Vec.mult(Geometry.Vec.add(p1, p2), 0.5);
    const v = Geometry.Vec.normalize(Geometry.Vec.sub(p2, p1));
    const norm = { x: -v.y, y: v.x };
    
    const size = 5;
    if (count === 1) {
      const back = Geometry.Vec.add(mid, Geometry.Vec.mult(v, -size));
      const w1 = Geometry.Vec.add(back, Geometry.Vec.mult(norm, size * 0.7));
      const w2 = Geometry.Vec.add(back, Geometry.Vec.mult(norm, -size * 0.7));
      return `M ${w1.x} ${w1.y} L ${mid.x} ${mid.y} L ${w2.x} ${w2.y}`;
    } else {
      const spacing = 4;
      const mid1 = Geometry.Vec.add(mid, Geometry.Vec.mult(v, -spacing));
      const mid2 = Geometry.Vec.add(mid, Geometry.Vec.mult(v, spacing));
      
      const back1 = Geometry.Vec.add(mid1, Geometry.Vec.mult(v, -size));
      const w1_1 = Geometry.Vec.add(back1, Geometry.Vec.mult(norm, size * 0.7));
      const w1_2 = Geometry.Vec.add(back1, Geometry.Vec.mult(norm, -size * 0.7));
      
      const back2 = Geometry.Vec.add(mid2, Geometry.Vec.mult(v, -size));
      const w2_1 = Geometry.Vec.add(back2, Geometry.Vec.mult(norm, size * 0.7));
      const w2_2 = Geometry.Vec.add(back2, Geometry.Vec.mult(norm, -size * 0.7));
      
      return `M ${w1_1.x} ${w1_1.y} L ${mid1.x} ${mid1.y} L ${w1_2.x} ${w1_2.y} ` +
             `M ${w2_1.x} ${w2_1.y} L ${mid2.x} ${mid2.y} L ${w2_2.x} ${w2_2.y}`;
    }
  }

  /**
   * 길이 일치 표시 빗금 기호(Tick) 업데이트
   */
  function updateTickMarks(props) {
    const [A, B, C, D] = state.vertices;
    
    // 초기화
    tickMarks.AB.style.display = "none";
    tickMarks.BC.style.display = "none";
    tickMarks.CD.style.display = "none";
    tickMarks.DA.style.display = "none";

    if (props.equalAllSides) {
      tickMarks.AB.style.display = "";
      tickMarks.BC.style.display = "";
      tickMarks.CD.style.display = "";
      tickMarks.DA.style.display = "";
      
      tickMarks.AB.setAttribute("d", getTickPath(A, B, 1));
      tickMarks.BC.setAttribute("d", getTickPath(B, C, 1));
      tickMarks.CD.setAttribute("d", getTickPath(C, D, 1));
      tickMarks.DA.setAttribute("d", getTickPath(D, A, 1));
    } else {
      if (props.equalAB_CD) {
        tickMarks.AB.style.display = "";
        tickMarks.CD.style.display = "";
        tickMarks.AB.setAttribute("d", getTickPath(A, B, 1));
        tickMarks.CD.setAttribute("d", getTickPath(C, D, 1));
      }
      if (props.equalBC_DA) {
        tickMarks.BC.style.display = "";
        tickMarks.DA.style.display = "";
        const count = props.equalAB_CD ? 2 : 1; // 기호가 서로 다름을 표현
        tickMarks.BC.setAttribute("d", getTickPath(B, C, count));
        tickMarks.DA.setAttribute("d", getTickPath(D, A, count));
      }
    }
  }

  function getTickPath(p1, p2, count) {
    const mid = Geometry.Vec.mult(Geometry.Vec.add(p1, p2), 0.5);
    const v = Geometry.Vec.normalize(Geometry.Vec.sub(p2, p1));
    const norm = { x: -v.y, y: v.x };
    
    const len = 5;
    if (count === 1) {
      const start = Geometry.Vec.add(mid, Geometry.Vec.mult(norm, -len));
      const end = Geometry.Vec.add(mid, Geometry.Vec.mult(norm, len));
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    } else {
      const spacing = 3;
      const mid1 = Geometry.Vec.add(mid, Geometry.Vec.mult(v, -spacing));
      const mid2 = Geometry.Vec.add(mid, Geometry.Vec.mult(v, spacing));
      
      const start1 = Geometry.Vec.add(mid1, Geometry.Vec.mult(norm, -len));
      const end1 = Geometry.Vec.add(mid1, Geometry.Vec.mult(norm, len));
      
      const start2 = Geometry.Vec.add(mid2, Geometry.Vec.mult(norm, -len));
      const end2 = Geometry.Vec.add(mid2, Geometry.Vec.mult(norm, len));
      
      return `M ${start1.x} ${start1.y} L ${end1.x} ${end1.y} M ${start2.x} ${start2.y} L ${end2.x} ${end2.y}`;
    }
  }

  /**
   * 상단 분류 배지 색상 및 명칭 업데이트
   */
  function updateBadge(name) {
    badgeText.textContent = name;
    
    // 배지 스타일 클래스 세팅
    let colorVar = "--color-quad";
    if (name === "정사각형") colorVar = "--color-square";
    else if (name === "직사각형") colorVar = "--color-rect";
    else if (name === "마름모") colorVar = "--color-rhom";
    else if (name === "평행사변형") colorVar = "--color-para";
    else if (name === "등변사다리꼴") colorVar = "--color-iso-trap";
    else if (name === "사다리꼴") colorVar = "--color-trap";

    badgeDot.style.backgroundColor = `var(${colorVar})`;
    shapeBadge.style.borderColor = `var(${colorVar})`;
  }

  /**
   * 실시간 정보 수치 텍스트 업데이트
   */
  function updatePropertiesPanel(analysis) {
    valAB.textContent = `${Math.round(analysis.lengths.AB)} px`;
    valBC.textContent = `${Math.round(analysis.lengths.BC)} px`;
    valCD.textContent = `${Math.round(analysis.lengths.CD)} px`;
    valDA.textContent = `${Math.round(analysis.lengths.DA)} px`;

    valAngA.textContent = `${Math.round(analysis.angles.A)}°`;
    valAngB.textContent = `${Math.round(analysis.angles.B)}°`;
    valAngC.textContent = `${Math.round(analysis.angles.C)}°`;
    valAngD.textContent = `${Math.round(analysis.angles.D)}°`;

    valDiagLens.textContent = `AC: ${Math.round(analysis.diagonals.AC)} px / BD: ${Math.round(analysis.diagonals.BD)} px`;
    valDiagPerp.textContent = analysis.properties.diagonalsPerpendicular ? "예 (90° 수직 직교)" : "아니오";
    valDiagBisect.textContent = analysis.properties.diagonalsBisect ? "예 (서로를 이등분)" : "아니오";

    // 만족 중인 성질 성취기준 뷰어 동적 추가
    satisfiedList.innerHTML = "";
    
    const propMeta = [
      { key: "convex", label: "볼록 사각형 (도형이 겹치지 않음)", yesDesc: "볼록함", noDesc: "오목하거나 꼬임" },
      { key: "parallelAB_CD", label: "마주보는 한 쌍 대변 평행 (AB ∥ CD)", yesDesc: "평행", noDesc: "평행하지 않음" },
      { key: "parallelBC_DA", label: "마주보는 다른 한 쌍 대변 평행 (BC ∥ DA)", yesDesc: "평행", noDesc: "평행하지 않음" },
      { key: "equalAB_CD", label: "대변의 길이 같음 (AB = CD)", yesDesc: "같음", noDesc: "다름" },
      { key: "equalBC_DA", label: "대변의 길이 같음 (BC = DA)", yesDesc: "같음", noDesc: "다름" },
      { key: "equalAllSides", label: "네 변의 길이 같음 (AB=BC=CD=DA)", yesDesc: "모두 같음 (마름모 조건)", noDesc: "다름" },
      { key: "equalAngleA_C", label: "대각의 크기 같음 (∠A = ∠C)", yesDesc: "같음", noDesc: "다름" },
      { key: "equalAngleB_D", label: "대각의 크기 같음 (∠B = ∠D)", yesDesc: "같음", noDesc: "다름" },
      { key: "allAnglesRight", label: "네 각이 모두 90도 (∠A=∠B=∠C=∠D=90°)", yesDesc: "모두 직각 (직사각형 조건)", noDesc: "아님" },
      { key: "diagonalsEqual", label: "대각선의 길이 같음 (AC = BD)", yesDesc: "길이 같음", noDesc: "다름" },
      { key: "diagonalsPerpendicular", label: "대각선의 수직 교차 (AC ⊥ BD)", yesDesc: "수직 직교", noDesc: "수직 아님" },
      { key: "diagonalsBisect", label: "대각선의 상호 이등분", yesDesc: "서로를 이등분함", noDesc: "이등분하지 않음" }
    ];

    propMeta.forEach(prop => {
      const isYes = analysis.properties[prop.key];
      const item = document.createElement("div");
      item.className = `property-item ${isYes ? "yes" : "no"}`;
      
      const icon = document.createElement("span");
      icon.className = "icon";
      icon.textContent = isYes ? "🟢" : "⚪";
      
      const text = document.createElement("span");
      text.style.flex = "1";
      text.innerHTML = `<strong>${prop.label}</strong>: ${isYes ? prop.yesDesc : prop.noDesc}`;

      item.appendChild(icon);
      item.appendChild(text);
      satisfiedList.appendChild(item);
    });
  }

  /**
   * 포함 관계 다이어그램 실시간 하이라이트
   */
  function updateHierarchyTree(hierarchy) {
    document.querySelectorAll(".tree-node").forEach(node => {
      const nodeName = node.dataset.node;
      if (hierarchy.includes(nodeName)) {
        node.classList.add("highlighted");
      } else {
        node.classList.remove("highlighted");
      }
    });
  }

  // --- 미션(도전 과제) 제어 함수군 ---

  function setupMission() {
    state.missionPassed = false;
    successLayer.style.display = "none";

    const cur = missions[state.currentMissionIdx];
    mBadge.textContent = cur.badge;
    mTitle.textContent = cur.title;
    mDesc.textContent = cur.desc;

    // 미션 닷 활성화
    document.querySelectorAll(".step-dot").forEach((dot, idx) => {
      dot.classList.toggle("active", idx === state.currentMissionIdx);
    });

    // 교실 내 나의 진행도 상태 업데이트
    const myProgressFill = document.getElementById("my-progress-fill");
    const myProgressText = document.getElementById("my-progress-text");
    if (myProgressFill && myProgressText) {
      const percent = (state.currentMissionIdx) * 20;
      myProgressFill.style.width = `${percent + 20}%`;
      myProgressText.textContent = `${state.currentMissionIdx + 1}단계 진행 중`;
    }

    verifyMission();
  }

  function verifyMission() {
    if (state.draggedIdx !== null) return; // 드래그 중에는 성공 판정 보류
    if (state.missionPassed) return; // 이미 완료된 미션 중복 연출 방지

    const cur = missions[state.currentMissionIdx];
    if (!state.analysis) return;

    const checklistData = cur.checklist(state.analysis);
    
    // 체크리스트 렌더링
    mChecklist.innerHTML = "";
    let allDone = true;

    checklistData.forEach(item => {
      const chk = document.createElement("div");
      chk.className = `chk-item ${item.done ? "success" : "pending"}`;
      
      const icon = document.createElement("span");
      icon.className = "chk-icon";
      
      const text = document.createElement("span");
      text.className = "chk-text";
      text.textContent = item.text;
      
      chk.appendChild(icon);
      chk.appendChild(text);
      mChecklist.appendChild(chk);

      if (!item.done) allDone = false;
    });

    // 최종 미션 성공 조건 판정
    if (allDone && cur.check(state.analysis)) {
      state.missionPassed = true;
      
      // 미션 닷에 완료 표시 추가
      const activeDot = document.querySelector(`.step-dot[data-step="${state.currentMissionIdx + 1}"]`);
      if (activeDot) activeDot.classList.add("completed");

      // 성공 레이어 오버레이
      successDesc.textContent = cur.successDesc;
      successLayer.style.display = "flex";

      // 만약 최종 5개 다 완료하면 교사용 리포트도 100% 완료로 업데이트
      if (state.currentMissionIdx === 4) {
        const myProgressFill = document.getElementById("my-progress-fill");
        const myProgressText = document.getElementById("my-progress-text");
        if (myProgressFill && myProgressText) {
          myProgressFill.style.width = "100%";
          myProgressText.textContent = "완료 (5/5)";
          myProgressText.style.color = "var(--accent-success)";
        }
      }
    }
  }

  // --- 초기화 동작 ---
  setupMission();
  updateDrawing();
});
