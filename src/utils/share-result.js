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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((ln, idx) => {
    ctx.fillText(ln, x, y + idx * lineHeight);
  });
}

async function buildResultImage({ gameTitle, thumbnail, difficulty, timeSeconds, details, encouragement }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, '#FFF8F0');
  grad.addColorStop(1, '#FFEBD8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FF8B6A';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('모리모리', 80, 110);

  roundedRect(ctx, 64, 150, 952, 1120, 34);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  try {
    const imageUrl = new URL(thumbnail, window.location.origin).toString();
    const img = await loadImage(imageUrl);
    roundedRect(ctx, 110, 220, 860, 300, 24);
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, 110, 220, 860, 300);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#F2E8DC';
    roundedRect(ctx, 110, 220, 860, 300, 24);
    ctx.fill();
  }

  ctx.fillStyle = '#5B4A3B';
  ctx.font = '600 44px sans-serif';
  ctx.fillText(gameTitle, 110, 590);

  ctx.fillStyle = '#8C7A6A';
  ctx.font = '500 32px sans-serif';
  ctx.fillText(`${difficultyLabel(difficulty)} 난이도`, 110, 640);

  ctx.fillStyle = '#2E2A27';
  ctx.font = 'bold 108px sans-serif';
  ctx.fillText(formatSeconds(timeSeconds), 110, 790);

  ctx.fillStyle = '#6A5A4E';
  ctx.font = '500 34px sans-serif';
  let lineY = 860;
  details.forEach((line) => {
    ctx.fillText(line, 110, lineY);
    lineY += 52;
  });

  ctx.fillStyle = '#3D3D3D';
  ctx.font = '600 36px sans-serif';
  drawWrappedText(ctx, encouragement, 110, 1030, 860, 52, 2);

  ctx.fillStyle = '#A08E7F';
  ctx.font = '500 28px sans-serif';
  ctx.fillText('두뇌훈련을 위한 모리모리', 110, 1210);

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
  encouragement,
}) {
  const url = `${window.location.origin}${window.location.pathname}#/play/${gameId}/${difficulty}`;

  if (!navigator.share) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
    return { shared: false, fallback: true, sharePayload: 'url_clipboard' };
  }

  const imageBlob = await buildResultImage({ gameTitle, thumbnail, difficulty, timeSeconds, details, encouragement });
  const imageFile = imageBlob ? new File([imageBlob], 'morimori-record.png', { type: 'image/png' }) : null;

  if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
    await navigator.share({ url, files: [imageFile] });
    return { shared: true, fallback: false, sharePayload: 'image_url' };
  } else {
    await navigator.share({ url });
    return { shared: true, fallback: false, sharePayload: 'url_only' };
  }
}
