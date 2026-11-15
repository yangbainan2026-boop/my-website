(() => {
  'use strict';

  const get = id => document.getElementById(id);
  const form = get('adForm');
  const fields = get('studioFields');
  const fileInput = get('photoInput');
  const uploadZone = get('uploadZone');
  const thumbnail = get('thumbPhoto');
  const sourceImage = get('userPhoto');
  const backdrop = get('sourceBackdrop');
  const resetButton = get('resetPhoto');
  const platform = get('platform');
  const resolution = get('resolution');
  const model = get('model');
  const style = get('adStyle');
  const prompt = get('direction');
  const modelNote = get('modelNote');
  const controls = [...form.querySelectorAll('[data-ratio]')];
  const stage = get('previewStage');
  const video = get('previewVideo');
  const badge = get('previewState');
  const resultNote = get('resultNote');
  const actions = get('resultActions');
  const downloadVideo = get('downloadVideo');
  const downloadCover = get('downloadCover');
  const primary = get('generateButton');
  const cancelButton = get('cancelRender');
  const viewResult = get('viewResult');
  const settingsButton = get('exportSettings');
  const briefButton = get('downloadBrief');
  const briefStatus = get('briefStatus');
  const brandAssets = get('brandAssets');
  const assetList = get('assetList');
  const assetStatus = get('assetStatus');
  const reference = get('referenceCase');
  const platformButtons = [...document.querySelectorAll('.studio-platform')];
  const platformPhotos = [...document.querySelectorAll('[data-platform-photo]')];
  const status = get('statusLine');
  const progress = get('progressBar');
  const sample = {
    url: sourceImage.getAttribute('src'),
    name: '示例素材 · 越野产品图',
    detail: 'JPG、PNG 或 WebP · 20 MB 以内'
  };
  const platformRatios = {
    douyin: '9:16',
    wechat: '9:16',
    kuaishou: '9:16',
    red: '3:4',
    bilibili: '16:9',
    youtube: '16:9',
    social: '1:1'
  };
  const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

  let activeSource = sample;
  let uploadSequence = 0;
  let ratio = '9:16';
  let result = null;
  let job = null;
  let supplementalAssets = [];

  function outputSize() {
    const [ratioWidth, ratioHeight] = ratio.split(':').map(Number);
    const scale = Number(resolution.value) / Math.min(ratioWidth, ratioHeight);
    return {
      width: Math.round(ratioWidth * scale),
      height: Math.round(ratioHeight * scale)
    };
  }

  function readSettings() {
    const { width, height } = outputSize();
    return {
      brand: get('brandName').value.trim(),
      brandDescription: get('brandIntro').value.trim(),
      replyContact: get('replyContact').value.trim(),
      use: get('videoUse').value,
      referenceCase: reference.value,
      referenceUrl: get('referenceUrl').value.trim(),
      platform: platform.value,
      model: model.value,
      style: style.value,
      prompt: prompt.value.trim(),
      aspectRatio: ratio,
      width,
      height
    };
  }

  function showStatus(message = '', tone = '') {
    status.hidden = !message;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function updateDimensions() {
    stage.dataset.ratio = ratio;
    controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ratio === ratio)));
    const { width, height } = outputSize();
    get('outputPixels').textContent = ratio + ' · ' + width + ' × ' + height + ' px';
    platformButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(
        platform.value !== 'custom' && platformRatios[button.dataset.platform] === ratio
      ));
    });
  }

  function updateModel() {
    const local = model.value === 'local';
    modelNote.textContent = local
      ? '本地预演使用运镜模板，可识别「推进」「拉远」「横移」等镜头词。'
      : '所选模型待接入。可导出设置，或切回本地预演生成样片。';
    primary.disabled = !local || Boolean(job);
  }

  function clearResult() {
    video.pause();
    video.removeAttribute('src');
    video.removeAttribute('poster');
    video.load();
    video.hidden = true;
    downloadCover.removeAttribute('href');
    downloadVideo.removeAttribute('href');
    downloadVideo.hidden = true;
    actions.hidden = true;
    viewResult.hidden = true;
    if (result) {
      URL.revokeObjectURL(result.posterUrl);
      if (result.videoUrl) URL.revokeObjectURL(result.videoUrl);
      result = null;
    }
    sourceImage.src = activeSource.url;
    sourceImage.hidden = false;
    backdrop.hidden = false;
    badge.hidden = false;
    badge.textContent = activeSource === sample ? '示例产品图' : '已上传产品图';
    resultNote.textContent = '生成后可在这里播放样片，也可以单独下载封面。';
  }

  function applySource(next) {
    if (activeSource !== sample) URL.revokeObjectURL(activeSource.url);
    activeSource = next;
    thumbnail.src = next.url;
    backdrop.src = next.url;
    platformPhotos.forEach(photo => { photo.src = next.url; });
    get('fileName').textContent = next.name;
    get('fileMeta').textContent = next.detail;
    resetButton.hidden = next === sample;
    sourceImage.alt = next === sample ? '越野车产品示例' : '已上传的产品图片';
    clearResult();
  }

  async function useFile(file) {
    if (!file || job) return;
    const sequence = ++uploadSequence;
    if (!allowedImageTypes.has(file.type) && (file.type || !/\.(?:jpe?g|png|webp)$/i.test(file.name))) {
      showStatus('请选择 JPG、PNG 或 WebP 图片。', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showStatus('图片不能超过 20 MB。', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (sequence !== uploadSequence || job) {
        URL.revokeObjectURL(url);
        return;
      }
      applySource({
        url,
        file,
        name: file.name,
        detail: image.naturalWidth + ' × ' + image.naturalHeight + ' px · ' + (file.size / 1024 / 1024).toFixed(1) + ' MB'
      });
      showStatus('图片已载入。', 'success');
    } catch {
      URL.revokeObjectURL(url);
      if (sequence === uploadSequence) showStatus('这张图片无法读取，请换一张。', 'error');
    }
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    void useFile(file);
  });
  uploadZone.addEventListener('dragover', event => {
    event.preventDefault();
    if (!job) uploadZone.classList.add('is-dragging');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('is-dragging'));
  uploadZone.addEventListener('drop', event => {
    event.preventDefault();
    uploadZone.classList.remove('is-dragging');
    void useFile(event.dataTransfer.files[0]);
  });
  resetButton.addEventListener('click', () => {
    uploadSequence++;
    applySource(sample);
    showStatus();
  });

  function renderAssetList() {
    assetList.replaceChildren(...supplementalAssets.map(file => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = file.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'studio-reset';
      remove.textContent = '移除';
      remove.setAttribute('aria-label', '移除 ' + file.name);
      remove.addEventListener('click', () => {
        supplementalAssets = supplementalAssets.filter(entry => entry !== file);
        assetStatus.hidden = true;
        renderAssetList();
      });
      item.append(name, remove);
      return item;
    }));
  }

  brandAssets.addEventListener('change', () => {
    const files = [...brandAssets.files];
    brandAssets.value = '';
    if (!files.length) return;
    const additions = files.filter(file => !supplementalAssets.some(saved =>
      saved.name === file.name && saved.size === file.size && saved.lastModified === file.lastModified
    ));
    const combined = [...supplementalAssets, ...additions];
    if (combined.length > 5 || combined.reduce((total, file) => total + file.size, 0) > 50 * 1024 * 1024) {
      assetStatus.textContent = '最多可添加 5 个文件，合计不能超过 50 MB。';
    } else if (additions.some(file => !/\.(?:jpe?g|png|webp|mp4|webm|mov)$/i.test(file.name))) {
      assetStatus.textContent = '请选择 JPG、PNG、WebP、MP4、WebM 或 MOV 文件。';
    } else {
      supplementalAssets = combined;
      assetStatus.hidden = true;
      renderAssetList();
      return;
    }
    assetStatus.hidden = false;
    assetStatus.dataset.tone = 'error';
  });

  function invalidateOutput() {
    if (result) clearResult();
    showStatus();
  }

  function applyPlatform() {
    ratio = platformRatios[platform.value] || ratio;
    updateDimensions();
    invalidateOutput();
  }
  platform.addEventListener('change', applyPlatform);
  platformButtons.forEach(button => button.addEventListener('click', () => {
    if (job) return;
    platform.value = button.dataset.platform;
    applyPlatform();
  }));
  document.addEventListener('click', event => {
    const useCase = event.target.closest('[data-use-reference]');
    if (!useCase || job) return;
    reference.value = useCase.dataset.useReference;
    if (!reference.value) return;
    reference.focus({ preventScroll: true });
    get('workspace').scrollIntoView();
  });
  controls.forEach(button => button.addEventListener('click', () => {
    ratio = button.dataset.ratio;
    if (platformRatios[platform.value] !== ratio) platform.value = 'custom';
    updateDimensions();
    invalidateOutput();
  }));
  resolution.addEventListener('change', () => {
    updateDimensions();
    invalidateOutput();
  });
  model.addEventListener('change', () => {
    updateModel();
    invalidateOutput();
  });
  style.addEventListener('change', invalidateOutput);
  prompt.addEventListener('input', invalidateOutput);

  function saveFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  settingsButton.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(readSettings(), null, 2) + '\n'], { type: 'application/json' });
    saveFile(blob, '有你互动-广告生成设置.json');
  });

  briefButton.addEventListener('click', async () => {
    if (!get('referenceUrl').reportValidity()) return;
    briefStatus.hidden = false;
    briefStatus.dataset.tone = '';
    briefStatus.textContent = '正在整理简报…';
    briefButton.disabled = true;
    try {
      const settings = readSettings();
      const entries = [];
      const allFiles = [activeSource.file, ...supplementalAssets].filter(Boolean);
      allFiles.forEach((file, index) => {
        const safeName = file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-');
        entries.push({ name: '素材/' + (index + 1) + '-' + safeName, blob: file });
      });
      const label = field => field.selectedOptions[0].textContent.trim();
      const lines = [
        '有你互动｜AIGC 广告合作简报',
        '',
        '品牌 / 产品：' + (settings.brand || '待补充'),
        '品牌说明：' + (settings.brandDescription || '待补充'),
        '回访方式：' + (settings.replyContact || '未填写'),
        '视频用途：' + (settings.use || '待补充'),
        '对标案例：' + (settings.referenceCase ? label(reference) : '未选择'),
        '外部参考：' + (settings.referenceUrl || '未填写'),
        '投放平台：' + label(platform),
        '输出规格：' + settings.aspectRatio + ' · ' + settings.width + ' × ' + settings.height + ' px',
        '画面风格：' + label(style),
        '生成模型：' + label(model),
        '',
        '广告提示词：' + (settings.prompt || '待补充'),
        '',
        '随附素材：' + (entries.length ? entries.map(entry => entry.name).join('、') : '暂无')
      ];
      const brief = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
      if (entries.length) {
        const archive = await window.AdBriefZip.create([{ name: '广告合作简报.txt', blob: brief }, ...entries]);
        saveFile(archive, '有你互动-广告合作简报与素材.zip');
      } else {
        saveFile(brief, '有你互动-广告合作简报.txt');
      }
      briefStatus.dataset.tone = 'success';
      briefStatus.textContent = '简报已下载，可发送给制作团队。';
    } catch {
      briefStatus.dataset.tone = 'error';
      briefStatus.textContent = '暂时无法打包，请减少素材后重试。';
    } finally {
      briefButton.disabled = false;
    }
  });

  function showResult(poster, recording, dimensions) {
    const name = '有你互动-广告预演-' + dimensions.width + 'x' + dimensions.height;
    const posterUrl = URL.createObjectURL(poster);
    const videoUrl = recording ? URL.createObjectURL(recording.blob) : null;
    result = { posterUrl, videoUrl };
    sourceImage.src = posterUrl;
    backdrop.hidden = true;
    badge.textContent = '本地预演封面';
    downloadCover.href = posterUrl;
    downloadCover.download = name + '.png';
    actions.hidden = false;
    viewResult.hidden = false;

    if (videoUrl) {
      video.src = videoUrl;
      video.poster = posterUrl;
      video.hidden = false;
      sourceImage.hidden = true;
      badge.hidden = true;
      downloadVideo.href = videoUrl;
      downloadVideo.download = name + '.' + recording.extension;
      downloadVideo.textContent = '下载样片 ' + recording.extension.toUpperCase();
      downloadVideo.hidden = false;
      resultNote.textContent = '本地运镜样片 · 无声 · ' + recording.extension.toUpperCase();
    } else {
      resultNote.textContent = '封面已按所选尺寸生成，可下载 PNG。';
    }
  }

  video.addEventListener('error', () => {
    if (!result?.videoUrl) return;
    video.hidden = true;
    sourceImage.hidden = false;
    badge.hidden = false;
    resultNote.textContent = '当前环境无法播放这段视频。可下载样片，在支持该格式的播放器中打开。';
  });

  cancelButton.addEventListener('click', () => job?.abort());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (job || model.value !== 'local') return;
    const renderer = window.AdPreviewRenderer;
    if (!renderer) {
      showStatus('预演工具未载入，请重新打开网页。', 'error');
      return;
    }

    const settings = readSettings();
    job = new AbortController();
    const { signal } = job;
    uploadSequence++;
    clearResult();
    fields.disabled = true;
    primary.disabled = true;
    settingsButton.disabled = true;
    cancelButton.hidden = false;
    progress.hidden = false;
    progress.value = 0;
    badge.textContent = '正在制作预演';
    showStatus('正在制作样片，请保持页面打开。');

    try {
      const image = new Image();
      image.src = activeSource.url;
      await image.decode();
      if (signal.aborted) return;
      const clip = { ...settings, image, signal, onProgress: value => { progress.value = value; } };
      const poster = await renderer.renderPoster(clip);
      if (signal.aborted) return;
      let recording = null;
      try {
        recording = await renderer.renderVideo(clip);
      } catch {
        if (!signal.aborted) showStatus('当前浏览器无法录制这一规格，已生成封面。可降低分辨率后重试。', 'error');
      }
      if (signal.aborted) return;
      showResult(poster, recording, settings);
      if (recording) showStatus('样片已生成，可播放或下载。', 'success');
    } catch {
      if (!signal.aborted) {
        clearResult();
        showStatus('预演未能生成。请换一张图片，或降低分辨率后重试。', 'error');
      }
    } finally {
      if (signal.aborted) {
        clearResult();
        showStatus('已取消预演。');
      }
      job = null;
      fields.disabled = false;
      settingsButton.disabled = false;
      cancelButton.hidden = true;
      progress.hidden = true;
      updateModel();
    }
  });

  updateDimensions();
  updateModel();
  platformPhotos.forEach(photo => { photo.src = sample.url; });
})();
