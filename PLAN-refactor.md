# PLAN-refactor (hodi)

Trạng thái: Phase 1 và 2 xong (2026-11-15). Test 78/78, build OK. Đã thử /insight trên emulator: range, history, ngày cũ, talk, custom, lesson editor.

Mục tiêu nhỏ: bỏ lệnh gọi Firestore khỏi component, và chia `InsightView.tsx` (682 dòng) thành nhiều file.

Không đổi tính năng. Không đổi giao diện. Không đổi prompt AI.

## Nguyên tắc chung

- Hỏi owner trước khi bắt đầu. Hai phase, mỗi phase một commit.
- Trước và sau: `npm test`, `npm run test:rules`, `npm run build`.
- Chỉ di chuyển code.

## Hiện trạng

`components/InsightView.tsx` có:
- 2 hook đọc Firestore trực tiếp: `useAnalyses` (collection `aiNotes`, kind `analysis`) và `useTalk` (doc `aiChats/{id}`).
- 10 component con: `RangeAnalysis`, `AnalysisView`, `Section`, `DatedSection`, `DatedList`, `Steps`, `MeaningSearch`, `Lessons`, `LessonEditor`, `TalkView`, `History`, `PastDay`.

Các phần khác của hodi đã gọn (lib nhỏ, có test).

## Phase 1: đưa Firestore ra khỏi component

1. Tạo `src/lib/insight-data.ts` với 2 hàm: `watchAnalyses(uid, onChange)` và `watchTalk(uid, analysisId, onChange)`. Hai hàm trả về hàm huỷ (`unsubscribe`).
2. Tạo `src/hooks/useInsight.ts` chứa `useAnalyses` và `useTalk`, gọi các hàm ở bước 1.
3. `latestPerRange` (hàm thuần) chuyển sang `lib/ranges.ts` + unit test.

Xong khi: `grep "firebase/firestore" src/components` không còn kết quả.

## Phase 2: chia InsightView

```
src/components/insight/
  InsightView.tsx      # chỉ chọn range + ghép các phần
  RangeAnalysis.tsx
  AnalysisView.tsx     # + Steps, Section, DatedSection, DatedList
  TalkView.tsx
  MeaningSearch.tsx
  Lessons.tsx          # + LessonEditor
  History.tsx          # + PastDay
```

Sửa import trong `app/(main)/insight/page.tsx`.

Mục tiêu: không file nào trên 250 dòng.
