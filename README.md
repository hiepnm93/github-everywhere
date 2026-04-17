# GitHub Everywhere

Browser extension (Manifest V3) biến giao diện bất kỳ trang web nào sang phong
cách GitHub — màu sắc, font, bo viền, button, table, code block…

## Phiên bản hiện tại

**v1.1.7** - Profile Page Support

## Tính năng chính

- **Complete VOZ.vn transformation**: Đầy đủ chức năng với GitHub design
  - **Homepage**: Hiển thị danh sách forums như GitHub Trending
  - **Forum list**: Hiển thị threads như GitHub Pull Request list
  - **Thread detail**: Hiển thị comments như GitHub Issue/PR detail
  - **Auth pages**: Login/Register form đơn giản, GitHub style
- **Multi-page support**: Hỗ trợ nhiều loại trang với transformation phù hợp
- **GitHub navigation**: Header với Login/Register links
- **Smart breadcrumbs**: Extract từ DOM, clickable links
- **Pagination**: Hoạt động cho forum list và thread detail
- **Avatar display**: Hiển thị avatar user trong threads
- **Content filtering**: Tự động ẩn quảng cáo và comments trống
- **Theme support**: Light/Dark themes với GitHub color tokens
- **Responsive**: Tối ưu cho mobile

## Cài đặt

### Chromium (Chrome, Edge, Brave, Arc)

1. Mở `chrome://extensions`
2. Bật **Developer mode**
3. Click **Load unpacked** → chọn thư mục `github-everywhere/`

### Firefox

1. Mở `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → chọn `manifest.json`

## Sử dụng

1. Click extension icon
2. Enable cho hostname (ví dụ: `voz.vn`)
3. Chọn theme: Auto / Light / Dark
4. Reload trang web
5. Giao diện sẽ tự động transform sang GitHub style

## Tính năng VOZ.vn Transformation

### Homepage (https://voz.vn/)
- Hiển thị danh sách forums dạng GitHub repository items
- Icon màu xanh lá cây
- Threads/Messages counts
- Sub-forums với clickable links

### Forum List (/f/*, /s/*)
- Avatar người tạo thread
- Thread prefix badges
- Stats: Replies, Views
- Pagination với page numbers
- Breadcrumb navigation

### Thread Detail (/t/*)
- GitHub Issue/PR style layout
- Comment avatars (40x40)
- Author badges (Original Poster, Senior Member)
- Timestamps format
- Content với ads removed
- Reply box
- Pagination

### Auth Pages (/login, /register)
- Form đơn giản, canh giữa
- GitHub-style inputs
- Green submit button
- Header với navigation

### Profile Pages (/u/*)
- GitHub profile style layout
- Avatar lớn (296x296)
- Username, user title, join date
- Stats: Messages, Likes
- About section
- Recent activity section

## Cấu trúc

```
github-everywhere/
├── manifest.json           # v1.0.8
├── background.js          # Service worker: quản lý state
├── content.js             # Main content script
├── popup.html
├── popup.css
├── popup.js               # UI toggle
├── styles/
│   └── base.css          # Base GitHub styles
├── sites/
│   ├── voz.vn.css       # VOZ CSS overrides
│   └── voz.vn.js        # VOZ HTML transformation (NEW)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Site Configuration

Để thêm site mới, trong `content.js`:

```javascript
const siteMap = {
  "voz.vn": {
    css: "sites/voz.vn.css",
    js: "sites/voz.vn.js"
  }
};
```

### CSS Files (sites/*.css)
Override styles cho site. Biến colors:

```css
--ghx-bg-canvas, --ghx-bg-subtle, --ghx-bg-muted
--ghx-border, --ghx-border-muted
--ghx-fg-default, --ghx-fg-muted, --ghx-fg-subtle
--ghx-accent, --ghx-accent-emphasis
--ghx-success, --ghx-danger
--ghx-btn-bg, --ghx-btn-hover
--ghx-radius, --ghx-radius-lg
```

### JS Files (sites/*.js)
Transform HTML cho pages. Export `init()` function:

```javascript
export function init() {
  const type = detectPageType();
  if (type === "thread-detail") {
    transformThreadDetailPage();
  } else if (type === "home") {
    transformHomePage();
  }
  // ...
}
```

## Page Types

- **home**: Homepage (forum index)
- **thread-detail**: Thread detail pages
- **forum-list**: Forum/subforum list
- **profile**: User profile pages
- **auth**: Login/Register pages

## Kỹ thuật

- **DOM Manipulation**: Ẩn VOZ elements, inject GitHub HTML
- **Content Extraction**: Extract data từ VOZ DOM
- **CSS Variables**: GitHub Primer design tokens
- **Event Delegation**: Reliable event handling
- **CSS Specificity**: `!important` để override VOZ styles
- **Responsive Design**: Mobile-friendly layouts

## Roadmap

- [ ] Thêm sites khác (tuhu, tinhte,...)
- [ ] Theme customization
- [ ] Export/Import settings
- [ ] Performance optimization
- [ ] Firefox store submission

## Giới hạn

- Một số sites dùng inline styles mạnh có thể không override hết
- Javascript-heavy apps có thể load chậm hơn
- Needs reload để áp dụng changes

## License

MIT

