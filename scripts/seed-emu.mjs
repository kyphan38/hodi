// ---------------------------------------------------------------------------
// hodi - Tạo dữ liệu mẫu trong EMULATOR (không bao giờ chạm project thật)
//
//   node scripts/seed-emu.mjs <uid>
//
// uid: localStorage 'hodi.uid' trong trình duyệt sau khi đăng nhập emulator.
// Tạo ~1 năm bài viết (có khoảng lặng), một bài đúng ngày này năm trước, và
// một review tuần. Ghi qua REST với "Bearer owner" (chỉ emulator chấp nhận).
// ---------------------------------------------------------------------------

const uid = process.argv[2];
if (!uid) {
  console.error('usage: node scripts/seed-emu.mjs <uid>');
  process.exit(1);
}

const BASE = 'http://127.0.0.1:8080/v1/projects/demo-hodi/databases/(default)/documents';

const LINES = [
  'Hôm nay trời mưa cả ngày, mình ở nhà đọc sách.',
  'Slept badly. Too much coffee again.',
  'Họp dài, mệt. Nhưng tối nấu ăn thấy vui lại.',
  'Walked around the lake after work. Quiet and good.',
  'Mình đã không nói điều mình thật sự nghĩ trong buổi họp.',
  'Gọi cho mẹ. Nói chuyện lâu hơn mọi khi.',
  'I keep postponing the hard email. Tomorrow, first thing.',
  'Đà Lạt lạnh hơn mình nghĩ. Cà phê ngon.',
  'A small win: finished the thing I was avoiding.',
  'Không có gì đặc biệt. Chỉ muốn ghi lại là hôm nay ổn.',
];

const pad = (n) => String(n).padStart(2, '0');
const id = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const words = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function fields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null) out[k] = { nullValue: null };
    else if (typeof v === 'number') out[k] = { integerValue: String(v) };
    else out[k] = { stringValue: v };
  }
  return { fields: out };
}

async function put(path, data) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(fields(data)),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

// Ngày bắt đầu 04:00 như app: lùi 4 tiếng rồi lấy ngày.
const today = new Date(Date.now() - 4 * 3600_000);
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

let count = 0;
for (let back = 1; back <= 365; back++) {
  const d = new Date(today);
  d.setDate(d.getDate() - back);
  // Có giai đoạn viết đều, có giai đoạn bỏ bê.
  const busy = Math.floor(back / 40) % 3 === 1;
  if (rand() < (busy ? 0.8 : 0.35)) continue;
  const n = 1 + Math.floor(rand() * (rand() < 0.2 ? 30 : 6));
  const text = Array.from({ length: n }, () => LINES[Math.floor(rand() * LINES.length)]).join(rand() < 0.5 ? ' ' : '\n\n');
  const date = id(d);
  const at = d.getTime() + 15 * 3600_000;
  await put(`users/${uid}/entries/${date}`, {
    date, md: date.slice(5), text, words: words(text), prompt: null, createdAt: at, updatedAt: at,
  });
  count++;
}

// Đúng ngày này năm trước, và hai năm trước.
for (const years of [1, 2]) {
  const d = new Date(today);
  d.setFullYear(d.getFullYear() - years);
  const date = id(d);
  const text = years === 1 ? 'Một năm trước: mới chuyển nhà, còn bừa bộn.' : 'Two years ago I started running.';
  await put(`users/${uid}/entries/${date}`, {
    date, md: date.slice(5), text, words: words(text), prompt: 'What did today teach you?', createdAt: d.getTime(), updatedAt: d.getTime(),
  });
  count++;
}

console.log(`seeded ${count} entries for ${uid}`);
