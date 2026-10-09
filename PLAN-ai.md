# PLAN-ai - Tích hợp AI vào hodi

Ngày viết: 2026-10-09. Trạng thái: **A1-A8 xong và đã deploy (2026-10-09).** A8 gom mọi phân tích AI vào trang `insight`. Tiếp theo: chủ app dùng thử rồi chỉnh.

## Mục tiêu

AI trong hodi là **tấm gương + người bạn biết rút kinh nghiệm**, không phải huấn luyện viên.

- **Nghe trước, khuyên khi bạn muốn.** Bạn chỉ viết thì AI yên lặng.
- Khi bạn viết về **hành động của mình** (làm tốt hoặc làm chưa tốt), AI giúp trả lời:
  "lần sau gặp chuyện này thì làm gì để tốt hơn?".
- Bài học bạn thấy đúng thì **giữ lại** (`keep`). Lần sau gặp chuyện giống vậy, AI nhắc lại
  chính bài học của bạn, không phải lời khuyên chung chung.

## Danh sách tính năng

| # | Tên | Kích hoạt | Làm gì |
|---|---|---|---|
| 1 | `look back` (review tuần/tháng) | Bấm, ở trang review | Đọc các ngày trong kỳ, chỉ ra 2-3 điều lặp lại + 1 câu hỏi |
| 2 | `deeper` (câu hỏi đào sâu) | Bấm, sau `done` | 1 câu hỏi dựa trên điều vừa viết |
| 3 | `reflect` (phản chiếu) | Bấm, ở một khối | Nói lại ngắn điều bạn đang cảm thấy + 1 câu hỏi. Không khuyên |
| 4 | Tìm theo ý nghĩa | Gõ ở Days | "lần cuối tôi lo về công việc?" (cần embeddings) |
| 5 | `next time` (rút kinh nghiệm) | Bấm, ở một khối | Xem mục "Logic next time" bên dưới |
| 6 | Chọn câu hỏi thông minh | Nền, 1 lần/ngày | Chọn câu hỏi trong `QUESTIONS` hợp với mấy ngày gần đây |
| 7 | `check the story` (nhìn lại câu chuyện) | Bấm, ở một khối | Kiểu CBT: "có bằng chứng ngược lại không?" |
| 8 | Khép vòng lặp | Nền, 1 lần/ngày | Bạn viết "sẽ làm X" → vài ngày sau câu hỏi mờ là "Did you start X?" |
| 9 | On this day có ý nghĩa | Bấm, ở On this day | "Một năm trước bạn lo về X. Bây giờ thì sao?" |
| - | Hỗ trợ khi rất nặng | Luôn bật, chạy trên máy | Xem mục "An toàn" |

Mọi nút AI chỉ hiện khi Settings → `AI` = `on` (mặc định `off`).

**Ngôn ngữ trả lời:** Settings → `AI language` = `Tiếng Việt` (mặc định) / `English`.
Lưu localStorage như các tuỳ chọn khác; client gửi kèm `lang` trong mỗi lần gọi function.
Prompt luôn viết bằng tiếng Anh (AGENTS.md), chỉ dặn AI trả lời bằng ngôn ngữ đã chọn.

## Logic `next time` (tính năng chính)

Dùng khi bạn viết về một việc đã làm, một trải nghiệm tệ, hoặc một lần than phiền.

1. Bạn bấm `next time` ở khối đó.
2. Server gửi cho AI: khối hiện tại + **các bài học đã giữ** (`lessons`) + các trang gần đây
   (xem "Dữ liệu gửi đi").
3. AI trả về, ngắn gọn:
   - **What happened**: 1 câu, tách sự việc khỏi cảm xúc.
   - **What you did well**: 1 điểm (nếu có thật, không khen giả).
   - **Next time, you could try**: 1-3 bước nhỏ, cụ thể, trong tầm tay bạn.
   - **What helped before** (nếu có): trích ngày cũ hoặc bài học cũ. Ví dụ:
     "On 2026-09-12 you wrote that a short walk calmed you down."
