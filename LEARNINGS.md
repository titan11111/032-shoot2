# 032-shoot2 LEARNINGS（Galactic Vector - 宇宙STG）

## 実装済み最新技術

### #1 Web Audio API （周波数解析）
- AudioContext + AnalyserNode で BGM 周波数解析対応
- 将来の ビジュアライザ拡張に準備完了

### #2 Performance API
- frameData で FPS 計測準備完了

### #3 Pointer Events （Touch/Mouse統一）
- bindPointerEvents で全ボタンを統一処理

### #4 CSS Filters （SVG効果代替）
- --glow-filter で Cyan グロー効果

## テンプレート設計済み（#5-10）
- #5: Gamepad API （コントローラー対応）
- #6: Pointer Lock API （マウス固定）
- #7: Canvas Compositing （ブレンドモード）
- #8: localStorage （設定保存）
- #9: RequestAnimationFrame （最適化）
- #10: WebGL （背景GPUレンダリング）

## 世界観戦略
ベクトル宇宙 STG の視覚効果中心。CSS フィルタ + Web Audio で演出力を強化。
