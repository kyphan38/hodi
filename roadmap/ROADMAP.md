# hodi - Implementation Roadmap

App nhật ký tối giản. Next.js (static export) + Firebase (Auth + Firestore) + Vercel.
Một người dùng duy nhất, iPhone + Mac, giao diện tiếng Anh, viết tiếng Việt/Anh tuỳ ý.

Cùng hệ sinh thái với fina/logi/noda (Firebase project riêng, Google login 1 email, format
icon, PWA), nhưng **cố ý khác** ở hai chỗ: không có server, và giao diện "tờ giấy".

---

## Nguyên tắc xuyên suốt (áp dụng cho MỌI stage)

Bất biến. Agent thực thi không được đổi mà không hỏi.

1. **Mở app → con trỏ đã ở trang hôm nay.** Không menu, không nút "New".
2. **Một ngày = một doc**, id = ngày local `YYYY-MM-DD`. **Ngày bắt đầu lúc 04:00**: viết
   lúc 01:00 vẫn là trang hôm trước. Mọi chỗ tính "hôm nay" đi qua `dayOf()` (`src/lib/day.ts`).
3. **Chữ thô.** `textarea` thuần; đọc lại bằng `white-space: pre-wrap`. Không toolbar,
   không render markdown.
4. **Không bao giờ mất chữ.** Autosave ~1s + flush khi ẩn tab/rời trang + nháp localStorage.
   Có chữ chưa lưu mà server đổi → gộp (`mergeTexts`), không bỏ bên nào.
5. **Không áp lực.** Không streak, không thông báo, không huy hiệu, không mục tiêu số chữ.
   Tối đa 1 câu hỏi gợi ý mỗi ngày, bỏ qua được.
6. **Không xoá dữ liệu.** Rules `allow delete: if false`.
7. **Đơn sắc.** Màu chỉ mang nghĩa (độ đậm heatmap). SVG `currentColor`, không emoji.
8. **Không server.** Không API route, không secret phía server. Bảo vệ dữ liệu = Firestore
   rules, kiểm cả uid lẫn email.
9. **Yên lặng.** Không toast/popup. Trạng thái lưu = một chấm nhỏ.
10. **Riêng tư.** Tiêu đề tab luôn là "hodi"; làm mờ khi app bị ẩn; sign out xoá cache trên máy.
11. **iPhone PWA là target chính**; Mac là màn hình thứ hai.
12. **Tối giản.** Ý mới → ghi vào "Để sau" bên dưới, không tự làm.

---

## Mô hình dữ liệu (project `kyphan38-hodi-app`, DB `(default)`, `asia-southeast1`)

```ts
// users/{uid}/entries/{YYYY-MM-DD}
{ date: string; md: string /* 'MM-DD' */; text: string; words: number;
  prompt: string | null /* câu hỏi đang hiện lúc trang ra đời */;
  createdAt: number; updatedAt: number }

// users/{uid}/reviews/{'2026-W40' | '2026-10'}
{ kind: 'week' | 'month'; period: string; text: string; words: number;
  createdAt: number; updatedAt: number }
```

Tuỳ chọn (theme, cỡ chữ, câu hỏi on/off, typewriter) lưu **localStorage theo máy**: theme
phải có trước lần vẽ đầu tiên, Firestore thì quá muộn.

Rules sinh từ `firestore.rules.template` bằng `npm run rules` (email lấy từ `.env.local`,
file sinh ra không commit).

---

## Bảng stage

| Stage | Tên | Kết quả kiểm chứng được |
|---|---|---|
| 0 | Setup (chủ app) | Firebase project + Vercel + domain + env |
| 1 | Khung + Today | Đăng nhập, viết hôm nay, autosave, offline, mốc giờ, theme |
| 2 | Days | Search, heatmap, random day, timeline, đọc/sửa ngày cũ, On this day |
| 3 | Review + Settings | Review tuần/tháng, export `.md`, cỡ chữ |
| 4 | Chi tiết + ra mắt | Typewriter, vuốt/phím đổi ngày, README, hub, deploy, iPhone |

## Stage 0 - Setup (chủ app làm trên console)

1. Firebase Console → tạo project `kyphan38-hodi-app`.
2. Authentication → bật Google. Settings → Authorized domains → thêm `hodi.kyphan38.com`.
3. Firestore → tạo database `(default)` ở `asia-southeast1`.
4. Project settings → Web app → chép config vào `.env.local` (xem `.env.example`).
5. `npm run rules && firebase deploy --only firestore:rules,firestore:indexes`.
6. Vercel → import repo, domain `hodi.kyphan38.com`, thêm các biến `NEXT_PUBLIC_*`.

## Những gì KHÔNG làm

- Backup/restore `.json` (Firestore là nguồn chính, export `.md` là đủ).
- Tag, highlight, ảnh, mood, AI, thông báo, streak, mục tiêu số chữ.
- Khoá Face ID ở v1. Markdown render. Nhiều bài trong một ngày.
- Gợi ý Add to Home Screen, tự mờ khi không dùng, nhắc viết bù, theme theo giờ,
  âm thanh/rung, splash screen iOS, tự tiếp danh sách `- `, xoay ngang, link bấm được.

## Để sau

- Heatmap chọn năm (khi có > 1 năm dữ liệu).
- Khoá Face ID (passkey).

## Nhật ký quyết định

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-10-05 | Static export, login chỉ ở client, email check trong rules | Mở nhanh, offline tốt, ít secret; app chỉ có chữ, không cần server |
| 2026-10-05 | Firestore + offline cache, không mã hoá đầu-cuối ở v1 | Sync iPhone ↔ Mac; passphrase dễ quên = mất hết |
| 2026-10-05 | Ngày bắt đầu 04:00 | Hay viết khuya |
| 2026-10-05 | Giao diện "tờ giấy", không tab bar | App để ngồi với chính mình, không phải dashboard |
| 2026-10-05 | HTML trong SW là stale-while-revalidate | Mở là có trang ngay; dữ liệu nằm ở Firestore nên HTML cũ một build vẫn đúng |
| 2026-10-05 | Tuỳ chọn lưu localStorage, không Firestore | Theme cần trước lần vẽ đầu; đơn giản hơn |
| 2026-10-05 | Emulator đăng nhập bằng Google credential giả | Popup/redirect cần iframe khác origin mà trình duyệt test chặn |
| 2026-10-05 | Bảng màu xám trung tính (nền `#fafafa` / `#111111`, icon `#141414`) | Nền kem + icon nâu nhìn "sến"; xám không pha màu khớp hub đơn sắc |