4. Mỗi bước có nút `keep`. Bấm → lưu thành 1 bài học (`lessons`).
5. Lần sau, khi `next time` hoặc `reflect` thấy chuyện giống vậy, AI nhắc bài học đó trước.

Quy tắc giọng văn (đưa vào prompt):

- Không "you should", không ra lệnh. Dùng "you could try", "one option is".
- Không chung chung ("ngủ đủ giấc", "thở sâu") trừ khi nhật ký của bạn cho thấy nó đã giúp.
- Không đổ lỗi, không bênh vực. Nói thẳng nhưng tử tế.
- Nếu chuyện nằm ngoài tầm tay bạn: nói rõ, và chỉ gợi ý phần bạn kiểm soát được.

### Khi nào AI tự khuyên mà không cần bấm `next time`

- Bạn bấm `reflect` nhưng trong khối có câu hỏi xin lời khuyên ("what should I do?",
  "mình nên làm gì?") → `reflect` trả thêm phần "Next time, you could try".
- Ngoài ra AI không bao giờ tự khuyên.

## Logic khép vòng lặp (#8)

- Mỗi ngày, lần đầu mở Today (AI on), client gọi function `daily` (không cần lịch chạy
  trên server). Function đọc trang **hôm qua** và tìm câu hứa:
  "tomorrow I will...", "tuần sau mình sẽ...".
- Lưu vào `intentions` với ngày hỏi lại = ngày viết + 3 ngày (hoặc theo câu: "tuần sau" → +7).
- Đến ngày hỏi lại, câu hỏi mờ hôm đó là `Did you start X?` (thay câu hỏi thường).
- **Chỉ hỏi 1 lần.** Bạn trả lời hay bỏ qua đều xong, không hỏi lại, không đếm.
- Tối đa 1 câu hỏi kiểu này mỗi ngày.

Điều này đổi bất biến số 5 một chút: vẫn không streak, không thông báo, không đếm. Câu hỏi
hỏi lại chỉ là câu hỏi mờ như mọi ngày.

## An toàn

- Danh sách từ khoá (tiếng Việt + tiếng Anh) về tự làm hại bản thân, chạy **trên máy**,
  không gửi đi đâu. Có từ khoá → dưới khối hiện 1 dòng mờ với số đường dây hỗ trợ.
- Mọi prompt có quy tắc: nếu thấy dấu hiệu rất nặng, không phân tích, chỉ nói nhẹ nhàng và
  gợi ý nói chuyện với người thật.
- AI không chẩn đoán, không dùng từ y khoa về bạn.

## Dữ liệu gửi đi (riêng tư)

