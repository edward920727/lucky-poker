/**
 * 行政費配置管理
 * 支持動態更新行政費配置，並持久化到 localStorage
 */

import { ICM_ADMINISTRATIVE_FEE_CONFIG } from '../constants/icmRewardConfig';

const STORAGE_KEY = 'administrative_fee_config';

/**
 * 獲取當前行政費配置（優先使用用戶自定義配置，否則使用默認配置）
 */
export function getAdministrativeFeeConfig(): Record<number, number> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合併默認配置和用戶配置
      return { ...ICM_ADMINISTRATIVE_FEE_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error('讀取行政費配置失敗:', error);
  }
  return ICM_ADMINISTRATIVE_FEE_CONFIG;
}

/**
 * 更新行政費配置
 */
export function updateAdministrativeFeeConfig(entryFee: number, administrativeFee: number): void {
  try {
    const current = getAdministrativeFeeConfig();
    current[entryFee] = administrativeFee;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('保存行政費配置失敗:', error);
  }
}

/**
 * 批量更新行政費配置
 */
export function updateAdministrativeFeeConfigBatch(config: Record<number, number>): void {
  try {
    const current = getAdministrativeFeeConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('批量保存行政費配置失敗:', error);
  }
}

/**
 * 重置為默認配置
 */
export function resetAdministrativeFeeConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('重置行政費配置失敗:', error);
  }
}

/**
 * 獲取指定報名費的行政費（使用當前配置）
 */
export function getAdministrativeFee(entryFee: number): number {
  const config = getAdministrativeFeeConfig();
  return config[entryFee] || 0;
}
