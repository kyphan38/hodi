# PLAN-motion - hodi: chuyển động (rất ít)

Viết ngày 2026-10-21 để giao cho một AI khác làm (hoặc làm trong phiên
này). Owner chưa duyệt: hỏi owner trước khi bắt đầu P1.

**hodi là app yên lặng nhất.** DESIGN.md xếp hodi vào nhóm "minimal": giữ
những gì đã có, chỉ thêm đúng chỗ người dùng đang nhìn thấy một thay đổi.
Plan này chỉ có hai phase nhỏ. Không thêm tính năng, không đổi bố cục.

## Prompt để dán cho AI làm

```
Work in /Users/kyphan/ws/app/hodi. Read ws/app/AGENTS.md, hodi/AGENTS.md,
hodi/roadmap/ROADMAP.md (the invariants), ws/app/DESIGN.md (sections
"Motion" and "Layout") and hodi/PLAN-motion.md first. Implement only phase
<P1> from PLAN-motion.md, exactly as written. Follow "Quy tắc cho mọi
phase", "CSS dùng chung" and "Lỗi hay gặp". Run every command in "Kiểm tra
mỗi phase" and fix all failures you caused. Then update README.md (Motion
section) and the "Tiến độ" list, commit only the files you changed on main
(no Co-Authored-By) and stop. Do not push unless I ask. Tell me in
Vietnamese, in short simple sentences, what changed and how to try it. Do
not start the next phase.
```

Đổi `<P1>` thành phase muốn làm. Mỗi lần chỉ một phase.

## Đọc trước khi làm

1. `ws/app/AGENTS.md` và `hodi/AGENTS.md`: không em dash (U+2014), code và
   comment bằng tiếng Anh, chữ trên UI càng ít càng tốt, không ghi
   `Co-Authored-By`. **hodi: chỉ commit, không push** nếu owner không bảo.
   Next.js ở đây là bản 16: đọc docs trong `node_modules/next/dist/docs/`
   nếu đụng tới API của Next.
2. `hodi/roadmap/ROADMAP.md`, phần "Nguyên tắc xuyên suốt". Các bất biến
   liên quan tới chuyển động:
   - **#1** Mở app là con trỏ đã ở trang hôm nay. Không gì chạy lúc mở.
   - **#5** Không áp lực: không đếm, không nhắc, không mừng.
   - **#9** Yên lặng: không toast, không popup, trạng thái lưu là một chấm.
   - **#10** Riêng tư: làm mờ khi app bị ẩn (`html.veiled`, **giữ nguyên**,
     đó không phải hiệu ứng trang trí).
   - **#12** Tối giản: ý mới ghi vào "Để sau", không tự làm.
3. `ws/app/DESIGN.md`, phần **Motion**. Plan này chỉ áp dụng phần cần thiết
   cho hodi.
4. Code đã làm cùng hệ thống này (copy ý, không import chéo repo):
   `logi/src/lib/motion.ts`, `legi/src/app/globals.css` (hodi và legi dùng
   chung giọng "tờ giấy").

## Hiện trạng (2026-10-21)

- `src/app/globals.css` có đúng ba thứ: `settle` (chấm trạng thái lưu sáng
  rồi mờ, 2,4s), `zoom` (Heatmap đổi năm/tháng, 0,18s) và khối
  `prefers-reduced-motion` (0.01ms).
- `TopBar` mờ đi khi đang gõ (`transition-opacity`), `StatusDot` đổi chữ
  bằng `transition-opacity`. Đều đã đúng tinh thần, giữ nguyên.
- Trang `insight` (`src/components/InsightView.tsx`) là chỗ duy nhất có chờ
  AI: chữ `reading…` (phân tích), `searching…` (tìm theo nghĩa), và kết quả
  hiện cả khối một lúc. Chữ chờ đứng yên, không có hiệu ứng nào.
- Trang Today (`TodayView.tsx`): bấm `done` thì câu hỏi kế tiếp hiện thay
  câu cũ ngay lập tức.
- Test: `node --test` trên hàm thuần (`test/*.test.ts`), không có test
  component. Có emulator (xem README: `npm run emu` cần Java 21, rồi
  `npm run dev:emu`, cổng 3040) và đăng nhập emulator tự động (không popup
  Google). Dữ liệu mẫu: `node scripts/seed-emu.mjs <uid>`. Chức năng AI cần
  Cloud Functions và khoá Gemini nên **không chạy được** trong emulator: thử
  phần AI bằng trang tạm (xem dưới).

## Quy tắc cho mọi phase

- Theo phần **Motion** của DESIGN.md: chỉ `opacity` và `transform`, reduced
  motion phải chạy, không vòng lặp gây chú ý, không thư viện.
- **Không có gì chạy khi đang gõ**, khi mở app, hay khi đổi trang. Hiệu ứng
  chỉ dành cho thứ người dùng vừa bấm và đang đợi.
