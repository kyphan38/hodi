import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Web tĩnh, không server: mọi dữ liệu đi thẳng từ trình duyệt tới Firestore.
  // Bảo vệ dữ liệu nằm ở firestore.rules, không ở API route nào cả.
  output: 'export',
  // /days -> /days/index.html: host tĩnh nào cũng phục vụ đúng, kể cả SW cache.
  trailingSlash: true,
  // Huy hiệu dev của Next đè lên góc dưới trang viết.
  devIndicators: false,
};

export default nextConfig;
