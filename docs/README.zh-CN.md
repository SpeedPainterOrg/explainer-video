<div align="center">

# Explainer Video

**把文字、网页和文档直接变成带配音与字幕的手绘解释视频。**

[官方网站](https://speedpainter.org) · [成片演示](https://cdn.jsdelivr.net/gh/SpeedPainterOrg/explainer-video@v0.5.1/assets/explainer-video-demo.mp4) · [隐私政策](https://speedpainter.org/en/privacy) · [联系支持](https://speedpainter.org/en/contact)

</div>

<p align="center">
  <a href="../README.md">English</a> ·
  <strong>简体中文</strong> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a>
</p>

## 查看真实成片

[![手绘解释视频演示](../assets/explainer-video-demo-preview.gif)](https://cdn.jsdelivr.net/gh/SpeedPainterOrg/explainer-video@v0.5.1/assets/explainer-video-demo.mp4)

[观看带配音和烧录字幕的完整成片。](https://cdn.jsdelivr.net/gh/SpeedPainterOrg/explainer-video@v0.5.1/assets/explainer-video-demo.mp4)

## 安装

```bash
npx --yes github:SpeedPainterOrg/explainer-video
```

安装器会自动识别 Codex 和 Claude Code。安装后新建一个 Agent 会话；如果出现
鉴权提示，按提示完成 Google 登录即可。

## 生成视频

```text
用 30 秒讲清楚世界杯从 1930 年首届赛事到今天的发展历史。
```

你可以提供文字、网页或文档，也可以指定语言、时长、画面比例、音色、音乐和
字幕；没有指定时会自动使用合理的默认配置。

## 隐私

- 原始文件由 Agent 在本地读取，文件本身不会上传。
- 服务端只接收制作视频所需的正文内容。
- 不需要提供生图、配音、存储或渲染服务的 API Key。

[隐私政策](https://speedpainter.org/en/privacy) · [服务条款](https://speedpainter.org/en/terms) · [联系支持](https://speedpainter.org/en/contact) · [提交问题](https://github.com/SpeedPainterOrg/explainer-video/issues)
