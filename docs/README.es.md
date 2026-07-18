<div align="center">

# Explainer Video

**Convierte textos, páginas web y documentos en vídeos dibujados a mano con voz y subtítulos.**

[Sitio web](https://speedpainter.org) · [Demo](../assets/explainer-video-demo.mp4) · [Privacidad](https://speedpainter.org/en/privacy) · [Soporte](https://speedpainter.org/en/contact)

</div>

<p align="center">
  <a href="../README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <strong>Español</strong>
</p>

## Mira el resultado

[![Demo de un vídeo explicativo dibujado a mano](../assets/explainer-video-demo-preview.gif)](../assets/explainer-video-demo.mp4)

[Ver el vídeo completo con narración y subtítulos incrustados.](../assets/explainer-video-demo.mp4)

## Instalación

### Claude Code

```bash
npx --yes github:SpeedPainterOrg/explainer-video
```

### Codex

```bash
codex plugin marketplace add SpeedPainterOrg/explainer-video --ref main
codex plugin add explainer-video@speedpainter
```

Abre una sesión nueva del agente después de instalarlo. La primera vez que
crees un vídeo, sigue la indicación para iniciar sesión con Google.

## Crea un vídeo

```text
Convierte este documento en un vídeo explicativo de 30 segundos.
```

Puedes proporcionar texto, una URL o un documento y elegir el idioma, la
duración, el formato, la voz, la música y los subtítulos. Si no indicas una
opción, se utiliza un valor predeterminado adecuado.

## Privacidad

- El agente lee el archivo original de forma local; el archivo no se sube.
- Solo se envía al servicio el contenido extraído necesario para crear el vídeo.
- No necesitas claves de API de imagen, voz, almacenamiento ni renderizado.

[Política de privacidad](https://speedpainter.org/en/privacy) · [Términos](https://speedpainter.org/en/terms) · [Soporte](https://speedpainter.org/en/contact) · [Informar de un problema](https://github.com/SpeedPainterOrg/explainer-video/issues)
