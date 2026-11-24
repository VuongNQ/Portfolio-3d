# Portfolio 3D

Portfolio dạng timeline cuộn dọc: 9 năm kinh nghiệm và các dự án cá nhân năm 2026, mỗi mốc là một "trạm" 3D dựng bằng Three.js. Nội dung là HTML tĩnh sinh lúc build, cảnh 3D chỉ tô điểm và tải sau khi trang đã hiển thị.

## Chạy trên máy

Node.js 22.18+ hoặc 24.

```sh
npm ci
npm run dev      # server phát triển
npm run check    # type check, build và unit test
npm run preview  # xem bản build
```

## Sửa nội dung

Toàn bộ nội dung nằm trong [`content/timeline.json`](content/timeline.json): HTML và cảnh 3D cùng đọc từ file này. Build sẽ dừng nếu dữ liệu sai: thiếu `ai.split` cho dự án có AI cùng viết, ngày sai định dạng, trạm không theo thứ tự thời gian, link không phải https, hoặc có email hay số điện thoại.

Mức dùng AI (`ai.level`) có 3 giá trị:

| Giá trị | Nhãn | Khi nào dùng |
| --- | --- | --- |
| `none` | No AI | Không dùng AI |
| `assist` | AI suggestions | Autocomplete, hỏi đáp |
| `cowrite` | Co-written with AI | Agent lên kế hoạch hoặc sinh code; bạn định hướng, review và merge. Bắt buộc có `ai.split` (Me / AI / Check it) |

`visual` chọn cảnh 3D cho trạm: `org-tree`, `stream`, `gauge`, `handheld`, `stairs`, `triangle`. Hai trạm cùng `org-tree` được nối bằng một đường cong nét đứt.

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `vite.config.ts` | Plugin chèn HTML từ timeline vào `index.html` và kiểm tra dữ liệu |
| `src/content/` | Kiểu dữ liệu, kiểm tra, render HTML |
| `src/main.ts` | Bật lớp 3D khi có WebGL 2, sau sự kiện `load` và lúc trình duyệt rảnh |
| `src/scroll.ts` | Chuyển vị trí cuộn thành tiến độ 0–1 trên ray, không chặn cuộn gốc |
| `src/scene/` | Renderer, ray camera, cảnh từng trạm, cấu hình chất lượng |
| `tests/` | Unit test chạy bằng `node --test` |

## Hiệu năng và truy cập

- Three.js là chunk riêng (~128 KB gzip), không preload, tải sau LCP. CI chặn tổng JS vượt 1,5 MB gzip.
- Hai cấu hình chất lượng: `full` (pixel ratio ≤ 2, khử răng cưa, 600 hạt) và `low` (pixel ratio 1, 160 hạt). Màn hình hẹp, máy ≤ 4 nhân hoặc bật tiết kiệm dữ liệu bắt đầu ở `low`. Nếu p95 thời gian khung vượt 20 ms trên 120 khung, trang tự hạ xuống `low`.
- Dừng render khi tab bị ẩn; mất WebGL context thì chuyển về nền tĩnh. Rời trang thì giải phóng geometry, material và renderer.
- `prefers-reduced-motion`: camera không bay mà chuyển giữa các trạm bằng fade, cảnh đứng yên.
- Tắt JavaScript hoặc không có WebGL 2 vẫn đọc được toàn bộ nội dung. Canvas có `aria-hidden`, có skip link và mục lục.

Ghi số đo thật vào [docs/benchmark.md](docs/benchmark.md).

## Triển khai

GitHub Pages qua GitHub Actions ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)): mỗi lần push lên `main`, workflow chạy `npm run check` rồi deploy `dist/`. Bật một lần trong **Settings → Pages → Build and deployment → Source: GitHub Actions**. Địa chỉ: <https://vuongnq.github.io/Portfolio-3d/>.

Vite dùng `base: './'` (URL tương đối), nên cùng một bản build chạy được ở subpath `/Portfolio-3d/`, ở domain riêng, hay trên Cloudflare Pages.