- Không toast, không popup, không rung (bất biến #9, #5).
- Không đổi chữ trên UI. Không đổi logic lưu, merge, AI, `dayOf()`.
- Mỗi phase xong: thêm mục ngắn **Motion** vào `README.md`, ghi một dòng vào
  "Tiến độ" cuối file này, rồi **hỏi owner trước khi làm phase tiếp theo**.

## Kiểm tra mỗi phase

```bash
cd ws/app/hodi
npx tsc --noEmit
npm run lint
npm test
npm run build
```

- `npm test` đã đặt `TZ=Asia/Ho_Chi_Minh`. Lưu output ra file rồi so số test
  passed với tổng.
- Hiệu ứng thử bằng **trang tạm** `src/app/zz-*/page.tsx` (ngoài `(main)`),
  xoá sau, cùng với `.next/dev/types` (nếu không `typecheck` báo thiếu
  module). Phần không dính AI (Today) thử được trên trang thật với emulator.
- Service worker của hodi có thể giữ JS/CSS cũ trong trình duyệt: huỷ đăng ký
  và xoá cache (`caches.keys()`) trước khi kết luận về CSS.
- Pane trình duyệt của app có thể không vẽ hình (`visibilityState` là
  `hidden`, `requestAnimationFrame` không chạy). Nếu vậy ghi rõ "chưa thấy
  tốc độ".
- Thử màn 375px, light và dark, và một lần với reduced motion bật.
- Commit: chỉ add đúng đường dẫn đã sửa (`git add <file> ...`, không
  `git add -A`). Kiểm tra `git branch --show-current` là `main`. Message dạng
  `feat(motion): ...`. Không co-author. **Không push** nếu owner không bảo.

## Chỗ sửa chính (vị trí ngày 2026-10-21, có thể lệch vài dòng)

| Chỗ | File | Phase |
|---|---|---|
| Token, khối chuyển động, reduced motion | `src/app/globals.css:165-200` | P1 |
| Chữ chờ và kết quả AI | `src/components/InsightView.tsx` (`RangeAnalysis` ~145, `MeaningSearch` ~330, `TalkView` ~485) | P1 |
| Câu hỏi kế tiếp | `src/components/TodayView.tsx:~89-135, 264-290` | P2 |

## CSS dùng chung (sửa `globals.css`)

Thêm token vào `:root` (một lần, không cần bản dark):

```css
  --ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
```

Thêm sau khối `zoom`, trước khối reduced motion:

```css
/* ---- Motion: short, opacity only here (DESIGN.md "Motion") ---- */
@keyframes fade-in {
  from { opacity: 0; }
}
.fade-in {
  animation: fade-in 180ms ease-out both;
}

/* A slow fade in and out for "waiting"; never blinks. */
@keyframes breathe {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
.breathe {
  animation: breathe 3.2s ease-in-out infinite;
}
```

Đổi `.zoom` cho cùng giọng: `animation: zoom 180ms var(--ease-soft)`.
`settle` giữ nguyên.

Thay khối reduced motion bằng khối chung (giữ dòng `scroll-behavior`):

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Lỗi hay gặp (đọc kỹ)

1. **Không có test component.** Đừng cài jsdom. Logic nhỏ thành hàm thuần
   trong `src/lib/motion.ts`, test trong `test/motion.test.ts` (giống các
   test hiện có, `node --test`).
2. **`matchMedia` không có trong Node.** `reducedMotion()` trả `true` khi
   không có `matchMedia`.
3. **React Compiler lint (Next 16).** Cấm `setState` trong `useEffect`; tính
   state "đã đổi" lúc render (mẫu `prev`/`setPrev` trong
   `logi/src/components/Toasts.tsx`).
4. **Hydration.** Trang render trên server (static export). Đừng đọc
   `matchMedia` lúc render đầu rồi đổi class theo nó.
5. **Textarea không được remount.** Today dùng cùng một textarea để giữ tiêu
   điểm (`GrowText`, `Editor`). Mọi hiệu ứng ở Today chỉ đặt trên phần tử
   câu hỏi, **không** đổi `key` của khối chứa textarea, không đổi chiều cao,
   không làm con trỏ nhảy (bất biến #1, #4).
6. **Kết quả AI chỉ chạy khi nó vừa về.** Mở trang `insight` với kết quả đã
   lưu thì hiện sẵn, không chạy.
7. **Không em dash.** Kiểm tra trước khi commit (zsh):
   `grep -rn $'\xe2\x80\x94' src test PLAN-motion.md README.md` phải rỗng.

---

## P1 - Trang insight: chữ chờ thở, kết quả mờ vào

### P1.1 CSS và hàm

File: `src/app/globals.css`, mới `src/lib/motion.ts`, `test/motion.test.ts`.

- Làm đúng như "CSS dùng chung".
- `src/lib/motion.ts`: `reducedMotion()` (copy từ `logi/src/lib/motion.ts`,
  trả `true` khi không có `matchMedia`). Test: trả `true` trong Node.

### P1.2 Chữ chờ thở chậm

File: `src/components/InsightView.tsx`.

- Thêm class `breathe` cho các chữ chờ: `reading…` (`RangeAnalysis`),
  `searching…` (`MeaningSearch`) và chữ chờ tương tự ở `TalkView` và nơi
  nào khác có `state === 'busy'` hiển thị chữ. Chỉ thêm class, không đổi
  chữ, không đổi vị trí.

### P1.3 Kết quả AI mờ vào một lần

File: `src/components/InsightView.tsx`.

- **Phân tích** (`RangeAnalysis` / `AnalysisView`): khi `run()` xong ở lần mở
  trang này, bài phân tích mới hiện bằng `fade-in`. Cách làm: `RangeAnalysis`
  giữ state `fresh` (id của phân tích vừa tạo, đặt trong `run()` sau khi
  `analyzeRange` xong; không đặt lúc mount) và truyền `fade` xuống
  `AnalysisView` để thêm `fade-in` lên thẻ `<article>`. Mở trang với bài đã
  lưu thì `fade` là sai.
- **Tìm theo nghĩa** (`MeaningSearch`): danh sách kết quả (`typeof state ===
  'object'`) luôn đến sau `busy`, nên thêm `fade-in` cho khối kết quả. Mỗi lần
  tìm lại, đổi `key` theo lần tìm (một số đếm tăng trong `run`) để chạy lại.
- **Nói tiếp** (`TalkView`): lời đáp mới vừa về thì `fade-in`; các tin cũ
  đã hiện sẵn không chạy lại.
- Không đổi chiều cao đã dành chỗ, không đổi thứ tự.

Xong khi: bấm `analyze` thì chữ `reading…` thở chậm, xong thì bài phân tích mờ
vào một lần; tìm theo nghĩa thì kết quả mờ vào; mở lại trang `insight` với
bài đã lưu thì mọi thứ hiện sẵn; reduced motion thì không có gì chạy.

---

## P2 - Today: câu hỏi kế tiếp mờ vào

File: `src/components/TodayView.tsx`.

- Khi bấm `done` (hoặc `another`) và một câu hỏi **mới** thay chỗ câu cũ,
  dòng câu hỏi (`<p className="mb-2 text-faint">{block.question}</p>` ở
  `Block`, dòng ~289, và dòng gợi ý khi chưa viết) mờ vào bằng `fade-in`
  (180ms). Chỉ opacity: không dịch chuyển, không đổi chiều cao.
- Cách làm: đặt `key={question}` trên chính phần tử câu hỏi (không trên khối
  chứa textarea), và chỉ thêm class `fade-in` sau khi người dùng đã bấm `done`
  hoặc `another` ít nhất một lần trong lần mở này (state `moved` tính lúc
  render, không đặt lúc mount). Lúc mở app, câu hỏi đầu tiên hiện sẵn.
- Textarea và con trỏ không được mất tiêu điểm hay nhảy: sau `done`, `focus`
  vẫn do code hiện có lo (`focus once the field is in the page`).
- Không thêm hiệu ứng nào khi đang gõ, khi blocks được lưu, hay khi `StatusDot`
  đổi (đã có `settle`).

Xong khi: bấm `done` thì câu hỏi kế tiếp mờ vào nhẹ và con trỏ vẫn đứng sẵn
trong ô viết; mở app thì câu hỏi và con trỏ hiện sẵn, không có gì chạy.

---

## Không làm (ghi lại để AI sau khỏi đề xuất lại)

- **Toast hay popup** cho bất kỳ việc gì (bất biến #9).
- **Hiệu ứng khi gõ hay khi lưu** (ngoài chấm `settle` đã có): chữ là thứ duy
  nhất ở trang Today.
- **Chuyển trang** giữa Today, Days, Insight, Settings: bất biến #1 (mở app là
  gõ được) và "không áp lực".
- **Đổi tháng/năm của Heatmap** thành nhiều bước: `zoom` hiện tại là đủ.
- **Vuốt** (đổi ngày, mở menu) và **rung**.
- **Làm động `html.veiled`** (làm mờ riêng tư): giữ tức thì, đó là tính năng
  riêng tư.
- **Mừng khi viết xong hay khi đủ chữ**: trái bất biến #5.

## Tiến độ

(AI làm ghi một dòng mỗi phase: ngày, commit, ghi chú.)
- P1 (2026-10-21): Motion CSS block (`fade-in`, `breathe`, `--ease-soft`), `zoom` on the shared easing, one global reduced-motion block, `src/lib/motion.ts` + test, waiting words `breathe`, analysis / search results / talk replies fade in once when fresh. `fresh` for an analysis is derived: the id on screen when "analyze" was pressed differs from the id now. Checked against the Auth and Firestore emulators (Functions are not available, so analyze and search fail fast): a saved analysis shows with no fade on load; after a press, a second analysis written by REST fades in (`fade-in` class, animation `fade-in`); a talk reply added live gets `fade-in` while the earlier messages and your own do not; a talk that is already there at load shows still. The waiting words and the search result block were checked by code and types only (no AI in the emulator). Browser pane was used for state checks, not for seeing speed.
