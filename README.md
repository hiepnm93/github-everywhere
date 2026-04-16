# GitHub Everywhere

Browser extension (Manifest V3) biến giao diện bất kỳ trang web nào sang phong
cách GitHub — màu sắc, font, bo viền, button, table, code block…

## Tính năng

- **CSS base** đè lên mọi site: font system, palette Primer-inspired (light + dark), `--ghx-*` design tokens.
- **Site overrides**: hiện có `sites/voz.css` cho voz.vn (xenforo). Thêm site mới chỉ cần thêm file CSS và 1 dòng vào `content.js`.
- **Popup**: toggle bật/tắt toàn cục, toggle per-host, chọn theme (auto/light/dark).
- **Không cần quyền đặc biệt**: chỉ `storage` + inject CSS qua `scripting` API.

## Cài đặt

### Chromium (Chrome, Edge, Brave, Arc)

1. Mở `chrome://extensions`
2. Bật **Developer mode**
3. Click **Load unpacked** → chọn thư mục `github-everywhere/`

### Firefox

1. Mở `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → chọn `manifest.json`

## Thêm site mới

1. Tạo `sites/<domain>.css` với các override
2. Trong `content.js` thêm vào `siteMap`:
   ```js
   const siteMap = {
     "voz.vn": "sites/voz.css",
     "example.com": "sites/example.css"
   };
   ```
3. Reload extension

Các biến CSS có sẵn để dùng trong override:

```
--ghx-bg-canvas, --ghx-bg-subtle, --ghx-bg-muted
--ghx-border, --ghx-border-muted
--ghx-fg-default, --ghx-fg-muted, --ghx-fg-subtle
--ghx-accent, --ghx-accent-emphasis
--ghx-danger, --ghx-success, --ghx-attention, --ghx-done
--ghx-btn-bg, --ghx-btn-hover, --ghx-btn-border
--ghx-shadow-sm, --ghx-shadow-md
--ghx-font-sans, --ghx-font-mono
--ghx-radius, --ghx-radius-lg
```

## Cấu trúc

```
github-everywhere/
├── manifest.json
├── background.js       # service worker: quản lý state
├── content.js          # inject CSS theo hostname
├── popup.html
├── popup.css
├── popup.js            # UI toggle
├── styles/
│   └── base.css        # override toàn cục
├── sites/
│   └── voz.css         # override voz.vn
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Giới hạn

- Chỉ override CSS, không sửa layout. Site nào dùng iframe nặng hoặc inline style !important sẽ không đổi hết.
- Icon sample placeholder — thay bằng icon riêng nếu muốn public.
