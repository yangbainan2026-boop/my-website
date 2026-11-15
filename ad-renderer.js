(() => {
  'use strict';

  const durationMs = 6000;
  const frameRate = 24;
  const design = {
    studio: { background: '#171b23', shade: '#100f17', opacity: 0.54 },
    lifestyle: { background: '#382821', shade: '#261912', opacity: 0.37 },
    keynote: { background: '#071325', shade: '#080a10', opacity: 0.68 }
  };
  const mediaTypes = [
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  function makeCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('此浏览器无法绘制预演画面。');
    return { canvas, context };
  }

  function fitImage(context, image, targetWidth, targetHeight, mode, left = 0, top = 0) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const getScale = mode === 'cover' ? Math.max : Math.min;
    const scale = getScale(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    context.drawImage(
      image,
      left + (targetWidth - width) / 2,
      top + (targetHeight - height) / 2,
      width,
      height
    );
  }

  function describeMotion(prompt) {
    const input = String(prompt || '');
    return {
      pullBack: /拉远|后退|退后|zoom\s*out|pull\s*back/i.test(input),
      pan: /往左|向左|左移|从右到左|pan\s*left/i.test(input) ? -1
        : /横移|往右|向右|右移|从左到右|pan/i.test(input) ? 1 : 0,
      amount: /快速|加速|疾速|fast/i.test(input) ? 1.2
        : /轻微|缓慢|慢速|slow/i.test(input) ? 0.55 : 0.85,
      light: /暖色|暖光|暖调|金色|warm/i.test(input) ? '#b56a34'
        : /冷色|冷光|冷调|冰蓝|cool/i.test(input) ? '#3c75c2' : '',
      title: input.match(/(?:字幕|标题|文案)\s*[：:]\s*[「“"]([^」”"\n]{1,60})[」”"]/)?.[1] || ''
    };
  }

  function createComposer({ image, width, height, prompt, brand, style, signal }) {
    if (signal?.aborted) throw new DOMException('已取消预演。', 'AbortError');
    if (!image?.naturalWidth || !image.naturalHeight) {
      throw new Error('产品图片尚未读取完成。');
    }
    if (!Number.isInteger(width) || !Number.isInteger(height)
        || width < 2 || height < 2 || width * height > 8_400_000) {
      throw new Error('该分辨率超出浏览器预演范围。');
    }

    const { canvas, context } = makeCanvas(width, height);
    const theme = design[style] || design.studio;
    const motion = describeMotion(prompt);
    const title = motion.title || String(brand || '').trim().slice(0, 60);
    const shortEdge = Math.min(width, height);
    const matte = makeCanvas(Math.round(width * 24 / shortEdge), Math.round(height * 24 / shortEdge));
    matte.context.fillStyle = theme.background;
    matte.context.fillRect(0, 0, matte.canvas.width, matte.canvas.height);
    fitImage(matte.context, image, matte.canvas.width, matte.canvas.height, 'cover');

    // Cache the softly textured stage so recording only has to composite two layers.
    const stage = makeCanvas(Math.round(width * 320 / shortEdge), Math.round(height * 320 / shortEdge));
    const stageWidth = stage.canvas.width;
    const stageHeight = stage.canvas.height;
    const stageContext = stage.context;
    stageContext.imageSmoothingQuality = 'high';
    stageContext.drawImage(matte.canvas, 0, 0, stageWidth, stageHeight);
    stageContext.fillStyle = theme.shade;
    stageContext.globalAlpha = theme.opacity;
    stageContext.fillRect(0, 0, stageWidth, stageHeight);
    if (motion.light) {
      stageContext.fillStyle = motion.light;
      stageContext.globalAlpha = 0.29;
      stageContext.fillRect(0, 0, stageWidth, stageHeight);
    }
    stageContext.globalAlpha = 1;
    const vignette = stageContext.createRadialGradient(
      stageWidth * 0.5, stageHeight * 0.43, 0,
      stageWidth * 0.5, stageHeight * 0.49, Math.hypot(stageWidth, stageHeight) * 0.53
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.5, 'rgba(0, 0, 0, 0.06)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
    stageContext.fillStyle = vignette;
    stageContext.fillRect(0, 0, stageWidth, stageHeight);

    // A transparent source should blend with the stage instead of getting a black rectangle.
    const product = document.createElement('canvas');
    product.width = width;
    product.height = height;
    const productContext = product.getContext('2d');
    if (!productContext) throw new Error('此浏览器无法绘制产品图片。');
    productContext.imageSmoothingQuality = 'high';
    const photoMargin = shortEdge * 0.055;
    fitImage(productContext, image, width - photoMargin * 2, height - photoMargin * 2,
      'contain', photoMargin, photoMargin);

    const fontSize = Math.round(shortEdge * 0.046);
    context.font = '600 ' + fontSize + 'px system-ui, sans-serif';
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    const titleWidth = Math.min(context.measureText(title).width, width - fontSize * 3);

    function paint(progress) {
      const smoothed = progress * progress * (3 - 2 * progress);
      const travel = motion.pullBack ? 1 - smoothed : smoothed;
      const zoom = 0.94 + travel * 0.088 * motion.amount;
      const offset = motion.pan * (smoothed - 0.5) * shortEdge * 0.11;
      context.drawImage(stage.canvas, 0, 0, width, height);
      context.drawImage(
        product,
        (width - width * zoom) / 2 + offset,
        (height - height * zoom) / 2,
        width * zoom,
        height * zoom
      );
      if (title) {
        const lineY = height - shortEdge * 0.088;
        context.fillStyle = 'rgba(10, 13, 18, 0.78)';
        context.fillRect((width - titleWidth) / 2 - fontSize * 0.6, lineY - fontSize * 0.92,
          titleWidth + fontSize * 1.2, fontSize * 1.84);
        context.fillStyle = '#fff';
        context.fillText(title, width / 2, lineY, titleWidth);
      }
    }

    function release() {
      matte.canvas.width = 0;
      stage.canvas.width = 0;
      product.width = 0;
      canvas.width = 0;
    }

    return { canvas, paint, release };
  }

  async function renderPoster(settings) {
    const { canvas, paint, release } = createComposer(settings);
    try {
      paint(0.52);
      const poster = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (settings.signal?.aborted) throw new DOMException('已取消预演。', 'AbortError');
      if (!poster) throw new Error('当前分辨率的封面无法导出。');
      return poster;
    } finally {
      release();
    }
  }

  async function renderVideo(settings) {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      throw new Error('此浏览器无法在本地录制视频。');
    }
    const { canvas, paint, release } = createComposer(settings);
    const { signal, onProgress } = settings;
    let stream;
    let recorder;
    try {
      paint(0);
      stream = canvas.captureStream(frameRate);
      if (!stream.getVideoTracks().length) throw new Error('没有可录制的视频轨道。');
      const bitsPerSecond = Math.max(1_000_000, Math.round(canvas.width * canvas.height * 3.4));
      const canRecord = type => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type);
      const chunks = [];
      return await new Promise((resolve, reject) => {
        let frameTimer;
        let finishTimer;
        let finished = false;

        function finish(error) {
          if (finished) return;
          finished = true;
          clearTimeout(frameTimer);
          clearTimeout(finishTimer);
          signal?.removeEventListener('abort', abortJob);
          if (error) {
            reject(error);
            return;
          }
          const type = chunks[0]?.type || recorder.mimeType;
          if (!type || !chunks.length) {
            reject(new Error('此浏览器未产出可保存的样片。'));
            return;
          }
          onProgress?.(1);
          resolve({
            blob: new Blob(chunks, { type }),
            extension: /^video\/mp4/i.test(type) ? 'mp4' : 'webm'
          });
        }

        function abortJob() {
          finish(new DOMException('已取消预演。', 'AbortError'));
        }

        for (const mimeType of mediaTypes) {
          if (!canRecord(mimeType)) continue;
          try {
            recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond });
            recorder.ondataavailable = event => {
              if (event.data.size) chunks.push(event.data);
            };
            recorder.onerror = event => finish(event.error || new Error('此浏览器无法在本地录制视频。'));
            recorder.onstop = () => finish();
            recorder.start();
            break;
          } catch {
            recorder = null;
          }
        }
        if (!recorder) {
          finish(new Error('此浏览器不支持可用的录制格式。'));
          return;
        }
        if (signal?.aborted) {
          abortJob();
          return;
        }
        signal?.addEventListener('abort', abortJob, { once: true });
        const start = performance.now();

        function advance() {
          if (finished) return;
          try {
            const progress = Math.min(1, (performance.now() - start) / durationMs);
            paint(progress);
            onProgress?.(progress * 0.98);
            if (progress < 1) {
              frameTimer = setTimeout(advance, 1000 / frameRate);
              return;
            }
            finishTimer = setTimeout(() => finish(new Error('录制结束后未收到视频。')), 8000);
            recorder.stop();
          } catch (error) {
            finish(error);
          }
        }
        advance();
      });
    } finally {
      if (recorder?.state !== undefined && recorder.state !== 'inactive') recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      release();
    }
  }

  window.AdPreviewRenderer = { renderVideo, renderPoster };
})();
