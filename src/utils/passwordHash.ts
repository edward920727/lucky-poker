/**
 * 密码哈希工具
 * 使用 Web Crypto API 进行密码哈希，确保密码不以明文形式存储
 */

/**
 * 将字符串转换为 ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  return uint8Array.buffer;
}

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将十六进制字符串转换为 ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * 生成随机盐值
 */
function generateSalt(): ArrayBuffer {
  const saltArray = new Uint8Array(16);
  crypto.getRandomValues(saltArray);
  return saltArray.buffer;
}

/**
 * 将盐值转换为字符串（用于存储）
 */
function saltToString(salt: ArrayBuffer): string {
  return arrayBufferToHex(salt);
}

/**
 * 将字符串转换为盐值
 */
function stringToSalt(saltString: string): ArrayBuffer {
  return hexToArrayBuffer(saltString);
}

/**
 * 使用 PBKDF2 算法哈希密码
 * @param password 明文密码
 * @param salt 盐值（可选，如果不提供会自动生成）
 * @returns 包含哈希值和盐值的对象
 */
export async function hashPassword(
  password: string,
  salt?: ArrayBuffer
): Promise<{ hash: string; salt: string }> {
  // 如果没有提供盐值，生成一个新的
  const saltBuffer = salt || generateSalt();
  const saltString = saltToString(saltBuffer);

  // 将密码和盐值转换为 ArrayBuffer
  const passwordBuffer = stringToArrayBuffer(password);

  // 使用 PBKDF2 算法进行哈希
  // PBKDF2 是一个安全的密码哈希算法，适合在浏览器中使用
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // 使用 PBKDF2 派生密钥（这里用作哈希）
  // 参数：算法、密钥材料、盐值、迭代次数、哈希函数、输出长度
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000, // 迭代次数，越高越安全但越慢
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 输出 256 位（32 字节）
  );

  // 将哈希值转换为十六进制字符串
  const hashString = arrayBufferToHex(hashBuffer);

  return {
    hash: hashString,
    salt: saltString,
  };
}

/**
 * 验证密码
 * @param password 用户输入的明文密码
 * @param storedHash 存储的哈希值
 * @param storedSalt 存储的盐值
 * @returns 密码是否正确
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    // 使用存储的盐值重新哈希用户输入的密码
    const saltBuffer = stringToSalt(storedSalt);
    const { hash } = await hashPassword(password, saltBuffer);

    // 比较哈希值（使用时间安全的比较方法）
    return constantTimeCompare(hash, storedHash);
  } catch (error) {
    console.error('密码验证失败:', error);
    return false;
  }
}

/**
 * 时间安全的字符串比较（防止时序攻击）
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * 检查密码是否为哈希格式
 * 如果密码看起来像哈希值（64 字符的十六进制字符串），则可能是哈希值
 * 否则可能是明文密码（需要迁移）
 */
export function isHashedPassword(password: string): boolean {
  // 哈希值通常是 64 字符的十六进制字符串（SHA-256）
  // 盐值通常是 32 字符的十六进制字符串（16 字节）
  // 如果密码是 64 字符且只包含十六进制字符，可能是哈希值
  return /^[0-9a-f]{64}$/i.test(password);
}

/**
 * 检查数据格式是否为旧格式（明文密码）
 * 旧格式：{ username, password, isAdmin }
 * 新格式：{ username, passwordHash, passwordSalt, isAdmin }
 */
export function isLegacyUserFormat(user: any): boolean {
  // 如果有 password 字段且没有 passwordHash，则是旧格式
  return 'password' in user && !('passwordHash' in user);
}
