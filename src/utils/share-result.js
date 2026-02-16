import { formatSeconds } from './helpers.js';

function difficultyLabel(difficulty) {
  if (difficulty === 'easy') return '쉬움';
  if (difficulty === 'hard') return '어려움';
  return '보통';
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitText(ctx, text, maxWidth, defaultSize, minSize = 28, weight = '700') {
  let fontSize = defaultSize;
  while (fontSize > minSize) {
    ctx.font = `${weight} ${fontSize}px sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
  return fontSize;
}

function drawPreviewOverlay(ctx, gameId, x, y, w, h) {
  fillRoundedRect(ctx, x, y, w, h, 28, 'rgba(25, 23, 22, 0.45)');

  const p = 24;
  if (gameId === 'card-match') {
    const cols = 4;
    const rows = 2;
    const gap = 12;
    const cw = Math.floor((w - p * 2 - gap * (cols - 1)) / cols);
    const ch = Math.floor((h - p * 2 - gap * (rows - 1)) / rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x + p + c * (cw + gap);
        const cy = y + p + r * (ch + gap);
        fillRoundedRect(ctx, cx, cy, cw, ch, 14, c === 1 || c === 5 ? '#FFFFFF' : '#B7DFF6');
        ctx.fillStyle = c === 1 || c === 5 ? '#3D3D3D' : '#FFFFFF';
        ctx.font = '700 34px sans-serif';
        ctx.fillText(c === 1 || c === 5 ? '🍓' : '?', cx + cw / 2 - 12, cy + ch / 2 + 12);
      }
    }
    return;
  }

  if (gameId === 'number-sequence') {
    fillRoundedRect(ctx, x + p, y + 24, w - p * 2, 92, 16, '#FFFFFF');
    ctx.fillStyle = '#3D3D3D';
    ctx.font = '700 38px sans-serif';
    ctx.fillText('3  →  6  →  ?  →  12  →  15', x + p + 20, y + 84);
    fillRoundedRect(ctx, x + p, y + 140, w - p * 2, 110, 16, '#F6FAFF');
    ctx.fillStyle = '#3D3D3D';
    ctx.font = '700 34px sans-serif';
    ctx.fillText('선택지: 7 / 8 / 9 / 10', x + p + 24, y + 206);
    return;
  }

  if (gameId === 'color-find') {
    const gridX = x + p + 10;
    const gridY = y + 24;
    const gap = 10;
    const size = 52;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        fillRoundedRect(ctx, gridX + c * (size + gap), gridY + r * (size + gap), size, size, 10, r === 1 && c === 4 ? '#69B7E8' : '#79C4EC');
      }
    }
    fillRoundedRect(ctx, x + p, y + 258, w - p * 2, 54, 14, '#FFFFFF');
    ctx.fillStyle = '#3D3D3D';
    ctx.font = '700 30px sans-serif';
    ctx.fillText('다른 색 하나를 찾아보세요', x + p + 20, y + 294);
    return;
  }

  if (gameId === 'math-challenge') {
    fillRoundedRect(ctx, x + p, y + 24, w - p * 2, 96, 16, '#FFFFFF');
    ctx.fillStyle = '#3D3D3D';
    ctx.font = '800 46px sans-serif';
    ctx.fillText('18 + 27 = ?', x + p + 28, y + 88);
    fillRoundedRect(ctx, x + p, y + 140, w - p * 2, 170, 16, '#F7F9FF');
    ctx.fillStyle = '#3D3D3D';
    ctx.font = '700 30px sans-serif';
    ctx.fillText('1 2 3   4 5 6   7 8 9', x + p + 22, y + 204);
    ctx.fillText('지우기   0   확인', x + p + 22, y + 258);
  }
}

function deriveRecords({ gameId, timeSeconds, details, metrics }) {
  const moveCount = Number.isInteger(metrics?.move_count) ? metrics.move_count : null;
  const attemptCount = Number.isInteger(metrics?.attempt_count) ? metrics.attempt_count : null;
  const wrongCount = Number.isInteger(metrics?.wrong_count) ? metrics.wrong_count : null;
  const detailLine = details?.[0] || '';

  if (gameId === 'card-match' && Number.isInteger(moveCount)) {
    return {
      primaryLabel: '성공 기록',
      primaryValue: `${moveCount}회만에 성공!`,
      secondaryLabel: '완료 시간',
      secondaryValue: formatSeconds(timeSeconds),
    };
  }

  return {
    primaryLabel: '완료 시간',
    primaryValue: formatSeconds(timeSeconds),
    secondaryLabel: '시도 횟수',
    secondaryValue: attemptCount !== null
      ? `${attemptCount}회`
      : wrongCount !== null
        ? `${wrongCount}회`
        : detailLine || '-',
  };
}

async function buildResultImage({
  gameId,
  gameTitle,
  thumbnail,
  difficulty,
  timeSeconds,
  details,
  metrics = {},
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, '#FFF4E8');
  grad.addColorStop(1, '#FFE2CA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  fillRoundedRect(ctx, 52, 56, 976, 1238, 36, '#FFFFFF');
  fillRoundedRect(ctx, 88, 94, 904, 170, 28, '#FFF3EA');
  ctx.fillStyle = '#FF8B6A';
  ctx.font = '900 64px sans-serif';
  ctx.fillText('모리모리', 124, 168);
  ctx.fillStyle = '#3D3D3D';
  ctx.font = '800 46px sans-serif';
  ctx.fillText('두뇌훈련을 위한 모리모리', 124, 232);

  const previewX = 88;
  const previewY = 292;
  const previewW = 904;
  const previewH = 370;
  fillRoundedRect(ctx, previewX, previewY, previewW, previewH, 28, '#F3E6D9');
  try {
    const imageUrl = new URL(thumbnail, window.location.origin).toString();
    const img = await loadImage(imageUrl);
    roundedRect(ctx, previewX, previewY, previewW, previewH, 28);
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, previewX, previewY, previewW, previewH);
    ctx.restore();
  } catch {
    // keep placeholder
  }
  const shouldUseExampleOverlay = gameId !== 'math-challenge' && gameId !== 'number-sequence';
  if (shouldUseExampleOverlay) {
    drawPreviewOverlay(ctx, gameId, previewX, previewY + 30, previewW, 320);
  }

  const titleSize = fitText(ctx, gameTitle, 700, 66, 44, '900');
  ctx.fillStyle = '#5B4A3B';
  ctx.font = `900 ${titleSize}px sans-serif`;
  ctx.fillText(gameTitle, 110, 760);

  fillRoundedRect(ctx, 760, 700, 230, 74, 20, '#FFE8D6');
  ctx.fillStyle = '#A15B3A';
  ctx.font = '700 36px sans-serif';
  ctx.fillText(difficultyLabel(difficulty), 816, 748);

  const { primaryLabel, primaryValue, secondaryLabel, secondaryValue } = deriveRecords({
    gameId, timeSeconds, details, metrics,
  });

  fillRoundedRect(ctx, 88, 820, 904, 198, 24, '#FFF8F2');
  ctx.fillStyle = '#8A6A57';
  ctx.font = '700 34px sans-serif';
  ctx.fillText(primaryLabel, 120, 880);
  const primarySize = fitText(ctx, primaryValue, 840, 88, 46, '900');
  ctx.fillStyle = '#2E2A27';
  ctx.font = `900 ${primarySize}px sans-serif`;
  ctx.fillText(primaryValue, 120, 972);

  fillRoundedRect(ctx, 88, 1042, 904, 170, 24, '#F7FAFF');
  ctx.fillStyle = '#5F7696';
  ctx.font = '700 32px sans-serif';
  ctx.fillText(secondaryLabel, 120, 1100);
  const secondarySize = fitText(ctx, secondaryValue, 840, 74, 42, '900');
  ctx.fillStyle = '#2F3F56';
  ctx.font = `900 ${secondarySize}px sans-serif`;
  ctx.fillText(secondaryValue, 120, 1184);

  ctx.fillStyle = '#A08E7F';
  ctx.font = '600 30px sans-serif';
  ctx.fillText('지금 기록을 공유하고 다음 도전을 시작해보세요', 110, 1264);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function shareGameResult({
  gameId,
  gameTitle,
  difficulty,
  timeSeconds,
  thumbnail,
  details,
  metrics = {},
}) {
  const url = `${window.location.origin}${window.location.pathname}#/play/${gameId}/${difficulty}`;

  if (!navigator.share) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
    return { shared: false, fallback: true, sharePayload: 'url_clipboard' };
  }

  const imageBlob = await buildResultImage({
    gameId,
    gameTitle,
    thumbnail,
    difficulty,
    timeSeconds,
    details,
    metrics,
  });
  const imageFile = imageBlob ? new File([imageBlob], 'morimori-record.png', { type: 'image/png' }) : null;

  if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
    await navigator.share({ url, files: [imageFile] });
    return { shared: true, fallback: false, sharePayload: 'image_url' };
  } else {
    await navigator.share({ url });
    return { shared: true, fallback: false, sharePayload: 'url_only' };
  }
}
