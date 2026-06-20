// geometry.js - 사각형 성질 탐구 수학 및 기하 연산 모듈

// 기본 오차 범위 설정 (픽셀 및 각도 단위)
const EPSILON_PARALLEL = 0.05; // 약 3도 이내 평행 허용
const EPSILON_PERPENDICULAR = 0.05; // 약 3도 이내 수직 허용
const EPSILON_LENGTH = 6.0; // 6픽셀 이내 길이 차이 허용
const EPSILON_ANGLE = 3.0; // 3도 이내 각도 차이 허용

// 2D 벡터 유틸리티
const Vec = {
  dist(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  },
  add(p1, p2) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
  },
  sub(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
  },
  mult(p, s) {
    return { x: p.x * s, y: p.y * s };
  },
  dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  },
  cross(v1, v2) {
    return v1.x * v2.y - v1.y * v2.x;
  },
  len(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },
  normalize(v) {
    const l = Vec.len(v);
    return l === 0 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
  },
  angle(v) {
    return Math.atan2(v.y, v.x);
  },
  rotate(v, rad) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  }
};

/**
 * 사각형의 꼭짓점 순서가 시계방향(CW)인지 반시계방향(CCW)인지 판별
 * Y축이 아래로 향하는 스크린 좌표계 기준
 */
function isCCW(A, B, C, D) {
  const sum = (B.x - A.x) * (B.y + A.y) +
              (C.x - B.x) * (C.y + B.y) +
              (D.x - C.x) * (D.y + C.y) +
              (A.x - D.x) * (A.y + D.y);
  return sum < 0;
}

/**
 * 사각형의 내각 계산 (도 단위)
 * 항상 사각형 안쪽을 향하는 내각을 반환합니다.
 */
function calculateInteriorAngles(A, B, C, D) {
  const pts = [A, B, C, D];
  const ccw = isCCW(A, B, C, D);
  const angles = [];

  for (let i = 0; i < 4; i++) {
    const prev = pts[(i + 3) % 4];
    const curr = pts[i];
    const next = pts[(i + 1) % 4];

    const vPrev = Vec.sub(prev, curr);
    const vNext = Vec.sub(next, curr);

    let aPrev = Math.atan2(vPrev.y, vPrev.x);
    let aNext = Math.atan2(vNext.y, vNext.x);

    let diff = aPrev - aNext;
    if (diff < 0) diff += 2 * Math.PI;

    // CCW 상태와 좌표계에 맞춰 내각 조정
    let deg = (diff * 180) / Math.PI;
    if (!ccw) {
      deg = 360 - deg;
    }
    angles.push(deg);
  }

  return {
    A: angles[0],
    B: angles[1],
    C: angles[2],
    D: angles[3]
  };
}

/**
 * 두 대각선 AC와 BD의 교점 구하기
 */
function getDiagonalIntersection(A, B, C, D) {
  const det = (C.x - A.x) * (D.y - B.y) - (C.y - A.y) * (D.x - B.x);
  if (Math.abs(det) < 1e-5) return null; // 평행할 리 없음 (사각형인 한)

  const t = ((B.x - A.x) * (D.y - B.y) - (B.y - A.y) * (D.x - B.x)) / det;
  return {
    x: A.x + t * (C.x - A.x),
    y: A.y + t * (C.y - A.y)
  };
}

/**
 * 볼록(Convex) 사각형 여부 확인
 * 모든 내각이 180도 미만이고 교점이 대각선 선분 내에 존재하는지 검사
 */
function isConvexQuadrilateral(A, B, C, D) {
  const angles = calculateInteriorAngles(A, B, C, D);
  if (angles.A >= 180 || angles.B >= 180 || angles.C >= 180 || angles.D >= 180) {
    return false;
  }
  
  // 대각선 교점이 각 대각선 선분 내부(t, u 가 0~1 사이)에 있는지 확인
  const det = (C.x - A.x) * (D.y - B.y) - (C.y - A.y) * (D.x - B.x);
  if (Math.abs(det) < 1e-2) return false;

  const t = ((B.x - A.x) * (D.y - B.y) - (B.y - A.y) * (D.x - B.x)) / det;
  const u = ((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x)) / det;

  return (t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99);
}

/**
 * 사각형 정보 및 성질 판정
 */
