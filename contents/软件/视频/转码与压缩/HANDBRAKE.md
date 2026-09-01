# HandBrake

> 开源、跨平台的批量视频转码器：把剪辑软件导出的"体积失控的母版"压成"能发出去的交付版"，一套预设吃遍压缩、格式转换、代理与归档。客观为主，个人长期使用观察补充。信息核对时点：**2026-08**（1.11.x 主线；1.11 起新增 MOV 容器与 ProRes / DNxHR 编码器）。

## 概览

| 能力 | 说明 |
| --- | --- |
| 定位 | 面向**成片**的批量转码 / 压缩 GUI 工具 |
| 视频编码器 | x264 / x265（8/10/12-bit）/ SVT-AV1 / ProRes / DNxHR / FFV1 等 |
| 硬件加速 | Intel QSV · NVIDIA NVENC · AMD VCN · Apple VideoToolbox |
| 容器 | MP4 / M4V / MKV / WebM / MOV（1.11+） |
| 字幕 | 软字幕透传 / SRT 外挂导入 / 硬字幕烧录 |
| 批量 | 队列 + 文件夹批量扫描，一晚压完一个项目 |
| 平台 | Windows / macOS / Linux |

一句话：它不剪片、不做特效，只把"已经导出的视频"用最省心的方式变成"体积合适、格式正确"的交付文件。

## 获取与安装

### 官方下载

