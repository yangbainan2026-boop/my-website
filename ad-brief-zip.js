(() => {
  'use strict';

  const utf8 = new TextEncoder();
  const chunkSize = 1024 * 1024;
  const zip32Limit = 0xffffffff;
  const utf8Flag = 1 << 11;
  const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    }
    return value;
  });

  async function crc32(blob) {
    let crc = 0xffffffff;
    for (let offset = 0; offset < blob.size; offset += chunkSize) {
      const chunk = new Uint8Array(await blob.slice(offset, offset + chunkSize).arrayBuffer());
      for (const byte of chunk) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosTimestamp(now) {
    const year = Math.max(1980, Math.min(2107, now.getFullYear()));
    return {
      date: ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
      time: (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
    };
  }

  function localHeader(name, size, crc, stamp) {
    const bytes = new Uint8Array(30 + name.length);
    const header = new DataView(bytes.buffer);
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, utf8Flag, true);
    header.setUint16(10, stamp.time, true);
    header.setUint16(12, stamp.date, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, size, true);
    header.setUint32(22, size, true);
    header.setUint16(26, name.length, true);
    bytes.set(name, 30);
    return bytes;
  }

  function centralHeader(name, size, crc, stamp, offset) {
    const bytes = new Uint8Array(46 + name.length);
    const header = new DataView(bytes.buffer);
    header.setUint32(0, 0x02014b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 20, true);
    header.setUint16(8, utf8Flag, true);
    header.setUint16(12, stamp.time, true);
    header.setUint16(14, stamp.date, true);
    header.setUint32(16, crc, true);
    header.setUint32(20, size, true);
    header.setUint32(24, size, true);
    header.setUint16(28, name.length, true);
    header.setUint32(42, offset, true);
    bytes.set(name, 46);
    return bytes;
  }

  function prepare(entries) {
    if (!Array.isArray(entries) || entries.length >= 0xffff) {
      throw new Error('文件列表无效，或文件数量超出 ZIP 上限。');
    }
    const seen = new Set();
    let archiveSize = 22;
    return entries.map(entry => {
      const { name, blob } = entry || {};
      if (typeof name !== 'string' || !(blob instanceof Blob) ||
          name.split('/').some(part => !part || part === '.' || part === '..') ||
          /[\\:\u0000-\u001f]/.test(name) || seen.has(name)) {
        throw new Error('打包文件名无效或重复。');
      }
      seen.add(name);
      const bytes = utf8.encode(name);
      archiveSize += 76 + 2 * bytes.length + blob.size;
      if (bytes.length > 0xffff || archiveSize >= zip32Limit) {
        throw new Error('文件名或文件大小超出 ZIP 上限。');
      }
      return { name: bytes, blob };
    });
  }

  async function create(entries) {
    const files = prepare(entries);
    const stamp = dosTimestamp(new Date());
    const parts = [];
    const directory = [];
    let offset = 0;
    let directorySize = 0;
    for (const { name, blob } of files) {
      const crc = await crc32(blob);
      const local = localHeader(name, blob.size, crc, stamp);
      const central = centralHeader(name, blob.size, crc, stamp, offset);
      parts.push(local, blob);
      directory.push(central);
      offset += local.byteLength + blob.size;
      directorySize += central.byteLength;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, directorySize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end.buffer], { type: 'application/zip' });
  }

  window.AdBriefZip = { create };
})();