function analyzeQuadrilateral(A, B, C, D) {
  const ab = Vec.dist(A, B);
  const bc = Vec.dist(B, C);
  const cd = Vec.dist(C, D);
  const da = Vec.dist(D, A);

  const vAB = Vec.sub(B, A);
  const vBC = Vec.sub(C, B);
  const vCD = Vec.sub(D, C);
  const vDA = Vec.sub(A, D);

  // 평행 여부 판정 (외적이 0에 가까운지)
  const normAB = Vec.normalize(vAB);
  const normCD = Vec.normalize(Vec.sub(C, D)); // 방향을 맞추기 위해 D->C 벡터 이용
  const crossAB_CD = Math.abs(Vec.cross(normAB, normCD));
  const isAB_parallel_CD = crossAB_CD < EPSILON_PARALLEL;

  const normBC = Vec.normalize(vBC);
  const normAD = Vec.normalize(Vec.sub(A, D));
  const crossBC_DA = Math.abs(Vec.cross(normBC, normAD));
  const isBC_parallel_DA = crossBC_DA < EPSILON_PARALLEL;

  // 내각
  const angles = calculateInteriorAngles(A, B, C, D);

  // 대각선 정보
  const ac = Vec.dist(A, C);
  const bd = Vec.dist(B, D);
  const P = getDiagonalIntersection(A, B, C, D);

  let isDiagonalsPerpendicular = false;
  let isDiagonalsBisectEachOther = false;
  let pDistA = 0, pDistC = 0, pDistB = 0, pDistD = 0;

  if (P) {
    pDistA = Vec.dist(A, P);
    pDistC = Vec.dist(C, P);
    pDistB = Vec.dist(B, P);
    pDistD = Vec.dist(D, P);

    // 수직 판정
    const vAC = Vec.sub(C, A);
    const vBD = Vec.sub(D, B);
    const dotAC_BD = Math.abs(Vec.dot(Vec.normalize(vAC), Vec.normalize(vBD)));
    isDiagonalsPerpendicular = dotAC_BD < EPSILON_PERPENDICULAR;

    // 이등분 판정
    const isAC_bisected = Math.abs(pDistA - pDistC) < EPSILON_LENGTH;
    const isBD_bisected = Math.abs(pDistB - pDistD) < EPSILON_LENGTH;
    isDiagonalsBisectEachOther = isAC_bisected && isBD_bisected;
  }

  // 볼록성 검사
  const convex = isConvexQuadrilateral(A, B, C, D);

  // 성질 만족 여부 객체
  const properties = {
    convex,
    // 대변 평행
    parallelAB_CD: isAB_parallel_CD,
    parallelBC_DA: isBC_parallel_DA,
    parallelPairs: (isAB_parallel_CD ? 1 : 0) + (isBC_parallel_DA ? 1 : 0),

    // 변의 길이 같음
    equalAB_CD: Math.abs(ab - cd) < EPSILON_LENGTH,
    equalBC_DA: Math.abs(bc - da) < EPSILON_LENGTH,
    equalAllSides: Math.abs(ab - bc) < EPSILON_LENGTH &&
                   Math.abs(bc - cd) < EPSILON_LENGTH &&
                   Math.abs(cd - da) < EPSILON_LENGTH &&
                   Math.abs(da - ab) < EPSILON_LENGTH,

    // 대각 크기 같음
    equalAngleA_C: Math.abs(angles.A - angles.C) < EPSILON_ANGLE,
    equalAngleB_D: Math.abs(angles.B - angles.D) < EPSILON_ANGLE,
    allAnglesRight: Math.abs(angles.A - 90) < EPSILON_ANGLE &&
                     Math.abs(angles.B - 90) < EPSILON_ANGLE &&
                     Math.abs(angles.C - 90) < EPSILON_ANGLE &&
                     Math.abs(angles.D - 90) < EPSILON_ANGLE,

    // 대각선 성질
    diagonalsEqual: Math.abs(ac - bd) < EPSILON_LENGTH,
    diagonalsPerpendicular: isDiagonalsPerpendicular,
    diagonalsBisect: isDiagonalsBisectEachOther
  };

  // 도형 분류 결정
  let classification = "일반 사각형";
  let hierarchy = ["quadrilateral"];

  if (convex) {
    const isParallelogram = (properties.parallelPairs === 2) || 
                            (properties.equalAB_CD && properties.equalBC_DA) ||
                            (properties.diagonalsBisect);

    const isRectangle = isParallelogram && (properties.allAnglesRight || properties.diagonalsEqual);
    const isRhombus = isParallelogram && (properties.equalAllSides || properties.diagonalsPerpendicular);
    
    if (isParallelogram) {
      hierarchy.push("parallelogram");
      if (isRectangle && isRhombus) {
        classification = "정사각형";
        hierarchy.push("rectangle", "rhombus", "square");
      } else if (isRectangle) {
        classification = "직사각형";
        hierarchy.push("rectangle");
      } else if (isRhombus) {
        classification = "마름모";
        hierarchy.push("rhombus");
      } else {
        classification = "평행사변형";
      }
    } else {
      // 사다리꼴 판정 (최소 한 쌍 평행)
      const isTrapezoid = properties.parallelPairs >= 1;
      if (isTrapezoid) {
        hierarchy.push("trapezoid");
        
        const isIsoscelesTrapezoid = properties.diagonalsEqual || 
                                     (isAB_parallel_CD && properties.equalBC_DA) || 
                                     (isBC_parallel_DA && properties.equalAB_CD);
                                     
        if (isIsoscelesTrapezoid) {
          classification = "등변사다리꼴";
          hierarchy.push("isosceles_trapezoid");
        } else {
          classification = "사다리꼴";
        }
      }
    }
  } else {
    classification = "볼록하지 않은 사각형";
  }

  return {
    lengths: { AB: ab, BC: bc, CD: cd, DA: da },
    angles,
    diagonals: { AC: ac, BD: bd, perpendicular: isDiagonalsPerpendicular, bisect: isDiagonalsBisectEachOther },
    properties,
    classification,
    hierarchy,
    intersection: P
  };
}