- **官网**：[handbrake.fr/downloads](https://handbrake.fr/downloads) 直接下载，无需注册账号，三平台安装包齐全；国内访问若慢，Windows 可走 `winget install HandBrake.HandBrake`，macOS 用 `brew install --cask handbrake`，Linux 推荐 Flathub 官方验证包（Ubuntu App Center 里的 snap 是社区维护、多年未更的旧包，避开）。
- **Windows 运行时注意**：1.11 起 UI 依赖 .NET Desktop Runtime 10.x，安装包会引导安装；装完双击没反应，先查运行时是否装齐，这是最高频的"开不了"原因。
- **版本选择**：正式版 1.11.x 即可；Nightly 构建只为尝鲜新编码器，不建议用于正式交付（输出规格可能变动）。

### 系统要求与硬件加速

- **平台**：Windows / macOS / Linux 全支持，三端界面与预设体系一致。
- **硬件编码**：QSV / NVENC / VCN / VideoToolbox 速度通常是软件编码的数倍，代价是**同码率下画质略逊** x265 / SVT-AV1 一档。赶时间的单文件用硬件编码；批量交付压画质，优先软件编码 + 队列过夜。
- **资源画像**：转码不吃内存（数 GB 即可），吃 CPU 与磁盘 I/O；队列页面会实时估算剩余空间，低于阈值自动暂停，防止把系统盘塞爆。

### 授权与成本

- **完全免费、开源（GPL v2，部分组件 BSD）**，无广告、无内购、无"专业版"分级，商用无限制。
- 官方明确**不支持绕过 DVD / Blu-ray 版权加密**（不随包分发 libdvdcss），有加密的正版碟先得用其他工具处理。

## 核心能力

### 定位与竞品坐标

- 对 **FFmpeg**：HandBrake 本质是"FFmpeg 能力的可视化子集 + 预设体系"，易用性完胜；FFmpeg 赢在无限灵活——无损转封装（`-c copy`）、多段拼接、抽帧、复杂滤镜链都能做，但要写命令。
- 对 **剪辑软件自带导出**：DaVinci / Premiere 直接导出交付版时确实不需要 HandBrake；但"把**已经导出的成片**二次压缩""把一批不同来源的文件统一成交付规格"这类活，HandBrake 比反复开工程渲染快得多，也不占剪辑工作站。
- 对 **VLC 的转换功能**：VLC Convert 是"应急手段"，没有质量控制（RF）与队列体系；HandBrake 是专门干这个的，详细分工见 [转码与压缩 · 总览](/contents/软件/视频/转码与压缩/总览.md)。
- 对 **格式工厂 / ShanaEncoder 类工具**：HandBrake 编码器跟进更快（SVT-AV1、新版 x265）、开源无广告无捆绑；国产工具胜在中文界面与本土格式习惯。

**独特卖点**：免费开源 + 跨平台 + 预设体系（`Fast 1080p30` 开箱即用）+ 恒定质量控制 + 批量队列。它是"给任何需要压视频的人推荐都不会错"的默认项。

### 核心功能

- **预设体系**：官方预设按"用途 → 分辨率/帧率 → 质量"三级组织（Fast / HQ / Super HQ，1080p / 2160p 等），选一个就能开压；自定义预设可保存、可设为默认、可导出 JSON 文件分发——把导出的 JSON 放进团队网盘或仓库，成员导入即得同一套规格，比口头约定"码率多少、RF 多少"靠谱得多。**团队统一交付规格靠的就是它**。
- **恒定质量（RF）**：推荐的码控模式。给定"目标质量"而非"目标码率"，安静镜头省码率、复杂镜头给足，画质稳定体积合理。与之相对的平均码率（ABR）模式适合有硬性体积上限的场景。
- **队列与批量**：单文件加队列、文件夹批量扫描后一键"全部加入队列"，挂机过夜是它的核心使用姿势。
- **滤镜链**：反交错（Yadif / BWDIF）、降噪（NLMeans / HQDN3D）、锐化、去色带、裁切（含自动检测黑边）、缩放、旋转、灰度——老素材翻新（DV / 老录像带数字化的画面修复）常用。
- **字幕**：源内软字幕（SRT / ASS / PGS）透传保留、外挂 SRT 导入、烧录硬字幕（不可逆，烧前想清楚）；MP4 对软字幕支持有限，多字幕轨需求优先 MKV。
- **音频**：AAC / HE-AAC / Opus / FLAC / AC-3 / E-AC-3 / MP3 / PCM（1.11+）编码，多音轨独立设置；TrueHD / DTS 等无损高清音轨可透传原样保留（规则见下文「音频透传」一节）。
- **章节**：源章节标记自动保留，也可手动重建——分集交付、按章节跳转的成片有用。
- **10-bit 与 HDR**：x265 10/12-bit 输出，HDR10 元数据透传；Dolby Vision 仅部分 profile 支持，深水区自行验证。

### RF 档位速查

| 目标 | x264 RF | x265 RF | 说明 |
| --- | --- | --- | --- |
| 高质量留档 | 16–18 | 18–20 | 肉眼难辨损失，体积仍明显小于母版 |
| 交付 / 网络发布 | 20–23 | 22–25 | 官方 Fast 系预设大致落在此区间 |
| 空间敏感 | 24–26 | 26–28 | 再往下画面开始糊，不建议交付用 |

> x265 / SVT-AV1 的 RF 标尺与 x264 不通用：同样数字下新编码器更耐压，按上表平移 2–4 档再微调。首次用新编码器，先压一段复杂镜头对比再批量。

### 工作流定位

```
剪辑软件导出母版（高码率、画质优先）
        ├─→ HandBrake 恒定质量压缩 → 交付版（发平台 / 发客户）
        ├─→ HandBrake 低分辨率预设 → 代理（回剪辑线粗剪）
        └─→ HandBrake FFV1 / ProRes 预设 → 长期归档（1.11+）
```

- **二次交付**：客户临时要一版"微信能传"的低规格文件，从母版直接压，不用重开剪辑工程。
- **规格统一**：多人协作时每人导出习惯不同，最后一律过同一个自定义预设，交付规格就统一了。
- **交付目标怎么定**：压成什么规格（码率 / 分辨率 / 编码器）参考 [母版与交付规格](/contents/交付与复盘/导出与分发/母版与交付规格.md) 与 [平台规格速查](/contents/交付与复盘/导出与分发/平台规格速查.md)——HandBrake 只管"压得准"，压成什么样由交付规格说了算。

## 上手与使用

### 常用操作速查

HandBrake 是重菜单的 GUI，快捷键不多，按"菜单路径"记忆更实用：

| 场景 | 操作路径 | 说明 |
| --- | --- | --- |
| 打开源 | `文件 → 打开源` 或直接拖拽 | 支持视频文件 / 文件夹 / DVD 与蓝光目录（无加密的） |
| 选预设 | 右侧预设栏 | 第一次先试 `Fast 1080p30` |
| 调质量 | `视频 → 质量（RF）` | 数值越小画质越高、体积越大 |
| 存自定义预设 | 预设栏 `+` 或右键保存 | 建议按交付平台命名（如"B 站交付"） |
| 批量 | `文件 → 添加全部到队列` | 文件夹扫描后一键全加 |
| 挂机压 | `队列 → 启动编码` | 显示进度与剩余时间 |
| 压前预览 | 预览按钮 | 可预览滤镜与画质，避免白压一轮 |

### 常用技巧

- **把自定义预设设为默认**：交付规格定下来后存成预设并设默认，以后每次打开就是"选文件 → 点开始"两步。
- **先试压 30 秒**：拖入源后用起止点截一小段复杂镜头（运动 / 水面 / 暗场）试压，确认画质体积再上批量，避免一晚白跑。
- **体积估算**：恒定质量模式下体积与内容复杂度相关，无法精确预估；用"试压 30 秒 × 总时长占比"粗算，误差通常可接受。
- **字幕三选一**：要客户端可关字幕 → 透传软字幕（MKV）；平台硬性要求内嵌 → 烧录；不确定 → 交付版烧录 + 母版保留软字幕轨。
- **音频透传**：源是多声道 AC-3 / E-AC-3 且目标平台支持时直接透传，避免 AAC 二次有损；立体声交付则统一 AAC。可用组合与坑见下一小节。
- **老素材翻新**：DV / 录像带素材先反交错再降噪，顺序别反；NLMeans 慢但效果好，批量挂机可接受。
- **硬件编码器取舍**：N卡用 NVENC、A卡用 VCN、Intel 核显用 QSV，画质敏感的交付版仍建议 x265 / SVT-AV1 软件编码。

### 音频透传：原样保留音轨

转码时**视频必然重编码，但音频可以完全保留原始数据**——HandBrake 的 Passthru（透传 / 直通）把源音轨的码流原样复制进新容器，不重新压缩，质量与采样率 100% 不变。能不能透传取决于两个条件：**音频编码类型** + **输出容器**。

**支持透传的常见组合**

| 音轨类型 | MP4 / M4V | MKV | 说明 |
| --- | --- | --- | --- |
| AAC / MP3 / Opus / Vorbis / ALAC / FLAC | 支持 | 支持 | 常规压缩与无损编码，两容器基本都能透传 |
| AC-3（Dolby Digital）/ E-AC-3（DD+） | 支持 | 支持 | 多声道环绕声，平台兼容时优先透传 |
| TrueHD / DTS / DTS-HD MA 等高清无损 | 兼容性差 | 支持 | **要留住这类音轨，输出格式必须切 MKV** |
| PCM | 视实现 | 支持 | 体积极大，通常改 FLAC 或走 MKV 透传 |

**设置方法**

1. 切到 **Audio（音频）** 标签页。
2. 在音轨的 **Codec（编码器）** 下拉菜单里，选带 **Passthru** 字样的选项：`Auto Passthru`（按源格式自动匹配，最省心）或指定格式的 `AAC Passthru` / `AC3 Passthru` / `E-AC3 Passthru` / `DTS Passthru` / `TrueHD Passthru` / `FLAC Passthru`。
3. 存预设时同样在 Audio 的编码器里选 `Auto Passthru`，整批文件就都走透传。

> 选了 Passthru 后，**Bitrate / Samplerate / Mixdown 会变灰失效**——因为不再编码。这也意味着**声道数原样保留**：源是 5.1 输出就是 5.1，想要立体声必须编码，不能靠透传降规格。

**注意事项与局限**

- **容器兼容性**：MP4 对 Dolby TrueHD、DTS 这类高清无损音轨的透传兼容性较差（塞进去播放器也可能不认），强行保留就把输出格式切换为 **MKV**。
- **静默回落**：源格式不被容器支持时，HandBrake 不会报错中止，而是自动回落到 Fallback 编码器（预设里的 `AudioEncoderFallback`，默认 `av_aac`）。所以压完要么看活动日志里的 fallback 提示，要么用 MediaInfo 核一下输出音轨编码是不是还是源格式——**别以为选了 Passthru 就一定是原音轨**。
- **只有音频能直通**：透传只做到"不改动音频"，视频部分依然会被重编码，HandBrake 不支持视频流的直接复制。若连视频也要无损直通（仅改封装的 remux），那是 FFmpeg `-c copy` 的活，见 [转码与压缩 · 总览](/contents/软件/视频/转码与压缩/总览.md)。
- **透传 ≠ 一定更好**：源音轨本身码率虚高（如 640 kbps 的 AC-3 立体声）时，重编码成 AAC 128–160 kbps 听感几乎无差却省下大量体积；只有"多声道环绕"或"无损母版留存"才值得为透传放弃体积。

### 实战预设：归档压缩（JJH 系）

下面两套是日常归档视频时实际在用的预设，覆盖 4K 与 1080p 两档，本质是"x265 + 恒定质量 + MP4 容器 + 立体声 AAC"的长期留存策略。需要可直接导入（导入方法见本小节末）。

| 参数 | JJH 2160p 4K H265 | JJH 1080p H265（No Chapiter） |
| --- | --- | --- |
| 视频编码 | x265（HEVC） | x265（HEVC） |
| 质量 RF | 22.5 | 23 |
| 编码器预设 | medium | medium |
| 帧率模式 | CFR | CFR |
| 多遍 | 开（含 Turbo 多遍） | 开（含 Turbo 多遍） |
| 分辨率 | 3840×2160，不放大 | 1920×1080，不放大 |
| 容器 | MP4 | MP4 |
| 音频 | AAC 160 kbps 立体声 | AAC 160 kbps 立体声 |
| 章节 | 关 | 关 |
| 字幕 | 自动探测强制字幕（foreign）并烧录，无则跳过 | 同左 |
| 色彩 / HDR | 透传（含 HDR 动态元数据） | 透传（含 HDR 动态元数据） |
| 反交错 | decomb（默认） | decomb（默认） |
| 去块 | 关 | 开（`strength=strong:thresh=20`） |

**取舍解读**

- **RF 22.5 / 23 的落点**：对照前文 RF 档位表，这两套落在"留档偏上、交付偏下"区间——比纯母版级（x265 RF 18–20）更舍得压体积，比网络交付（RF 22–25）略收一点质量。是"既要存得久、又要存得下"的务实点；若做母版级长期留存，可下探到 20 附近。
- **x265 而非 H.264**：同画质体积小很多，适合长期存储；代价是老设备硬解慢，但归档文件本就不追求随时秒开。
- **保持原始分辨率、不放大**：归档只压画质、不降分辨率，避免二次丢失细节；`PictureUseMaximumSize` 开、`AllowUpscaling` 关保证这一点。
- **MP4 而非 MKV**：归档走 MP4 是为了最大兼容（相册 / 电视 / 网盘直读），代价是软字幕支持弱——所以这两套不设软字幕轨、默认只烧录可能存在的强制字幕；需要可关字幕轨时改走 MKV。
- **多遍 + Turbo**：恒定质量下多遍主要改善码率分配、几乎不增画质；开 Turbo 是为了"画质优先、时间可接受"的折中。
- **关章节**：归档母版本身带章节意义不大，且 MP4 章节兼容性参差，统一关掉更省心（命名里 No Chapiter 即此意）。

> 这两套的"留档哲学"是**有损压缩式归档**：靠 x265 在可接受体积内尽量保画质，而非 FFV1 / ProRes 那种无损数字保存。前者适合个人创作者多年留存，后者适合机构级数字典藏——见 [转码与压缩 · 总览](/contents/软件/视频/转码与压缩/总览.md) 的归档选型说明。

**导入方法**：把下面任一代码块整段复制到本地、存成 `.json` 文件（如 `handbrake-4k.json` / `handbreake-1080p.json`），再到 HandBrake 顶部 `预设 → 导入预设`（或预设栏右键）选中该文件即可；导入后在预设栏可见 `JJH 2160p 4K H265` 与 `JJH 1080p H265`。把这两个 JSON 放进团队网盘 / 仓库，全队导入即得同一套归档规格。

**JJH 2160p 4K H265**（4K 归档）

```json
{
  "PresetList": [
    {
      "AlignAVStart": true,
      "AudioCopyMask": [ "copy:aac" ],
      "AudioEncoderFallback": "av_aac",
      "AudioLanguageList": [],
      "AudioList": [
        {
          "AudioBitrate": 160,
          "AudioCompressionLevel": 0,
          "AudioEncoder": "av_aac",
          "AudioMixdown": "stereo",
          "AudioNormalizeMixLevel": false,
          "AudioSamplerate": "auto",
          "AudioTrackQualityEnable": false,
          "AudioTrackQuality": -1,
          "AudioTrackGainSlider": 0,
          "AudioTrackDRCSlider": 0
        }
      ],
      "AudioSecondaryEncoderMode": true,
      "AudioTrackSelectionBehavior": "first",
      "AudioTrackNamePassthru": true,
      "AudioAutomaticNamingBehavior": "unnamed",
      "ChapterMarkers": false,
      "ChildrenArray": [],
      "Default": false,
      "FileFormat": "av_mp4",
      "Folder": false,
      "FolderOpen": false,
      "Optimize": false,
      "Mp4iPodCompatible": false,
      "PictureCropMode": 0,
      "PictureBottomCrop": 0,
      "PictureLeftCrop": 0,
      "PictureRightCrop": 0,
      "PictureTopCrop": 0,
      "PictureDARWidth": 0,
      "PictureDeblockPreset": "off",
      "PictureDeblockTune": "medium",
      "PictureDeblockCustom": "",
      "PictureDeinterlaceFilter": "decomb",
      "PictureCombDetectPreset": "default",
      "PictureCombDetectCustom": "",
      "PictureDeinterlacePreset": "default",
      "PictureDeinterlaceCustom": "",
      "PictureDenoiseCustom": "",
      "PictureDenoiseFilter": "off",
      "PictureSharpenCustom": "",
      "PictureSharpenFilter": "off",
      "PictureSharpenPreset": "medium",
      "PictureSharpenTune": "none",
      "PictureDetelecine": "off",
      "PictureDetelecineCustom": "",
      "PictureColorspacePreset": "off",
      "PictureColorspaceCustom": "",
      "PictureChromaSmoothPreset": "off",
      "PictureChromaSmoothTune": "none",
      "PictureChromaSmoothCustom": "",
      "PictureItuPAR": false,
      "PictureKeepRatio": true,
      "PicturePAR": "auto",
      "PicturePARWidth": 0,
      "PicturePARHeight": 0,
      "PictureWidth": 3840,
      "PictureHeight": 2160,
      "PictureUseMaximumSize": true,
      "PictureAllowUpscaling": false,
      "PictureForceHeight": 0,
      "PictureForceWidth": 0,
      "PicturePadMode": "none",
      "PicturePadTop": 0,
      "PicturePadBottom": 0,
      "PicturePadLeft": 0,
      "PicturePadRight": 0,
      "PicturePadColor": "black",
      "PresetName": "JJH 2160p 4K H265",
      "Type": 1,
      "SubtitleAddCC": false,
      "SubtitleAddForeignAudioSearch": true,
      "SubtitleAddForeignAudioSubtitle": false,
      "SubtitleBurnBehavior": "foreign",
      "SubtitleBurnBDSub": false,
      "SubtitleBurnDVDSub": false,
      "SubtitleLanguageList": [],
      "SubtitleTrackSelectionBehavior": "none",
      "SubtitleTrackNamePassthru": true,
      "VideoAvgBitrate": 0,
      "VideoColorRange": "auto",
      "VideoColorMatrixCode": 0,
      "VideoEncoder": "x265",
      "VideoFramerateMode": "cfr",
      "VideoGrayScale": false,
      "VideoScaler": "swscale",
      "VideoPreset": "medium",
      "VideoTune": "",
      "VideoProfile": "auto",
      "VideoLevel": "auto",
      "VideoOptionExtra": "",
      "VideoQualityType": 2,
      "VideoQualitySlider": 22.5,
      "VideoMultiPass": true,
      "VideoTurboMultiPass": true,
      "VideoPasshtruHDRDynamicMetadata": "all",
      "x264UseAdvancedOptions": false,
      "PresetDisabled": false,
      "MetadataPassthru": true
    }
  ],
  "VersionMajor": 67,
  "VersionMicro": 0,
  "VersionMinor": 0
}
```

**JJH 1080p H265 Medium No Chapiter**（1080p 归档，开去块）

```json
{
  "PresetList": [
    {
      "AlignAVStart": true,
      "AudioCopyMask": [ "copy:aac" ],
      "AudioEncoderFallback": "av_aac",
      "AudioLanguageList": [],
      "AudioList": [
        {
          "AudioBitrate": 160,
          "AudioCompressionLevel": 0,
          "AudioEncoder": "av_aac",
          "AudioMixdown": "stereo",
          "AudioNormalizeMixLevel": false,
          "AudioSamplerate": "auto",
          "AudioTrackQualityEnable": false,
          "AudioTrackQuality": -1,
          "AudioTrackGainSlider": 0,
          "AudioTrackDRCSlider": 0
        }
      ],
      "AudioSecondaryEncoderMode": true,
      "AudioTrackSelectionBehavior": "first",
      "AudioTrackNamePassthru": true,
      "AudioAutomaticNamingBehavior": "unnamed",
      "ChapterMarkers": false,
      "ChildrenArray": [],
      "Default": false,
      "FileFormat": "av_mp4",
      "Folder": false,
      "FolderOpen": false,
      "Optimize": false,
      "Mp4iPodCompatible": false,
      "PictureCropMode": 0,
      "PictureBottomCrop": 0,
      "PictureLeftCrop": 0,
      "PictureRightCrop": 0,
      "PictureTopCrop": 0,
      "PictureDARWidth": 0,
      "PictureDeblockPreset": "off",
      "PictureDeblockTune": "medium",
      "PictureDeblockCustom": "strength=strong:thresh=20:blocksize=8",
      "PictureDeinterlaceFilter": "decomb",
      "PictureCombDetectPreset": "default",
      "PictureCombDetectCustom": "",
      "PictureDeinterlacePreset": "default",
      "PictureDeinterlaceCustom": "",
      "PictureDenoiseCustom": "",
      "PictureDenoiseFilter": "off",
      "PictureSharpenCustom": "",
      "PictureSharpenFilter": "off",
      "PictureSharpenPreset": "medium",
      "PictureSharpenTune": "none",
      "PictureDetelecine": "off",
      "PictureDetelecineCustom": "",
      "PictureColorspacePreset": "off",
      "PictureColorspaceCustom": "",
      "PictureChromaSmoothPreset": "off",
      "PictureChromaSmoothTune": "none",
      "PictureChromaSmoothCustom": "",
      "PictureItuPAR": false,
      "PictureKeepRatio": true,
      "PicturePAR": "auto",
      "PicturePARWidth": 0,
      "PicturePARHeight": 0,
      "PictureWidth": 1920,
      "PictureHeight": 1080,
      "PictureUseMaximumSize": true,
      "PictureAllowUpscaling": false,
      "PictureForceHeight": 0,
      "PictureForceWidth": 0,
      "PicturePadMode": "none",
      "PicturePadTop": 0,
      "PicturePadBottom": 0,
      "PicturePadLeft": 0,
      "PicturePadRight": 0,
      "PicturePadColor": "black",
      "PresetName": "JJH 1080p H265 Medium No Chapiter",
      "Type": 1,
      "SubtitleAddCC": false,
      "SubtitleAddForeignAudioSearch": true,
      "SubtitleAddForeignAudioSubtitle": false,
      "SubtitleBurnBehavior": "foreign",
      "SubtitleBurnBDSub": false,
      "SubtitleBurnDVDSub": false,
      "SubtitleLanguageList": [],
      "SubtitleTrackSelectionBehavior": "none",
      "SubtitleTrackNamePassthru": true,
      "VideoAvgBitrate": 0,
      "VideoColorRange": "auto",
      "VideoColorMatrixCode": 0,
      "VideoEncoder": "x265",
      "VideoFramerateMode": "cfr",
      "VideoGrayScale": false,
      "VideoScaler": "swscale",
      "VideoPreset": "medium",
      "VideoTune": "",
      "VideoProfile": "auto",
      "VideoLevel": "auto",
      "VideoOptionExtra": "",
      "VideoQualityType": 2,
      "VideoQualitySlider": 23,
      "VideoMultiPass": true,
      "VideoTurboMultiPass": true,
      "VideoPasshtruHDRDynamicMetadata": "all",
      "x264UseAdvancedOptions": false,
      "PresetDisabled": false,
      "MetadataPassthru": true
    }
  ],
  "VersionMajor": 67,
  "VersionMicro": 0,
  "VersionMinor": 0
}
```

### 使用体验速记

> 以下为长期使用观察（待你按真实体验校订）：默认预设开箱即用，新手第一次压视频几乎零学习成本；批量队列挂机过夜是最有价值的用法，白天机器干别的；界面参数密度高，但 90% 场景只动"预设 + RF"两项；Windows 端 .NET 运行时缺装是最常见的"打不开"；MP4 字幕兼容坑踩过一次后，多字幕交付都改走 MKV。

## 适用人群与误区

### 优缺点

**优点**

- 免费开源、全平台、无广告无捆绑。
- 预设体系成熟，新手一键、团队能统一规格。
- 恒定质量模式省心，画质稳定。
- 队列与文件夹批量，规模化压缩效率高。
- 编码器跟进快（SVT-AV1 / ProRes / DNxHR / FFV1），归档与制作向格式都覆盖。

**缺点**

- **不支持视频流直通**：必然重新编码，"无损转封装（remux）"做不了——那是 FFmpeg `-c copy` 的活。
- 不能合并多个源、不能剪辑拼接，只做"一进一出"。
- 参数界面信息密度高，第一次面对满屏选项会懵。
- MP4 容器字幕支持有限；Dolby Vision 支持不完整。

### 适用 / 不适用人群

- **适用**：需要批量压缩交付版的视频创作者；要统一团队交付规格的小团队；老素材翻新（反交错降噪）；归档需求（FFV1）；不想碰命令行的人。
- **不适用**：只需改容器不重编码 → FFmpeg；要剪辑 / 拼接 / 加片头 → 剪辑软件；音频文件转码为主 → 见 [音频 · 播放与转码](/contents/软件/音频/播放与转码/总览.md)。

### 常见误区

- "HandBrake 无损压缩"——**不存在**：它必然重编码；"视觉无损"靠低 RF 实现，真无损只有 FFV1 / ProRes 这类编码或转封装。
- "硬件编码更好"——更快但**同码率画质略逊**软件编码，画质敏感场景别贪快。
- "RF 调到最低最稳"——体积暴涨、上传更慢，交付完全没必要。
- "把平台下载的视频再压一遍"——源已是高压缩有损文件，二次压缩画质崩得快。
- "预设名里的 Fast 指播放更快"——Fast / HQ 说的是**压缩侧**取舍：Fast 压得快、同画质体积略大；HQ / Super HQ 压得慢、体积更省，批量时长会明显拉长，与成片播放流畅度无关。
- "10-bit 交付更高级"——10-bit 输出（HEVC / AV1）在部分老设备与浏览器上无法硬解，会直接黑屏或软解卡顿；除非做 HDR 或渠道明确支持，交付默认仍选 8-bit。
- "HandBrake 能拷加密 DVD"——官方不支持绕过版权保护。

## 自查与延伸

### 自查清单

- 体积太大 → RF 上调一档，或换 x265 / SVT-AV1。
- 画质糊 → RF 下调，检查是否误用硬件编码器。
- 平台拒收 → 对照平台规格检查容器 / 编码器 / 分辨率组合。
- 字幕丢失 → MP4 软字幕兼容问题，改烧录或换 MKV。
- 队列中途停 → 检查目标磁盘剩余空间提示。
- 无损音轨丢了 / 音轨被转码 → 输出容器改 MKV，Codec 选对应 Passthru，并核对是否触发了 fallback。
- 打不开软件（Windows）→ 检查 .NET Desktop Runtime 10.x。

### 延伸阅读

- 同角色选型对比见 [转码与压缩 · 总览](/contents/软件/视频/转码与压缩/总览.md)。
- 应急单文件转码见 [VLC](/contents/软件/视频/播放/VLC.md)。
- 压成什么规格：[母版与交付规格](/contents/交付与复盘/导出与分发/母版与交付规格.md) · [平台规格速查](/contents/交付与复盘/导出与分发/平台规格速查.md)。
- 剪辑线内的导出工艺见 [DaVinci](/contents/软件/视频/剪辑与调色/DAVINCI.md)。
