/**
 * EventBus - 中央集権的なイベント管理システム
 * 
 * 各コンポーネント間の疎結合なコミュニケーションを実現する
 * タイプセーフなイベントシステム
 */

import type { EventMap, EventName, EventListener } from '../types/events';

export class EventBus {
  private listeners: Map<EventName, Set<EventListener<any>>> = new Map();
  private static instance: EventBus | null = null;

  /**
   * シングルトンパターンでEventBusのインスタンスを取得
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * イベントリスナーを登録
   * @param eventName イベント名
   * @param listener リスナー関数
   */
  on<K extends EventName>(
    eventName: K,
    listener: EventListener<EventMap[K]>
  ): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener);
  }

  /**
   * イベントリスナーを削除
   * @param eventName イベント名
   * @param listener リスナー関数
   */
  off<K extends EventName>(
    eventName: K,
    listener: EventListener<EventMap[K]>
  ): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * 一度だけ実行されるイベントリスナーを登録
   * @param eventName イベント名
   * @param listener リスナー関数
   */
  once<K extends EventName>(
    eventName: K,
    listener: EventListener<EventMap[K]>
  ): void {
    const onceListener = (data: EventMap[K]) => {
      listener(data);
      this.off(eventName, onceListener);
    };
    this.on(eventName, onceListener);
  }

  /**
   * イベントを発火
   * @param eventName イベント名
   * @param data イベントデータ
   */
  emit<K extends EventName>(eventName: K, data: EventMap[K]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      // リスナーをコピーしてから実行（実行中のリスナー削除を安全に処理）
      const listeners = Array.from(eventListeners);
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * 指定したイベントの全リスナーを削除
   * @param eventName イベント名
   */
  removeAllListeners<K extends EventName>(eventName: K): void {
    this.listeners.delete(eventName);
  }

  /**
   * 全てのリスナーを削除
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 現在登録されているリスナーの情報を取得（デバッグ用）
   */
  getListenerInfo(): Record<string, number> {
    const info: Record<string, number> = {};
    this.listeners.forEach((listeners, eventName) => {
      info[eventName] = listeners.size;
    });
    return info;
  }

  /**
   * 指定されたイベントにリスナーが登録されているかチェック
   * @param eventName イベント名
   */
  hasListeners<K extends EventName>(eventName: K): boolean {
    const eventListeners = this.listeners.get(eventName);
    return Boolean(eventListeners && eventListeners.size > 0);
  }
}

// デフォルトのEventBusインスタンスをエクスポート
export const eventBus = EventBus.getInstance();
