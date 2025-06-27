/**
 * BaseManager - 全てのマネージャークラスの基底クラス
 * 
 * 共通的なイベントバス操作とライフサイクル管理を提供
 */

import type { EventMap, EventName, EventListener } from '../types/events';
import { eventBus } from '../utils/EventBus';

export abstract class BaseManager {
  protected eventBus = eventBus;
  private listeners: Array<{ eventName: EventName; listener: EventListener<any> }> = [];

  /**
   * イベントリスナーを登録（自動クリーンアップ対象）
   * @param eventName イベント名
   * @param listener リスナー関数
   */
  protected listen<K extends EventName>(
    eventName: K,
    listener: EventListener<EventMap[K]>
  ): void {
    this.eventBus.on(eventName, listener);
    this.listeners.push({ eventName, listener });
  }

  /**
   * イベントリスナーを削除
   * @param eventName イベント名
   * @param listener リスナー関数
   */
  protected unlisten<K extends EventName>(
    eventName: K,
    listener: EventListener<EventMap[K]>
  ): void {
    this.eventBus.off(eventName, listener);
    this.listeners = this.listeners.filter(
      l => !(l.eventName === eventName && l.listener === listener)
    );
  }

  /**
   * イベントを発火
   * @param eventName イベント名
   * @param data イベントデータ
   */
  protected emit<K extends EventName>(eventName: K, data: EventMap[K]): void {
    this.eventBus.emit(eventName, data);
  }

  /**
   * マネージャーの初期化（サブクラスで実装）
   */
  abstract initialize(): Promise<void> | void;

  /**
   * リソースのクリーンアップ
   * 登録したイベントリスナーを全て削除
   */
  dispose(): void {
    // 登録したイベントリスナーを全て削除
    this.listeners.forEach(({ eventName, listener }) => {
      this.eventBus.off(eventName, listener);
    });
    this.listeners = [];
    
    // サブクラス固有のクリーンアップ
    this.onDispose();
  }

  /**
   * サブクラス固有のクリーンアップ処理（オプション）
   */
  protected onDispose(): void {
    // サブクラスでオーバーライド可能
  }

  /**
   * マネージャーの名前を取得（デバッグ用）
   */
  abstract getName(): string;
}