- Chỉ gửi khi bạn bấm, trừ 2 việc nền (#6, #8). Hai việc nền chỉ gửi trang hôm qua.
- `next time` / `reflect`: khối hiện tại + `lessons` + 60 ngày gần nhất (đủ cho
  "what helped before" khi chưa có embeddings). Sau Phase A6 chỉ gửi các đoạn liên quan.
- `look back`: các ngày trong tuần/tháng đó.
- Không lưu log nội dung trên server.

## Kiến trúc

hodi là static export (`output: 'export'`), không có API route. Đề xuất:

- **Firebase Cloud Functions (callable), region `asia-southeast1`**, cùng project
  `kyphan38-hodi-app`.
  - Callable tự kiểm Firebase Auth; thêm kiểm email như `firestore.rules`.
  - Function tự đọc Firestore bằng Admin SDK, nên client chỉ gửi `day` + chỉ số khối,
    không gửi cả nhật ký qua mạng.
  - Gọi Gemini bằng key AI Studio (SDK `@google/genai`, model `gemini-3.8-flash` như cogi).
    Key nằm trong Secret Manager (`GEMINI_API_KEY`); emulator đọc `functions/.secret.local`.
  - Email được phép: biến môi trường `ALLOWED_USER_EMAIL` trong `functions/.env` (không commit).
  - Site trên Vercel vẫn static, offline/SW không đổi.
- Cần **gói Blaze** (trả theo dùng) cho Functions.

### Dữ liệu mới

```ts
// users/{uid}/aiNotes/{auto-id} - kết quả AI, KHÔNG trộn vào text của entry (bất biến 3)
// result: JSON theo kind (ReflectResult, NextTimeResult... trong src/types/hodi.ts)
{ day: string; blockTime: string | null; kind: 'reflect' | 'nextTime' | 'deeper' | 'story' | 'lookBack' | 'onThisDay';
  result: object; createdAt: number }

// users/{uid}/lessons/{auto-id} - bài học bạn bấm `keep`
{ text: string; situation: string; sourceDay: string; archived: boolean;
  createdAt: number; updatedAt: number }

// users/{uid}/intentions/{auto-id} - câu hứa cho #8
{ text: string; day: string; askOn: string; status: 'open' | 'asked';
  createdAt: number }

// users/{uid}/meta/ai - trạng thái việc nền
{ lastDailyRun: string; questionFor: { day: string; text: string } | null }
```

- Không xoá (bất biến 6): bài học không cần nữa thì `archived: true`.
- `aiNotes`, `intentions`, `meta`: chỉ function ghi; client chỉ đọc (rules).
- `lessons`: client sửa được `text` và `archived`.

### Giao diện (tối giản, đơn sắc)

- Nút AI là chữ nhỏ mờ cạnh `done`: `reflect`, `next time`, `deeper`, `story`.
- Kết quả hiện ngay dưới khối, chữ mờ, thụt lề, có thể thu gọn. Không popup, không toast.
- Đang chờ: dùng chấm trạng thái sẵn có, không spinner.
- Bài học: trang `/lessons`, link nhỏ trong TopBar (cạnh days/review). Chỉ là danh sách chữ,
  sửa được, `archive`.
- Settings: thêm hàng `AI` (`on` / `off`) và `AI language` (`Tiếng Việt` / `English`).

## Quyết định (chủ app, 2026-10-09)

1. Nhà cung cấp: **Gemini, key từ AI Studio** (giống cogi). Key nằm ở project
   `gen-lang-client-005134315635`, cần project đó có thanh toán (paid tier).
2. Ngôn ngữ: **tuỳ chọn trong Settings**, mặc định tiếng Việt, có English.
3. Gói Blaze: **đồng ý**. Hướng dẫn ở mục A0.
4. #8: hỏi lại sau **+3 ngày** (hoặc +7 nếu viết "tuần sau"), **chỉ 1 lần**, không hỏi lại nữa.

## A0 - Setup (chủ app làm)

1. **Bật Blaze** cho `kyphan38-hodi-app`: Firebase Console → `Upgrade` → **Blaze**.
2. **Cảnh báo chi phí:** Google Cloud Console → `Billing` → `Budgets & alerts` → 5 USD/tháng.
3. **Key Gemini:** đã tạo (AI Studio), đã nằm trong `.env.local`. Kiểm tra key ở AI Studio là
   **Paid**, không phải Free.
4. **Đưa key lên Secret Manager** (sau khi bật Blaze):

   ```bash
   cd ~/ws/app/hodi && npm run fn:env && grep '^GEMINI_API_KEY=' .env.local | cut -d= -f2- | firebase functions:secrets:set GEMINI_API_KEY --data-file=-
   ```

5. **Deploy rules + functions:**

   ```bash
   cd ~/ws/app/hodi && npm run rules && firebase deploy --only functions,firestore:rules
   ```

6. Mở app → Settings → `AI` = `on` → `check`. Thấy một câu chào là xong.

## Ghi chú sau A2

- Nút `reflect · next time` chỉ hiện ở trang **Today**, khi đang sửa một khối có chữ.
  Ngày cũ (Day view) chưa có, để sau nếu cần.
- Client gửi chính khối đó; function tự đọc 60 ngày trước + bài học (không archived).
- Mỗi lần gọi mất khoảng 10-15 giây (Gemini đọc cả 60 ngày).

## Ghi chú sau A4

- `deeper`: hiện sau `done` (cạnh `another · free write`). Câu hỏi AI trở thành câu hỏi của
  khối tiếp theo, nên nằm trong chữ nhật ký như mọi câu hỏi (`› ...`). Không lưu aiNotes.
- Chọn câu hỏi: function `daily` chạy 1 lần/ngày (kết quả lưu `meta/ai.questionFor`), chọn
  từ danh sách `QUESTIONS` dựa trên 7 ngày trước. `another` quay về thứ tự cũ.
  Câu hỏi vẫn là tiếng Anh (danh sách có sẵn).

## Ghi chú sau A5

- `daily` tìm lời hứa trong các trang chưa đọc (tối đa 7 ngày trước), lưu `intentions`
  với `askOn` (mặc định +3, "tuần sau" +7, "mai" +2). Lời hứa đến hạn được hỏi **1 lần**:
  đánh dấu `asked` ngay khi lấy ra, hiện trước câu hỏi của ngày, `another` để bỏ qua.
- Khoá bằng transaction (`meta/ai.claim`): hai lần mở cùng lúc không quét hai lần.
- Cần bật `Daily question` và `AI` thì mới chạy.

## Ghi chú sau A6

- `story` nằm cạnh `reflect · next time`: câu chuyện bạn tự kể, tối đa 3 sự thật từ ngày cũ
  "không khớp" (bỏ ngày bịa), một câu "truer", một câu hỏi.
- On this day: `now?` ở cuối mỗi dòng. So trang cũ với 30 ngày gần nhất; `now` = null khi
  các trang gần đây không nhắc lại chuyện đó. Note lưu với `source` = ngày cũ.

## Ghi chú sau A7

- Index: `users/{uid}/chunks/{day}_{i}`, mỗi khối một vector 768 chiều (`gemini-embedding-2`),
  vector index trong `firestore.indexes.json`. Chunks là dữ liệu phụ, được xoá/thay khi trang đổi.
- Index được cập nhật dần: `daily` (15 giây mỗi sáng) và `search` (35 giây mỗi lần), theo
  `meta/ai.indexedAt`. Chỉ khối đổi chữ mới gọi lại AI (so hash). 188 trang mất ~9 giây.
- Days: gõ tìm kiếm → `by meaning` dưới kết quả theo chữ. Index chưa xong thì có dòng
  "Still reading older pages" + `Search again`.
- `reflect`, `next time`, `story` giờ gửi 14 ngày gần nhất + 12 khối cũ liên quan nhất,
  thay cho 60 ngày. Không có index thì quay về 60 ngày như cũ.

## Các phase

| Phase | Nội dung | Kiểm chứng |
|---|---|---|
| A0 | Chủ app: Blaze, budget, secret, deploy | Settings → `check` ra câu chào |
| A1 ✅ | Nền móng: thư mục `functions/`, callable `ping` + kiểm email, Gemini key, rules mới, hàng `AI` + `AI language` trong Settings, `aiNotes`, kiểm từ khoá an toàn trên máy, cập nhật ROADMAP | Test rules; AI off thì không thấy nút nào |
| A2 ✅ | `reflect` + `next time` + `keep` + trang `/lessons` + "what helped before" (60 ngày) | Viết 1 trải nghiệm tệ → nhận 1-3 bước, giữ được bài học, lần sau được nhắc lại |
| A3 ✅ | `look back` cho review tuần/tháng | Mở review tuần → 2-3 điều lặp lại có trích ngày |
| A4 ✅ | `deeper` + chọn câu hỏi thông minh (#6) | Câu hỏi ngày mai khác hash cũ, hợp với hôm qua |
| A5 ✅ | Khép vòng lặp (#8) | Viết "mai mình sẽ chạy bộ" → 3 ngày sau thấy câu hỏi lại đúng 1 lần, ngày sau không thấy nữa |
| A6 ✅ | `story` (CBT) + On this day có ý nghĩa | Viết "I always fail" → nhận câu hỏi tìm bằng chứng ngược lại |
| A7 ✅ | Tìm theo ý nghĩa: embeddings cho mỗi khối, lưu Firestore vector; `next time` dùng nó thay 60 ngày | Gõ "lo về công việc" ở Days → ra đúng ngày dù không có chữ "công việc" |

Mỗi phase: test thuần cho logic (prompt builder, parse kết quả, chọn ngày hỏi lại), test rules
bằng emulator, `npm run typecheck && npm test`, rồi mới merge.

## Thay đổi ROADMAP (làm ở A1)

- Bất biến 8: "Không server" → "Không server, **trừ Cloud Functions cho AI**. Site vẫn static."
- Bất biến 5: thêm "AI không bao giờ tự khuyên; câu hỏi hỏi lại (#8) chỉ hỏi 1 lần."
- Bất biến mới: "AI chỉ chạy khi bấm, trừ 2 việc nền 1 lần/ngày. Kết quả AI không trộn vào
  text của trang."
- Xoá "AI" khỏi "Những gì KHÔNG làm". Ghi vào Nhật ký quyết định.

## A8 - Gom AI vào trang `insight` (2026-10-09)

Chủ app muốn phân tích **cả ngày / vài ngày / tuần / tháng**, không phải nút trong từng khối.
Today phải trở lại là trang chỉ để viết.

**Bỏ** (code và function trên server): `reflect`, `next time`, `story` ở từng khối, `deeper`,
kết quả AI dưới khối, `now?` ở On this day, `look back` ở review, `by meaning` ở Days,
trang `/lessons`.

**Giữ ở Today** (không có nút): câu hỏi đầu ngày do AI chọn + câu hỏi lại lời hứa (#6, #8),
dòng an toàn.

**Trang `insight`** (thanh trên cùng, chỉ khi AI bật):
- Chọn nhanh `today · 3 days · 7 days · 30 days` → `analyze`. Function `analyze` đọc mọi
  trang trong khoảng + bài học + 12 khối cũ liên quan (index A7), trả về:
  overview, gives energy, takes energy, keeps coming back, went well, the story (nếu có),
  next time try (`keep`), helped before, 1 câu hỏi. Mỗi ý kèm tối đa 4 ngày, bấm để mở.
  Lưu ở `aiNotes` (kind `analysis`, `range`, `from`, `to`); hiện bản mới nhất của mỗi khoảng.
- `search by meaning` (function `search`, A7).
- `lessons`: danh sách bài học, sửa / `archive`.
- `lessons in action`: mỗi lần phân tích, AI so bài học đã giữ với các trang trong khoảng:
  `used` (đã làm theo) hoặc `could have helped` (lúc có thể dùng mà chưa dùng), kèm ngày.
  Không chấm điểm, không trách. Chỉ ngày trong khoảng mới được ghi.

**Reset theo ngày + lịch sử (2026-10-09):** trang `insight` chỉ hiện phân tích của **hôm nay**.
Sang ngày mới thì trống, bấm `analyze` lại. Mục `history` ở cuối trang liệt kê các ngày cũ;
mở `/insight/?d=YYYY-MM-DD` để xem lại (chỉ đọc, không trò chuyện tiếp).

**`write about this` (function `talk`):** dưới câu hỏi của phân tích hôm nay. Mở một cuộc trò
chuyện ngắn để gỡ rối, lưu ở `users/{uid}/aiChats/{analysisId}` (function ghi cả hai phía).
- Logic 4 bước: hiểu (chuyện gì, cảm thấy gì, muốn gì) → gỡ (sự việc / cảm xúc / câu chuyện tự
  kể; điều trong tầm tay) → lựa chọn (1-3 bước nhỏ có `keep`, ngay khi bạn xin ý) → đóng (1 câu
  tóm tắt, `closed`).
- Mỗi câu trả lời 1-3 câu, tối đa 1 câu hỏi. Tối đa 12 lượt AI; từ lượt 5 chuyển sang lựa chọn.
- Chỉ trò chuyện được trong ngày của phân tích. Câu trả lời của bạn không vào nhật ký.

**Để sau:** 1 năm (tóm tắt từng tháng trước rồi phân tích 12 bản tóm tắt); tự chọn ngày.
