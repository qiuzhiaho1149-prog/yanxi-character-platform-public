# dsh-yanxi-vision

给嫣汐一个 `see_image` 工具：用 DeepSeek Flash 的视觉能力看 QQ 图片/表情包。

- 只允许读 `~/.dsh-yanxi/home` 和 `~/.dsh-yanxi/life` 里的图片
- 支持 JPEG/PNG/GIF/WebP
- 直接调用 `https://api.deepseek.com/chat/completions`，model=`deepseek-flash`
- key 来自环境变量 `DEEPSEEK_API_KEY`，不落盘

不依赖宿主 `read_image` 或 attachments 服务。