/**
 * 제약 조건 고정 투영 (Constraint Projection)
 */
function projectToConstraint(A, B, C, D, lockType, activeIndex) {
  const pts = [ { ...A }, { ...B }, { ...C }, { ...D } ];

  if (!lockType || lockType === "none") return pts;

  // 1. 평행사변형 잠금
  if (lockType === "parallelogram") {
    if (activeIndex === 0) {
      pts[3] = Vec.sub(Vec.add(pts[0], pts[2]), pts[1]);
    } else if (activeIndex === 1) {
      pts[0] = Vec.sub(Vec.add(pts[1], pts[3]), pts[2]);
    } else if (activeIndex === 2) {
      pts[3] = Vec.sub(Vec.add(pts[0], pts[2]), pts[1]);
    } else if (activeIndex === 3) {
      pts[2] = Vec.sub(Vec.add(pts[1], pts[3]), pts[0]);
    }
    return pts;
  }

  // 2. 직사각형 잠금
  if (lockType === "rectangle") {
    let pivot, p1, p2, p3;
    if (activeIndex === 0) {
      pivot = 1; p1 = 0; p2 = 2; p3 = 3;
    } else if (activeIndex === 1) {
      pivot = 0; p1 = 1; p2 = 3; p3 = 2;
    } else if (activeIndex === 2) {
      pivot = 1; p1 = 2; p2 = 0; p3 = 3;
    } else {
      pivot = 0; p1 = 3; p2 = 1; p3 = 2;
    }

    const vPivotToP2 = Vec.sub(pts[p2], pts[pivot]);
    const len2 = Vec.len(vPivotToP2);
    if (len2 > 5) {
      const dir2 = Vec.normalize(vPivotToP2);
      const dirOrth = { x: -dir2.y, y: dir2.x };
      const vPivotToP1 = Vec.sub(pts[p1], pts[pivot]);
      const projLen = Vec.dot(vPivotToP1, dirOrth);
      
      pts[p1] = Vec.add(pts[pivot], Vec.mult(dirOrth, projLen));
      pts[p3] = Vec.sub(Vec.add(pts[p1], pts[p2]), pts[pivot]);
    }
    return pts;
  }

  // 3. 마름모 잠금
  if (lockType === "rhombus") {
    const O = {
      x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
      y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
    };

    let vAC = Vec.sub(pts[2], pts[0]);
    let vBD = Vec.sub(pts[3], pts[1]);

    if (Vec.len(vAC) < 5) vAC = { x: 100, y: 0 };
    if (Vec.len(vBD) < 5) vBD = { x: 0, y: 100 };

    const dirAC = Vec.normalize(vAC);
    const dirBD_target = { x: -dirAC.y, y: dirAC.x };
    const lenBD = Vec.dot(vBD, dirBD_target);

    vBD = Vec.mult(dirBD_target, lenBD);

    pts[0] = Vec.sub(O, Vec.mult(vAC, 0.5));
    pts[2] = Vec.add(O, Vec.mult(vAC, 0.5));
    pts[1] = Vec.sub(O, Vec.mult(vBD, 0.5));
    pts[3] = Vec.add(O, Vec.mult(vBD, 0.5));

    return pts;
  }

  // 4. 정사각형 잠금
  if (lockType === "square") {
    const O = {
      x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
      y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
    };

    let vAC = Vec.sub(pts[2], pts[0]);
    let lenAC = Vec.len(vAC);
    if (lenAC < 5) lenAC = 100;

    const dirAC = Vec.normalize(vAC);
    const dirBD = { x: -dirAC.y, y: dirAC.x };
    const vBD = Vec.mult(dirBD, lenAC);

    pts[0] = Vec.sub(O, Vec.mult(dirAC, lenAC * 0.5));
    pts[2] = Vec.add(O, Vec.mult(dirAC, lenAC * 0.5));
    pts[1] = Vec.sub(O, Vec.mult(vBD, 0.5));
    pts[3] = Vec.add(O, Vec.mult(vBD, 0.5));

    return pts;
  }

  // 5. 사다리꼴 잠금
  if (lockType === "trapezoid") {
    const vAB = Vec.sub(pts[1], pts[0]);
    const vCD = Vec.sub(pts[2], pts[3]);
    const crossAB_CD = Math.abs(Vec.cross(Vec.normalize(vAB), Vec.normalize(vCD)));

    const vBC = Vec.sub(pts[2], pts[1]);
    const vDA = Vec.sub(pts[0], pts[3]);
    const crossBC_DA = Math.abs(Vec.cross(Vec.normalize(vBC), Vec.normalize(vDA)));

    if (crossAB_CD < crossBC_DA) {
      const dirAB = Vec.normalize(vAB);
      const lenCD = Vec.dist(pts[2], pts[3]);
      
      if (activeIndex === 2) {
        pts[3] = Vec.sub(pts[2], Vec.mult(dirAB, lenCD));
      } else {
        pts[2] = Vec.add(pts[3], Vec.mult(dirAB, lenCD));
      }
    } else {
      const dirBC = Vec.normalize(vBC);
      const lenDA = Vec.dist(pts[0], pts[3]);

      if (activeIndex === 0) {
        pts[3] = Vec.sub(pts[0], Vec.mult(dirBC, lenDA));
      } else {
        pts[0] = Vec.add(pts[3], Vec.mult(dirBC, lenDA));
      }
    }
    return pts;
  }

  // 6. 등변사다리꼴 잠금
  if (lockType === "isosceles_trapezoid") {
    const centerAB = Vec.mult(Vec.add(pts[0], pts[1]), 0.5);
    const centerCD = Vec.mult(Vec.add(pts[2], pts[3]), 0.5);
    
    const axis = Vec.sub(centerCD, centerAB);
    if (Vec.len(axis) < 5) return pts;
    
    const axisDir = Vec.normalize(axis);
    const perpDir = { x: -axisDir.y, y: axisDir.x };
    
    const wAB = Math.abs(Vec.dot(Vec.sub(pts[1], centerAB), perpDir));
    const wCD = Math.abs(Vec.dot(Vec.sub(pts[2], centerCD), perpDir));
    
    pts[0] = Vec.sub(centerAB, Vec.mult(perpDir, wAB));
    pts[1] = Vec.add(centerAB, Vec.mult(perpDir, wAB));
    pts[3] = Vec.sub(centerCD, Vec.mult(perpDir, wCD));
    pts[2] = Vec.add(centerCD, Vec.mult(perpDir, wCD));
    
    return pts;
  }

  return pts;
}

// 브라우저 전역 객체로 노출
window.Geometry = { Vec, analyzeQuadrilateral, projectToConstraint };
