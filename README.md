# 温氏采购 · 登录页完整包

独立、可离线运行的登录页（含完整 Three.js 校园场景、字体、动画）。不依赖仓库里其他页面。

## 运行

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
```

浏览器打开：http://127.0.0.1:8788/

- `/` 或 `/index.html` 或 `/login.html` 都是同一登录页

## 包含内容

- 登录 / 注册表单与样式
- 完整 3D 校园（`campus.js` 全量，不是截断版）
- Three.js r186 压缩运行时、GSAP、3D 字型 Helvetiker
- Geist + Noto Sans SC 本地字体（不走 Google CDN）
