function getSpeechBubbleConfig(sceneType, cameraAngle, emotion) {
  const baseConfig = {
    maxWidth: 200,
    padding: 15,
    fontSize: 16,
    fontFamily: 'PatrickHand',
    textColor: '#000000',
    bubbleColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 2,
  };

  switch (emotion) {
    case 'angry':
      return { ...baseConfig, bubbleColor: '#FFE6E6', borderColor: '#FF0000', borderWidth: 3, spiky: true };
    case 'sad':
      return { ...baseConfig, bubbleColor: '#E6F3FF', borderColor: '#0066CC', curved: true };
    case 'thinking':
      return { ...baseConfig, bubbleColor: '#F0F0F0', borderStyle: 'dashed', cloudStyle: true };
    case 'surprised':
      return { ...baseConfig, bubbleColor: '#FFFF99', borderColor: '#FF6600', jagged: true };
    default:
      return baseConfig;
  }
}

function calculateBubblePosition(width, height, config, panel) {
  let x, y;
  switch (panel.camera_angle) {
    case 'close_up': x = width * 0.7; y = height * 0.1; break;
    case 'medium_shot': x = width * 0.5; y = height * 0.1; break;
    case 'wide_shot': x = width * 0.3; y = height * 0.1; break;
    default: x = width * 0.5; y = height * 0.1;
  }
  const bubbleWidth = config.maxWidth + (config.padding * 2);
  const bubbleHeight = 100;
  x = Math.max(bubbleWidth/2, Math.min(width - bubbleWidth/2, x));
  y = Math.max(bubbleHeight/2, Math.min(height - bubbleHeight/2, y));
  return { x, y };
}

function drawBubbleTail(ctx, x, y, config) {
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x, y + 20);
  ctx.lineTo(x + 10, y);
  ctx.fillStyle = config.bubbleColor;
  ctx.fill();
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = config.borderWidth;
  ctx.stroke();
}

function drawRegularBubble(ctx, x, y, width, height, config) {
  const radius = 15;
  ctx.beginPath();
  ctx.roundRect(x - width/2, y - height/2, width, height, radius);
  ctx.fillStyle = config.bubbleColor;
  ctx.fill();
  if (config.borderStyle === 'dashed') ctx.setLineDash([5, 5]);
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = config.borderWidth;
  ctx.stroke();
  ctx.setLineDash([]);
  drawBubbleTail(ctx, x, y + height/2, config);
}

function drawSpikyBubble(ctx, x, y, width, height, config) {
  ctx.beginPath();
  const spikes = 8;
  const spikeHeight = 10;
  const left = x - width/2;
  const top = y - height/2;
  const right = x + width/2;
  const bottom = y + height/2;
  ctx.moveTo(left, top + 10);
  for (let i = 0; i < spikes; i++) {
    const spikeX = left + (width / spikes) * i;
    const nextSpikeX = left + (width / spikes) * (i + 1);
    ctx.lineTo(spikeX + (width / spikes) / 2, top - spikeHeight);
    ctx.lineTo(nextSpikeX, top);
  }
  ctx.lineTo(right, top + 10);
  ctx.lineTo(right, bottom - 10);
  ctx.lineTo(right - 10, bottom);
  ctx.lineTo(left + 10, bottom);
  ctx.lineTo(left, bottom - 10);
  ctx.closePath();
  ctx.fillStyle = config.bubbleColor;
  ctx.fill();
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = config.borderWidth;
  ctx.stroke();
}

function wrapText(ctx, text, maxWidth, config) {
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && i > 0) {
      lines.push(currentLine.trim());
      currentLine = words[i] + ' ';
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
}

function drawThoughtBubble(ctx, x, y, width, height, config) {
  drawRegularBubble(ctx, x, y, width, height, config);
  const smallBubbles = [
    { x: x - 30, y: y + height/2 + 20, radius: 8 },
    { x: x - 50, y: y + height/2 + 35, radius: 5 },
    { x: x - 65, y: y + height/2 + 45, radius: 3 },
  ];
  smallBubbles.forEach(bubble => {
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, 2 * Math.PI);
    ctx.fillStyle = config.bubbleColor;
    ctx.fill();
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = config.borderWidth;
    ctx.stroke();
  });
}

function drawSpeechBubble(ctx, text, position, config, speaker) {
  const { x, y } = position;
  const lines = wrapText(ctx, text, config.maxWidth - (config.padding * 2), config);
  const lineHeight = config.fontSize * 1.2;
  const textHeight = lines.length * lineHeight;
  const bubbleWidth = config.maxWidth;
  const bubbleHeight = textHeight + (config.padding * 2);
  ctx.save();
  if (config.cloudStyle) drawThoughtBubble(ctx, x, y, bubbleWidth, bubbleHeight, config);
  else if (config.spiky) drawSpikyBubble(ctx, x, y, bubbleWidth, bubbleHeight, config);
  else drawRegularBubble(ctx, x, y, bubbleWidth, bubbleHeight, config);
  ctx.fillStyle = config.textColor;
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const startY = y - (textHeight / 2) + (lineHeight / 2);
  lines.forEach((line, index) => ctx.fillText(line, x, startY + (index * lineHeight)));
  if (speaker && config.showSpeaker !== false) {
    ctx.font = `bold ${config.fontSize - 2}px ${config.fontFamily}`;
    ctx.fillStyle = '#666666';
    ctx.fillText(`${speaker}:`, x, y - bubbleHeight/2 - 15);
  }
  ctx.restore();
}

module.exports = {
  getSpeechBubbleConfig,
  calculateBubblePosition,
  drawSpeechBubble,
  drawRegularBubble,
  drawSpikyBubble,
  drawThoughtBubble,
  wrapText,
  drawBubbleTail,
};


